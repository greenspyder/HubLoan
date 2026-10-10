import { releaseVersion } from './shop-release.mjs';
import { publicEtsy } from './etsy.mjs';
import { modelCatalog } from './models.mjs';
import { publicFactories, missionFactoryId, requireFactoryProduction } from './factories.mjs';
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
export const TEXT_MODELS = modelCatalog.map(m => m.id);
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
  return { version: 2, salesJourneyVersion: 2, etsy:publicEtsy(workspace), factories: publicFactories(workspace, publicExperiments(workspace)), aiCosts: publicCosts(workspace), knowledge: publicKnowledge(workspace), experiments: publicExperiments(workspace), engineering: publicEngineering(workspace), strategy: businessStrategy, marketing: publicMarketing(workspace), shop: publicShop(workspace), commerce: publicCommerce(workspace), autonomy: { projects: workspace.autonomy?.projects || [], enabled: Boolean(workspace.autonomy?.enabled), durable: durableAutonomy }, agents: workspace.agents, missions: workspace.missions.map(({ artifact, execution, executionHistory, revisions, ...mission }) => ({ ...mission, completedSteps: execution?.checkpoints?.length || 0, reviewVersions: (revisions || []).map(r => ({ id:r.id, at:r.at, feedback:r.feedback, components:r.components })), reviewComponents: mission.kind === 'sprites' && execution?.checkpoints?.filter(c => c.kind === 'image').length === 4 ? [1,2,3,4].map(i => `sprites/object-${i}.png`) : [], releaseVersion: releaseVersion({ ...mission, artifact }), factoryId: missionFactoryId(workspace, mission), hasArtifact: Boolean(artifact), hasPreview: Boolean(artifact?.preview), artifactMime: artifact?.mime, artifactFilename: artifact?.filename })), settings: { model: workspace.settings.model, workerModel: workspace.settings.workerModel || 'gpt-4.1-mini', decisionModel: workspace.settings.decisionModel || 'gpt-4.1-mini', modelCatalog, availableModels: workspace.settings.availableModels || [], modelsCheckedAt: workspace.settings.modelsCheckedAt, imageModel: workspace.settings.imageModel, maxOutputTokens: workspace.settings.maxOutputTokens, configured: Boolean(workspace.secret) }, storage };
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
  if (body.factoryId) { requireFactoryProduction(workspace, body.factoryId, body.kind); mission.factoryId = body.factoryId; }
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
  mission.events ||= [];
  mission.attempts ||= [];
  if (mission.attempt) mission.attempts.push({ attempt: mission.attempt, executionId: mission.executionId, status: mission.status, error: mission.error, endedAt: new Date().toISOString() });
  Object.assign(mission, { status: 'queued', phase: 'Na fila para retomar', error: '', budgetBlock: undefined, executionId: randomUUID(), attempt: (mission.attempt || 0) + 1 });
  mission.events.push({ at: new Date().toISOString(), message: `Tentativa ${mission.attempt}: etapas concluídas serão preservadas.` });
}
export function approveMission(workspace, id, body = {}) {
  const mission = missionById(workspace, id);
  if (mission.status !== 'review') throw new AppError('Somente entregas em revisão podem ser aprovadas.', 409);
  if (mission.qualityReview && mission.qualityReview.decision !== 'APPROVE') {
    if (body.override !== true || body.version !== releaseVersion(mission)) throw new AppError('Sentinel não aprovou a qualidade. Corrija os objetos ou justifique uma revisão humana explícita da versão atual.', 409);
    const reason = text(body.reason, 'Justificativa da revisão humana', 2000);
    (mission.reviews ||= []).push({ decision:'HUMAN_OVERRIDE', feedback:reason, at:new Date().toISOString() });
  }
  mission.status = 'approved'; mission.phase = 'Entrega aprovada';
}
export function reviewMission(workspace, id, body) {
  const mission = missionById(workspace, id);
  if (!['review', 'approved', 'rejected'].includes(mission.status)) throw new AppError('Aguarde a entrega antes de revisá-la.', 409);
  if (body.version !== releaseVersion(mission)) throw new AppError('A entrega mudou. Atualize e revise a versão atual.', 409);
  const feedback = text(body.feedback, 'Feedback', 2000);
  if (!['reject', 'adjust'].includes(body.decision)) throw new AppError('Decisão de revisão inválida.');
  if (body.decision === 'reject') {
    mission.status = 'rejected'; mission.phase = 'Entrega rejeitada';
    (mission.reviews ||= []).push({ decision:'REJECT', feedback, at:new Date().toISOString() });
    mission.events.push({ at:new Date().toISOString(), message:`Entrega rejeitada: ${feedback}` });
    delete mission.shopRelease;
    return;
  }
  if (!Array.isArray(body.components)) throw new AppError('Informe uma lista de objetos para ajustar.');
  const components = [...new Set(body.components)];
  const images = mission.execution?.checkpoints.filter(c => c.kind === 'image') || [];
  if (mission.kind !== 'sprites' || images.length !== 4 || !components.length || components.some(c => !/^sprites\/object-[1-4]\.png$/.test(c))) throw new AppError('Selecione objetos de um pack com quatro checkpoints de imagem válidos. Entregas antigas precisam de revisão manual.', 409);
  const intent = createHash('sha256').update(JSON.stringify(['production-v1', mission.title, mission.brief, mission.kind, mission.agentId])).digest('hex');
  if (mission.execution.fingerprint !== intent) throw new AppError('O briefing mudou desde a produção. Nenhum ajuste parcial foi iniciado.', 409);
  // Verify all source outputs before removing any checkpoint or queueing paid work.
  for (const c of mission.execution.checkpoints) if (createHash('sha256').update(JSON.stringify(c.result)).digest('hex') !== c.resultHash) throw new AppError('Checkpoint inválido. Nenhum ajuste foi iniciado.', 409);
  (mission.revisions ||= []).push({ id:randomUUID(), at:new Date().toISOString(), feedback, components, artifact:mission.artifact, output:mission.output, qualityReview:mission.qualityReview, execution:structuredClone(mission.execution) });
  images.forEach((c,i) => { c.componentId ||= `sprites/object-${i+1}.png`; });
  mission.execution.corrections ||= {};
  for (const c of components) mission.execution.corrections[c] = feedback;
  mission.execution.checkpoints = mission.execution.checkpoints.filter(c => c.kind !== 'vision' && !components.includes(c.componentId));
  delete mission.shopRelease;
  mission.status = 'failed';
  queueMission(workspace, id);
  (mission.reviews ||= []).push({ decision:'REGENERATE_PARTIAL', feedback, components, at:new Date().toISOString() });
  mission.events.push({ at:new Date().toISOString(), message:`Ajustes solicitados: ${components.join(', ')}. Demais objetos preservados.` });
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
