import type { Factory, Workspace } from './agentApi';

export const brl = (minor: number) => (minor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const factoryUrl = (id: string) => `/agentes/base?factory=${encodeURIComponent(id)}#factories`;
export const experimentUrl = (id?: string) => `/agentes/vendas#${id ? `experiment-${id}` : 'experiments'}`;

// Only persisted observations count as commercial milestones. No time-based income or XP.
export function factoryView(factory: Factory, workspace: Workspace) {
  const experiments = (workspace.experiments || []).filter(e => factory.experimentIds.includes(e.id));
  const sales = experiments.reduce((n, e) => n + (e.marketplace ? e.marketplaceMetrics?.sales || 0 : e.metrics.sales), 0);
  const hasObservation = experiments.some(e => !e.marketplace || e.marketplaceMetrics);
  const allObserved = experiments.length > 0 && experiments.every(e => !e.marketplace || e.marketplaceMetrics);
  const milestones = [
    { label: 'Teste definido', met: experiments.length > 0 },
    { label: 'Oferta preparada', met: experiments.some(e => Boolean(e.marketplace || e.validation?.offer)) },
    { label: 'Venda registrada', met: sales > 0 },
    { label: 'Resultado apurado', met: factory.resultMinor !== null && allObserved },
  ];
  const review = workspace.missions.some(m => (m.factoryId === factory.id || (!m.factoryId && factory.id === `factory-${m.kind}` && m.purpose !== 'experiment-preparation')) && m.status === 'review');
  const researching = workspace.autonomy.projects.some(p => p.factoryId === factory.id && p.status === 'planning');
  const state = factory.blocker ? ['blocked', 'Falta integração'] : factory.running ? ['working', 'Produzindo'] : researching ? ['working', 'Pesquisando'] : review ? ['attention', 'Revisão pendente'] : factory.queued ? ['waiting', 'Na fila'] : factory.resultMinor !== null && allObserved ? [factory.resultMinor > 0 ? 'positive' : 'attention', 'Resultado apurado'] : sales > 0 ? ['attention', 'Revisar custos'] : experiments.some(e => !e.ended) ? ['waiting', 'Validando demanda'] : ['idle', 'Em espera'];
  const first = experiments.find(e => !e.ended) || experiments[0];
  const action = factory.blocker ? { label: 'Ver o que falta', href: factoryUrl(factory.id) } : review ? { label: 'Revisar entrega', href: '/agentes/armazem' } : factory.running || factory.queued || researching ? { label: 'Acompanhar operação', href: factoryUrl(factory.id) } : first ? { label: sales > 0 && factory.resultMinor === null ? 'Apurar resultado' : 'Abrir teste comercial', href: experimentUrl(first.id) } : { label: 'Planejar primeiro teste', href: experimentUrl() };
  return { experiments, sales, hasObservation, allObserved, milestones, state: state[0], status: state[1], action };
}

export function economicView(workspace: Workspace) {
  const experiments = workspace.experiments || [];
  const external = experiments.filter(e => e.marketplace);
  const declared = external.reduce((n, e) => n + (e.marketplaceMetrics?.grossMinor || 0), 0);
  const confirmed = workspace.shop?.metrics;
  const complete = experiments.length > 0 && experiments.every(e => e.metrics.costComplete && (e.marketplace ? e.marketplaceMetrics?.resultMinor != null : e.metrics.resultMinor != null));
  const result = complete ? experiments.reduce((n, e) => n + (e.marketplace ? e.marketplaceMetrics!.resultMinor! : e.metrics.resultMinor!), 0) : null;
  return {
    declared, confirmed,
    costs: experiments.reduce((n, e) => n + e.metrics.costMinor, 0),
    result,
    sales: (confirmed?.purchases || 0) + external.reduce((n, e) => n + (e.marketplaceMetrics?.sales || 0), 0),
    active: experiments.filter(e => !e.ended).length,
    pendingObservations: external.filter(e => !e.marketplaceMetrics).length,
  };
}
