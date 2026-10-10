import { costExposure } from './ai-costs.mjs';
import { commercialAction } from './commercial.mjs';
import { randomUUID } from 'node:crypto';
import { AppError, decryptKey, text } from './domain.mjs';
import { costProvider } from './ai-costs.mjs';
import { REFERENCE_RULES, normalizeReferences, referenceComparison } from './market-references.mjs';
import { commercialLearning } from './learning.mjs';
export function createReferenceResearch(store, provider) {
 return async function research(id, token, experimentId, input) {
  if(input.authorize!==true)throw new AppError('Autorize a pesquisa paga dentro dos limites de IA.');
  const query=text(input.query,'Mercado/público para pesquisa',400), job=randomUUID();
  const {workspace:w}=await store.mutate(id,w=>{
   const e=w.experiments?.find(e=>e.id===experimentId);if(!e)throw new AppError('Teste não encontrado.',404);
   if(e.closedAt||Date.parse(e.endsAt)<=Date.now()||e.validation?.sampleId||e.marketplace?.publication||(e.referenceResearch?.status==='running'&&e.referenceResearch.expiresAt>Date.now()))throw new AppError('Pesquisa indisponível neste teste.',409);
   if(!w.secret)throw new AppError('Conecte a chave de IA.');
   if((e.marketReferences||[]).length)throw new AppError('Este teste já tem referências; preserve-as ou abra outro teste.');
   const spent=e.costs.filter(c=>!c.voidedAt).reduce((n,c)=>n+c.amountMinor,0)+(w.aiCosts?.entries||[]).filter(c=>c.taskId===e.id).reduce((n,c)=>n+costExposure(c),0);
   const reserve=(w.aiCosts?.ceilings?.research||200)+(w.aiCosts?.ceilings?.text||100);
   if(spent+reserve>e.budgetMinor)throw new AppError('O orçamento restante do experimento não comporta pesquisa e análise.');
   e.referenceResearch={status:'running',job,expiresAt:Date.now()+120000,at:new Date().toISOString()};
  });
  try{
   const e=w.experiments.find(e=>e.id===experimentId),key=decryptKey(w.secret,token),budget=costProvider(store,provider,id,e.id,'coordinator');
   const found=await budget.research(key,w.settings.model,`${REFERENCE_RULES}\nPesquise ofertas reais para ${e.salesChannel?.channel||e.channel}. Público ${e.audience}; pergunta: ${query}. Mostre trechos próprios e fontes que sustentam cada observação.`,AbortSignal.timeout(45000),{market:true,maxToolCalls:2});
   if(found.truncated||!found.sources?.length||!found.searches)throw new AppError('Pesquisa sem fontes suficientes; nenhuma produção iniciada.');
   const result=await budget.text(key,w.settings.model,REFERENCE_RULES+' Devolva SOMENTE JSON {references:[...]} com até cinco referências. Não invente informações ausentes.',JSON.stringify({now:new Date().toISOString(),report:found.output,sources:found.sources,commercialLearning:commercialLearning(w)}),3500,AbortSignal.timeout(45000));
   if(result.truncated)throw new AppError('Análise incompleta; pesquisa preservada sem produção.');
   let parsed;try{parsed=JSON.parse(result.output.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw new AppError('Análise inválida; nenhuma produção iniciada.');}
   const refs=normalizeReferences(parsed.references,found.sources);
   return await store.mutate(id,w=>{const current=w.experiments.find(e=>e.id===experimentId);if(current.referenceResearch?.job!==job||current.validation?.sampleId||current.closedAt||Date.parse(current.endsAt)<=Date.now())throw new AppError('O teste mudou durante a pesquisa.',409);current.marketReferences=refs;current.marketComparison=referenceComparison(refs);current.referenceResearch={status:'complete',at:new Date().toISOString(),sources:found.sources,note:'Extração pela IA; confira cada fonte. Não há verificação independente de vendas.'};});
  }catch(error){await store.mutate(id,w=>{const e=w.experiments.find(e=>e.id===experimentId);if(e.referenceResearch?.job===job)e.referenceResearch={status:'failed',error:error instanceof AppError?error.message:'Pesquisa interrompida; chamadas podem ter sido cobradas. Confira antes de tentar novamente.'};});throw error;}
 };
}
export function createOfferPreparation(store,provider){return async(id,token,eid,input)=>{
 if(input.authorize!==true)throw new AppError('Autorize a preparação com IA.');const license=text(input.license,'Direitos que você pode conceder',1000),job=randomUUID();
 const {workspace:w}=await store.mutate(id,w=>{const e=w.experiments?.find(e=>e.id===eid);if(!e?.salesChannel||!e.validation?.evidence||!e.validation?.offer||e.closedAt||Date.parse(e.endsAt)<=Date.now()||e.marketplace?.publication||e.marketplace?.etsy||e.marketplace?.observation||(e.offerPreparation?.status==='running'&&e.offerPreparation.expiresAt>Date.now()))throw new AppError('Defina evidência e oferta em um teste aberto sem publicação pendente.',409);if(!w.secret)throw new AppError('Conecte a chave de IA.');e.offerPreparation={job,status:'running',expiresAt:Date.now()+90000};});
 try{const e=w.experiments.find(e=>e.id===eid),p=costProvider(store,provider,id,eid,'creator');const result=await p.text(decryptKey(w.secret,token),w.settings.model,`${REFERENCE_RULES} Prepare metadata ORIGINAL da oferta, sem produzir nem publicar. Devolva SOMENTE JSON {title,description,tags,category,packages,faq,requirements}. Fiverr title até 80 caracteres; description até 4000; tags até 300; categoria até 150; packages, faq e requirements até 1500 cada. Etsy até 13 tags de até 20 caracteres separadas por vírgulas. Preserve moeda/preço propostos como hipótese, não invente conversão nem resultados. Fiverr sugira Basic/Standard/Premium com escopo, prazo e revisões explícitos; diga que pacotes/preços precisam de revisão. Não use nomes, textos ou identidade de concorrentes.`,JSON.stringify({audience:e.audience,channel:e.salesChannel.channel,hypothesis:e.hypothesis,offer:e.validation.offer,references:e.marketReferences||[],patterns:e.marketComparison,license}),2400,AbortSignal.timeout(45000));
 if(result.truncated)throw new AppError('Oferta incompleta: nenhuma alteração aplicada.');let parsed;try{parsed=JSON.parse(result.output.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw new AppError('Metadata inválida; nenhuma alteração aplicada.');}
 return await store.mutate(id,w=>{const e=w.experiments.find(e=>e.id===eid);if(e.offerPreparation?.job!==job)throw new AppError('Preparação mudou.',409);commercialAction(w,e,'marketplace-offer',{...parsed,...e.salesChannel,license});e.offerPreparation={status:'complete',at:new Date().toISOString()};});
 }catch(error){await store.mutate(id,w=>{const e=w.experiments.find(e=>e.id===eid);if(e.offerPreparation?.job===job)e.offerPreparation={status:'failed',error:error instanceof AppError?error.message:'Preparação interrompida; confira estado e custos.'};});throw error;}
};}
