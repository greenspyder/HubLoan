import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { createMarketing, createMarketingProvider } from '../marketing.mjs';
import { workspaceId, publicWorkspace, encryptKey } from '../domain.mjs';
const token = 'a'.repeat(64), id = workspaceId(token), masterKey = 'e'.repeat(64), secret = 'fixtureMarketingToken0123456789';
const config = { enabled: true, intervalMinutes: 120, maxPosts: 6 };
async function fixture(t) {
  const store = await createStore({ file: ':memory:' }), posts = [], sessions = new Map();
  const marketingProvider = { connect: async () => ({ target: '123', name: '@fixture@mastodon.social' }), publish: async (channel, key, connection, campaign) => { assert.equal(key, secret); assert.equal(connection.target, '123'); posts.push(campaign); return { remoteId: '456', url: 'https://mastodon.social/@fixture/456' }; } };
  const shopProvider = { checkout: async (_, input) => { const s = { id: 'cs_live_fixture1', url: 'https://checkout.stripe.com/c/pay/fixture', metadata: input.metadata, client_reference_id: input.client_reference_id, amount_total: input.line_items[0].price_data.unit_amount, currency: 'brl', livemode: true, mode: 'payment', payment_status: 'unpaid', payment_intent: 'pi_fixture' }; sessions.set(s.id, s); return s; }, session: async (_, sid) => sessions.get(sid) };
  const app = createApp({ store, provider: {}, masterKey, marketingProvider, shopProvider });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await app.close(); await store.close(); });
  const productId = randomUUID(), otherProduct = randomUUID(), slug = 'f'.repeat(32);
  await store.mutate(id, w => { w.shop = { slug, enabled: true, livemode: true, secret: encryptKey('stripe-fixture', masterKey), products: [{ id: productId, title: 'Mobília original', description: 'GLB / OBJ procedural.', kind: 'model3d', listed: true, priceMinor: 3500, currency: 'brl' }, { id: otherProduct, title: 'Guia original', description: 'Markdown.', kind: 'text', listed: true, priceMinor: 1500, currency: 'brl' }], orders: [] }; });
  const base = `http://127.0.0.1:${app.server.address().port}/api/agents`;
  async function call(path, input, access = token, method = input ? 'POST' : 'GET') { const r = await fetch(base + path, { method, headers: { ...(access ? { Authorization: `Bearer ${access}` } : {}), 'Content-Type': 'application/json' }, body: input ? JSON.stringify(input) : undefined }); return { status: r.status, data: await r.json() }; }
  async function start() { assert.equal((await call('/marketing/connect', { channel: 'mastodon', apiKey: secret, authorize: true })).status, 200); assert.equal((await call('/marketing/configure', config)).status, 200); }
  return { store, app, posts, marketingProvider, sessions, call, start, productId, otherProduct, slug };
}
test('automatic real-channel publication reserves once across workers and exposes only metadata', async t => {
  const f = await fixture(t); await f.start();
  const second = createMarketing(f.store, { masterKey, provider: f.marketingProvider }); t.after(() => second.close());
  await Promise.all([f.app.marketing.tick(), second.tick(), f.app.marketing.tick()]);
  assert.equal(f.posts.length, 1);
  const w = (await f.call('/workspace')).data, c = w.marketing.campaigns[0];
  assert.equal(c.status, 'posted'); assert.equal(c.productId, f.productId); assert.ok(c.text.includes('R$ 35,00')); assert.ok(c.text.includes('produzido com IA')); assert.ok(c.link.endsWith(`campanha=${c.id}`));
  const serialized = JSON.stringify(w); assert.ok(!serialized.includes(secret)); assert.ok(!serialized.includes('visitHashes')); assert.ok(!serialized.includes('stripe-fixture'));
  await f.app.marketing.tick(); assert.equal(f.posts.length, 1);
  await f.store.mutate(id, w => { w.marketing.campaigns[0].createdAt = new Date(Date.now() - 121 * 60000).toISOString(); });
  await f.app.marketing.tick(); assert.equal(f.posts.length, 2); assert.equal(f.posts[1].productId, f.otherProduct);
});
test('timeouts pause uncertain delivery permanently; owner must inspect before continuing with other products', async t => {
  const f = await fixture(t); await f.start(); f.marketingProvider.publish = async () => { throw new Error(`PRIVATE ${secret}`); };
  await f.app.marketing.tick();
  const w = (await f.call('/workspace')).data, c = w.marketing.campaigns[0];
  assert.equal(c.status, 'uncertain'); assert.equal(w.marketing.enabled, false); assert.ok(!JSON.stringify(w).includes(secret));
  assert.equal((await f.call('/marketing/configure', config)).status, 409);
  await f.app.marketing.tick(); assert.equal(w.marketing.campaigns.length, 1);
  assert.equal((await f.call(`/marketing/campaigns/${c.id}/skip`, {})).status, 200);
  await f.call('/marketing/configure', config);
  await f.store.mutate(id, w => { w.marketing.campaigns[0].createdAt = new Date(Date.now() - 121 * 60000).toISOString(); });
  f.marketingProvider.publish = async (_, __, ___, campaign) => { f.posts.push(campaign); return { remoteId: '999', url: 'https://mastodon.social/@fixture/999' }; };
  await f.app.marketing.tick(); assert.equal(f.posts.length, 1); assert.equal(f.posts[0].productId, f.otherProduct);
});
test('crashed pending jobs are recovered even after pausing, without re-sending', async t => {
  const f = await fixture(t); await f.start();
  await f.store.mutate(id, w => { w.marketing.enabled = false; w.marketing.campaigns.push({ id: randomUUID(), productId: f.productId, channel: 'mastodon', status: 'publishing', createdAt: new Date(Date.now() - 120000).toISOString() }); });
  await f.app.marketing.tick();
  const m = (await f.call('/workspace')).data.marketing; assert.equal(m.campaigns[0].status, 'uncertain'); assert.equal(m.enabled, false); assert.equal(f.posts.length, 0);
});
test('campaign visits deduplicate browser/day, bind product, isolate tenant and attribute confirmed purchases/refunds only', async t => {
  const f = await fixture(t); await f.start(); await f.app.marketing.tick();
  const campaign = (await f.call('/workspace')).data.marketing.campaigns[0];
  const input = { campaignId: campaign.id, productId: f.productId, visitToken: 'c'.repeat(64) };
  assert.equal((await f.call(`/storefront/${f.slug}/visit`, input, '')).data.recorded, true);
  assert.equal((await f.call(`/storefront/${f.slug}/visit`, input, '')).data.recorded, false);
  assert.equal((await f.call(`/storefront/${f.slug}/visit`, { ...input, productId: f.otherProduct, visitToken: 'd'.repeat(64) }, '')).data.recorded, false);
  assert.equal((await f.call(`/storefront/${'0'.repeat(32)}/visit`, input, '')).data.recorded, false);
  const receiptToken = 'd'.repeat(64);
  assert.equal((await f.call(`/storefront/${f.slug}/checkout`, { productId: f.productId, receiptToken, campaignId: campaign.id }, '')).status, 200);
  assert.equal((await f.call('/workspace')).data.marketing.campaigns[0].purchases, 0);
  f.sessions.get('cs_live_fixture1').payment_status = 'paid';
  assert.equal((await f.call(`/storefront/${f.slug}/receipt`, undefined, receiptToken)).data.status, 'paid');
  let c = (await f.call('/workspace')).data.marketing.campaigns[0]; assert.equal(c.visits, 1); assert.equal(c.purchases, 1); assert.equal(c.grossMinor, 3500);
  await f.store.mutate(id, w => { const o = w.shop.orders[0]; o.status = 'revoked'; o.refundedMinor = 3500; w.shop.orders.push({ ...o, id: randomUUID(), livemode: false }); });
  c = (await f.call('/workspace')).data.marketing.campaigns[0]; assert.equal(c.refundedMinor, 3500); assert.equal(c.grossMinor, 3500); assert.equal(c.purchases, 1); assert.equal(c.testPurchases, 1);
  assert.equal((await f.call(`/marketing/campaigns/${campaign.id}/skip`, {}, 'b'.repeat(64))).status, 409);
  assert.equal((await f.call('/marketing/configure', config, '')).status, 401);
});
test('authorization, real-shop gate, expiry and caps prevent unintended publication', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('/marketing/connect', { channel: 'mastodon', apiKey: secret, authorize: false })).status, 400);
  assert.equal((await f.call('/marketing/configure', config)).status, 400);
  await f.start();
  await f.store.mutate(id, w => { w.shop.livemode = false; });
  assert.equal((await f.call('/marketing/configure', config)).status, 400); await f.app.marketing.tick(); assert.equal(f.posts.length, 0);
  await f.store.mutate(id, w => { w.shop.livemode = true; w.marketing.expiresAt = Date.now() - 1; });
  await f.app.marketing.tick(); assert.equal((await f.call('/workspace')).data.marketing.enabled, false);
  await f.call('/marketing/configure', { ...config, maxPosts: 1 }); await f.app.marketing.tick(); await f.app.marketing.tick();
  assert.equal(f.posts.length, 1); assert.equal((await f.call('/workspace')).data.marketing.enabled, false);
  for (const bad of [{ ...config, intervalMinutes: 1 }, { ...config, maxPosts: 21 }]) assert.equal((await f.call('/marketing/configure', bad)).status, 400);
  await f.call('/marketing/channels/mastodon', undefined, token, 'DELETE'); assert.equal((await f.call('/workspace')).data.marketing.channels[0].configured, false);
});
test('daily channel caps apply across renewed permissions and hidden products never get advertised', async t => {
  const f = await fixture(t); await f.start();
  await f.store.mutate(id, w => { w.shop.products[0].listed = false; for (let i = 0; i < 3; i++) w.marketing.campaigns.push({ id: randomUUID(), productId: randomUUID(), channel: 'mastodon', createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), status: 'posted' }); });
  await f.call('/marketing/configure', config); await f.app.marketing.tick(); assert.equal(f.posts.length, 0);
  await f.store.mutate(id, w => { for (const c of w.marketing.campaigns) c.createdAt = new Date(Date.now() - 25 * 3600000).toISOString(); });
  await f.app.marketing.tick(); assert.equal(f.posts.length, 1); assert.equal(f.posts[0].productId, f.otherProduct);
});
test('encrypted channel and completed job survive SQLite restart without duplicate publication', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'hubloan-marketing-')); t.after(() => rm(dir, { recursive: true, force: true }));
  let store = await createStore({ file: join(dir, 'db.sqlite') });
  let sends = 0; const provider = { connect: async () => ({ target: '123', name: '@fixture' }), publish: async (_, key) => { assert.equal(key, secret); sends++; return { remoteId: '456', url: 'https://mastodon.social/@fixture/456' }; } };
  await store.mutate(id, w => { w.shop = { enabled: true, livemode: true, slug: 'f'.repeat(32), products: [{ id: randomUUID(), listed: true, kind: 'text', title: 'Guia', description: 'Markdown', priceMinor: 1500 }] }; });
  let marketing = createMarketing(store, { masterKey, provider }); await marketing.connect(id, { channel: 'mastodon', apiKey: secret, authorize: true }); await marketing.configure(id, config); await marketing.tick(); await marketing.close(); await store.close();
  store = await createStore({ file: join(dir, 'db.sqlite') }); marketing = createMarketing(store, { masterKey, provider });
  t.after(async () => { await marketing.close(); await store.close(); }); await marketing.tick(); assert.equal(sends, 1); assert.equal(publicWorkspace((await store.read(id)).workspace).marketing.campaigns[0].status, 'posted');
});
test('provider sends only fixed official HTTPS endpoints, verifies channel permissions and rejects redirects/secret errors', async () => {
  const requests = [], responses = [{ id: '123', username: 'fixture' }, { id: '456', account: { id: '123' }, url: 'https://mastodon.social/@fixture/456' }, { ok: true, result: { id: 1, is_bot: true } }, { ok: true, result: { id: -100123456, type: 'channel', title: 'Fixture', username: 'fixture' } }, { ok: true, result: { status: 'administrator', can_post_messages: true } }, { ok: true, result: { message_id: 9, chat: { id: -100123456 } } }];
  const provider = createMarketingProvider({ fetcher: async (url, opts) => { requests.push({ url, opts }); return { ok: true, json: async () => responses.shift() }; } });
  const mastodon = await provider.connect('mastodon', secret); await provider.publish('mastodon', secret, mastodon, { id: 'idem-fixture', text: 'test' });
  const telegram = await provider.connect('telegram', secret, '@fixture'); const posted = await provider.publish('telegram', secret, telegram, { text: 'test' });
  assert.equal(posted.url, 'https://t.me/fixture/9'); assert.equal(requests[1].opts.headers['Idempotency-Key'], 'idem-fixture');
  for (const r of requests) { assert.equal(r.opts.redirect, 'error'); assert.ok(['https://mastodon.social', 'https://api.telegram.org'].includes(new URL(r.url).origin)); }
  assert.equal(JSON.parse(requests[5].opts.body).chat_id, '-100123456');
  const failed = createMarketingProvider({ fetcher: async () => { throw new Error(secret); } }); await assert.rejects(() => failed.connect('mastodon', secret), e => !e.message.includes(secret));
  const denied = createMarketingProvider({ fetcher: async url => ({ ok: true, json: async () => ({ ok: true, result: url.endsWith('getMe') ? { is_bot: true, id: 1 } : url.endsWith('getChat') ? { id: -100123456, type: 'channel' } : { status: 'member' } }) }) }); await assert.rejects(() => denied.connect('telegram', secret, '@fixture'), /permissão/);
});

