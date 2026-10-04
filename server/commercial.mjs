import { AppError, text } from './domain.mjs';
import { factoryById } from './factories.mjs';
const channels = ['fiverr','etsy','itchio'];
const integer = (v,name) => { if(!Number.isSafeInteger(v)||v<0||v>100000000) throw new AppError(`${name}: informe um inteiro não negativo.`); return v; };
export function commercialAction(w,e,action,input,now=Date.now()) {
  if(action==='marketplace-offer') {
    if(e.closedAt||now>=Date.parse(e.endsAt)) throw new AppError('Abra um novo teste para preparar outra oferta.',409);
    if(!channels.includes(input.channel)) throw new AppError('Canal inválido.');
    const f=factoryById(w,input.factoryId);
    if((w.shop?.products||[]).some(p=>e.missionIds.includes(p.missionId))) throw new AppError('Use um experimento separado da loja para evitar misturar receitas.',409);
    if(e.missionIds.some(id=>w.missions.find(m=>m.id===id)?.kind!==f.kind)) throw new AppError('A fábrica deve corresponder à amostra.');
    if(input.channel==='fiverr'&&f.kind!=='thumbnail') throw new AppError('Este fluxo Fiverr prepara serviços de thumbnails.');
    if(input.channel==='etsy'&&!['sprites','model3d','image','text'].includes(f.kind)) throw new AppError('Formato não suportado neste fluxo Etsy.');
    if(input.channel==='itchio'&&!['sprites','model3d'].includes(f.kind)) throw new AppError('Use itch.io para assets 2D/3D.');
    if(!e.validation?.evidence||!e.validation?.offer) throw new AppError('Registre a evidência e uma oferta no Modo Primeira Venda antes de preparar o anúncio.');
    if(now-Date.parse(e.validation.evidence.observedAt)>30*86400000) throw new AppError('Evidência vencida: planeje um teste atualizado.');
    if(e.marketplace?.observation) throw new AppError('Oferta com resultados registrados: use outro experimento.',409);
    e.marketplace={channel:input.channel,factoryId:f.id,title:text(input.title,'Título',140),description:text(input.description,'Descrição',4000),tags:text(input.tags,'Tags',300),license:text(input.license,'Licença / direitos',1000),status:'prepared-manual',at:new Date(now).toISOString()}; e.review=null;
  } else if(action==='marketplace-results') {
    const offer=e.marketplace;if(!offer) throw new AppError('Prepare uma oferta primeiro.');
    const reference=text(input.reference,'Referência do relatório e período',500);
    const listing=text(input.listing,'URL pública da oferta',1000);let url;try{url=new URL(listing);}catch{throw new AppError('URL inválida.');}
    const host=offer.channel==='itchio'?'itch.io':`${offer.channel}.com`;
    if(url.protocol!=='https:'||url.username||url.password||!(url.hostname===host||url.hostname.endsWith(`.${host}`))) throw new AppError('Use a URL HTTPS da oferta no marketplace selecionado.');
    url.search='';url.hash='';url.hostname=url.hostname.replace(/^www\./,'');const canonical=url.href.replace(/\/$/,'');
    if((w.experiments||[]).some(other=>other.id!==e.id&&other.marketplace?.observation?.listing===canonical)) throw new AppError('Esta oferta já está atribuída a outro experimento; evite duplicar receitas.',409);
    const observation={listing:canonical,reference,origin:'owner-declared-not-api-verified',currency:'BRL',at:new Date(now).toISOString(),period:text(input.period,'Período e conversão para BRL',500)};
    for(const k of ['grossMinor','refundedMinor','sales']) observation[k]=integer(input[k],k);
    if(observation.refundedMinor>observation.grossMinor) throw new AppError('Reembolso superior à receita.');
    if(observation.sales>0&&observation.grossMinor<=observation.refundedMinor)throw new AppError('Vendas retidas exigem receita não totalmente reembolsada.');
    for(const k of ['visits','leads','humanMinutes','repeatSales']) observation[k]=input[k]===null||input[k]===undefined?null:integer(input[k],k);
    if(observation.repeatSales>observation.sales) throw new AppError('Recompras superiores às vendas.');
    offer.history ||= []; if(offer.observation) offer.history.push(offer.observation);if(offer.history.length>=100)throw new AppError('Limite de revisões atingido.');
    offer.observation=observation;offer.status='externally-reported';e.review=null;
  } else throw new AppError('Ação comercial inválida.');
}
export function marketplaceMetrics(e,costComplete,costMinor) {
  const o=e.marketplace?.observation;if(!o)return null;
  return {...o,costMinor,resultMinor:costComplete?o.grossMinor-o.refundedMinor-costMinor:null,conversion:o.visits>0&&o.sales<=o.visits?o.sales/o.visits:null,confidence:'declarado pelo proprietário; não verificado pela API'};
}
