import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, postgresConfig } from '../store.mjs';
import { createApp } from '../app.mjs';
import { createProvider } from '../provider.mjs';
import { workspaceId, encryptKey, decryptKey, initialWorkspace, addMission, queueMission, recoverStale, AppError } from '../domain.mjs';
const token = 'a'.repeat(64), otherToken = 'b'.repeat(64), key = 'sk-test-only-not-a-real-provider-key';
const missionInput = { title: 'Entrega de teste', brief: 'Conteúdo original de teste', agentId: 'creator', kind: 'text', execute: true };
async function fixture(t, provider = { validate: async () => {}, text: async () => ({ output: 'Saída apenas do provedor de teste', tokens: 10 }), image: async () => ({ base64: Buffer.from('test-image-bytes').toString('base64'), tokens: 5 }) }) {
  const store = await createStore({ file: ':memory:' });
  const app = createApp({ store, provider });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await app.close(); await store.close(); });
  const base = `http://127.0.0.1:${app.server.address().port}/api/agents`;
  async function request(path, method = 'GET', body, access = token, extra = {}) {
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = response.headers.get('content-type')?.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
    return { status: response.status, data };
  }
  async function connect() { const result = await request('/settings', 'POST', { apiKey: key, model: 'gpt-4.1-mini', imageModel: 'gpt-image-1-mini' }); assert.equal(result.status, 200); }
  return { app, store, request, connect };
}