test('manual campaigns remain unverified, preserve attribution and never send posts or consume automatic grant', async t => {
 const f=await fixture(t);
 const prepared=await f.call('/marketing/prepare',{productId:f.productId,channel:'whatsapp'});
 assert.equal(prepared.status,200);const c=prepared.data.marketing.campaigns[0];assert.equal(c.status,'prepared');assert.equal(c.url,undefined);assert.equal(c.purchases,0);assert.equal(prepared.data.marketing.enabled,false);assert.equal(prepared.data.marketing.grantUsed,0);assert.equal(f.posts.length,0);
 await f.call('/marketing/prepare',{productId:f.productId,channel:'whatsapp'});assert.equal((await f.call('/workspace')).data.marketing.campaigns.length,1);
 assert.equal((await f.call('/marketing/prepare',{productId:f.productId,channel:'whatsapp'},'b'.repeat(64))).status,400);
 assert.equal((await f.call('/marketing/prepare',{productId:f.productId,channel:'telegram'})).status,400);
 assert.equal((await f.call(`/storefront/${f.slug}/visit`,{campaignId:c.id,productId:f.productId,visitToken:'c'.repeat(64)},'')).data.recorded,true);
 const receiptToken='d'.repeat(64);assert.equal((await f.call(`/storefront/${f.slug}/checkout`,{productId:f.productId,receiptToken,campaignId:c.id},'')).status,200);
 f.sessions.get('cs_live_fixture1').payment_status='paid';await f.call(`/storefront/${f.slug}/receipt`,undefined,receiptToken);
 const after=(await f.call('/workspace')).data.marketing.campaigns[0];assert.equal(after.purchases,1);assert.equal(after.status,'prepared');
 await f.start();await f.app.marketing.tick();assert.equal(f.posts.length,1);assert.equal((await f.call('/workspace')).data.marketing.grantUsed,1);
});
test('Bluesky provider uses verified account, fixed hosted PDS, UTF8 link facets and deterministic record IDs',async()=>{
 const requests=[],did='did:plc:abc123',campaign={id:randomUUID(),title:'Mobília 🌱 original',link:'https://hub-loan.vercel.app/loja/test?produto=abc',createdAt:new Date().toISOString()};
 const session={did,handle:'fixture.bsky.social',accessJwt:'fixture-jwt',didDoc:{service:[{id:'#atproto_pds',serviceEndpoint:'https://test.host.bsky.network'}]}};
 const responses=[session,session,{uri:`at://${did}/app.bsky.feed.post/${campaign.id}`,cid:'fixture-cid'}];
 const p=createMarketingProvider({fetcher:async(url,opts)=>{requests.push({url,opts});return {ok:true,json:async()=>responses.shift()};}});
 const c=await p.connect('bluesky','aaaa-bbbb-cccc-dddd','fixture.bsky.social');assert.equal(c.target,did);assert.ok(!JSON.stringify(c).includes('jwt'));
 const r=await p.publish('bluesky','aaaa-bbbb-cccc-dddd',c,campaign);assert.equal(r.url,`https://bsky.app/profile/${did}/post/${campaign.id}`);
 const record=JSON.parse(requests[2].opts.body);assert.equal(record.rkey,campaign.id);assert.equal(record.repo,did);assert.ok(Array.from(record.record.text).length<=300);
 const index=record.record.facets[0].index;assert.equal(Buffer.from(record.record.text).subarray(index.byteStart,index.byteEnd).toString(),campaign.link);
 assert.ok(requests.every(r=>r.opts.redirect==='error'));
 const rejected=createMarketingProvider({fetcher:async()=>({ok:true,json:async()=>({...session,didDoc:{service:[{id:'#atproto_pds',serviceEndpoint:'https://attacker.example'}]}})})});
 await assert.rejects(()=>rejected.connect('bluesky','aaaa-bbbb-cccc-dddd','fixture.bsky.social'),/hospedadas/);
});
test('Bluesky errors cannot leak app passwords and unexpected account changes prevent posting',async()=>{
 const p=createMarketingProvider({fetcher:async()=>{throw new Error('secret-password');}});
 await assert.rejects(()=>p.connect('bluesky','secret-password','fixture.bsky.social'),e=>!e.message.includes('secret-password'));
 let calls=0;const p2=createMarketingProvider({fetcher:async()=>{calls++;return {ok:true,json:async()=>({did:'did:plc:different',handle:'other.bsky.social',accessJwt:'private'})};}});
 await assert.rejects(()=>p2.publish('bluesky','aaaa-bbbb-cccc-dddd',{target:'did:plc:original',identifier:'did:plc:original'},{}),/diferente/);assert.equal(calls,1);
});
