import { approveShopRelease, releaseVersion } from '../shop-release.mjs';
import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { unzipSync, strFromU8 } from 'fflate';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { createShop, createStripeProvider } from '../shop.mjs';
import { workspaceId, addMission, publicWorkspace } from '../domain.mjs';
const token = 'a'.repeat(64), other = 'b'.repeat(64), master = 'e'.repeat(64), id = workspaceId(token);
const apiKey = 'sk_test_testOnlySecretKey123456789', webhookSecret = 'whsec_testOnly123456789';
const config = { name: 'Loja de teste', contact: 'support@example.test', license: 'Uso comercial permitido. Redistribuição proibida.', enabled: true, autoPublish: true, maxProducts: 20, prices: { text: 1500, image: 2000, thumbnail: 2500, sprites: 3000, model3d: 3500 } };
function fakeProvider() {
  const sessions = new Map(), orders = new Map(); let creates = 0;
  return { sessions, creates: () => creates,
    account: async () => ({ id: 'acct_fixture', charges_enabled: true }),
    webhook: async (_, url) => { assert.ok(url.startsWith('https://hubloan.onrender.com/api/agents/storefront/')); return { id: 'we_fixture', secret: webhookSecret }; },
    checkout: async (_, params, attempt) => {
      if (orders.has(attempt)) return orders.get(attempt);
      creates++;
      const session = { id: `cs_test_fixture${creates}`, url: `https://checkout.stripe.com/c/pay/cs_test_fixture${creates}`, client_reference_id: params.client_reference_id, metadata: params.metadata, amount_total: params.line_items[0].price_data.unit_amount, currency: 'brl', livemode: false, mode: 'payment', payment_status: 'unpaid', payment_intent: { id: `pi_fixture${creates}`, latest_charge: { refunded: false, amount_refunded: 0, disputed: false } } };
      sessions.set(session.id, session); orders.set(attempt, session); return session;
    },
    session: async (_, sessionId) => { const result = sessions.get(sessionId); if (!result) throw new Error('missing'); return result; },
    verify: (raw, signature, secret) => Stripe.webhooks.constructEvent(raw, signature, secret),
  };
}
async function fixture(t) {
  const store = await createStore({ file: ':memory:' }), provider = fakeProvider();
  const app = createApp({ store, provider: {}, shopProvider: provider, masterKey: master });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await app.close(); await store.close(); });
  const base = `http://127.0.0.1:${app.server.address().port}/api/agents`;
  async function call(route, method = 'GET', input, access = token, extra = {}) {
    const r = await fetch(base + route, { method, headers: { ...(access ? { Authorization: `Bearer ${access}` } : {}), 'Content-Type': 'application/json', ...extra }, body: input ? typeof input === 'string' ? input : JSON.stringify(input) : undefined });
    return { status: r.status, data: r.headers.get('content-type')?.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
  }
  async function configure() { assert.equal((await call('/shop/connect', 'POST', { apiKey, authorizeWebhook: true })).status, 200); const result = await call('/shop/configure', 'POST', config); assert.equal(result.status, 200); return result.data.shop.slug; }
  async function mission(kind = 'text') { return (await store.mutate(id, w => { const m = addMission(w, { kind, title: `Produto ${kind}`, brief: 'PRIVATE BRIEF MUST NOT LEAK', agentId: 'creator' }); m.status = 'approved'; m.output = 'CONTEÚDO PAGO DE TESTE'; if (kind !== 'text') m.artifact = { mime: kind === 'image' ? 'image/png' : 'application/zip', base64: Buffer.from('paid binary').toString('base64') }; approveShopRelease(w,m,{authorize:true,version:releaseVersion(m),priceMinor:config.prices[m.kind],rationale:'Preço de teste com provider simulado'}); return m.id; })).result; }
  async function event(slug, session, type = 'checkout.session.completed', changes = {}) { const raw = JSON.stringify({ id: 'evt_fixture', livemode: false, type, data: { object: { ...session, ...changes } } }); const signature = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret: webhookSecret }); return call(`/storefront/${slug}/webhook`, 'POST', raw, '', { 'stripe-signature': signature }); }
  return { store, provider, app, call, configure, mission, event };
}
test('all five formats publish automatically with protected files and immutable prices, without leaking briefs or credentials', async t => {
  const f = await fixture(t), slug = await f.configure();
  for (const kind of ['text', 'image', 'thumbnail', 'sprites', 'model3d']) await f.mission(kind);
  await Promise.all([f.app.shop.tick(), f.app.shop.tick()]);
  const workspace = (await f.call('/workspace')).data;
  assert.equal(workspace.shop.products.length, 5);
  const catalog = await f.call(`/storefront/${slug}`, 'GET', undefined, '');
  assert.equal(catalog.status, 200); assert.equal(catalog.data.products.length, 5);
  const serialized = JSON.stringify(catalog.data);
  for (const value of ['CONTEÚDO PAGO', 'PRIVATE BRIEF', apiKey, webhookSecret, 'base64', 'receiptHash', 'account', 'secret', 'orders']) assert.ok(!serialized.includes(value));
  const publicData = JSON.stringify(workspace); assert.ok(!publicData.includes(apiKey)); assert.ok(!publicData.includes(webhookSecret));
  assert.equal((await f.call(`/shop/missions/${workspace.shop.products[0].missionId}/publish`, 'POST', {}, other)).status, 404);
  assert.equal((await f.call(`/shop/missions/${workspace.shop.products[0].missionId}/publish`, 'POST', {})).status, 409);
  await f.call('/shop/configure', 'POST', { ...config, prices: { ...config.prices, text: 5000 } });
  assert.equal((await f.call('/workspace')).data.shop.products.find(p => p.kind === 'text').priceMinor, 1500);
});
test('paid delivery requires authoritative payment, webhook signatures, matching amounts, currency, mode and private buyer token', async t => {
  const f = await fixture(t), slug = await f.configure(), m = await f.mission(); await f.app.shop.publish(id, m);
  const p = (await f.call('/workspace')).data.shop.products[0], receipt = 'c'.repeat(64);
  const checkout = await f.call(`/storefront/${slug}/checkout`, 'POST', { productId: p.id, receiptToken: receipt }, '');
  assert.equal(checkout.status, 200); assert.ok(checkout.data.url.startsWith('https://checkout.stripe.com/'));
  assert.equal((await f.call(`/storefront/${slug}/download`, 'GET', undefined, receipt)).status, 403);
  assert.equal((await f.call(`/storefront/${slug}/download`, 'GET', undefined, token)).status, 404);
  assert.equal((await f.call(`/storefront/${slug}/download`, 'GET', undefined, '')).status, 404);
  assert.equal((await f.call(`/storefront/${slug}/webhook`, 'POST', '{}', '', { 'stripe-signature': 'invalid' })).status, 400);
  const session = [...f.provider.sessions.values()][0]; session.payment_status = 'paid';
  const actual = session.amount_total; session.amount_total = 1;
  assert.equal((await f.event(slug, session)).status, 409); session.amount_total = actual;
  const originalCurrency = session.currency; session.currency = 'usd'; assert.equal((await f.event(slug, session)).status, 409); session.currency = originalCurrency;
  assert.equal((await f.event(slug, session)).status, 200);
  assert.equal((await f.event(slug, session)).status, 200);
  const download = await f.call(`/storefront/${slug}/download`, 'GET', undefined, receipt); assert.equal(download.status, 200);
  const files = unzipSync(download.data); assert.equal(strFromU8(files['product.md']), 'CONTEÚDO PAGO DE TESTE'); assert.match(strFromU8(files['LICENSE.txt']), /Uso comercial/);
  const workspace = (await f.call('/workspace')).data;
  assert.equal(workspace.shop.metrics.testPurchases, 1); assert.equal(workspace.shop.metrics.purchases, 0); assert.equal(workspace.shop.metrics.grossMinor, 0); assert.equal(workspace.shop.metrics.netProfit, null);
  assert.equal((await f.call(`/storefront/${'d'.repeat(32)}/download`, 'GET', undefined, receipt)).status, 404);
});
test('refunds revoke access, hidden/paused listings prevent new sales and old buyers retain their purchased version', async t => {
  const f = await fixture(t), slug = await f.configure(), m = await f.mission(); await f.app.shop.publish(id, m);
  const p = (await f.call('/workspace')).data.shop.products[0], receipt = 'c'.repeat(64);
  await f.call(`/storefront/${slug}/checkout`, 'POST', { productId: p.id, receiptToken: receipt }, '');
  const session = [...f.provider.sessions.values()][0]; session.payment_status = 'paid'; await f.event(slug, session);
  await f.store.mutate(id, w => { w.missions[0].output = 'CHANGED CONTENT'; });
  await f.call(`/shop/products/${p.id}`, 'PATCH', { listed: false });
  assert.equal((await f.call(`/storefront/${slug}`, 'GET', undefined, '')).data.products.length, 0);
  assert.equal((await f.call(`/storefront/${slug}/checkout`, 'POST', { productId: p.id, receiptToken: 'd'.repeat(64) }, '')).status, 404);
  await f.call('/shop/configure', 'POST', { ...config, enabled: false });
  const download = await f.call(`/storefront/${slug}/download`, 'GET', undefined, receipt); assert.equal(download.status, 200); assert.equal(strFromU8(unzipSync(download.data)['product.md']), 'CONTEÚDO PAGO DE TESTE');
  session.payment_intent.latest_charge.refunded = true; session.payment_intent.latest_charge.amount_refunded = 1500;
  assert.equal((await f.call(`/storefront/${slug}/download`, 'GET', undefined, receipt)).status, 403);
  const order = (await f.store.read(id)).workspace.shop.orders[0]; assert.equal(order.status, 'revoked');
  session.payment_intent.latest_charge.refunded = false; session.payment_intent.latest_charge.amount_refunded = 0;
  await f.event(slug, session); assert.equal((await f.call(`/storefront/${slug}/download`, 'GET', undefined, receipt)).status, 403);
});
test('concurrent publication and checkout use one product/order; grants and purchased bytes survive restart and expiration', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'hubloan-shop-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'shop.sqlite'), provider = fakeProvider(); let store = await createStore({ file }); let shop = createShop(store, { masterKey: master, provider, intervalMs: 100000 });
  await shop.connect(id, { apiKey, authorizeWebhook: true }); await shop.configure(id, config);
  const m = (await store.mutate(id, w => { const m = addMission(w, { title: 'Original', brief: 'Teste', agentId: 'creator', kind: 'text' }); m.output = 'Original file'; m.status = 'approved'; approveShopRelease(w,m,{authorize:true,version:releaseVersion(m),priceMinor:config.prices[m.kind],rationale:'Preço de teste com provider simulado'}); return m.id; })).result;
  const published = await Promise.allSettled([shop.publish(id, m), shop.publish(id, m)]); assert.equal(published.filter(r => r.status === 'fulfilled').length, 1);
  const s = (await store.read(id)).workspace.shop, p = s.products[0], receipt = 'c'.repeat(64);
  await Promise.all([shop.checkout(s.slug, p.id, receipt), shop.checkout(s.slug, p.id, receipt)]); assert.equal(provider.creates(), 1); assert.equal((await store.read(id)).workspace.shop.orders.length, 1);
  const session = [...provider.sessions.values()][0]; session.payment_status = 'paid'; await shop.receipt(s.slug, receipt);
  await shop.close(); await store.close(); store = await createStore({ file }); shop = createShop(store, { masterKey: master, provider, intervalMs: 100000 });
  await store.mutate(id, w => { w.shop.expiresAt = Date.now() - 1000; }); await shop.tick();
  assert.equal((await store.read(id)).workspace.shop.autoPublish, false);
  assert.equal(strFromU8(unzipSync((await shop.receipt(s.slug, receipt, true)).bytes)['product.md']), 'Original file');
  assert.equal(publicWorkspace((await store.read(id)).workspace, 'sqlite').shop.configured, true);
  await shop.close(); await store.close();
});
test('configuration validates webhook consent, prices, persistent encryption and paused drafts are never published', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('/shop/connect', 'POST', { apiKey, authorizeWebhook: false })).status, 400);
  await f.configure(); assert.equal((await f.call('/shop/configure', 'POST', { ...config, prices: { ...config.prices, text: 0 } })).status, 400);
  const m = await f.mission(); await f.store.mutate(id, w => { w.missions.find(item => item.id === m).status = 'draft'; }); await f.app.shop.tick();
  assert.equal((await f.call('/workspace')).data.shop.products.length, 0);
  const shop = createShop(f.store, { provider: fakeProvider(), intervalMs: 100000 }); await assert.rejects(shop.connect(id, { apiKey, authorizeWebhook: true }), /criptografado/); await shop.close();
  const real = createStripeProvider(), raw = '{"type":"checkout.session.completed"}';
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: raw, secret: webhookSecret, timestamp: Math.floor(Date.now() / 1000) - 1000 });
  assert.throws(() => real.verify(Buffer.from(raw), signature, webhookSecret));
});

