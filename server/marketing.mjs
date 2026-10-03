import { createBluesky, blueskyText } from './bluesky.mjs';
import { randomUUID, createHash } from 'node:crypto';
import { AppError, encryptKey, decryptKey, text } from './domain.mjs';
const channels = ['mastodon', 'telegram', 'bluesky'];
const manualChannels = ['whatsapp', 'linkedin', 'reddit', 'instagram', 'tiktok'];
const uncertainMessage = 'Envio sem confirmação. A divulgação foi pausada para evitar duplicação. Confira o canal e encerre esta tentativa antes de retomar.';
const metadata = c => ({ id: c.id, channel: c.channel, productId: c.productId, title: c.title, text: c.text, link: c.link, status: c.status, createdAt: c.createdAt, postedAt: c.postedAt, url: c.url, error: c.error || '', visits: c.visits || 0 });
export function publicMarketing(w) {
  const m = w.marketing || {}, orders = w.shop?.orders || [];
  return { enabled: m.enabled === true, expiresAt: m.expiresAt, intervalMinutes: m.intervalMinutes || 240, maxPosts: m.maxPosts || 6, grantUsed: (m.campaigns || []).filter(c => m.grant && c.grant === m.grant).length, error: m.error || '', channels: channels.map(kind => ({ kind, configured: Boolean(m.channels?.[kind]?.secret), name: m.channels?.[kind]?.name || '' })), campaigns: (m.campaigns || []).map(c => { const paid = orders.filter(o => o.campaignId === c.id && o.paidAt && o.livemode); return { ...metadata(c), purchases: paid.length, grossMinor: paid.reduce((n, o) => n + o.priceMinor, 0), refundedMinor: paid.reduce((n, o) => n + (o.refundedMinor || 0), 0), testPurchases: orders.filter(o => o.campaignId === c.id && o.paidAt && !o.livemode).length }; }), note: 'Acessos são requisições de navegadores, deduplicadas por código anônimo e dia, não pessoas verificadas. Podem incluir robôs. Compras são pagamentos reais confirmados; receita bruta não é lucro.' };
}
export function marketingPost(product, link) {
  const tags = { sprites: '#gamedev #Godot', model3d: '#gamedev #3D', thumbnail: '#YouTube #design', image: '#design', text: '#criadores' };
  // Only immutable public catalog facts. Never expose mission briefs or invent testimonials.
  const title = Array.from(product.title.replace(/[\r\n]/g, ' ')).slice(0, 90).join('');
  return `${title}\n${product.description}\nR$ ${(product.priceMinor / 100).toFixed(2).replace('.', ',')} · arquivo digital produzido com IA.\nConfira prévia, formato e licença:\n${link}\n${tags[product.kind] || ''}`;
}
export function createMarketingProvider({ fetcher = fetch } = {}) {
  async function json(url, options = {}) {
    try {
      const r = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error();
      return await r.json();
    } catch { throw new AppError('Não foi possível confirmar a operação no canal. Confira permissões e conexão.', 502); }
  }
  const telegram = async (secret, method, input = {}) => { const result = await json(`https://api.telegram.org/bot${secret}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); if (!result.ok) throw new AppError('O Telegram recusou a operação. Confira as permissões do bot.', 502); return result.result; };
  const bluesky = createBluesky(json);
  return {
    async connect(kind, secret, target) {
      if (kind === 'bluesky') return bluesky.connect(secret, target);
      if (kind === 'mastodon') {
        const account = await json('https://mastodon.social/api/v1/accounts/verify_credentials', { headers: { Authorization: `Bearer ${secret}` } });
        if (!/^\d+$/.test(account.id || '') || !account.username) throw new AppError('Conta Mastodon inválida.');
        return { target: account.id, name: `@${account.username}@mastodon.social` };
      }
      const bot = await telegram(secret, 'getMe'), chat = await telegram(secret, 'getChat', { chat_id: target });
      if (!bot.is_bot || chat.type !== 'channel' || !/^-[0-9]+$/.test(String(chat.id))) throw new AppError('Escolha um canal Telegram administrado pelo seu bot; grupos e conversas privadas não são suportados.');
      const rights = await telegram(secret, 'getChatMember', { chat_id: chat.id, user_id: bot.id });
      if (!(rights.status === 'creator' || (rights.status === 'administrator' && rights.can_post_messages))) throw new AppError('O bot precisa ser administrador com permissão de publicar no canal.');
      return { target: String(chat.id), name: text(chat.title, 'Nome do canal', 200), username: /^[A-Za-z0-9_]{5,32}$/.test(chat.username || '') ? chat.username : null };
    },
    async publish(kind, secret, connection, campaign) {
      if (kind === 'bluesky') return bluesky.publish(secret, connection, campaign);
      if (kind === 'mastodon') {
        const result = await json('https://mastodon.social/api/v1/statuses', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', 'Idempotency-Key': campaign.id }, body: JSON.stringify({ status: campaign.text, visibility: 'public', language: 'pt' }) });
        if (!/^\d+$/.test(result.id || '') || String(result.account?.id) !== connection.target || !result.url || new URL(result.url).origin !== 'https://mastodon.social') throw new AppError('Publicação Mastodon sem confirmação.', 502);
        return { remoteId: result.id, url: result.url };
      }
      const result = await telegram(secret, 'sendMessage', { chat_id: connection.target, text: campaign.text, link_preview_options: { is_disabled: false } });
      if (!Number.isSafeInteger(result.message_id) || String(result.chat?.id) !== connection.target) throw new AppError('Publicação Telegram sem confirmação.', 502);
      return { remoteId: String(result.message_id), url: connection.username ? `https://t.me/${connection.username}/${result.message_id}` : `https://t.me/c/${connection.target.replace(/^-100/, '')}/${result.message_id}` };
    },
  };
}
export function createMarketing(store, { masterKey = null, provider = createMarketingProvider(), publicOrigin = 'https://hub-loan.vercel.app', intervalMs = 15000 } = {}) {
  const origin = new URL(publicOrigin);
  if ((origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash) throw new Error('Invalid marketing origin.');
  let closed = false, flight = null;
  const init = w => w.marketing ||= { enabled: false, channels: {}, campaigns: [], intervalMinutes: 240, maxPosts: 6 };
  async function connect(id, input) {
    if (!masterKey) throw new AppError('A divulgação precisa de armazenamento criptografado persistente.');
    if (!channels.includes(input.channel) || input.authorize !== true) throw new AppError('Escolha um canal e autorize publicar nele.');
    const secret = text(input.apiKey, 'Token do canal', 1000);
    if (input.channel === 'bluesky' ? !/^[a-z]{4}(-[a-z]{4}){3}$/.test(secret) : input.channel === 'telegram' ? !/^\d{5,20}:[A-Za-z0-9_-]{30,100}$/.test(secret) : !/^[A-Za-z0-9_-]{20,200}$/.test(secret)) throw new AppError('Formato do token inválido.');
    const target = input.channel === 'bluesky' ? text(input.target, 'Identificador Bluesky', 253).replace(/^@/,'') : input.channel === 'telegram' ? text(input.target, 'Canal Telegram', 50) : '';
    if(input.channel === 'bluesky' && !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(target)) throw new AppError('Informe seu identificador Bluesky, sem URL ou e-mail.');
    if (input.channel === 'telegram' && target && !/^(@[A-Za-z0-9_]{5,32}|-100\d{5,20})$/.test(target)) throw new AppError('Use @nome_do_canal ou o ID -100… do canal.');
    const connection = await provider.connect(input.channel, secret, target);
    return store.mutate(id, w => { const m = init(w); if (m.campaigns.some(c => c.status === 'publishing')) throw new AppError('Aguarde o envio atual antes de mudar a conexão.', 409); m.channels[input.channel] = { ...connection, secret: encryptKey(secret, masterKey) }; m.enabled = false; });
  }
  async function disconnect(id, kind) { if (!channels.includes(kind)) throw new AppError('Canal inválido.'); return store.mutate(id, w => { const m = init(w); if (m.campaigns.some(c => c.status === 'publishing')) throw new AppError('Aguarde o envio atual.', 409); delete m.channels[kind]; m.enabled = false; }); }
  async function configure(id, input) {
    if (typeof input.enabled !== 'boolean' || !Number.isInteger(input.intervalMinutes) || input.intervalMinutes < 120 || input.intervalMinutes > 1440 || !Number.isInteger(input.maxPosts) || input.maxPosts < 1 || input.maxPosts > 20) throw new AppError('Use intervalo de 120 a 1.440 minutos e limite de 1 a 20 publicações.');
    return store.mutate(id, w => {
      const m = init(w);
      if (input.enabled && (!masterKey || !Object.values(m.channels).some(c => c.secret) || !w.shop?.enabled || !w.shop.livemode)) throw new AppError('Conecte um canal e ative uma loja Stripe real antes de divulgar.');
      if (input.enabled && m.campaigns.some(c => ['publishing', 'uncertain'].includes(c.status))) throw new AppError('Confira o envio pendente no canal e encerre a tentativa antes de retomar.', 409);
      Object.assign(m, { enabled: input.enabled, intervalMinutes: input.intervalMinutes, maxPosts: input.maxPosts, expiresAt: Date.now() + 72 * 3600000, grant: randomUUID(), error: '' });
    });
  }
  async function prepare(id, input) {
    if(!manualChannels.includes(input.channel)) throw new AppError('Canal de compartilhamento inválido.');
    return store.mutate(id,w=>{
      const m=init(w), product=w.shop?.products.find(p=>p.id===input.productId&&p.listed);
      if(!w.shop?.enabled || !w.shop.livemode || !product) throw new AppError('Abra a loja real e publique um produto antes de preparar sua divulgação.');
      if(m.campaigns.length>=1000) throw new AppError('Limite de campanhas atingido.');
      if(m.campaigns.some(c=>c.channel===input.channel&&c.productId===product.id)) return;
      const campaignId=randomUUID(),link=`${publicOrigin}/loja/${w.shop.slug}?produto=${product.id}&campanha=${campaignId}`;
      m.campaigns.push({id:campaignId,channel:input.channel,productId:product.id,title:product.title,link,text:marketingPost(product,link),createdAt:new Date().toISOString(),status:'prepared',visits:0,visitHashes:[]});
    });
  }
  async function skip(id, campaignId) {
    return store.mutate(id, w => { const m = init(w), c = m.campaigns.find(c => c.id === campaignId); if (!c || c.status !== 'uncertain') throw new AppError('Tentativa não encontrada ou não encerrável.', 409); c.status = 'skipped'; c.error = 'Tentativa encerrada pelo proprietário após conferir o canal. Este produto não será reenviado neste canal.'; });
  }
  async function step(id) {
    const reserved = await store.mutate(id, w => {
      const m = init(w), now = Date.now();
      for (const c of m.campaigns) if (c.status === 'publishing' && now - Date.parse(c.createdAt) > 90000) { c.status = 'uncertain'; c.error = uncertainMessage; m.enabled = false; m.error = uncertainMessage; }
      if (!m.enabled) return null;
      if (m.expiresAt <= now || m.campaigns.filter(c => m.grant && c.grant === m.grant).length >= m.maxPosts || m.campaigns.length >= 1000) { m.enabled = false; return null; }
      if (!w.shop?.enabled || !w.shop.livemode || m.campaigns.some(c => ['publishing', 'uncertain'].includes(c.status))) return null;
      const recent = m.campaigns.filter(c => channels.includes(c.channel) && now - Date.parse(c.createdAt) < m.intervalMinutes * 60000);
      if (recent.length) return null;
      // One offer per product/channel for its entire lifetime. Max three attempts/channel per rolling day.
      for (const product of w.shop.products.filter(p => p.listed)) for (const channel of channels) {
        const connection = m.channels[channel];
        if (!connection?.secret || m.campaigns.some(c => c.productId === product.id && c.channel === channel) || m.campaigns.filter(c => c.channel === channel && now - Date.parse(c.createdAt) < 86400000).length >= 3) continue;
        const campaignId = randomUUID(), link = `${publicOrigin}/loja/${w.shop.slug}?produto=${product.id}&campanha=${campaignId}`;
        const campaign = { id: campaignId, channel, productId: product.id, title: product.title, link, text: marketingPost(product, link), createdAt: new Date(now).toISOString(), status: 'publishing', grant: m.grant, visits: 0, visitHashes: [] };
        if (channel === 'bluesky') campaign.text = blueskyText(campaign);
        m.campaigns.push(campaign); return { campaign, connection };
      }
      return null;
    });
    if (!reserved.result) return;
    const { campaign, connection } = reserved.result;
    try {
      const result = await provider.publish(campaign.channel, decryptKey(connection.secret, masterKey), connection, campaign);
      if (!result?.remoteId || !result.url || !['https://mastodon.social', 'https://t.me', 'https://bsky.app'].includes(new URL(result.url).origin)) throw new Error('Unconfirmed post');
      await store.mutate(id, w => { const c = w.marketing.campaigns.find(c => c.id === campaign.id); if (c.status !== 'publishing') return; Object.assign(c, { status: 'posted', postedAt: new Date().toISOString(), url: result.url, remoteId: result.remoteId }); });
    } catch {
      // Timeout or lost database reply may mean the post exists. Never retry an uncertain delivery.
      await store.mutate(id, w => { const c = w.marketing.campaigns.find(c => c.id === campaign.id); if (c.status === 'posted') return; c.status = 'uncertain'; c.error = uncertainMessage; w.marketing.enabled = false; w.marketing.error = uncertainMessage; });
    }
  }
  async function visit(slug, input) {
    if (!/^[a-f0-9]{32}$/.test(slug) || !/^[a-f0-9]{64}$/.test(input.visitToken || '') || !/^[a-f0-9-]{36}$/.test(input.campaignId || '')) return { recorded: false };
    const found = await store.shopBySlug(slug); if (!found) return { recorded: false };
    const hash = createHash('sha256').update(`${input.campaignId}:${new Date().toISOString().slice(0, 10)}:${input.visitToken}`).digest('hex');
    return (await store.mutate(found.id, w => {
      const c = w.marketing?.campaigns.find(c => c.id === input.campaignId && c.productId === input.productId && ['posted', 'publishing', 'uncertain', 'skipped', 'prepared'].includes(c.status));
      if (!w.shop.enabled || !w.shop.products.some(p => p.id === input.productId && p.listed) || !c || c.visitHashes.includes(hash) || c.visitHashes.length >= 10000) return { recorded: false };
      c.visitHashes.push(hash); c.visits++; return { recorded: true };
    })).result;
  }
  async function tick() {
    if (closed || flight) return flight;
    flight = (async () => { for (const { id } of await store.marketingSpaces()) { if (closed) break; try { await step(id); } catch { /* Next tick recovers durable stale attempts; no external retry. */ } } })().finally(() => { flight = null; });
    return flight;
  }
  const timer = setInterval(() => { tick().catch(() => {}); }, intervalMs); timer.unref();
  return { connect, configure, disconnect, prepare, skip, visit, tick, close: async () => { closed = true; clearInterval(timer); await flight; } };
}
