import { configureCosts } from '../ai-costs.mjs';
import { createExperiment, experimentAction } from '../experiments.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../store.mjs';
import { createRunner } from '../runner.mjs';
import { createApp } from '../app.mjs';
import { createProject } from '../autonomy.mjs';
import { parseMarketDecision, recordExperiment } from '../market.mjs';
import { initialWorkspace, encryptKey, workspaceId } from '../domain.mjs';
const token = 'a'.repeat(64), other = 'b'.repeat(64), masterKey = 'f'.repeat(64), id = workspaceId(token);
const sources = [{ url: 'https://example.com/demand', title: 'Sinal de demanda de teste' }, { url: 'https://example.org/prices', title: 'Preço anunciado de teste' }];
sources.push({url:'https://example.net/product',title:'Terceira oferta simulada'});
const refs=sources.map((s,i)=>({marketplace:'Test',seller:`Seller ${i}`,category:'Templates',product:`Product ${i}`,url:s.url,observedAt:new Date().toISOString(),observedPrice:'BRL 10',signals:[{kind:'review',value:'One product review (fixture)',scope:'product',sourceUrl:s.url}],features:['Editable template'],inference:'May solve a recurring need',hypothesis:'Test original template',ipRisk:'unknown',opportunity:'Original template with distinct composition'}));
const candidates = [0, 1, 2].map(i => ({ title: `Oportunidade de teste ${i}`, audience: 'Público de teste', rationale: 'Justificativa do provedor simulado, sem vendas comprovadas.', uncertainty: 'Demanda é hipótese de teste.', test: 'Publicar oferta manualmente e medir visitas e vendas por sete dias.', kind: 'text', scores: { demand: 4 - i, competition: 3, feasibility: 4, distribution: 3, evidence: 3 }, referenceUrls:sources.map(s=>s.url),sourceUrls: [sources[i % 2].url] }));
const input = { mode: 'discover', kind: 'text', research: true, maxDeliveries: 2, maxCalls: 12, intervalMinutes: 1, start: true };
function providerFixture({ weak = false, unknown = false, noSearch = false, image = false } = {}) {
  const fixture = { calls: 0, histories: [], learningInputs: [], memoryInputs: [], validate: async () => {}, research: async () => { fixture.calls++; return { output: 'Pesquisa pública SIMULADA com duas fontes.', sources, searches: noSearch ? 0 : 2, tokens: 50 }; }, text: async (_key, _model, instructions, payload) => {
    fixture.calls++;
    if (instructions.includes('candidates:')) {
      fixture.histories.push(JSON.parse(payload).history); fixture.learningInputs.push(JSON.parse(payload).commercialLearning); fixture.memoryInputs.push(JSON.parse(payload).memory);
      const output = structuredClone(candidates);
      if (weak) output.forEach(candidate => { candidate.scores.evidence = 0; });
      if (unknown) output[0].sourceUrls = ['https://invented.test'];
      if (image) output[0].kind = 'image';
      return { output: JSON.stringify({ references:refs,candidates: output }), tokens: 60 };
    }
    return { output: instructions.includes('somente JSON') ? JSON.stringify({ title: 'Produto original escolhido', brief: 'Entregue o produto completo e a oferta para o teste definido, sem afirmar publicação.' }) : 'Conteúdo SIMULADO para teste automatizado.', tokens: 20 };
  } };
  return fixture;
}
async function setup(t, options = {}) {
  const store = await createStore({ file: ':memory:' }); const provider = providerFixture(options); let clock = Date.now();
  await store.mutate(id, workspace => { workspace.secret = encryptKey('sk-test-key-not-real-market', token);configureCosts(workspace, {enabled:true,dailyMinor:1000000,monthlyMinor:1000000,callMinor:10000,ceilings:{text:100,research:200,vision:200,image:500}});  createProject(workspace, { ...input, ...options.input }, token, masterKey, clock); });
  const runner = createRunner(store, provider, { masterKey, now: () => clock, intervalMs: 100000 });
  t.after(async () => { await runner.close(); await store.close(); });
  return { store, runner, provider, read: async () => (await store.read(id)).workspace, advance: () => { clock += 61000; } };
}
test('discovery chooses and produces without a user-supplied product; pending undistributed inventory blocks another paid cycle', async t => {
  const f = await setup(t);
  await f.runner.tick(); let w = await f.read(); let p = w.autonomy.projects[0];
  assert.equal(p.mode, 'discover'); assert.equal(p.name, 'Descoberta de oportunidades'); assert.equal(p.decisions[0].selected.title, candidates[0].title);
  assert.equal(f.provider.memoryInputs[0].notes.length,3); assert.equal(w.knowledge.notes.length,1); assert.equal(p.decisions[0].memoryUsed.length,3); assert.equal(p.calls, 3); assert.equal(w.missions[0].decisionId, p.decisions[0].id); assert.ok(w.missions[0].brief.includes('Publicar oferta manualmente'));
  await f.runner.tick(); w = await f.read(); p = w.autonomy.projects[0]; assert.equal(p.calls, 6); assert.equal(w.missions[0].status, 'review');
  await f.store.mutate(id, workspace => recordExperiment(workspace, p.id, p.decisions[0].id, { visits: 100, sales: 2, revenue: 60, cost: 20, evidence: 'Painel de teste, período informado pelo usuário.' }));
  f.advance(); await f.runner.tick(); await f.runner.tick(); w = await f.read(); p = w.autonomy.projects[0];
  assert.equal(p.decisions.length,1);assert.equal(p.status,'paused');assert.match(p.error,/estoque produzido sem distribuição/);assert.equal(f.provider.calls,6);
  f.advance();await f.runner.tick();assert.equal(f.provider.calls,6);
});
test('discovery fails closed on fabricated citations, weak evidence, missing search or unauthorized image', async t => {
  for (const flags of [{ weak: true }, { unknown: true }, { noSearch: true }, { image: true }]) {
    const f = await setup(t, flags); await f.runner.tick(); const w = await f.read();
    assert.equal(w.autonomy.projects[0].status, 'paused'); assert.equal(w.missions.length, 0); assert.ok(f.provider.calls <= 2);
    await f.runner.tick(); assert.ok(f.provider.calls <= 2);
  }
});
test('hard API call allowance blocks incomplete cycles and prevents automatic retries after a charged failure', async t => {
  const f = await setup(t, { input: { maxCalls: 5 } }); await f.runner.tick(); assert.equal(f.provider.calls, 0); assert.equal((await f.read()).autonomy.projects[0].status, 'paused');
  const failure = await setup(t); failure.provider.research = async () => { failure.provider.calls++; throw new Error('Connection failed after sending request'); };
  await failure.runner.tick(); await failure.runner.tick(); assert.equal((await failure.read()).autonomy.projects[0].calls, 1); assert.equal(failure.provider.calls, 1);
});
test('ranking is deterministic and bounds model scores instead of accepting claimed best-return choice', () => {
  const result = parseMarketDecision(JSON.stringify({ references:refs,candidates, selected: 'option-3', profit: 999999 }), sources);
  assert.equal(result.selected.id, 'option-1'); assert.equal(result.selected.score, 70); assert.equal(result.profit, undefined);
  const invalid = structuredClone(candidates); invalid[0].scores.evidence = 100;
  assert.throws(() => parseMarketDecision(JSON.stringify({ references:refs,candidates: invalid }), sources), /Pontuação/);
});
test('reported commercial results reject inconsistent numbers and preserve explicit provenance', () => {
  const w = initialWorkspace(); w.autonomy = { enabled: false, projects: [{ id: 'test', status: 'paused', events: [], decisions: [{ id: 'decision', selected: candidates[0] }] }] };
  assert.throws(() => recordExperiment(w, 'test', 'decision', { visits: 0, sales: 1, revenue: 50, cost: 5, evidence: 'Reference' }), /inconsistentes/);
  assert.throws(() => recordExperiment(w, 'test', 'decision', { visits: 10, sales: 1, revenue: -50, cost: 5, evidence: 'Reference' }), /não negativos/);
  recordExperiment(w, 'test', 'decision', { visits: 10, sales: 0, revenue: 0, cost: 5, evidence: 'Teste de loja sem vendas.' });
  assert.equal(w.autonomy.projects[0].decisions[0].feedback.net, -5); assert.equal(w.autonomy.projects[0].decisions[0].feedback.origin, 'user_report');
});
test('experiment API enforces workspace isolation and cannot invent marketplace transactions', async t => {
  const f = await setup(t); await f.runner.tick(); await f.runner.tick(); const p = (await f.read()).autonomy.projects[0];
  const app = createApp({ store: f.store, provider: f.provider, masterKey }); await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); t.after(() => app.close());
  const url = `http://127.0.0.1:${app.server.address().port}/api/agents/projects/${p.id}/decisions/${p.decisions[0].id}/feedback`;
  const send = access => fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ visits: 20, sales: 1, revenue: 25, cost: 5, evidence: 'Resultado declarado para teste.' }) });
  assert.equal((await send(other)).status, 404); const response = await send(token); assert.equal(response.status, 200); const w = await response.json(); assert.equal(w.autonomy.projects[0].decisions[0].feedback.origin, 'user_report');
});