test('public preview is a reduced JPEG; original bytes stay behind payment and withdrawing hides previews', async t => {
  const f = await fixture(t), slug = await f.configure(), m = await f.mission('image');
  const original = await sharp({ create: { width: 1000, height: 800, channels: 4, background: '#ef5588' } }).png().toBuffer();
  await f.store.mutate(id, w => { w.missions[0].artifact.base64 = original.toString('base64'); });
  await f.store.mutate(id,w=>approveShopRelease(w,w.missions[0],{authorize:true,version:releaseVersion(w.missions[0]),priceMinor:2000,rationale:'Versão com preview revisada'}));
  await f.app.shop.publish(id, m);
  const p = (await f.call('/workspace')).data.shop.products[0]; assert.equal(p.hasPreview, true);
  const r = await f.call(`/storefront/${slug}/preview?product=${p.id}`, 'GET', undefined, '');
  assert.equal(r.status, 200); const info = await sharp(r.data).metadata(); assert.equal(info.width, 480); assert.equal(info.height, 300); assert.equal(info.format, 'jpeg'); assert.ok(!r.data.equals(original));
  await f.call(`/shop/products/${p.id}`, 'PATCH', { listed: false });
  assert.equal((await f.call(`/storefront/${slug}/preview?product=${p.id}`, 'GET', undefined, '')).status, 404);
});

