import test from 'node:test';
import assert from 'node:assert/strict';
import { executionCapabilities, assessOpportunity } from '../opportunities.mjs';
import { parseMarketDecision, marketSettings } from '../market.mjs';
import { createStore } from '../store.mjs';
import { createRunner } from '../runner.mjs';
import { createProject } from '../autonomy.mjs';
import { initialWorkspace, encryptKey, workspaceId } from '../domain.mjs';
import { createShop, salePackage } from '../shop.mjs';
const token = 'a'.repeat(64), id = workspaceId(token), masterKey = 'f'.repeat(64);
const sources = [{ title: 'Fixture signal', url: 'https://example.org/trend' }, { title: 'Fixture requirements', url: 'https://example.com/requirements' }];
const video = { title: 'Vídeos originais de um nicho', audience: 'Público do nicho', kind: 'text', rationale: 'Sinal de interesse da pesquisa simulada', uncertainty: 'Views não são lucro', test: 'Preparar três roteiros originais e validar oferta sem presumir vendas', sourceUrls: sources.map(s => s.url), scores: { demand: 5, competition: 5, feasibility: 5, distribution: 5, evidence: 4 }, businessModel: 'content_channel', platform: 'tiktok', monetization: 'Venda de um guia próprio; elegibilidade de programa de criadores desconhecida', costs: { production: 'Desconhecido', api: 'Uso de tokens; total desconhecido', distribution: 'Orgânico, alcance desconhecido', fees: 'Taxas e impostos desconhecidos' }, successCriterion: 'Continuar somente após validar compradores e margem após custos', experimentUnits: 3, requiredCapabilities: ['text', 'capcut_edit'] };
const options = [video, { ...video, title: 'Serviço de legendagem', businessModel: 'service', platform: 'other' }, { ...video, title: 'Guia do nicho', scores: { demand: 3, competition: 3, feasibility: 4, distribution: 3, evidence: 3 }, businessModel: 'digital_product', platform: 'storefront', requiredCapabilities: ['text', 'storefront_publish'] }];
function liveShop(w) { w.shop = { enabled: true, livemode: true, autoPublish: true, expiresAt: Date.now() + 3600000, secret: 'encrypted-fixture', webhookSecret: 'fixture', license: 'Commercial fixture', name: 'Fixture', contact: 'fixture@example.org', products: [], orders: [], prices: { text: 1500 }, maxProducts: 20 }; }
test('broad research options validate permissions and retain existing project defaults', () => {
 assert.equal(marketSettings({ scope: 'broad', allowPreparation: true }).scope, 'broad'); assert.equal(marketSettings().scope, 'products');
 assert.throws(() => marketSettings({ scope: 'whatever' }), /Escopo/); assert.throws(() => marketSettings({ allowPreparation: 'true' }), /Permissão/);
});
test('server computes missing video tools even if the model omits them or claims a text strategy is executable', () => {
 const w = initialWorkspace(), c = assessOpportunity({ ...video, requiredCapabilities: ['text'], execution: { status: 'executable' } }, executionCapabilities(w));
 assert.equal(c.execution.status, 'blocked');
 for (const cap of ['video_render', 'video_caption', 'tiktok_publish']) assert.ok(c.execution.missing.some(m => m.capability === cap));
 assert.equal(assessOpportunity(video, executionCapabilities(w), true).execution.status, 'preparation');
 assert.throws(() => assessOpportunity({ ...video, costs: {} }, executionCapabilities(w)), /Custos/);
 assert.throws(() => assessOpportunity({ ...video, experimentUnits: 100 }, executionCapabilities(w)), /três/);
 const unknown = assessOpportunity({ ...video, requiredCapabilities: ['imaginary_api'] }, executionCapabilities(w)); assert.ok(unknown.execution.missing.some(m => m.capability === 'imaginary_api'));
});
test('executable lower-score strategy outranks blocked or preparation strategies; views or claimed profit never bypass gates', () => {
 const w = initialWorkspace(); liveShop(w);
 const decision = parseMarketDecision(JSON.stringify({ candidates: options, profit: 999999 }), sources, [], ['text'], { capabilities: executionCapabilities(w), allowPreparation: true });
 assert.equal(decision.selected.title, 'Guia do nicho'); assert.equal(decision.candidates[0].execution.status, 'preparation'); assert.equal(decision.profit, undefined);
 w.shop.autoPublish = false;
 const blocked = parseMarketDecision(JSON.stringify({ candidates: options }), sources, [], ['text'], { capabilities: executionCapabilities(w), allowPreparation: false }); assert.equal(blocked.selected, null);
});
async function fixture(t, allowPreparation) {
 const store = await createStore({ file: ':memory:' }), payloads = [];
 const provider = { research: async (_key, _model, input) => { const q = JSON.parse(input); assert.ok(q.capabilities.includes('vídeos curtos')); return { output: 'SIMULATED market research', sources, searches: 2, tokens: 10 }; }, text: async (_key, _model, instructions, input) => { payloads.push(JSON.parse(input.startsWith('{') ? input : '{}')); return { output: instructions.includes('candidates:') ? JSON.stringify({ candidates: options }) : instructions.includes('somente JSON') ? JSON.stringify({ title: 'Roteiros de teste originais', brief: 'Preparar materiais' }) : 'MATERIAIS SIMULADOS. Sem edição ou publicação.', tokens: 10 }; } };
 await store.mutate(id, w => { w.secret = encryptKey('sk-fixture-not-real', token); createProject(w, { mode: 'discover', kind: 'text', market: { scope: 'broad', allowPreparation, specializations: ['text'] }, maxDeliveries: 1, maxCalls: 6, intervalMinutes: 1, start: true, research: true }, token, masterKey); });
 const runner = createRunner(store, provider, { masterKey, intervalMs: 100000 }); t.after(async () => { await runner.close(); await store.close(); }); return { store, runner, payloads };
}
test('broad cycle records blocked insights without producing, spending on unsupported tools or inventing publication', async t => {
 const f = await fixture(t, false); await f.runner.tick(); const w = (await f.store.read(id)).workspace;
 assert.equal(w.missions.length, 0); assert.equal(w.autonomy.projects[0].status, 'paused'); assert.equal(w.autonomy.projects[0].decisions[0].candidates.length, 3); assert.equal(w.autonomy.projects[0].calls, 2);
 assert.equal(f.payloads[0].executionCapabilities.tiktok_publish.available, false); assert.ok(!JSON.stringify(f.payloads).includes('sk-fixture'));
});
test('authorized preparation creates a private text kit, bounded by project calls, never a published video or shop product', async t => {
 const f = await fixture(t, true); await f.runner.tick(); await f.runner.tick(); const w = (await f.store.read(id)).workspace, m = w.missions[0];
 assert.equal(m.kind, 'text'); assert.equal(m.purpose, 'experiment-preparation'); assert.equal(m.status, 'review'); assert.equal(w.autonomy.projects[0].calls, 6); assert.equal(w.autonomy.projects[0].status, 'completed'); assert.ok(m.brief.includes('NÃO EXECUÇÃO')); assert.ok(m.brief.includes('tiktok_publish'));
 assert.throws(() => salePackage(m, 'Fixture license'), /Kit de experimento/);
 await f.store.mutate(id, current => liveShop(current)); const shop = createShop(f.store, { masterKey, provider: {}, intervalMs: 100000 }); t.after(() => shop.close()); await shop.tick(); const after = (await f.store.read(id)).workspace; assert.equal(after.shop.products.length, 0); assert.equal(after.shop.autoPublish, true);
});
test('expired, test-mode or text-only channel connections cannot claim an executable whole workflow', () => {
 const w = initialWorkspace(); liveShop(w); w.shop.livemode = false; assert.equal(executionCapabilities(w).storefront_publish.available, false);
 w.shop.livemode = true; w.shop.expiresAt = Date.now() - 1; assert.equal(executionCapabilities(w).storefront_publish.available, false);
 w.marketing = { enabled: true, expiresAt: Date.now() + 100000, channels: { mastodon: { secret: 'fixture' } } };
 const c = assessOpportunity({ ...video, platform: 'mastodon' }, executionCapabilities(w)); assert.equal(c.execution.status, 'blocked'); assert.ok(c.execution.missing.some(m => m.capability === 'unsupported_workflow'));
});