test('next market analysis receives actual experiment evidence with explicit provenance, without extra model calls', async t => {
  const f = await setup(t);
  await f.store.mutate(id, w => { const e = createExperiment(w, { name: 'Teste anterior', hypothesis: 'Hipótese limitada', audience: 'Freelancers', channel: 'Canal próprio', days: 7, budgetMinor: 1000, minSales: 1, minNetMinor: 100, missionIds: [] }); experimentAction(w, e.id, 'cost', { category: 'api', amountMinor: 200, note: 'PRIVATE COST REFERENCE' }); experimentAction(w, e.id, 'review', { complete: true }); });
  await f.runner.tick(); const learning = f.provider.learningInputs[0];
  assert.equal(learning.experiments[0].metrics.costMinor, 200); assert.equal(learning.experiments[0].costOrigin, 'owner-declared'); assert.equal(learning.experiments[0].paymentOrigin, 'confirmed-stripe'); assert.equal(learning.experiments[0].evidenceState, 'observing'); assert.ok(!JSON.stringify(learning).includes('PRIVATE COST REFERENCE'));
  const w = await f.read(); assert.deepEqual(w.autonomy.projects[0].decisions[0].learning, learning); assert.equal(w.autonomy.projects[0].decisions[0].model, 'gpt-4.1-mini'); assert.equal(f.provider.calls, 3);
});

test('first-sale discovery persists one decision, pauses before production and does not research again', async t => {
 const f=await setup(t,{input:{firstSale:true,name:'Primeira Venda Autônoma',goal:'Primeira venda independente',budgetMinor:1000}});
 await f.runner.tick();let w=await f.read();const p=w.autonomy.projects[0];
 assert.equal(p.status,'paused');assert.equal(p.goal,'Primeira venda independente');assert.equal(p.decisions.length,1);assert.equal(w.missions.length,0);assert.equal(p.calls,2);
 f.advance();await f.runner.tick();assert.equal(f.provider.calls,2);assert.equal((await f.read()).autonomy.enabled,false);
});
