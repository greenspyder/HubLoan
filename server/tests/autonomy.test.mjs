import { configureCosts } from '../ai-costs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from '../store.mjs';
import { createRunner } from '../runner.mjs';
import { createProvider } from '../provider.mjs';
import { createApp } from '../app.mjs';
import { encryptKey, workspaceId, publicWorkspace, initialWorkspace, cancelMission } from '../domain.mjs';
import { normalizeWorkspace, createProject, projectAction, autonomyMasterKey, unlockGrant } from '../autonomy.mjs';
import { localEncryptionKey } from '../local-key.mjs';
const token = 'c'.repeat(64), id = workspaceId(token), masterKey = 'd'.repeat(64), key = 'sk-autonomy-test-only-not-real';
const input = { name: 'Projeto de teste', goal: 'Produzir conteúdo original de teste', kind: 'text', maxDeliveries: 2, intervalMinutes: 1, research: false, start: true };
function fakeProvider() {
  let calls = 0;
  return { get calls() { return calls; }, validate: async () => {}, text: async (_key, _model, instructions) => { calls++; return { output: instructions.includes('somente JSON') ? JSON.stringify({ title: `Tarefa original ${calls}`, brief: 'Produzir conteúdo completo de teste.' }) : 'Conteúdo final do provedor de teste', tokens: 10 }; }, research: async () => ({ output: 'Pesquisa de teste com fonte', sources: [{ title: 'Fonte de teste', url: 'https://example.com' }], tokens: 30, searches: 1 }) };
}
async function setup(t, { provider = fakeProvider(), file = ':memory:', maxDeliveries = 2, research = false } = {}) {
  const store = await createStore({ file }); let clock = Date.now();
  await store.mutate(id, workspace => { workspace.secret = encryptKey(key, token);configureCosts(workspace, {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}});  createProject(workspace, { ...input, maxDeliveries, research }, token, masterKey, clock); });
  const runner = createRunner(store, provider, { masterKey, now: () => clock, intervalMs: 100000 });
  t.after(async () => { await runner.close(); await store.close(); });
  return { store, runner, provider, advance: () => { clock += 61000; }, workspace: async () => (await store.read(id)).workspace };
}
test('grant can resume unattended work after process restart without receiving access token again', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'hubloan-grant-')); t.after(() => rm(directory, { recursive: true }));
  const file = join(directory, 'store.sqlite'); let store = await createStore({ file });
  await store.mutate(id, workspace => { workspace.secret = encryptKey(key, token);configureCosts(workspace, {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}});  createProject(workspace, { ...input, maxDeliveries: 1 }, token, masterKey); });
  const grant = (await store.read(id)).workspace.autonomy.grant;
  assert.equal(unlockGrant(id, grant, masterKey), token); assert.throws(() => unlockGrant(workspaceId('e'.repeat(64)), grant, masterKey));
  await store.close(); store = await createStore({ file });
  const provider = fakeProvider(); const runner = createRunner(store, provider, { masterKey, intervalMs: 100000 });
  await runner.tick(); assert.equal((await store.read(id)).workspace.missions[0].status, 'queued');
  await runner.tick(); const workspace = (await store.read(id)).workspace;
  assert.equal(workspace.missions[0].status, 'review'); assert.equal(workspace.autonomy.projects[0].status, 'completed'); assert.equal(workspace.autonomy.grant, undefined);
  const snapshot = JSON.stringify(publicWorkspace(workspace, 'sqlite', true)); assert.ok(!snapshot.includes(token)); assert.ok(!snapshot.includes(key));
  await runner.close(); await store.close();
});
test('coordinator produces different tasks, honors interval and stops at delivery cap', async t => {
  const f = await setup(t);
  await f.runner.tick(); await f.runner.tick(); assert.equal(f.provider.calls, 4);
  await f.runner.tick(); assert.equal(f.provider.calls, 4);
  f.advance(); await f.runner.tick(); await f.runner.tick();
  const workspace = await f.workspace(); assert.equal(workspace.missions.length, 2); assert.notEqual(workspace.missions[0].title, workspace.missions[1].title);
  assert.equal(workspace.autonomy.projects[0].status, 'completed'); assert.equal(workspace.autonomy.enabled, false);
  f.advance(); await f.runner.tick(); assert.equal(f.provider.calls, 8);
});
test('pausing stops new coordination; cancellation stops project and requires explicit recovery', async t => {
  const f = await setup(t);
  await f.store.mutate(id, w => projectAction(w, w.autonomy.projects[0].id, 'pause', token, masterKey));
  await f.runner.tick(); assert.equal(f.provider.calls, 0);
  await f.store.mutate(id, w => projectAction(w, w.autonomy.projects[0].id, 'resume', token, masterKey));
  f.advance(); await f.runner.tick();
  await f.store.mutate(id, w => cancelMission(w, w.missions[0].id));
  await f.runner.tick(); assert.equal((await f.workspace()).autonomy.projects[0].status, 'paused');
  await assert.rejects(() => f.store.mutate(id, w => projectAction(w, w.autonomy.projects[0].id, 'resume', token, masterKey)), /interrompida/);
});
test('invalid planner output pauses instead of retrying and records completed call usage', async t => {
  const f = await setup(t, { provider: { text: async () => ({ output: 'invalid json', tokens: 22 }) } });
  await f.runner.tick(); const w = await f.workspace();
  assert.equal(w.autonomy.projects[0].status, 'paused'); assert.equal(w.autonomy.projects[0].tokens, 22); assert.equal(w.missions.length, 0);
  await f.runner.tick(); assert.equal((await f.workspace()).autonomy.enabled, false);
});
test('web research happens once and keeps actual tool sources separate from generated task', async t => {
  let searches = 0; const provider = fakeProvider(); const originalResearch = provider.research;
  provider.research = async (...args) => { searches++; return originalResearch(...args); };
  const f = await setup(t, { research: true, provider }); await f.runner.tick(); await f.runner.tick(); f.advance(); await f.runner.tick(); await f.runner.tick();
  const project = (await f.workspace()).autonomy.projects[0]; assert.equal(searches, 1); assert.equal(project.searches, 1); assert.equal(project.researchReport.sources[0].url, 'https://example.com');
});
test('expiry pauses future work and creation validates execution volume and durable grant support', async t => {
  const w = normalizeWorkspace(initialWorkspace()); w.secret = encryptKey(key, token);configureCosts(w, {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}});
  assert.throws(() => createProject(w, { ...input, maxDeliveries: 21 }, token, masterKey), /vinte/);
  assert.throws(() => createProject(w, input, token, null), /estável/);
  const f = await setup(t); await f.store.mutate(id, w => { w.autonomy.projects[0].expiresAt = 0; });
  await f.runner.tick(); assert.equal((await f.workspace()).autonomy.projects[0].status, 'paused'); assert.equal(f.provider.calls, 0);
});
test('local key persists and server derivation requires secret credentials', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'hubloan-key-')); t.after(() => rm(directory, { recursive: true }));
  const file = join(directory, 'autonomy.key'); assert.equal(await localEncryptionKey(file), await localEncryptionKey(file)); assert.equal((await readFile(file, 'utf8')).length, 64);
  assert.equal(autonomyMasterKey({ connectionString: 'postgres://user@host/db' }), null);
  assert.equal(autonomyMasterKey({ connectionString: 'Host=h;Password=short' }), null);
  assert.equal(autonomyMasterKey({ encryptionKey: masterKey }), autonomyMasterKey({ encryptionKey: masterKey }));
});
test('project API protects grants, validates authorization and isolates different workspaces', async t => {
  const store = await createStore({ file: ':memory:' }); const app = createApp({ store, provider: fakeProvider(), masterKey });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); t.after(async () => { await app.close(); await store.close(); });
  async function post(path, payload, access = token) { const response = await fetch(`http://127.0.0.1:${app.server.address().port}/api/agents${path}`, { method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); return { status: response.status, data: await response.json() }; }
  assert.equal((await post('/projects', input)).status, 400);
  await post('/settings', { apiKey: key, model: 'gpt-4.1-mini', imageModel: 'gpt-image-1-mini' });
  const created = await post('/projects', input); assert.equal(created.status, 201); assert.equal(created.data.autonomy.durable, true); assert.equal(created.data.autonomy.grant, undefined);
  const projectId = created.data.autonomy.projects[0].id;
  assert.equal((await post(`/projects/${projectId}/pause`, {}, 'e'.repeat(64))).status, 404);
  assert.equal((await post(`/projects/${projectId}/pause`, {})).data.autonomy.enabled, false);
});
test('hosted web search requests a tool and only exposes actual HTTP citation annotations', async () => {
  let payload;
  const provider = createProvider(async (_url, options) => { payload = JSON.parse(options.body); return new Response(JSON.stringify({ output: [{ type: 'web_search_call' }, { type: 'message', content: [{ type: 'output_text', text: 'Pesquisa', annotations: [{ type: 'url_citation', url: 'https://example.com', title: 'Fonte' }, { type: 'url_citation', url: 'javascript:bad()' }] }] }], usage: { total_tokens: 25 } })); });
  const result = await provider.research(key, 'gpt-4.1-mini', 'Objetivo');
  assert.equal(payload.tool_choice, 'required'); assert.equal(payload.max_tool_calls, 1); assert.equal(result.sources.length, 1); assert.equal(result.searches, 1);
});
