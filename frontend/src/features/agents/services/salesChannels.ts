import type { BusinessExperiment, Factory, SalesChannel, Workspace } from './agentApi';
export type MarketplaceId = SalesChannel['channel'];
export const marketplaceNames = { fiverr: 'Fiverr', etsy: 'Etsy', itchio: 'itch.io' };
export function factoryChannels(f: Factory): MarketplaceId[] {
  return f.kind === 'thumbnail' ? ['fiverr'] : ['sprites', 'model3d'].includes(f.kind) ? ['etsy', 'itchio'] : ['text', 'image'].includes(f.kind) ? ['etsy'] : [];
}
export function offerContext(e: BusinessExperiment) { return e.salesChannel || e.marketplace; }
export function existingOffer(w: Workspace, factoryId: string, channel: string) {
  return w.experiments?.find(e => !e.ended && offerContext(e)?.factoryId === factoryId && offerContext(e)?.channel === channel);
}
export function offerUrl(factoryId: string, channel: string, experimentId?: string) {
  const query = new URLSearchParams({ factory: factoryId, channel });
  if (experimentId) query.set('experiment', experimentId);
  return `/agentes/oferta?${query}`;
}
export function publicationState(e?: BusinessExperiment) {
  return !e ? 'Nenhuma oferta' : e.ended ? 'Teste encerrado' : e.marketplaceMetrics ? e.marketplaceMetrics.sales > 0 ? 'Venda declarada' : 'Resultados declarados' : e.marketplace?.publication ? 'Publicação informada · resultado desconhecido' : e.marketplace ? 'Oferta preparada · falta publicar' : 'Preparação iniciada';
}
export function channelState(w: Workspace, channel: string, factory?: Factory) {
  if(channel==='etsy') {const c=w.etsy;return {tone:c?.error?'error':c?.connected?'integrated':'unconfigured',label:c?.error?'Erro na operação Etsy':c?.connected?'Integrado · publicação após revisão':'Configuração necessária · assistido disponível',detail:c?.error||c?.note||'Autorize uma aplicação Etsy para publicação oficial. Enquanto isso, prepare e publique manualmente.'};}
  if (channel === 'fiverr' ) return { tone: 'manual', label: 'Fluxo assistido · publicação manual', detail: channel === 'fiverr' ? 'HubLoan prepara Gig, amostra e materiais; você publica e atende pedidos no Fiverr.' : 'HubLoan prepara listing, imagens, arquivos, título, descrição e tags; você publica no Etsy.' };
  if (channel === 'itchio') {
    const c = w.commerce;
    const missing = [!c?.configured && 'conectar a chave itch.io', !(factory ? c?.targets[factory.kind] : Object.keys(c?.targets || {}).length) && 'selecionar uma página pública de assets', !c?.license && 'definir a licença', c && c.uploads >= c.maxUploads && 'revisar o limite de uploads'].filter(Boolean);
    return { tone: c?.error ? 'error' : c?.configured ? 'integrated' : 'unconfigured', label: c?.error ? 'Erro na última operação' : c?.configured ? 'Integrado · conectado' : 'Não configurado', detail: c?.error || (missing.length ? `Falta ${missing.join('; ')}.` : 'Upload de packs para páginas existentes disponível. Criar página, definir preço e atendimento são externos.') };
  }
  const shop = w.shop;
  return { tone: shop?.error ? 'error' : shop?.configured && shop.livemode && shop.enabled ? 'integrated' : 'unconfigured', label: shop?.error ? 'Erro na última operação' : !shop?.configured ? 'Não configurada' : !shop.livemode ? 'Modo de teste' : !shop.enabled ? 'Configurada · catálogo fechado' : 'Integrada · pagamentos reais', detail: shop?.error || (!shop?.configured ? 'Conecte Stripe e configure recebimento, licença e preços.' : !shop.livemode ? 'Pagamentos de teste não contam como vendas reais.' : !shop.enabled ? 'Abra o catálogo quando seus produtos estiverem revisados.' : 'Sua loja própria: catálogo, pagamentos Stripe e entrega de arquivos. A aquisição de compradores depende da divulgação.') };
}