test('first-sale samples cannot bypass review through manual or automatic publishing, without blocking unrelated products', async t => {
  const {createExperiment,experimentAction}=await import('../experiments.mjs');
  const f=await fixture(t);await f.configure();
  let experimentId,sampleId;
  await f.store.mutate(id,w=>{const e=createExperiment(w,{name:'Amostra',hypothesis:'Validar',audience:'Freelancers',channel:'Canal próprio',days:7,budgetMinor:6000,minSales:1,minNetMinor:1000,missionIds:[]});experimentId=e.id;const a=(action,input={})=>experimentAction(w,e.id,`validation-${action}`,input);a('enable');a('evidence',{url:'https://example.org/request',summary:'Pedido observado',observedAt:new Date().toISOString()});a('offer',{scope:'Template',criteria:'Legível',priceMinor:1500,deliveryDays:3});a('sample',{kind:'text',agentId:'creator'});const m=w.missions[0];sampleId=m.id;m.status='review';m.output='Amostra original';});
  assert.equal((await f.call(`/shop/missions/${sampleId}/publish`,'POST',{})).status,409);
  await f.mission('text');await f.app.shop.tick();let w=(await f.call('/workspace')).data;assert.equal(w.shop.products.length,1);assert.equal(w.shop.autoPublish,true);
  assert.equal((await f.call(`/experiments/${experimentId}/validation-quality`,'POST',{approved:true,reason:'Li a amostra'},other)).status,404);
  assert.equal((await f.call(`/experiments/${experimentId}/validation-quality`,'POST',{approved:true,reason:'Li a amostra'})).status,200);
  assert.equal((await f.call(`/shop/missions/${sampleId}/publish`,'POST',{})).status,409);
  assert.equal((await f.call(`/experiments/${experimentId}/validation-release`,'POST',{authorize:true})).status,200);
  await f.store.mutate(id,w=>{const m=w.missions.find(m=>m.id===sampleId);m.status='approved';approveShopRelease(w,m,{authorize:true,version:releaseVersion(m),priceMinor:1500,rationale:'Oferta do experimento revisada'});});
  await f.app.shop.tick();w=(await f.call('/workspace')).data;assert.equal(w.shop.products.filter(p=>p.missionId===sampleId).length,1);
});

