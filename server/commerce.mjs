import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { AppError, encryptKey, decryptKey, workspaceId, missionById, text } from './domain.mjs';

export function itchTarget(url) {
  let parsed; try { parsed = new URL(url); } catch { throw new AppError('URL itch.io inválida.'); }
  const match = parsed.hostname.match(/^([a-z0-9_-]+)\.itch\.io$/);
  const slug = parsed.pathname.replace(/^\//, '').replace(/\/$/, '');
  if (parsed.protocol !== 'https:' || !match || !/^[a-z0-9_-]+$/.test(slug) || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) throw new AppError('Use https://usuario.itch.io/nome-do-pack.');
  return `${match[1]}/${slug}`;
}
function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
export function summarizeGame(game) {
  const url = typeof game.url === 'string' ? game.url.replace(/^http:/, 'https:') : '';
  return { id: game.id, title: String(game.title || '').slice(0, 150), url, published: game.published === true, classification: game.classification || '', views: count(game.views_count), purchases: count(game.purchases_count), downloads: count(game.downloads_count), earnings: (game.earnings || []).filter(item => /^[A-Z]{3}$/.test(item.currency) && Number.isSafeInteger(item.amount)).map(item => ({ currency: item.currency, grossMinor: item.amount })), observedAt: new Date().toISOString(), origin: 'itch_api', scope: 'page_lifetime', note: 'Totais da página; receita informada pela plataforma, não lucro líquido nem atribuição a cada arquivo.' };
}
export function createItchProvider({ fetcher = fetch, binary = process.env.BUTLER_PATH || 'butler', launch = spawn } = {}) {
  async function get(key, path) {
    let response; try { response = await fetcher(`https://api.itch.io/${path}`, { headers: { Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(30000) }); } catch { throw new AppError('Não foi possível consultar itch.io. Tente novamente.', 422); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.errors) throw new AppError('itch.io recusou a consulta. Confira a chave e as permissões.', 422);
    return data;
  }
  return {
    async games(key) { const data = await get(key, 'profile/games'); if (!Array.isArray(data.games)) throw new AppError('Resposta de catálogo inválida.', 422); return data.games.map(summarizeGame).filter(game => Number.isSafeInteger(game.id) && game.id > 0); },
    async push(key, target, mission) {
      if (!/^[a-z0-9_-]+\/[a-z0-9_-]+$/.test(target) || !/^[a-f0-9-]{36}$/.test(mission.id)) throw new AppError('Destino inválido.');
      const directory = await mkdtemp(join(tmpdir(), 'hubloan-publish-'));
      const channel = `pack-${mission.id}`, version = `hubloan-${mission.id}-${mission.attempt}`;
      try {
        const file = join(directory, 'pack.zip'); await writeFile(file, Buffer.from(mission.artifact.base64, 'base64'), { mode: 0o600 });
        await new Promise((resolve, reject) => {
          // No shell, no key in argv, no provider output in logs or public errors.
          const child = launch(binary, ['push', file, `${target}:${channel}`, '--userversion', version], { env: { PATH: process.env.PATH, HOME: directory, ITCHIO_API_KEY: key }, stdio: 'ignore' });
          const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new AppError('Upload interrompido; confira o canal na loja antes de tentar novamente.', 422)); }, 180000);
          child.once('error', () => { clearTimeout(timer); reject(new AppError('Ferramenta de upload indisponível no servidor.', 422)); });
          child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new AppError('Upload não confirmado. Confira o canal na loja antes de tentar novamente.', 422)); });
        });
        return { channel, version };
      } finally { await rm(directory, { recursive: true, force: true }); }
    },
  };
}
export function publicCommerce(workspace) {
  const commerce = workspace.commerce || {};
  return { configured: Boolean(commerce.secret), autoPublish: commerce.autoPublish === true, background: commerce.background === true, maxUploads: commerce.maxUploads || 3, uploads: commerce.uploads || 0, expiresAt: commerce.expiresAt, games: commerce.games || [], targets: commerce.targets || {}, error: commerce.error || '', license: commerce.license || '' };
}
export function createCommerce(store, { masterKey = null, provider = createItchProvider(), intervalMs = 15000 } = {}) {
  const unlocked = new Map(); let busy = false, closed = false, flight;
  async function connect(id, token, input) {
    const key = text(input.apiKey, 'Chave itch.io', 1000); if (/\s/.test(key)) throw new AppError('Chave inválida.');
    const games = await provider.games(key);
    return store.mutate(id, workspace => { workspace.commerce = { ...(workspace.commerce || {}), secret: encryptKey(key, token), games, autoPublish: false, background: false, targets: {}, error: '', maxUploads: 3, uploads: 0 }; });
  }
  function unlock(id, token) { unlocked.set(id, { token, expires: Date.now() + 30000 }); }
  async function configure(id, token, input) {
    const current = (await store.read(id)).workspace.commerce;
    if (!current?.secret) throw new AppError('Conecte itch.io primeiro.');
    if (typeof input.autoPublish !== 'boolean' || typeof input.background !== 'boolean' || !Number.isInteger(input.maxUploads) || input.maxUploads < 1 || input.maxUploads > 20) throw new AppError('Configuração comercial inválida.');
    const games = await provider.games(decryptKey(current.secret, token)); const targets = {};
    for (const kind of ['sprites', 'model3d']) {
      const value = input.targets?.[kind]; if (!value) continue;
      const game = games.find(item => item.id === Number(value));
      if (!game || !game.published || game.classification !== 'assets') throw new AppError('Escolha uma página pública de assets da sua conta.');
      targets[kind] = { id: game.id, target: itchTarget(game.url), url: game.url, title: game.title };
    }
    if (input.autoPublish && !Object.keys(targets).length) throw new AppError('Selecione um destino para publicação automática.');
    const license = text(input.license, 'Licença e condições de uso', 4000);
    if (input.background && !masterKey) throw new AppError('Hospedagem sem autorização persistente.');
    const result = await store.mutate(id, workspace => { const commerce = workspace.commerce; if (!commerce?.secret) throw new AppError('Conexão removida.', 409); Object.assign(commerce, { targets, games, autoPublish: input.autoPublish, background: input.background, maxUploads: input.maxUploads, license, error: '', expiresAt: Date.now() + 72 * 3600000 }); if (input.background) commerce.grant = encryptKey(token, masterKey); else delete commerce.grant; });
    unlock(id, token); return result;
  }
  async function sync(id, token) {
    const c = (await store.read(id)).workspace.commerce; if (!c?.secret) throw new AppError('Conecte itch.io primeiro.');
    const games = await provider.games(decryptKey(c.secret, token));
    return store.mutate(id, w => { if (!w.commerce?.secret) throw new AppError('Conexão removida.', 409); w.commerce.games = games; w.commerce.lastSync = Date.now(); w.commerce.syncFailed = false; w.commerce.error = ''; });
  }
  async function publish(id, token, missionId, automatic = false) {
    const claim = await store.mutate(id, workspace => {
      const mission = missionById(workspace, missionId), c = workspace.commerce;
      if (!c?.secret || !c.targets?.[mission.kind] || !c.license) throw new AppError('Configure loja, destino e licença primeiro.');
      if (automatic && (!c.autoPublish || c.expiresAt < Date.now())) throw new AppError('Publicação automática pausada.');
      if (!['review', 'approved'].includes(mission.status) || mission.artifact?.mime !== 'application/zip') throw new AppError('O pack precisa estar produzido antes de publicar.');
      if (mission.publication?.status === 'uploaded') throw new AppError('Este pack já foi enviado.', 409);
      if (mission.publication?.status === 'uploading') throw new AppError('Upload em andamento ou interrompido. Confira na loja antes de recuperar.', 409);
      if (c.uploads >= c.maxUploads) throw new AppError('Limite de tentativas de upload atingido. Ajuste o limite para continuar.');
      c.uploads++; mission.publication = { status: 'uploading', at: new Date().toISOString(), target: c.targets[mission.kind], license: c.license };
      return { mission: structuredClone(mission), secret: c.secret };
    });
    try {
      const mission = claim.result.mission;
      // Attach the seller's exact license rather than inventing authorization/rights.
      const { unzipSync, zipSync, strToU8 } = await import('fflate');
      const files = unzipSync(Buffer.from(mission.artifact.base64, 'base64')); files['SELLER-LICENSE.txt'] = strToU8(mission.publication.license);
      mission.artifact.base64 = Buffer.from(zipSync(files)).toString('base64');
      const result = await provider.push(decryptKey(claim.result.secret, token), mission.publication.target.target, mission);
      return await store.mutate(id, w => { const m = missionById(w, missionId); m.publication = { ...m.publication, ...result, status: 'uploaded', at: new Date().toISOString(), note: 'Upload confirmado pelo butler. A visibilidade e o preço dependem da página itch.io; não é confirmação de venda.' }; });
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Upload não confirmado; confira a loja antes de retomar.';
      await store.mutate(id, w => { missionById(w, missionId).publication.status = 'uncertain'; missionById(w, missionId).publication.error = message; if (w.commerce) { w.commerce.autoPublish = false; w.commerce.error = message; } });
      throw new AppError(message, 422);
    }
  }
  async function recover(id, missionId) {
    return store.mutate(id, w => {
      const m = missionById(w, missionId);
      if (m.publication?.status !== 'uploading' || Date.now() - Date.parse(m.publication.at) < 240000) throw new AppError('Só recupere upload interrompido há mais de quatro minutos.');
      m.publication.status = 'uncertain'; m.publication.error = 'Upload interrompido recuperado; conferir canal na loja antes de reenviar.';
    });
  }
  async function run() {
    if (masterKey) for (const space of await store.commerceSpaces()) {
      try { const token = decryptKey(space.grant, masterKey); if (workspaceId(token) === space.id) unlock(space.id, token); } catch { /* An invalid grant cannot authorize requests. */ }
    }
    for (const [id, entry] of unlocked) {
      if (entry.expires < Date.now()) { unlocked.delete(id); continue; }
      const token = entry.token;
      const w = (await store.read(id)).workspace, c = w.commerce;
      if (!c?.secret || (!c.expiresAt || c.expiresAt < Date.now())) { unlocked.delete(id); continue; }
      if (c.autoPublish && c.uploads < c.maxUploads) {
        const mission = [...w.missions].reverse().find(m => ['review', 'approved'].includes(m.status) && c.targets[m.kind] && !m.publication);
        if (mission) { try { await publish(id, token, mission.id, true); } catch { /* recorded, no automatic retry */ } }
      }
      if (c.background && Date.now() - (c.lastSync || 0) > 300000 && !c.syncFailed) {
        try { await sync(id, token); } catch { await store.mutate(id, current => { if (current.commerce) { current.commerce.syncFailed = true; current.commerce.error = 'Consulta de métricas falhou. Sincronize manualmente para retomar.'; } }); }
      }
    }
  }
  function tick() { if (busy || closed) return Promise.resolve(); busy = true; flight = run().finally(() => { busy = false; }); return flight; }
  const timer = setInterval(() => { tick().catch(() => console.error('Falha ao processar integração comercial.')); }, intervalMs); timer.unref();
  return { connect, configure, sync, publish, recover, unlock, tick, close: async () => { closed = true; clearInterval(timer); await flight; }, disconnect: id => store.mutate(id, w => { if (w.commerce) { delete w.commerce.secret; delete w.commerce.grant; w.commerce.autoPublish = false; w.commerce.background = false; } }) };
}
