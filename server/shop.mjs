import { assertValidationPublication, validationPublicationAllowed } from './validation.mjs';
import sharp from 'sharp';
import Stripe from 'stripe';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import { AppError, encryptKey, decryptKey, text, missionById } from './domain.mjs';

const kinds = ['text', 'image', 'thumbnail', 'sprites', 'model3d'];
const kindDescriptions = { text: 'Conteúdo em Markdown; código, quando presente, é um protótipo não executado.', image: 'Imagem PNG gerada por IA.', thumbnail: 'Duas thumbnails 16:9 e arquivos de edição incluídos no pack.', sprites: 'Pack de objetos 2D, atlas e demonstração Godot.', model3d: 'Mobília procedural GLB/OBJ e demonstração Godot.' };
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = () => new AppError('O pagamento não pôde ser consultado ou criado. Confira a conexão Stripe e tente novamente.', 502);
export function createStripeProvider() {
  const client = key => new Stripe(key, { maxNetworkRetries: 1, timeout: 20000 });
  async function call(action) { try { return await action(); } catch { throw fail(); } }
  return {
    account: key => call(() => client(key).accounts.retrieve()),
    webhook: (key, url, attempt) => call(() => client(key).webhookEndpoints.create({ url, enabled_events: ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'charge.refunded', 'charge.dispute.created'], description: 'HubLoan digital storefront' }, { idempotencyKey: `hubloan-connect-${attempt}` })),
    checkout: (key, params, attempt) => call(() => client(key).checkout.sessions.create(params, { idempotencyKey: `hubloan-order-${attempt}` })),
    session: (key, id) => call(() => client(key).checkout.sessions.retrieve(id, { expand: ['payment_intent.latest_charge'] })),
    verify: (raw, signature, secret) => Stripe.webhooks.constructEvent(raw, signature, secret),
  };
}
function publicProduct({ id, missionId, title, description, kind, priceMinor, currency, publishedAt, listed, filename, license, bytes, hasPreview }) {
  return { id, missionId, title, description, kind, priceMinor, currency, publishedAt, listed, filename, license, bytes, hasPreview };
}
export function publicShop(workspace) {
  const s = workspace.shop || {};
  const orders = s.orders || [];
  const paid = orders.filter(o => o.paidAt && o.livemode);
  return { configured: Boolean(s.secret && s.webhookSecret), enabled: s.enabled === true, autoPublish: s.autoPublish === true, name: s.name || '', slug: s.slug || '', contact: s.contact || '', license: s.license || '', prices: s.prices || {}, maxProducts: s.maxProducts || 20, expiresAt: s.expiresAt, livemode: s.livemode === true, error: s.error || '', products: (s.products || []).map(publicProduct), metrics: { purchases: paid.length, grossMinor: paid.reduce((n, o) => n + o.priceMinor, 0), refundedMinor: paid.reduce((n, o) => n + (o.refundedMinor || 0), 0), currency: 'BRL', netProfit: null, testPurchases: orders.filter(o => o.paidAt && !o.livemode).length } };
}
export function salePackage(mission, license) {
  if (mission.purpose === 'experiment-preparation') throw new AppError('Kit de experimento privado não é produto da loja.');
  if (!['review', 'approved'].includes(mission.status) || !kinds.includes(mission.kind)) throw new AppError('A entrega precisa estar concluída para publicar.');
  const files = { 'LICENSE.txt': strToU8(license), 'README.md': strToU8(`# ${mission.title}\n\n${kindDescriptions[mission.kind]}\n\nProduzido com IA. Confira a adequação ao seu uso. Não são prometidos vendas, visualizações ou retorno financeiro.\n`) };
  if (mission.artifact) {
    if (!['image/png', 'application/zip'].includes(mission.artifact.mime)) throw new AppError('Formato não suportado pela loja.');
    const file = Buffer.from(mission.artifact.base64, 'base64');
    if (!file.length || file.length > 25000000) throw new AppError('Arquivo vazio ou acima do limite de 25 MB.');
    files[mission.artifact.mime === 'image/png' ? 'image.png' : 'assets.zip'] = file;
  } else {
    if (mission.kind !== 'text' || !mission.output?.trim() || mission.output.length > 100000) throw new AppError('A entrega não contém um arquivo válido.');
    files['product.md'] = strToU8(mission.output);
  }
  return Buffer.from(zipSync(files, { level: 0 }));
}
export function createShop(store, { masterKey = null, provider = createStripeProvider(), publicOrigin = 'https://hub-loan.vercel.app', webhookOrigin = 'https://hubloan.onrender.com', intervalMs = 15000 } = {}) {
  // Origins are operator-controlled, never taken from requests or model output.
  for (const origin of [publicOrigin, webhookOrigin]) { const url = new URL(origin); if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Shop requires HTTPS.'); if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid shop origin.'); }
  let closed = false, flight = null;
  function key(s) { if (!masterKey || !s?.secret) throw new AppError('Loja sem conexão de pagamentos.', 409); return decryptKey(s.secret, masterKey); }
  async function connect(id, input) {
    if (!masterKey) throw new AppError('A loja precisa de armazenamento criptografado persistente no servidor.');
    if (input.authorizeWebhook !== true) throw new AppError('Autorize conectar pagamentos e registrar o webhook desta loja.');
    const apiKey = text(input.apiKey, 'Chave Stripe', 1000);
    if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]{16,}$/.test(apiKey)) throw new AppError('Informe uma chave secreta Stripe válida.');
    const account = await provider.account(apiKey);
    if (apiKey.includes('_live_') && account.charges_enabled !== true) throw new AppError('Conclua a ativação de pagamentos na Stripe antes de conectar a chave real.');
    const live = apiKey.includes('_live_');
    const reserved = await store.mutate(id, w => {
      w.shop ||= { slug: randomBytes(16).toString('hex'), products: [], orders: [], prices: {}, maxProducts: 20 };
      const s = w.shop;
      if (s.account && s.account !== account.id) throw new AppError('Esta loja pertence a outra conta Stripe. Use um espaço separado.', 409);
      if (s.orders.length && s.livemode !== live) throw new AppError('Use um espaço separado para alternar teste e vendas reais sem perder acesso às compras existentes.', 409);
      if (s.connectingAt && Date.now() - s.connectingAt < 60000) throw new AppError('Conexão já em andamento.', 409);
      s.connectingAt = Date.now(); s.connectionAttempt ||= randomUUID(); s.secret = encryptKey(apiKey, masterKey); s.account = account.id; s.livemode = live;
      s.enabled = false; s.autoPublish = false; s.error = '';
      return { attempt: s.connectionAttempt, slug: s.slug };
    });
    try {
      const webhook = await provider.webhook(apiKey, `${webhookOrigin}/api/agents/storefront/${reserved.result.slug}/webhook`, reserved.result.attempt);
      if (!webhook.id || !webhook.secret) throw fail();
      return await store.mutate(id, w => { const s = w.shop; if (s.connectionAttempt !== reserved.result.attempt) throw new AppError('Conexão substituída.', 409); s.webhookSecret = encryptKey(webhook.secret, masterKey); s.webhookId = webhook.id; delete s.connectingAt; });
    } catch (error) { await store.mutate(id, w => { delete w.shop.connectingAt; w.shop.error = 'Conexão não concluída. Tente conectar novamente; o registro do webhook usa a mesma chave de idempotência.'; }); throw error instanceof AppError ? error : fail(); }
  }
  async function configure(id, input) {
    const name = text(input.name, 'Nome da loja', 100), contact = text(input.contact, 'Contato de suporte', 200), license = text(input.license, 'Licença e condições', 4000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) throw new AppError('Informe um e-mail público de suporte.');
    if (typeof input.enabled !== 'boolean' || typeof input.autoPublish !== 'boolean') throw new AppError('Autorização de publicação inválida.');
    if (!Number.isInteger(input.maxProducts) || input.maxProducts < 1 || input.maxProducts > 200) throw new AppError('Limite de produtos deve ser de 1 a 200.');
    const prices = {};
    for (const kind of kinds) { const value = input.prices?.[kind]; if (!Number.isInteger(value) || value < 500 || value > 1000000) throw new AppError('Defina preços por formato entre R$ 5 e R$ 10.000, em centavos.'); prices[kind] = value; }
    return store.mutate(id, w => { const s = w.shop; if (!s?.secret || !s.webhookSecret) throw new AppError('Conecte a Stripe primeiro.'); Object.assign(s, { name, contact, license, prices, maxProducts: input.maxProducts, enabled: input.enabled, autoPublish: input.autoPublish, expiresAt: Date.now() + 72 * 3600000, error: '' }); });
  }
  async function publish(id, missionId, automatic = false) {
    const snapshot = (await store.read(id)).workspace;
    const mission = missionById(snapshot, missionId);
    assertValidationPublication(snapshot,mission);
    if (!snapshot.shop?.license) throw new AppError('Configure a licença antes de publicar.');
    const bytes = salePackage(mission, snapshot.shop.license), productId = randomUUID();
    let preview = null;
    const source = mission.artifact?.preview || (mission.artifact?.mime === 'image/png' && mission.artifact.base64);
    if (source && source.length < 35000000) {
      try {
        const resized = await sharp(Buffer.from(source, 'base64'), { limitInputPixels: 20000000 }).resize(480, 300, { fit: 'contain', background: '#eef2e8' }).flatten({ background: '#eef2e8' }).toBuffer();
        const watermark = Buffer.from('<svg width="480" height="300"><rect x="0" y="250" width="480" height="50" fill="#102016" fill-opacity=".85"/><text x="240" y="282" text-anchor="middle" font-family="sans-serif" font-size="18" fill="white">PRÉVIA · HUBLOAN</text></svg>');
        preview = await sharp(resized).composite([{ input: watermark }]).jpeg({ quality: 65 }).toBuffer();
      } catch { /* A preview is optional; never expose the original on a public route. */ }
    }
    await store.writeSaleFile(productId, bytes, preview);
    try { return await store.mutate(id, w => {
      const s = w.shop; if (!s?.secret || !s.webhookSecret || !s.enabled || !s.license || !s.name || !s.contact) throw new AppError('Conecte e configure a loja antes de publicar.');
      if (automatic && (!s.autoPublish || s.expiresAt < Date.now())) throw new AppError('Autorização de publicação automática encerrada.');
      if (s.products.some(p => p.missionId === missionId)) throw new AppError('Esta entrega já tem um produto; publicação duplicada bloqueada.', 409);
      if (s.products.length >= s.maxProducts) throw new AppError('Limite de produtos atingido.');
      const m = missionById(w, missionId);
      assertValidationPublication(w,m);
      if (m.attempt !== mission.attempt || !['review', 'approved'].includes(m.status) || m.output !== mission.output || m.artifact?.base64 !== mission.artifact?.base64 || s.license !== snapshot.shop.license) throw new AppError('Entrega ou licença mudou. Tente publicar novamente.', 409);
      const product = { id: productId, missionId, title: m.title, description: kindDescriptions[m.kind], kind: m.kind, priceMinor: s.prices[m.kind], currency: 'brl', publishedAt: new Date().toISOString(), listed: true, filename: `hubloan-${m.id}.zip`, license: s.license, bytes: bytes.length, hasPreview: Boolean(preview) };
      if (!Number.isInteger(product.priceMinor) || product.priceMinor < 500) throw new AppError('Preço deste formato não configurado.');
      s.products.push(product);
      m.storePublication = { status: 'published', productId: product.id, at: product.publishedAt, url: `${publicOrigin}/loja/${s.slug}?produto=${product.id}` };
      m.events.push({ at: product.publishedAt, message: 'Produto publicado na loja própria. Publicação não comprova venda.' });
    }); } catch (error) {
      // A lost database reply can still mean the product committed. Never delete its purchased file.
      try { if (!(await store.read(id)).workspace.shop?.products.some(p => p.id === productId)) await store.removeSaleFile(productId); } catch { /* Leave an orphan rather than risk removing a committed sale file. */ }
      throw error;
    }
  }
  async function listing(id, productId, listed) {
    if (typeof listed !== 'boolean') throw new AppError('Estado de publicação inválido.');
    return store.mutate(id, w => { const p = w.shop?.products.find(p => p.id === productId); if (!p) throw new AppError('Produto não encontrado.', 404); p.listed = listed; });
  }
  async function lookup(slug) { if (!/^[a-f0-9]{32}$/.test(slug)) throw new AppError('Loja não encontrada.', 404); const found = await store.shopBySlug(slug); if (!found) throw new AppError('Loja não encontrada.', 404); return found; }
  async function catalog(slug) {
    const { workspace: w } = await lookup(slug), s = w.shop;
    return { name: s.name || 'Loja de produtos digitais', contact: s.contact || '', enabled: s.enabled === true, livemode: s.livemode === true, products: s.enabled ? s.products.filter(p => p.listed).map(publicProduct).map(({ missionId: _, ...p }) => p) : [] };
  }
  async function preview(slug, productId) {
    const { workspace: w } = await lookup(slug);
    if (!w.shop.enabled || !w.shop.products.some(p => p.id === productId && p.listed && p.hasPreview)) throw new AppError('Prévia indisponível.', 404);
    return store.readSaleFile(productId, true);
  }
  async function checkout(slug, productId, receiptToken, campaignId) {
    if (!/^[a-f0-9]{64}$/.test(receiptToken || '')) throw new AppError('Código de compra inválido.');
    const { id, workspace: w } = await lookup(slug), s = w.shop;
    const p = s.products.find(p => p.id === productId && p.listed);
    if (!s.enabled || !p) throw new AppError('Produto indisponível.', 404);
    const order = (await store.mutate(id, current => {
      const shop = current.shop;
      if (!shop.enabled || !shop.products.some(item => item.id === p.id && item.listed)) throw new AppError('Produto indisponível.', 404);
      const existing = shop.orders.find(o => o.receiptHash === digest(receiptToken));
      if (existing) { if (existing.productId !== p.id) throw new AppError('Código de compra já utilizado.', 409); return existing; }
      if (shop.orders.length >= 5000) throw new AppError('A loja atingiu o limite de pedidos. Contate o vendedor.', 409);
      const order = { id: randomUUID(), productId: p.id, receiptHash: digest(receiptToken), priceMinor: p.priceMinor, currency: p.currency, livemode: shop.livemode, createdAt: new Date().toISOString(), status: 'pending' };
      const campaign = current.marketing?.campaigns.find(c => c.id === campaignId && c.productId === p.id && ['posted', 'publishing', 'uncertain', 'skipped', 'prepared'].includes(c.status));
      if (campaign) order.campaignId = campaign.id;
      shop.orders.push(order); return order;
    })).result;
    const result = await provider.checkout(key(s), { mode: 'payment', payment_method_types: ['card'], client_reference_id: order.id, metadata: { hubloan_order: order.id, hubloan_product: p.id }, line_items: [{ quantity: 1, price_data: { currency: p.currency, unit_amount: order.priceMinor, product_data: { name: p.title, description: p.description } } }], success_url: `${publicOrigin}/loja/${slug}#compra=${receiptToken}`, cancel_url: `${publicOrigin}/loja/${slug}#compra=${receiptToken}`, expires_at: Math.floor(Date.parse(order.createdAt) / 1000) + 3600 }, order.id);
    if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(result.id || '') || !result.url || new URL(result.url).origin !== 'https://checkout.stripe.com') throw fail();
    await store.mutate(id, current => { const saved = current.shop.orders.find(o => o.id === order.id); if (saved.sessionId && saved.sessionId !== result.id) throw new AppError('Checkout conflitante.', 409); saved.sessionId = result.id; });
    return { url: result.url };
  }
  async function settle(id, sessionId) {
    const s = (await store.read(id)).workspace.shop;
    const order = s?.orders.find(o => o.sessionId === sessionId);
    if (!order) throw new AppError('Compra não encontrada.', 404);
    const session = await provider.session(key(s), sessionId);
    if (session.id !== order.sessionId || session.client_reference_id !== order.id || session.metadata?.hubloan_order !== order.id || session.metadata?.hubloan_product !== order.productId || session.amount_total !== order.priceMinor || session.currency !== order.currency || session.livemode !== order.livemode || session.mode !== 'payment') throw new AppError('Dados de pagamento não correspondem à compra.', 409);
    const intent = session.payment_intent;
    const charge = typeof intent === 'object' && intent?.latest_charge;
    const revoked = charge && typeof charge === 'object' && (charge.refunded || charge.amount_refunded > 0 || charge.disputed);
    return store.mutate(id, current => { const o = current.shop.orders.find(o => o.id === order.id);
      if (session.payment_status === 'paid') { o.paidAt ||= new Date().toISOString(); o.paymentIntent = typeof intent === 'string' ? intent : intent?.id; }
      if (revoked) { o.status = 'revoked'; o.refundedMinor = Math.max(o.refundedMinor || 0, charge.amount_refunded || 0); }
      else if (session.payment_status === 'paid' && o.status !== 'revoked') { o.status = 'paid'; }
      return o;
    });
  }
  async function receipt(slug, receiptToken, download = false) {
    if (!/^[a-f0-9]{64}$/.test(receiptToken || '')) throw new AppError('Compra não encontrada.', 404);
    const { id, workspace: w } = await lookup(slug), s = w.shop;
    const hash = digest(receiptToken);
    const order = s.orders.find(o => timingSafeEqual(Buffer.from(o.receiptHash), Buffer.from(hash)));
    if (!order) throw new AppError('Compra não encontrada.', 404);
    // Query provider on access too, so delayed webhooks cannot incorrectly release a refunded order.
    if (order.sessionId) await settle(id, order.sessionId);
    const shop = (await store.read(id)).workspace.shop, saved = shop.orders.find(o => o.id === order.id);
    const product = shop.products.find(p => p.id === saved.productId);
    if (!product) throw new AppError('Arquivo indisponível. Contate o vendedor.', 404);
    if (!download) return { status: saved.status, title: product.title, filename: product.filename, livemode: saved.livemode };
    if (saved.status !== 'paid') throw new AppError(saved.status === 'revoked' ? 'Acesso suspenso por reembolso ou contestação.' : 'Pagamento ainda não confirmado. Aguarde antes de baixar.', 403);
    return { bytes: await store.readSaleFile(product.id), filename: product.filename };
  }
  async function webhook(slug, raw, signature) {
    const { id, workspace: w } = await lookup(slug), s = w.shop;
    let event;
    try { event = provider.verify(raw, signature, decryptKey(s.webhookSecret, masterKey)); } catch { throw new AppError('Assinatura do pagamento inválida.', 400); }
    if (event.livemode !== s.livemode) throw new AppError('Modo de pagamento incorreto.');
    const object = event.data?.object;
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      // Retrieve the authoritative object instead of trusting event payload or arrival order.
      const existing = s.orders.find(o => o.sessionId === object?.id);
      if (existing) await settle(id, object.id);
      else if (s.orders.some(o => o.id === object?.metadata?.hubloan_order)) throw new AppError('Checkout em registro. Tente novamente.', 503);
    } else if (['charge.refunded', 'charge.dispute.created'].includes(event.type)) {
      const paymentIntent = object?.payment_intent;
      if (paymentIntent) await store.mutate(id, current => { for (const o of current.shop.orders) if (o.paymentIntent === paymentIntent) { o.status = 'revoked'; if (event.type === 'charge.refunded') o.refundedMinor = Math.max(o.refundedMinor || 0, object.amount_refunded || 0); } });
    }
    return { received: true };
  }
  async function run() {
    const spaces = await store.shopSpaces();
    for (const { id } of spaces) {
      if (closed) break;
      const s = (await store.read(id)).workspace.shop;
      if (!s?.enabled || !s.autoPublish || !s.secret || !s.webhookSecret) continue;
      if (s.expiresAt < Date.now()) { await store.mutate(id, w => { w.shop.autoPublish = false; }); continue; }
      const workspace = (await store.read(id)).workspace;
      const published = new Set(s.products.map(p => p.missionId));
      const missions = [...workspace.missions].reverse().filter(m => validationPublicationAllowed(workspace,m) && m.purpose !== 'experiment-preparation' && ['review', 'approved'].includes(m.status) && !published.has(m.id));
      for (const m of missions) {
        if (closed) break;
        try { await publish(id, m.id, true); }
        catch { await store.mutate(id, w => { w.shop.autoPublish = false; w.shop.error = 'Publicação interrompida. Confira a entrega e o limite de produtos antes de renovar a autorização.'; }); break; }
      }
    }
  }
  function tick() { if (flight || closed) return flight || Promise.resolve(); flight = run().finally(() => { flight = null; }); return flight; }
  const timer = setInterval(() => { tick().catch(() => console.error('Falha ao publicar na loja própria.')); }, intervalMs); timer.unref();
  return { connect, configure, publish, listing, catalog, preview, checkout, receipt, webhook, tick, close: async () => { closed = true; clearInterval(timer); await flight; } };
}
