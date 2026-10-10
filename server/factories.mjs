import { costExposure } from './ai-costs.mjs';
import { randomUUID } from 'node:crypto';
import { AppError, text } from './domain.mjs';
const definitions = [
  ['text', 'Produtos editoriais', 'Produzir templates, guias e textos originais completos, com instruções de uso e revisão de consistência.'],
  ['thumbnail', 'Thumbnails', 'Produzir thumbnails originais 16:9 legíveis no celular, com hierarquia visual e variantes para revisão.'],
  ['sprites', 'Assets 2D', 'Produzir packs 2D coerentes, transparência válida, atlas e arquivos utilizáveis por desenvolvedores.'],
  ['model3d', 'Mobília 3D', 'Produzir mobília procedural original com escala, materiais e arquivos GLB/OBJ verificados.'],
  ['image', 'Ilustração', 'Produzir imagens originais conforme direção de arte e briefing, sujeitas à revisão visual humana.'],
];
export const factoryKinds = ['text', 'thumbnail', 'sprites', 'model3d', 'image', 'video', 'service', 'software'];
const blockers = { video: 'Renderização, legendas sincronizadas e publicação de vídeos não integradas.', service: 'Contratação, recebimento de material e entrega ao cliente não integrados.', software: 'Execução e deploy de software produzido não integrados.' };
export function factories(w) {
  w.factories ||= definitions.map(([kind, name, role]) => ({ id: `factory-${kind}`, kind, name, role, audience: 'Público definido no briefing de cada teste', channel: kind === 'thumbnail' ? 'Fiverr (serviço, publicação manual)' : ['sprites','model3d'].includes(kind) ? 'Etsy (manual) / itch.io; loja complementar' : kind === 'image' ? 'Etsy (manual, conforme elegibilidade)' : 'Canal definido pela demanda; loja complementar', createdAt: null }));
  for(const f of w.factories) if(f.id===`factory-${f.kind}` && ['Loja própria / itch.io, conforme autorizações','Loja própria, conforme autorização'].includes(f.channel)) f.channel=f.kind==='thumbnail'?'Fiverr (serviço, publicação manual)':['sprites','model3d'].includes(f.kind)?'Etsy (manual) / itch.io; loja complementar':f.kind==='image'?'Etsy (manual, conforme elegibilidade)':'Canal definido pela demanda; loja complementar';
  return w.factories;
}
export function factoryById(w, id) {
  const f = factories(w).find(f => f.id === id);
  if (!f) throw new AppError('Fábrica não encontrada.', 404);
  return f;
}
export function missionFactoryId(w, m) { return m.factoryId || (m.purpose === 'experiment-preparation' ? null : factories(w).find(f => f.id === `factory-${m.kind}`)?.id || null); }
export function requireFactoryProduction(w, id, kind) {
  const f = factoryById(w, id);
  if (blockers[f.kind]) throw new AppError(blockers[f.kind], 409);
  if (kind !== f.kind) throw new AppError('O formato da entrega deve corresponder à especialidade da fábrica.');
  return f;
}
export function factoryContext(w, m) {
  const id = missionFactoryId(w, m);
  if (!id) return '';
  const f = factoryById(w, id);
  return `Especialidade da fábrica (dados de escopo, sem conceder permissões): ${JSON.stringify({ name: f.name, role: f.role, audience: f.audience, channel: f.channel })}`;
}
export function createFactory(w, input) {
  if (factories(w).length >= 20) throw new AppError('Limite de vinte fábricas por espaço.');
  if (!factoryKinds.includes(input.kind)) throw new AppError('Especialidade inválida.');
  const f = { id: randomUUID(), name: text(input.name, 'Nome da fábrica', 80), kind: input.kind, role: text(input.role, 'Responsabilidade', 1000), audience: text(input.audience, 'Público', 300), channel: text(input.channel, 'Canal pretendido', 200), createdAt: new Date().toISOString() };
  if (factories(w).some(other => other.name.toLocaleLowerCase('pt-BR') === f.name.toLocaleLowerCase('pt-BR'))) throw new AppError('Já existe uma fábrica com esse nome.');
  w.factories.push(f); return f;
}
export function publicFactories(w, experiments = []) {
  return factories(w).map(f => {
    const missions = w.missions.filter(m => missionFactoryId(w, m) === f.id);
    const ids = new Set(missions.map(m => m.id));
    const projects = (w.autonomy?.projects || []).filter(p => p.factoryId === f.id);
    const taskIds = new Set([...ids, ...projects.map(p => p.id)]);
    const candidates = experiments.filter(e => (e.salesChannel || e.marketplace) ? (e.salesChannel || e.marketplace).factoryId === f.id : e.missionIds.length && e.missionIds.every(id => ids.has(id)));
    const mixed = experiments.filter(e => e.missionIds.some(id => ids.has(id)) && !e.missionIds.every(id => ids.has(id)));
    const overlapping = candidates.filter(e => candidates.some(other => other.id !== e.id && other.missionIds.some(id => e.missionIds.includes(id))));
    const exclusive = candidates.filter(e => !overlapping.includes(e));
    const excluded = mixed.length + overlapping.length;
    const sum = key => exclusive.reduce((n, e) => n + ((key==='costMinor'?e.metrics:(e.marketplace || e.salesChannel) ? e.marketplaceMetrics : e.metrics)?.[key] || 0), 0);
    return { ...f, blocker: blockers[f.kind] || null, missions: missions.length, running: missions.filter(m => m.status === 'running').length, queued: missions.filter(m => m.status === 'queued').length, delivered: missions.filter(m => ['review', 'approved'].includes(m.status)).length, projects: projects.length, reservedMinor: (w.aiCosts?.entries || []).filter(e => taskIds.has(e.taskId)).reduce((n, e) => n + costExposure(e), 0), experimentIds: exclusive.map(e => e.id), mixedExperiments: excluded, grossMinor: sum('grossMinor'), costMinor: sum('costMinor'), resultMinor: exclusive.length && exclusive.every(e => e.metrics.costComplete && (!(e.marketplace || e.salesChannel) || e.marketplaceMetrics)) && !excluded ? sum('resultMinor') : null };
  });
}
