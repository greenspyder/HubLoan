import { publicCosts } from './ai-costs.mjs';
import { publicKnowledge } from './knowledge.mjs';
import { publicExperiments } from './experiments.mjs';
import { publicEngineering } from './engineering.mjs';
import { publicMarketing } from './marketing.mjs';
import { publicShop } from './shop.mjs';
import { businessStrategy } from './strategy.mjs';
import { publicCommerce } from './commerce.mjs';
import { createHash, createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const TEXT_MODELS = ['gpt-4.1-mini', 'gpt-4.1'];
export const IMAGE_MODELS = ['gpt-image-1-mini', 'gpt-image-1.5'];
export function workspaceId(token) {
  if (!/^[a-f0-9]{64}$/.test(token ?? '')) throw new AppError('Código de acesso inválido.', 401);
  return createHash('sha256').update(token).digest('hex');
}
export function encryptKey(key, token) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(token, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}
export function decryptKey(secret, token) {
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(token, 'hex'), Buffer.from(secret.iv, 'base64'));
  cipher.setAuthTag(Buffer.from(secret.tag, 'base64'));
  return Buffer.concat([cipher.update(Buffer.from(secret.data, 'base64')), cipher.final()]).toString('utf8');
}
export function initialWorkspace() {
  return { version: 2, agents: [
    { id: 'research', name: 'Atlas', role: 'Pesquisa e planejamento', enabled: true },
    { id: 'creator', name: 'Nova', role: 'Produção de conteúdo', enabled: true },
    { id: 'reviewer', name: 'Sentinel', role: 'Revisão e qualidade', enabled: true },
  ], missions: [], settings: { model: 'gpt-4.1-mini', imageModel: 'gpt-image-1-mini', maxOutputTokens: 1800 } };
}
export function publicWorkspace(workspace, storage, durableAutonomy = false) {
  return { version: 2, aiCosts: publicCosts(workspace), knowledge: publicKnowledge(workspace), experiments: publicExperiments(workspace), engineering: publicEngineering(workspace), strategy: businessStrategy, marketing: publicMarketing(workspace), shop: publicShop(workspace), commerce: publicCommerce(workspace), autonomy: { projects: workspace.autonomy?.projects || [], enabled: Boolean(workspace.autonomy?.enabled), durable: durableAutonomy }, agents: workspace.agents, missions: workspace.missions.map(({ artifact, ...mission }) => ({ ...mission, hasArtifact: Boolean(artifact), hasPreview: Boolean(artifact?.preview), artifactMime: artifact?.mime, artifactFilename: artifact?.filename })), settings: { model: workspace.settings.model, imageModel: workspace.settings.imageModel, maxOutputTokens: workspace.settings.maxOutputTokens, configured: Boolean(workspace.secret) }, storage };
}
export function text(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new AppError(`${name}: informe de 1 a ${max} caracteres.`);
  return value.trim();
}
export function addAgent(workspace, body) {
  if (workspace.agents.length >= 30) throw new AppError('Limite de 30 agentes atingido.');
  workspace.agents.push({ id: randomUUID(), name: text(body.name, 'Nome', 40), role: text(body.role, 'Função', 100), enabled: true });
}
export function addMission(workspace, body) {
  if (workspace.missions.length >= 200) throw new AppError('Limite de 200 missões. Exporte as entregas antes de criar outro espaço.');
  if (!workspace.agents.some(agent => agent.id === body.agentId && agent.enabled)) throw new AppError('Escolha um agente disponível.');
  if (!['text', 'image', 'thumbnail', 'sprites', 'model3d'].includes(body.kind)) throw new AppError('Tipo de entrega inválido.');
  const mission = { id: randomUUID(), title: text(body.title, 'Título', 100), brief: text(body.brief, 'Briefing', 6000), agentId: body.agentId, kind: body.kind, status: 'draft', output: '', error: '', phase: 'Pronta para executar', createdAt: new Date().toISOString(), events: [], tokens: 0, images: 0, attempt: 0 };
  workspace.missions.unshift(mission);
  return mission;
}
export function missionById(workspace, id) {
  const mission = workspace.missions.find(item => item.id === id);
  if (!mission) throw new AppError('Missão não encontrada.', 404);
  return mission;
}
export function queueMission(workspace, id) {
  const mission = missionById(workspace, id);
  if (!workspace.secret) throw new AppError('Conecte sua chave da OpenAI primeiro.');
  if (!['draft', 'failed', 'cancelled'].includes(mission.status)) throw new AppError('Esta missão já foi executada ou está em andamento.', 409);
  if (!workspace.agents.some(agent => agent.id === mission.agentId && agent.enabled)) throw new AppError('Reative o agente antes de executar.');
  if (workspace.missions.filter(item => ['queued', 'running'].includes(item.status)).length >= 5) throw new AppError('Aguarde as missões atuais: o limite é cinco na fila.');
  Object.assign(mission, { status: 'queued', phase: 'Na fila', error: '', output: '', artifact: undefined, events: [], attempt: mission.attempt + 1 });
}
export function approveMission(workspace, id) {
  const mission = missionById(workspace, id);
  if (mission.status !== 'review') throw new AppError('Somente entregas em revisão podem ser aprovadas.', 409);
  mission.status = 'approved'; mission.phase = 'Entrega aprovada';
}
export function cancelMission(workspace, id) {
  const mission = missionById(workspace, id);
  if (!['queued', 'running'].includes(mission.status)) throw new AppError('A missão não está em execução.', 409);
  mission.status = 'cancelled'; mission.phase = 'Cancelada';
}
export function recoverStale(workspace, now = Date.now()) {
  for (const mission of workspace.missions) {
    if (mission.status === 'running' && mission.leaseUntil < now) {
      mission.status = 'failed'; mission.phase = 'Execução interrompida';
      mission.error = 'A execução foi interrompida pelo servidor. Você pode tentar novamente; chamadas anteriores podem ter sido cobradas.';
    }
  }
}