test('review and generic automation never authorize release; price is individual and binds version and license', async t => {
  const f=await fixture(t);await f.configure();const mid=await f.mission();
  await f.store.mutate(id,w=>{const m=w.missions[0];delete m.shopRelease;m.status='review';});
  await f.app.shop.tick();assert.equal((await f.store.read(id)).workspace.shop.products.length,0);
  assert.equal((await f.call(`/shop/missions/${mid}/publish`,'POST',{})).status,409);
  const authorize=async(priceMinor=700,version)=>{const w=(await f.call('/workspace')).data;return f.call(`/shop/missions/${mid}/release`,'POST',{authorize:true,version:version||w.missions[0].releaseVersion,priceMinor,rationale:'Comparáveis e alternativa gratuita; hipótese de preço ainda não validada'});};
  assert.equal((await authorize()).status,409);
  await f.store.mutate(id,w=>{w.missions[0].status='approved';});
  assert.equal((await authorize(700,'stale')).status,409);
  assert.equal((await authorize(0)).status,400);
  assert.equal((await authorize()).status,200);
  await f.store.mutate(id,w=>{w.missions[0].output+=' nova versão';});
  assert.equal((await f.call(`/shop/missions/${mid}/publish`,'POST',{})).status,409);
  await authorize();await f.store.mutate(id,w=>{w.shop.license+=' Alterada';});
  assert.equal((await f.call(`/shop/missions/${mid}/publish`,'POST',{})).status,409);
  await authorize();await f.app.shop.tick();
  const w=(await f.store.read(id)).workspace;assert.equal(w.shop.products.length,1);assert.equal(w.shop.products[0].priceMinor,700);assert.equal(w.shop.prices.text,1500);
});
test('release endpoint isolates tenants and expired per-offer authorization blocks automation',async t=>{
  const f=await fixture(t);await f.configure();const mid=await f.mission();
  assert.equal((await f.call(`/shop/missions/${mid}/release`,'POST',{authorize:true},other)).status,404);
  await f.store.mutate(id,w=>{w.missions[0].shopRelease.expiresAt=Date.now()-1;});
  await f.app.shop.tick();assert.equal((await f.store.read(id)).workspace.shop.products.length,0);
  assert.equal((await f.call(`/shop/missions/${mid}/publish`,'POST',{})).status,409);
});