test('provider key encryption cannot be read using another workspace token', () => {
  const encrypted = encryptKey(key, token);
  assert.equal(decryptKey(encrypted, token), key);
  assert.throws(() => decryptKey(encrypted, otherToken));
  assert.ok(!JSON.stringify(encrypted).includes(key));
  assert.notEqual(workspaceId(token), workspaceId(otherToken));
  assert.throws(() => workspaceId('invalid'), /inválido/);
});
test('queue validation, retry accounting and interrupted execution recovery', () => {
  const workspace = initialWorkspace(); const mission = addMission(workspace, missionInput);
  assert.throws(() => queueMission(workspace, mission.id), /chave/);
  workspace.secret = encryptKey(key, token); queueMission(workspace, mission.id);
  assert.throws(() => queueMission(workspace, mission.id), /andamento/);
  mission.status = 'running'; mission.leaseUntil = 0; mission.tokens = 10;
  recoverStale(workspace); assert.equal(mission.status, 'failed');
  queueMission(workspace, mission.id); assert.equal(mission.attempt, 2); assert.equal(mission.tokens, 10);
  workspace.agents.find(a => a.id === 'creator').enabled = false; mission.status = 'failed';
  assert.throws(() => queueMission(workspace, mission.id), /Reative/);
});
test('SQLite persists data across restart and concurrent writes retain both changes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'hubloan-test-')); t.after(() => rm(directory, { recursive: true }));
  const file = join(directory, 'agents.sqlite'); let store = await createStore({ file });
  await Promise.all([store.mutate('id', w => w.agents.push({ id: 'one' })), store.mutate('id', w => w.agents.push({ id: 'two' }))]);
  await store.close(); store = await createStore({ file });
  assert.equal((await store.read('id')).workspace.agents.length, 5); await store.close();
  assert.equal(postgresConfig('Host=host;Port=5433;Username=user;Password=pass;Database=db;SSL Mode=Require').ssl.rejectUnauthorized, true);
});
test('API runs real workflow through injected provider, isolates users and requires human approval', async t => {
  const f = await fixture(t); await f.connect(); await f.request('/ai-costs', 'POST', {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}});
  const created = await f.request('/missions', 'POST', missionInput); assert.equal(created.status, 201);
  const id = created.data.missions[0].id; assert.equal(created.data.missions[0].status, 'queued');
  await f.app.runner.tick();
  const done = (await f.request('/workspace')).data;
  assert.equal(done.missions[0].status, 'review'); assert.equal(done.missions[0].tokens, 30);
  assert.equal(done.missions[0].output, 'Saída apenas do provedor de teste');
  assert.ok(!JSON.stringify(done).includes(key)); assert.equal(done.secret, undefined);
  assert.equal((await f.request(`/missions/${id}/approve`, 'POST', undefined, otherToken)).status, 404);
  assert.equal((await f.request('/workspace', 'GET', undefined, otherToken)).data.missions.length, 0);
  assert.equal((await f.request(`/missions/${id}/approve`, 'POST')).data.missions[0].status, 'approved');
  assert.equal((await f.request(`/missions/${id}/run`, 'POST')).status, 409);
  assert.equal((await f.request('/workspace', 'GET', undefined, 'bad')).status, 401);
  assert.equal((await f.request('/workspace', 'GET', undefined, token, { Origin: 'https://untrusted.test' })).status, 403);
});
test('image bytes are protected and downloaded separately from public mission history', async t => {
  const f = await fixture(t); await f.connect(); await f.request('/ai-costs', 'POST', {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}});
  const created = await f.request('/missions', 'POST', { ...missionInput, kind: 'image' }); const id = created.data.missions[0].id;
  await f.app.runner.tick();
  const data = (await f.request('/workspace')).data;
  assert.equal(data.missions[0].hasArtifact, true); assert.equal(data.missions[0].artifact, undefined); assert.equal(data.missions[0].images, 1);
  assert.equal((await f.request(`/missions/${id}/artifact`)).data.toString(), 'test-image-bytes');
  assert.equal((await f.request(`/missions/${id}/artifact`, 'GET', undefined, otherToken)).status, 404);
});
test('cancel aborts provider request and never resurrects a cancelled mission', async t => {
  let started; const ready = new Promise(resolve => { started = resolve; });
  const provider = { validate: async () => {}, text: async (_key, _model, _instructions, _input, _limit, signal) => { started(); return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })); } };
  const f = await fixture(t, provider); await f.connect(); await f.request('/ai-costs', 'POST', {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}}); const created = await f.request('/missions', 'POST', missionInput); const id = created.data.missions[0].id;
  const running = f.app.runner.tick(); await ready;
  assert.equal((await f.request(`/missions/${id}/cancel`, 'POST')).data.missions[0].status, 'cancelled');
  await running; assert.equal((await f.request('/workspace')).data.missions[0].status, 'cancelled');
});
test('provider failure is visible without exposing raw secrets; disconnected queue cannot run', async t => {
  const f = await fixture(t, { validate: async () => {}, text: async () => { throw new AppError('Saldo insuficiente', 422); } }); await f.connect(); await f.request('/ai-costs', 'POST', {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}});
  await f.request('/missions', 'POST', missionInput); await f.app.runner.tick();
  const data = (await f.request('/workspace')).data; assert.equal(data.missions[0].status, 'failed'); assert.equal(data.missions[0].error, 'Saldo insuficiente');
  await f.request(`/missions/${data.missions[0].id}/run`, 'POST');
  assert.equal((await f.request('/settings', 'DELETE')).data.missions[0].status, 'cancelled');
  assert.equal((await f.request(`/missions/${data.missions[0].id}/run`, 'POST')).status, 400);
});
test('Responses API payload and parsing handle actual output structure and token truncation', async () => {
  let request;
  const provider = createProvider(async (url, options) => { request = { url, options }; return new Response(JSON.stringify({ status: 'incomplete', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Entrega' }] }], usage: { total_tokens: 123 } })); });
  assert.deepEqual(await provider.text(key, 'gpt-4.1-mini', 'regras', 'briefing', 1800), { output: 'Entrega', model:undefined, usage:{total_tokens:123}, tokens: 123, truncated: true });
  assert.equal(request.url, 'https://api.openai.com/v1/responses'); const payload = JSON.parse(request.options.body); assert.equal(payload.store, false); assert.equal(payload.max_output_tokens, 1800);
  const failing = createProvider(async () => new Response(JSON.stringify({ error: { code: 'insufficient_quota', message: key } }), { status: 429 }));
  await assert.rejects(() => failing.text(key, 'gpt-4.1-mini', '', '', 100), error => /saldo/.test(error.message) && !error.message.includes(key));
});
