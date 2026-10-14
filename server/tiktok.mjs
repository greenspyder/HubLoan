import { randomBytes, createHash } from 'node:crypto';
import { AppError, encryptKey, decryptKey } from './domain.mjs';
const hash = s => createHash('sha256').update(s).digest('hex');
export function tiktokConfig(env = process.env) {
  return { clientKey: env.TIKTOK_CLIENT_KEY || '', clientSecret: env.TIKTOK_CLIENT_SECRET || '', redirectUri: env.TIKTOK_REDIRECT_URI || '', enabled: env.TIKTOK_LOGIN_ENABLED === 'true' };
}
function requirements(c, masterKey) {
  const missing = [];
  if (!masterKey) missing.push('Definir uma chave estável de criptografia no backend (AGENT_ENCRYPTION_KEY).');
  if (!c.clientKey || !c.clientSecret) missing.push('Cadastrar o app no TikTok for Developers e definir TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET somente no backend.');
  let valid = false;
  try { const u = new URL(c.redirectUri); valid = u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && u.pathname === '/agentes/conexoes'; } catch { /* Missing configuration. */ }
  if (!valid) missing.push('Definir TIKTOK_REDIRECT_URI como https://SEU-FRONTEND/agentes/conexoes e registrar a mesma URL no Login Kit.');
  if (!c.enabled) missing.push('Habilitar Login Kit para Web, obter aprovação ou acesso Sandbox autorizado e definir TIKTOK_LOGIN_ENABLED=true após conferir esse acesso.');
  return missing;
}
const fingerprint = c => hash(`${c.clientKey}\n${c.clientSecret}\n${c.redirectUri}`);
export function createTikTokProvider(fetcher = fetch) {
  async function request(path, options) {
    try {
      const r = await fetcher(`https://open.tiktokapis.com/v2/${path}`, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (data.error && data.error.code !== 'ok') throw new Error();
      return data;
    } catch { throw new AppError('TikTok não confirmou a operação. Confira credenciais, acesso e permissões no portal oficial.', 502); }
  }
  const post = (path, values) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(values) });
  return {
    token: (c, code) => post('oauth/token/', { client_key: c.clientKey, client_secret: c.clientSecret, code, grant_type: 'authorization_code', redirect_uri: c.redirectUri }),
    profile: access => request('user/info/?fields=open_id,display_name', { headers: { Authorization: `Bearer ${access}` } }),
    revoke: (c, token) => post('oauth/revoke/', { client_key: c.clientKey, client_secret: c.clientSecret, token }),
  };
}
export function createTikTok(store, { masterKey, config = tiktokConfig(), provider = createTikTokProvider(), now = Date.now } = {}) {
  const missing = requirements(config, masterKey);
  function state(w) {
    const t = w.tiktok || {}, current = t.configFingerprint === fingerprint(config);
    const connected = !missing.length && current && Boolean(t.secret) && t.expiresAt > now() && !t.error && !t.pending && !t.exchanging;
    const status = missing.length ? 'CONFIGURATION_REQUIRED' : t.pending?.expiresAt > now() ? 'AWAITING_AUTHORIZATION' : !current ? 'NOT_CONFIGURED' : t.error ? 'ERROR' : connected ? 'CONNECTED' : t.exchanging ? 'AWAITING_AUTHORIZATION' : t.secret ? 'AUTHORIZATION_REQUIRED' : 'NOT_CONFIGURED';
    return { configured: !missing.length, canAuthorize: !missing.length, canDisconnect: Boolean(t.secret || t.pending || t.exchanging), requirements: missing, redirectUri: config.redirectUri || null,
      account: { status, connected, name: connected ? t.displayName : null, scopes: connected ? t.scopes : [], verifiedAt: t.verifiedAt || null, expiresAt: t.expiresAt || null, error: t.error || null },
      publication: { status: 'NOT_SUPPORTED', connected: false, detail: 'Publicação pela API ainda não implementada. Content Posting exige produto, escopos e revisão próprios; Direct Post não admite utilitário apenas para contas internas. Afiliados continua assistido.' },
      broadcast: { status: 'CONFIGURATION_REQUIRED', connected: false, detail: 'Confirme elegibilidade LIVE e acesso às ferramentas oficiais na sua conta. Capture a cena local no OBS/LIVE Studio apenas se a conta permitir. O HubLoan não inicia nem confirma uma transmissão.' },
      events: { status: 'NOT_SUPPORTED', connected: false, detail: 'Nenhum adaptador oficial de comentários/presentes autorizado. É necessário acesso de parceiro com contrato técnico verificável, credenciais e validação de eventos. Eventos da Live Factory são simulados.' },
      revokeNotice: t.revokeNotice || null };
  }
  async function authorize(id) {
    if (missing.length) throw new AppError('Configuração necessária. Confira os requisitos em Conexões → TikTok.', 409);
    const nonce = randomBytes(32).toString('hex'), authorizationId = randomBytes(16).toString('hex');
    await store.mutate(id, w => { w.tiktok ||= {}; w.tiktok.pending = { hash: hash(nonce), expiresAt: now() + 600000, authorizationId, configFingerprint: fingerprint(config) }; delete w.tiktok.exchanging; w.tiktok.error = null; });
    return { state: nonce, url: `https://www.tiktok.com/v2/auth/authorize/?${new URLSearchParams({ client_key: config.clientKey, scope: 'user.info.basic', response_type: 'code', redirect_uri: config.redirectUri, state: nonce })}` };
  }
  async function callback(id, input) {
    if (missing.length) throw new AppError('Configuração TikTok incompleta.', 409);
    if (!/^[a-f0-9]{64}$/.test(input.state || '')) throw new AppError('State OAuth inválido.', 403);
    const { result: authorizationId } = await store.mutate(id, w => {
      const p = w.tiktok?.pending;
      if (!p || p.hash !== hash(input.state) || p.expiresAt <= now() || p.configFingerprint !== fingerprint(config)) throw new AppError('Autorização vencida, de outro espaço ou já utilizada.', 403);
      delete w.tiktok.pending; w.tiktok.configFingerprint = fingerprint(config); w.tiktok.exchanging = p.authorizationId; return p.authorizationId;
    });
    let grant;
    try {
      if (input.error) throw new AppError('Autorização recusada no TikTok. Nenhuma permissão LIVE foi concedida.', 403);
      if (typeof input.code !== 'string' || !input.code || input.code.length > 2048) throw new AppError('Código OAuth inválido.');
      grant = await provider.token(config, input.code);
      const scopes = typeof grant.scope === 'string' ? grant.scope.split(',').map(s => s.trim()) : [];
      if (typeof grant.access_token !== 'string' || !grant.access_token || grant.access_token.length > 8192 || !Number.isSafeInteger(grant.expires_in) || grant.expires_in <= 0 || grant.expires_in > 604800 || !scopes.includes('user.info.basic') || grant.token_type?.toLowerCase() !== 'bearer') throw new AppError('Resposta TikTok inválida ou permissão básica não concedida.', 502);
      const profile = await provider.profile(grant.access_token), user = profile.data?.user;
      if (!user || typeof user.open_id !== 'string' || user.open_id !== grant.open_id || typeof user.display_name !== 'string') throw new AppError('Identidade da conta TikTok não confirmada.', 502);
      await store.mutate(id, w => {
        if (w.tiktok?.exchanging !== authorizationId || w.tiktok.configFingerprint !== fingerprint(config)) throw new AppError('Conexão foi alterada. Autorize novamente.', 409);
        w.tiktok = { configFingerprint: fingerprint(config), secret: encryptKey(JSON.stringify({ access: grant.access_token }), masterKey), displayName: user.display_name.slice(0, 80), scopes, expiresAt: now() + grant.expires_in * 1000, verifiedAt: new Date(now()).toISOString(), error: null };
      });
    } catch (error) {
      if (grant?.access_token) { try { await provider.revoke(config, grant.access_token); } catch { /* No secret or provider error is logged. */ } }
      await store.mutate(id, w => { if (w.tiktok?.exchanging === authorizationId) { delete w.tiktok.exchanging; delete w.tiktok.secret; w.tiktok.error = error instanceof AppError ? error.message : 'Falha ao confirmar a conta TikTok. Autorize novamente.'; } });
      throw error instanceof AppError ? error : new AppError('Falha ao confirmar a conta TikTok.', 502);
    }
    return state((await store.read(id)).workspace);
  }
  async function disconnect(id) {
    const { result: secret } = await store.mutate(id, w => { const old = w.tiktok?.secret; w.tiktok = { configFingerprint: fingerprint(config) }; return old; });
    if (secret) {
      try { const { access } = JSON.parse(decryptKey(secret, masterKey)); await provider.revoke(config, access); }
      catch { await store.mutate(id, w => { w.tiktok.revokeNotice = 'Credencial local removida; revogação remota não confirmada. Remova o acesso também nas permissões de aplicativos do TikTok.'; }); }
    }
    return state((await store.read(id)).workspace);
  }
  return { state, authorize, callback, disconnect };
}
