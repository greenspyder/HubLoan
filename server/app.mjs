import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { AppError, workspaceId, publicWorkspace, encryptKey, text, TEXT_MODELS, IMAGE_MODELS, addAgent, addMission, missionById, queueMission, approveMission, cancelMission, recoverStale } from './domain.mjs';
import { recordExperiment } from './market.mjs';
import { createRunner } from './runner.mjs';
import { createProject, projectAction, reconcileProjects, syncAutonomy } from './autonomy.mjs';

export function createApp({ store, provider, staticDirectory = '../frontend/dist', allowedOrigins = [], masterKey = null }) {
  const runner = createRunner(store, provider, { masterKey });
  const rates = new Map();
  const root = resolve(staticDirectory);
  function send(response, status, body, headers = {}) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  }
  async function body(request) {
    let size = 0; const chunks = [];
    for await (const chunk of request) { size += chunk.length; if (size > 20000) throw new AppError('Dados enviados excedem o limite.', 413); chunks.push(chunk); }
    try { const parsed = JSON.parse(Buffer.concat(chunks).toString() || '{}'); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed; }
    catch { throw new AppError('JSON inválido.'); }
  }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/health' && request.method === 'GET') return send(response, 200, { status: 'ok', service: 'hubloan-agents', storage: store.mode });
      if (!url.pathname.startsWith('/api/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') throw new AppError('Rota não encontrada.', 404);
        const path = resolve(root, '.' + decodeURIComponent(url.pathname));
        if (path !== root && !path.startsWith(root + sep)) throw new AppError('Rota não encontrada.', 404);
        let data, extension;
        try { data = await readFile(path); extension = extname(path); }
        catch { if (extname(url.pathname)) throw new AppError('Arquivo não encontrado.', 404); data = await readFile(resolve(root, 'index.html')); extension = '.html'; }
        const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }[extension] || 'application/octet-stream';
        return send(response, 200, request.method === 'HEAD' ? '' : data, { 'Content-Type': mime + (['.html', '.js', '.css'].includes(extension) ? '; charset=utf-8' : ''), 'Cache-Control': url.pathname.startsWith('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache' });
      }
      if (!url.pathname.startsWith('/api/agents')) throw new AppError('Este servidor agora atende a central de agentes.', 404);
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.includes(origin) && origin !== `https://${request.headers.host}` && origin !== `http://${request.headers.host}`) throw new AppError('Origem não autorizada.', 403);
      if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); }
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      const token = request.headers.authorization?.replace(/^Bearer /, '') || '';
      const id = workspaceId(token);
      const rateKey = `${request.socket.remoteAddress}:${id}`;
      const now = Date.now();
      if (rates.size > 10000) for (const [key, entry] of rates) if (entry.reset <= now) rates.delete(key);
      const rate = rates.get(rateKey) || { count: 0, reset: now + 60000 };
      if (rate.reset <= now) { rate.count = 0; rate.reset = now + 60000; }
      if (++rate.count > 120) throw new AppError('Muitas requisições. Aguarde um minuto.', 429);
      rates.set(rateKey, rate);
      runner.unlock(id, token);
      const route = url.pathname.slice('/api/agents'.length);
      if (route === '/workspace' && request.method === 'GET') {
        const snapshot = await store.read(id);
        if (snapshot.workspace.missions.some(item => item.status === 'running' && item.leaseUntil < now) || snapshot.workspace.autonomy.projects.some(project => ['active', 'planning'].includes(project.status) && (project.expiresAt < now || (project.status === 'planning' && project.leaseUntil < now)))) {
          const updated = await store.mutate(id, workspace => { recoverStale(workspace); reconcileProjects(workspace); });
          return send(response, 200, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
        }
        return send(response, 200, publicWorkspace(snapshot.workspace, store.mode, Boolean(masterKey)));
      }
      if (route === '/settings' && request.method === 'POST') {
        const input = await body(request);
        if (!TEXT_MODELS.includes(input.model) || !IMAGE_MODELS.includes(input.imageModel)) throw new AppError('Modelo inválido.');
        const current = (await store.read(id)).workspace;
        const key = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
        if (!key && !current.secret) throw new AppError('Informe sua chave da OpenAI.');
        if (key) {
          if (!key.startsWith('sk-') || key.length < 20 || key.length > 1000 || /\s/.test(key)) throw new AppError('Formato de chave inválido.');
          await provider.validate(key, input.model);
        }
        const updated = await store.mutate(id, workspace => {
          workspace.settings = { model: input.model, imageModel: input.imageModel, maxOutputTokens: 1800 };
          if (key) workspace.secret = encryptKey(key, token);
        });
        return send(response, 200, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      if (route === '/settings' && request.method === 'DELETE') {
        const updated = await store.mutate(id, workspace => {
          delete workspace.secret;
          for (const project of workspace.autonomy.projects) { project.status = 'paused'; project.phase = 'Conexão removida'; }
          syncAutonomy(workspace);
          runner.cancelPlanning(id);
          for (const mission of workspace.missions) if (['queued', 'running'].includes(mission.status)) { runner.cancel(id, mission.id); mission.status = 'cancelled'; mission.phase = 'Conexão removida'; }
        });
        return send(response, 200, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      if (route === '/projects' && request.method === 'POST') {
        const input = await body(request);
        const updated = await store.mutate(id, workspace => createProject(workspace, input, token, masterKey));
        return send(response, 201, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      const feedbackRoute = route.match(/^\/projects\/([a-f0-9-]+)\/decisions\/([a-f0-9-]+)\/feedback$/);
      if (feedbackRoute && request.method === 'POST') {
        const input = await body(request);
        const updated = await store.mutate(id, workspace => recordExperiment(workspace, feedbackRoute[1], feedbackRoute[2], input));
        return send(response, 200, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      const projectRoute = route.match(/^\/projects\/([a-f0-9-]+)\/(pause|resume)$/);
      if (projectRoute && request.method === 'POST') {
        const updated = await store.mutate(id, workspace => projectAction(workspace, projectRoute[1], projectRoute[2], token, masterKey));
        if (projectRoute[2] === 'pause') runner.cancelPlanning(id);
        return send(response, 200, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      if (route === '/agents' && request.method === 'POST') {
        const input = await body(request);
        const updated = await store.mutate(id, workspace => addAgent(workspace, input));
        return send(response, 201, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      const agentRoute = route.match(/^\/agents\/([a-zA-Z0-9-]+)$/);
      if (agentRoute && request.method === 'PATCH') {
        const input = await body(request);
        if (typeof input.enabled !== 'boolean') throw new AppError('Estado inválido.');
        const updated = await store.mutate(id, workspace => {
          const agent = workspace.agents.find(item => item.id === agentRoute[1]);
          if (!agent) throw new AppError('Agente não encontrado.', 404);
          agent.enabled = input.enabled;
        });
        return send(response, 200, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      if (route === '/missions' && request.method === 'POST') {
        const input = await body(request);
        const updated = await store.mutate(id, workspace => { const mission = addMission(workspace, input); if (input.execute === true) queueMission(workspace, mission.id); });
        return send(response, 201, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      const action = route.match(/^\/missions\/([a-f0-9-]+)\/(run|cancel|approve|artifact)$/);
      if (action) {
        const [, missionId, operation] = action;
        if (operation === 'artifact' && request.method === 'GET') {
          const mission = missionById((await store.read(id)).workspace, missionId);
          if (!mission.artifact) throw new AppError('Imagem ainda não disponível.', 404);
          return send(response, 200, Buffer.from(mission.artifact.base64, 'base64'), { 'Content-Type': mission.artifact.mime, 'Content-Disposition': `attachment; filename="${mission.artifact.filename}"` });
        }
        if (request.method !== 'POST' || operation === 'artifact') throw new AppError('Método inválido.', 405);
        const updated = await store.mutate(id, workspace => {
          if (operation === 'run') queueMission(workspace, missionId);
          else if (operation === 'approve') approveMission(workspace, missionId);
          else cancelMission(workspace, missionId);
        });
        if (operation === 'cancel') runner.cancel(id, missionId);
        return send(response, 200, publicWorkspace(updated.workspace, store.mode, Boolean(masterKey)));
      }
      throw new AppError('Rota não encontrada.', 404);
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      if (!(error instanceof AppError)) console.error('Falha interna ao atender a central de agentes.');
      send(response, error instanceof AppError ? error.status : 500, { error: error instanceof AppError ? error.message : 'O servidor não conseguiu concluir a ação. Tente novamente.' });
    }
  });
  return { server, runner, close: async () => { await runner.close(); await new Promise(resolveClose => server.close(resolveClose)); } };
}
