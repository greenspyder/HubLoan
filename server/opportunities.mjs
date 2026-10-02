import { AppError, text } from './domain.mjs';
export const opportunityResearch = 'Investigue estratégias atuais de lucro além de packs: canais de vídeos curtos por nicho (roteiros originais, edição, legendas e distribuição), serviços de conteúdo, produtos digitais e utilitários. Inclua ao menos uma estratégia de conteúdo ou serviço se houver evidência. Pesquise sinais datados, concorrência, comprador ou pagador, caminho de monetização, requisitos de programas, custos de produção/API/taxas/distribuição, direitos autorais e ferramentas necessárias. Priorize pedidos públicos recentes de serviços, com URL e data, e diferencie pedido explícito de interesse inferido. Considere uma amostra para um público específico antes de coleção; descreva escopo/preço proposto/prazo, revisão humana, custos por entrega desconhecidos, janela e critério de continuar/parar, além de possibilidade de recompra sem afirmar clientes existentes. Views, tendências e preços anunciados não comprovam receita nem lucro. Diferencie produção de roteiro de vídeo pronto, e de publicação. CapCut/TikTok não estão integrados. Não limite a pesquisa às capacidades atuais: registre também oportunidades bloqueadas, sem executar ações externas.';
export function executionCapabilities(w, market = {}) {
  const shop = w.shop, marketing = w.marketing, now = Date.now();
  return {
    text: { available: true, detail: 'Texto/código em Markdown; código não é executado.' },
    image: { available: market.allowImages === true, detail: 'Imagem PNG; requer autorização de geração.' },
    thumbnail: { available: market.allowImages === true, detail: 'Thumbnails 16:9; requer autorização de geração.' },
    sprites: { available: market.allowImages === true, detail: 'Pack 2D; requer autorização de geração.' },
    model3d: { available: true, detail: 'Mobília procedural de caixas GLB/OBJ.' },
    storefront_publish: { available: Boolean(shop?.enabled && shop.livemode && shop.autoPublish && shop.expiresAt > now), detail: 'Loja Stripe real aberta com publicação automática autorizada.' },
    mastodon_publish: { available: Boolean(marketing?.enabled && marketing.expiresAt > now && marketing.channels?.mastodon?.secret), detail: 'Anúncios de produtos da loja, não publicação de qualquer conteúdo ou vídeo.' },
    telegram_publish: { available: Boolean(marketing?.enabled && marketing.expiresAt > now && marketing.channels?.telegram?.secret), detail: 'Anúncios de produtos da loja no canal conectado.' },
    itchio_publish: { available: Boolean(w.commerce?.autoPublish && w.commerce?.background && w.commerce?.expiresAt > now && w.commerce?.secret && w.commerce?.license && w.commerce.uploads < w.commerce.maxUploads), targets: Object.keys(w.commerce?.targets || {}), detail: 'Packs 2D/3D em páginas existentes autorizadas.' },
    video_render: { available: false, detail: 'Exportação de MP4 ainda não implementada.' },
    video_caption: { available: false, detail: 'Transcrição e sincronização de legendas em áudio/vídeo ainda não implementadas.' },
    capcut_edit: { available: false, detail: 'Editor CapCut não conectado.' },
    tiktok_publish: { available: false, detail: 'TikTok não conectado; API exige auditoria para alcance público e consentimento do criador.' },
    youtube_publish: { available: false, detail: 'Publicação de vídeos no YouTube não integrada.' },
    service_fulfillment: { available: false, detail: 'Contratação, recebimento de material do cliente e entrega de serviços não integrados.' },
    software_deploy: { available: false, detail: 'Código gerado não é executado nem implantado.' },
  };
}
export function assessOpportunity(candidate, capabilities, allowPreparation = false) {
  if (!['digital_product', 'content_channel', 'service', 'software'].includes(candidate.businessModel)) throw new AppError('Modelo de negócio inválido.');
  if (!['storefront', 'itchio', 'mastodon', 'telegram', 'tiktok', 'youtube', 'website', 'other'].includes(candidate.platform)) throw new AppError('Plataforma da estratégia inválida.');
  if (!Array.isArray(candidate.requiredCapabilities) || !candidate.requiredCapabilities.length || candidate.requiredCapabilities.length > 10 || candidate.requiredCapabilities.some(c => typeof c !== 'string' || !/^[a-z][a-z0-9_]{0,49}$/.test(c))) throw new AppError('Informe ferramentas necessárias para a estratégia.');
  const required = new Set([...candidate.requiredCapabilities, candidate.kind]);
  // Server rules prevent a model from disguising a video/service as an executable text product.
  if (candidate.businessModel === 'content_channel') { required.add('video_render'); required.add('video_caption'); }
  if (candidate.businessModel === 'service') required.add('service_fulfillment');
  if (candidate.businessModel === 'software') required.add('software_deploy');
  const publication = { storefront: 'storefront_publish', itchio: 'itchio_publish', mastodon: 'mastodon_publish', telegram: 'telegram_publish', tiktok: 'tiktok_publish', youtube: 'youtube_publish', website: 'website_publish', other: 'external_publish' };
  required.add(publication[candidate.platform]);
  if (candidate.platform === 'tiktok' || candidate.platform === 'youtube') { required.add('video_render'); required.add('video_caption'); }
  if (candidate.platform === 'itchio' && !capabilities.itchio_publish?.targets?.includes(candidate.kind)) required.add('itchio_target');
  if (['mastodon', 'telegram'].includes(candidate.platform)) required.add('storefront_publish');
  const missing = [...required].filter(c => capabilities[c]?.available !== true).map(c => ({ capability: c, reason: capabilities[c]?.detail || 'Ferramenta não implementada ou não conectada.' }));
  // Marketing only advertises listed goods. itch.io only ships supported game packs.
  if ((['mastodon', 'telegram', 'storefront'].includes(candidate.platform) && candidate.businessModel !== 'digital_product') || (candidate.platform === 'itchio' && !['sprites', 'model3d'].includes(candidate.kind))) missing.push({ capability: 'unsupported_workflow', reason: 'Esta integração não executa o modelo de negócio ou formato proposto.' });
  const costs = {};
  for (const key of ['production', 'api', 'distribution', 'fees']) costs[key] = text(candidate.costs?.[key], 'Custos conhecidos ou desconhecidos', 250);
  if (!Number.isInteger(candidate.experimentUnits) || candidate.experimentUnits < 1 || candidate.experimentUnits > 3) throw new AppError('O experimento deve ter de uma a três unidades.');
  return { businessModel: candidate.businessModel, platform: candidate.platform, monetization: text(candidate.monetization, 'Caminho de receita', 500), costs, successCriterion: text(candidate.successCriterion, 'Critério para continuar ou parar', 500), experimentUnits: candidate.experimentUnits, requiredCapabilities: [...required], execution: { status: missing.length ? allowPreparation ? 'preparation' : 'blocked' : 'executable', missing, note: missing.length ? 'Pode preparar um kit em Markdown. O fluxo comercial completo não será executado.' : 'Etapas disponíveis nas integrações autorizadas; publicação não comprova receita.' } };
}
export function preparationBrief(candidate) {
  return `PREPARAÇÃO DE EXPERIMENTO, NÃO EXECUÇÃO DA ESTRATÉGIA. Hipótese: ${candidate.title}; público: ${candidate.audience}; receita: ${candidate.monetization}; teste: ${candidate.test}; critério: ${candidate.successCriterion}. Prepare até ${candidate.experimentUnits} exemplos originais em Markdown. Para vídeo, inclua roteiro, gancho, texto das legendas e instruções de edição; tempos são sugestões, não transcrição ou legendas sincronizadas de um vídeo existente. Para serviço, prepare uma única oferta, escopo, preço proposto não validado, prazo, entregáveis e uma amostra original; inclua critérios para revisão humana e identifique custos ainda desconhecidos. Defina janela, limite declarado de gastos e critério de continuar/parar; esse limite não bloqueia cobranças. Sugira recompra apenas como hipótese, sem inventar clientes ou satisfação. Não envie mensagens privadas nem colete contatos pessoais; para software, especificação e protótipo não executado. Liste custos desconhecidos e etapas manuais: ${candidate.execution.missing.map(m => m.capability).join(', ')}. Não baixe clipes, copie material de terceiros, publique, alegue clientes/vendas/edição concluída nem invente resultados. Entrega privada, não é um produto publicável automaticamente.`;
}
