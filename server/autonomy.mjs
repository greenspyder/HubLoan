import { requireFactoryProduction, factoryContext } from './factories.mjs';
import { marketGoal, marketSettings } from './market.mjs';
import { hkdfSync } from 'node:crypto';
import { AppError, text, encryptKey, decryptKey, workspaceId, addMission, queueMission } from './domain.mjs';

export function autonomyMasterKey({ encryptionKey, connectionString } = {}) {
  // Domain-separated derivation from an existing server secret. Never use a public identifier.
  const material = encryptionKey || (connectionString && (/^postgres(ql)?:\/\//i.test(connectionString) ? new URL(connectionString).password : connectionString.match(/(?:^|;)\s*Password\s*=\s*([^;]+)/i)?.[1]));
  if (!material || material.length < 12) return null;
  return Buffer.from(hkdfSync('sha256', material, 'hubloan-autonomy-v1', 'unattended-workspace-grants', 32)).toString('hex');
}
export function normalizeWorkspace(workspace) {
  workspace.autonomy ||= { enabled: false, projects: [] };
  for (const project of workspace.autonomy.projects) { project.mode ||= 'goal'; project.calls ||= 0; project.maxCalls ??= project.maxDeliveries * 7 + 1; project.decisions ||= []; }
  return workspace;
}
export function syncAutonomy(workspace) {
  workspace.autonomy.enabled = workspace.autonomy.projects.some(project => ['active', 'planning'].includes(project.status));
  if (!workspace.autonomy.enabled) delete workspace.autonomy.grant;
}
function grant(workspace, token, masterKey) {
  if (!workspace.secret) throw new AppError('Conecte a chave de IA antes de iniciar o ciclo.');
  if (!masterKey) throw new AppError('A hospedagem precisa de uma chave de servidor estável para autonomia após reinícios. A fila manual continua disponível.');
  workspace.autonomy.grant = encryptKey(token, masterKey);
}
export function unlockGrant(id, secret, masterKey) {
  const token = decryptKey(secret, masterKey);
  if (workspaceId(token) !== id) throw new Error('Grant belongs to another workspace.');
  return token;
}
export function createProject(workspace, input, token, masterKey, now = Date.now()) {
  normalizeWorkspace(workspace);
  if (workspace.autonomy.projects.length >= 10) throw new AppError('Limite de dez projetos por espaço.');
  const factory = input.factoryId ? requireFactoryProduction(workspace, input.factoryId, input.kind) : null;
  if (factory && input.mode && input.mode !== 'goal') throw new AppError('Use objetivo definido para uma fábrica específica; descoberta ampla distribui por formato.');
  const mode = input.firstSale === true ? 'discover' : input.mode || 'goal';
  if ((input.firstSale === true || input.budgetMinor != null) && (!Number.isSafeInteger(input.budgetMinor) || input.budgetMinor < 1 || input.budgetMinor > 10000000)) throw new AppError('Defina um teto monetário positivo em centavos para o projeto.');
  if (!['goal', 'discover'].includes(mode)) throw new AppError('Modo de autonomia inválido.');
  const maxCalls = input.maxCalls ?? input.maxDeliveries * 7 + 1;
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 200) throw new AppError('Limite de chamadas deve ser de uma a duzentas.');
  if (!['text', 'image', 'thumbnail', 'sprites', 'model3d'].includes(input.kind)) throw new AppError('Tipo de entrega inválido.');
  if (!Number.isInteger(input.maxDeliveries) || input.maxDeliveries < 1 || input.maxDeliveries > 20) throw new AppError('Escolha de uma a vinte entregas por projeto.');
  if (!Number.isInteger(input.intervalMinutes) || input.intervalMinutes < 1 || input.intervalMinutes > 1440) throw new AppError('O intervalo deve ser de um a 1.440 minutos.');
  if (typeof input.research !== 'boolean' || typeof input.start !== 'boolean') throw new AppError('Configuração de autonomia inválida.');
  if (input.start && workspace.autonomy.enabled) throw new AppError('Pause o projeto atual antes de iniciar outro.');
  if (input.start) grant(workspace, token, masterKey);
  const project = { id: crypto.randomUUID(), name: text(input.name || (mode === 'discover' ? 'Descoberta de oportunidades' : ''), 'Nome do projeto', 100), goal: mode === 'discover' ? (input.firstSale ? text(input.goal, 'Objetivo', 4000) : marketGoal) : text(input.goal, 'Objetivo', 4000), mode, market: mode === 'discover' ? marketSettings(input.market) : undefined, maxCalls, calls: 0, decisions: [], kind: input.kind, maxDeliveries: input.maxDeliveries, intervalMinutes: input.intervalMinutes, research: mode === 'discover' || input.research, status: input.start ? 'active' : 'paused', phase: input.start ? 'Coordenador aguardando o próximo ciclo' : 'Projeto pausado', produced: 0, tokens: 0, searches: 0, events: [], createdAt: new Date(now).toISOString(), nextRunAt: now, expiresAt: now + 72 * 3600000, error: '' };
  if (input.budgetMinor != null) project.budgetMinor = input.budgetMinor;
  if (input.firstSale === true) project.firstSale = true;
  if (factory) { project.factoryId = factory.id; project.goal = `${factoryContext(workspace, { factoryId: factory.id })}\nObjetivo: ${project.goal}`; }
  workspace.autonomy.projects.unshift(project); syncAutonomy(workspace); return project;
}
export function projectById(workspace, id) {
  const project = workspace.autonomy.projects.find(project => project.id === id);
  if (!project) throw new AppError('Projeto não encontrado.', 404);
  return project;
}
export function projectAction(workspace, id, action, token, masterKey, now = Date.now()) {
  const project = projectById(workspace, id);
  if (action === 'pause') { project.status = 'paused'; project.phase = 'Próximas tarefas pausadas'; }
  else {
    if (project.firstSale && project.decisions.length) throw new AppError('Revise a descoberta existente e prepare o experimento; retomar não deve repetir pesquisa paga.',409);
    if (project.calls >= project.maxCalls) throw new AppError('Limite de chamadas atingido. Crie um novo ciclo com um novo limite.');
    if (project.produced >= project.maxDeliveries) throw new AppError('Este projeto já atingiu seu limite. Crie outro com um novo objetivo.');
    if (workspace.autonomy.projects.some(other => other.id !== id && ['active', 'planning'].includes(other.status))) throw new AppError('Já existe um projeto ativo.');
    if (workspace.missions.some(mission => mission.projectId === id && ['failed', 'cancelled'].includes(mission.status))) throw new AppError('Há uma tarefa interrompida. Revise e tente novamente antes de retomar.');
    grant(workspace, token, masterKey); project.status = 'active'; project.phase = 'Coordenador aguardando o próximo ciclo'; project.nextRunAt = now; project.expiresAt = now + 72 * 3600000; project.error = '';
  }
  syncAutonomy(workspace);
}
export function reconcileProjects(workspace, now = Date.now()) {
  normalizeWorkspace(workspace);
  for (const project of workspace.autonomy.projects) {
    const missions = workspace.missions.filter(mission => mission.projectId === project.id);
    if (project.status === 'paused' && project.produced >= project.maxDeliveries && missions.length > 0 && missions.every(mission => ['review', 'approved'].includes(mission.status))) { project.status = 'completed'; project.phase = 'Todas as entregas produzidas'; }
    if (!['active', 'planning'].includes(project.status)) continue;
    const interrupted = missions.find(mission => ['failed', 'cancelled'].includes(mission.status));
    if (interrupted) { project.status = 'paused'; project.phase = 'Pausado após tarefa interrompida'; project.error = interrupted.error || 'Uma tarefa foi cancelada. Revise antes de retomar.'; }
    else if (project.status === 'planning' && project.leaseUntil < now) { project.status = 'paused'; project.phase = 'Coordenação interrompida'; project.error = 'O servidor interrompeu a coordenação. Retome manualmente; a chamada pode ter sido cobrada.'; }
    else if (now > project.expiresAt) { project.status = 'paused'; project.phase = 'Janela de 72 horas encerrada'; }
    else if (project.produced >= project.maxDeliveries && !missions.some(mission => ['queued', 'running'].includes(mission.status))) { project.status = 'completed'; project.phase = 'Todas as entregas produzidas'; }
  }
  syncAutonomy(workspace);
}
export function parseAssignment(output) {
  try { const parsed = JSON.parse(output.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); return { title: text(parsed.title, 'Título planejado', 100), brief: text(parsed.brief, 'Briefing planejado', 1500) }; }
  catch { throw new AppError('O coordenador não devolveu uma tarefa válida. O ciclo foi pausado para evitar novas cobranças.'); }
}
export function enqueueAssignment(workspace, project, assignment, now = Date.now()) {
  const agent = workspace.agents.find(agent => agent.id === 'creator' && agent.enabled) || workspace.agents.find(agent => agent.enabled);
  if (!agent) throw new AppError('Todos os agentes estão pausados.');
  const mission = addMission(workspace, { ...assignment, kind: assignment.kind || project.kind, factoryId: project.factoryId, agentId: agent.id });
  if (assignment.purpose === 'experiment-preparation') { mission.purpose = assignment.purpose; mission.phase = 'Preparando materiais; estratégia não executada'; }
  if (assignment.decisionId) mission.decisionId = assignment.decisionId;
  mission.projectId = project.id; mission.sequence = project.produced + 1; queueMission(workspace, mission.id);
  project.produced++; project.status = 'active'; project.phase = 'Tarefa distribuída para produção'; project.nextRunAt = now + project.intervalMinutes * 60000;
  project.events.push({ at: new Date(now).toISOString(), message: `Tarefa ${project.produced}/${project.maxDeliveries} criada: ${mission.title}` });
  return mission;
}
