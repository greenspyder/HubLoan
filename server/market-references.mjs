import { randomUUID, createHash } from 'node:crypto';
import { AppError, text } from './domain.mjs';
import { sampleFingerprint } from './validation.mjs';
export const REFERENCE_RULES = 'Compare de 3 a 5 ofertas de vendedores distintos obtidas legitimamente. Use apenas URLs retornadas pela pesquisa. Não raspe marketplaces, contorne login ou use endpoints privados. Registre marketplace, seller, category, product, url, observedAt, observedPrice (texto ou null), signals:[{kind:review|paid_request|bestseller|sales|favorite,value,scope,sourceUrl}], features:[característica geral], inference, hypothesis, ipRisk:unknown|low|high, opportunity. Cada sinal deve constar explicitamente na fonte; favorito/preço/review não prova vendas nem lucro. Separe observação de inferência e hipótese. Nunca reproduza logo, marca, personagem, artwork, fotografia, texto ou identidade específica. Se não houver dados suficientes retorne references:[]; não invente vencedores.';
export function normalizeReferences(items, sources, now=Date.now(), origin='research-extraction-not-independently-verified') {
 if(!Array.isArray(items)||items.length>5) throw new AppError('Compare até cinco referências.');
 if(new Set(items.map(r=>r.url)).size!==items.length)throw new AppError('Compare ofertas com URLs distintas.');
 const urls=new Set(sources.map(s=>s.url));
 return items.map(r=>{
  const u=new URL(r.url);if(u.protocol!=='https:'||u.username||u.password||!urls.has(u.href))throw new AppError('Referência fora das fontes pesquisadas.');
  const at=Date.parse(r.observedAt);if(!Number.isFinite(at)||at>now||now-at>30*86400000)throw new AppError('Referência exige observação nos últimos 30 dias.');
  if(!Array.isArray(r.signals)||r.signals.length>6||!Array.isArray(r.features)||!r.features.length||r.features.length>8)throw new AppError('Sinais/características inválidos.');
  const signals=r.signals.map(s=>{if(!['review','paid_request','bestseller','sales','favorite'].includes(s.kind)||!urls.has(s.sourceUrl))throw new AppError('Sinal sem fonte válida.');return {kind:s.kind,value:text(s.value,'Sinal observado',300),scope:text(s.scope,'Escopo do sinal',150),sourceUrl:s.sourceUrl};});
  if(!['unknown','low','high'].includes(r.ipRisk))throw new AppError('Declare o risco de similaridade.');
  return {id:randomUUID(),marketplace:text(r.marketplace,'Marketplace',40),seller:text(r.seller,'Vendedor',100),category:text(r.category,'Categoria',100),product:text(r.product,'Produto',150),url:u.href,observedAt:new Date(at).toISOString(),observedPrice:r.observedPrice==null?null:text(r.observedPrice,'Preço observado e moeda',100),signals,features:r.features.map(f=>text(f,'Característica',150)),inference:text(r.inference,'Inferência',500),hypothesis:text(r.hypothesis,'Hipótese',500),ipRisk:r.ipRisk,opportunity:text(r.opportunity,'Oportunidade original',500),origin};
 });
}
const norm=s=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
export function referenceComparison(refs=[]) {
 const sellers=new Set(refs.map(r=>norm(r.seller))), counts=new Map();
 for(const r of refs)for(const f of new Set(r.features.map(norm))){const set=counts.get(f)||new Set();set.add(norm(r.seller));counts.set(f,set);}
 const patterns=[...counts].filter(([,s])=>s.size>=2).map(([feature,s])=>({feature,sellers:s.size}));
 const sufficient=sellers.size>=3&&refs.filter(r=>r.signals.some(s=>['review','paid_request','bestseller','sales'].includes(s.kind))).length>=3&&patterns.length>0;
 return {patterns,distinctSellers:sellers.size,sufficient,note:'Recorrência textual entre fontes; associação não comprova causalidade, vendas individuais nem lucro. Extração da IA requer conferência das fontes.'};
}
export function originalityFingerprint(e,m) {return createHash('sha256').update(JSON.stringify([e.marketReferences,e.marketplace?.title,e.marketplace?.description,e.marketplace?.tags,e.marketplace?.license,e.validation?.offer,m&&sampleFingerprint(m),m?.artifact?.preview])).digest('hex');}
export function originalityCurrent(w,e) {const m=w.missions.find(m=>m.id===e.validation?.sampleId);return Boolean(m&&e.originality?.approved&&e.originality.fingerprint===originalityFingerprint(e,m));}
export function referenceAction(w,e,action,input,now=Date.now()) {
 if(action==='market-reference'){
  if(e.closedAt||Date.parse(e.endsAt)<=now||e.validation?.sampleId||e.marketplace?.publication)throw new AppError('Referências ficam congeladas quando a amostra é definida.',409);
  const refs=e.marketReferences||[];if(refs.length>=5)throw new AppError('Limite de cinco referências.');
  const [ref]=normalizeReferences([input],[{url:input.url}],now,'owner-observed-not-api-verified');if(refs.some(r=>r.url===ref.url))throw new AppError('Referência já registrada.');
  e.marketReferences=[...refs,ref];e.marketComparison=referenceComparison(e.marketReferences);delete e.originality;e.review=null;
 }else if(action==='originality-review'){
  const m=w.missions.find(m=>m.id===e.validation?.sampleId);if(!m||!['review','approved'].includes(m.status)||typeof input.approved!=='boolean')throw new AppError('Examine a amostra antes de revisar originalidade.');
  e.originality={approved:input.approved,reason:text(input.reason,'Revisão de originalidade/direitos',800),fingerprint:originalityFingerprint(e,m),origin:'human-review-not-legal-clearance',at:new Date(now).toISOString()};
 }else throw new AppError('Ação de referência inválida.');
}
export function productionBottleneck(w,kind,factoryId) {
 const e=(w.experiments||[]).find(e=>!e.closedAt&&Date.parse(e.endsAt)>Date.now()&&e.validation?.sampleId&&((factoryId&&(e.salesChannel||e.marketplace)?.factoryId===factoryId)||w.missions.find(m=>m.id===e.validation.sampleId)?.kind===kind));
 if(e)return {experimentId:e.id,reason:!e.marketplace?.publication?'A amostra já existe. Revise e publique a oferta antes de produzir mais.':!e.marketplace?.observation?'A oferta já existe. Observe o mercado e registre resultados antes de produzir mais.':'Conclua o experimento e revise custos antes de propor outra produção.'};
 const m=w.missions.find(m=>!m.validationExperimentId&&m.kind===kind&&(!factoryId||m.factoryId===factoryId)&&['review','approved'].includes(m.status)&&!m.publication&&!(w.shop?.products||[]).some(p=>p.missionId===m.id));
 return m?{missionId:m.id,reason:'Há estoque produzido sem distribuição. Prepare um teste e publique a entrega existente antes de produzir mais.'}:null;
}
