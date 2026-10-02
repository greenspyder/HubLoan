import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createExperiment, experimentAction, publicExperiments } from '../experiments.mjs';
import { initialWorkspace, addMission, workspaceId, publicWorkspace } from '../domain.mjs';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
const now = Date.parse('2026-10-03T00:00:00Z');
const input = { name: 'Teste mensurável', hypothesis: 'Validar utilidade com compradores', audience: 'Freelancers', channel: 'Canal próprio', budgetMinor: 6000, days: 7, minSales: 1, minNetMinor: 1000, missionIds: [] };
function setup() { const w = initialWorkspace(); const m = addMission(w, { title: 'Produto', brief: 'Original', kind: 'text', agentId: 'creator' }); m.status = 'review'; const e = createExperiment(w, { ...input, missionIds: [m.id] }, now); w.shop = { products: [{ id: 'p', missionId: m.id }], orders: [] }; return { w, m, e }; }
function order(overrides = {}) { return { id: 'o', productId: 'p', priceMinor: 5000, refundedMinor: 0, livemode: true, currency: 'brl', status: 'paid', paidAt: new Date(now + 1000).toISOString(), receiptHash: 'privateBuyerSecret', ...overrides }; }
test('money is calculated in cents from real in-window payments, with refunds and disputes; test and unrelated sales are excluded', () => {
  const { w, e } = setup(); w.shop.orders = [order(), order({ id: 'test', livemode: false }), order({ id: 'foreign', currency: 'usd' }), order({ id: 'old', paidAt: new Date(now - 1).toISOString() }), order({ id: 'other', productId: 'other' }), order({ id: 'unpaid', paidAt: null })];
  experimentAction(w, e.id, 'cost', { amountMinor: 350, category: 'api', note: 'Consumo' }, now + 1000);
  let m = publicExperiments(w, now + 2000)[0].metrics; assert.equal(m.grossMinor, 5000); assert.equal(m.balanceMinor, 4650); assert.equal(m.resultMinor, null); assert.equal(m.sales, 1);
  experimentAction(w, e.id, 'review', { complete: true }, now + 2000); m = publicExperiments(w, now + 2000)[0].metrics; assert.equal(m.resultMinor, 4650); assert.equal(m.recommendation, 'validated');
  w.shop.orders[0].refundedMinor = 5000; w.shop.orders[0].status = 'revoked'; m = publicExperiments(w, now + 3000)[0].metrics; assert.equal(m.refundedMinor, 5000); assert.equal(m.sales, 0); assert.equal(m.balanceMinor, -350); assert.equal(m.costComplete, false);
  w.shop.orders[0].refundedMinor = 0; m = publicExperiments(w, now + 3000)[0].metrics; assert.equal(m.heldMinor, 5000); assert.equal(m.balanceMinor, -350);
  assert.ok(!JSON.stringify(publicWorkspace(w, 'sqlite')).includes('privateBuyerSecret'));
});
test('zero-cost review is explicit; fresh production, costs and payments invalidate it, and budget/expiry recommend stopping without claiming enforced spend caps', () => {
  const { w, m, e } = setup(); experimentAction(w, e.id, 'review', { complete: true }, now); assert.equal(publicExperiments(w, now)[0].metrics.costComplete, true);
  m.tokens += 1; assert.equal(publicExperiments(w, now)[0].metrics.resultMinor, null); m.status = 'running'; assert.throws(() => experimentAction(w, e.id, 'review', { complete: true }, now), /produção/); m.status = 'review';
  experimentAction(w, e.id, 'cost', { amountMinor: 6000, category: 'labor', note: 'Trabalho' }, now); assert.equal(publicExperiments(w, now)[0].metrics.recommendation, 'budget');
  experimentAction(w, e.id, 'void', { costId: e.costs[0].id }, now + 1); assert.equal(e.costs.length, 1); assert.ok(e.costs[0].voidedAt); assert.throws(() => experimentAction(w, e.id, 'void', { costId: e.costs[0].id }), /estornado/);
  experimentAction(w, e.id, 'review', { complete: true }, now + 1); assert.equal(publicExperiments(w, now + 8 * 86400000)[0].metrics.recommendation, 'stop'); assert.equal(w.autonomy, undefined);
});
test('validation prevents foreign missions, duplicate attribution, private kits, fractional money and invalid costs; linking and closure are explicit', () => {
  const { w, e } = setup(); assert.throws(() => createExperiment(w, { ...input, missionIds: e.missionIds }, now), /único|pertencer/);
  assert.throws(() => createExperiment(w, { ...input, missionIds: ['foreign'] }, now), /espaço/); assert.throws(() => createExperiment(w, { ...input, budgetMinor: 1.1 }, now), /inteiro/);
  assert.throws(() => experimentAction(w, e.id, 'cost', { amountMinor: -100, category: 'api', note: 'X' }), /inteiro/); assert.throws(() => experimentAction(w, e.id, 'cost', { amountMinor: 100, category: 'revenue', note: 'X' }), /Categoria/);
  const extra = addMission(w, { title: 'Extra', brief: 'Original', kind: 'text', agentId: 'creator' }); extra.purpose = 'experiment-preparation'; assert.throws(() => experimentAction(w, e.id, 'link', { missionId: extra.id }, now), /encontrada/); delete extra.purpose;
  experimentAction(w, e.id, 'link', { missionId: extra.id }, now); assert.equal(e.missionIds.length, 2);
  experimentAction(w, e.id, 'close', {}, now + 2000); assert.equal(publicExperiments(w, now + 3000)[0].ended, true); assert.throws(() => experimentAction(w, e.id, 'link', { missionId: extra.id }, now + 3000), /encerrar/);
  w.shop.orders.push(order({ paidAt: new Date(now + 3000).toISOString() })); assert.equal(publicExperiments(w, now + 4000)[0].metrics.grossMinor, 0);
});
test('API isolates experiment ledgers, requires owner auth and persists them across store restart', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'hubloan-experiment-')), file = join(dir, 'db.sqlite'); const token = 'a'.repeat(64), other = 'b'.repeat(64); let store = await createStore({ file }); const app = createApp({ store, provider: {} }); await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${app.server.address().port}/api/agents`;
  async function call(path, method = 'GET', body, access = token) { const response = await fetch(url + path, { method, headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: response.status, data: await response.json() }; }
  t.after(async () => { await app.close(); await store.close(); await rm(dir, { recursive: true, force: true }); });
  const saved = await call('/experiments', 'POST', input); assert.equal(saved.status, 201); const id = saved.data.experiments[0].id;
  assert.equal((await call(`/experiments/${id}/cost`, 'POST', { category: 'api', amountMinor: 100, note: 'Consumo' }, other)).status, 404);
  assert.equal((await call(`/experiments/${id}/review`, 'POST', { complete: false })).status, 400);
  assert.equal((await call('/experiments', 'POST', input, '')).status, 401);
  assert.equal((await call(`/experiments/${id}/cost`, 'POST', { category: 'api', amountMinor: 100, note: 'Consumo' })).status, 200);
  assert.equal((await call(`/experiments/${id}/review`, 'POST', { complete: true })).data.experiments[0].metrics.resultMinor, -100);
  await store.close(); store = await createStore({ file }); const persisted = (await store.read(workspaceId(token))).workspace; assert.equal(publicExperiments(persisted)[0].metrics.resultMinor, -100);
});
