import { selectedModel, estimatedTextUsd } from './models.mjs';
import { randomUUID, createHash } from 'node:crypto';
import { AppError } from './domain.mjs';
const init = w => w.aiCosts ||= { enabled:false, dailyMinor:500, monthlyMinor:5000, callMinor:100, taskMinor:500, ceilings:{text:100,research:200,vision:200,image:500}, entries:[], cache:[] };
export function configureCosts(w,input) {
 for(const k of ['dailyMinor','monthlyMinor','callMinor']) if(!Number.isSafeInteger(input[k]) || input[k]<1 || input[k]>10000000) throw new AppError('Limites devem ser centavos positivos.');
 for(const k of ['text','research','vision','image']) if(!Number.isSafeInteger(input.ceilings?.[k]) || input.ceilings[k]<1 || input.ceilings[k]>10000000) throw new AppError('Informe a reserva por chamada em centavos.');
 if(input.taskMinor !== undefined && (!Number.isSafeInteger(input.taskMinor) || input.taskMinor < 1 || input.taskMinor > 10000000)) throw new AppError('Limite por tarefa inválido.');
 Object.assign(init(w),{taskMinor:input.taskMinor || input.dailyMinor,enabled:input.enabled===true,dailyMinor:input.dailyMinor,monthlyMinor:input.monthlyMinor,callMinor:input.callMinor,ceilings:{...input.ceilings}});
}
export function publicCosts(w,now=Date.now()) {
 const c=init(w),date=new Date(now).toISOString(),sum=p=>c.entries.filter(e=>e.at.startsWith(p)).reduce((n,e)=>n+e.reservedMinor,0);
 return {...c,cache:undefined,dayMinor:sum(date.slice(0,10)),monthMinor:sum(date.slice(0,7)),entries:c.entries.slice(-100)};
}
export function costProvider(store,provider,id,taskId,agentId) {
 return Object.fromEntries(['text','research','vision','image'].map(kind=>[kind,async(...args)=>{
 if(kind!=='image') { const {result:model}=await store.mutate(id,w=>selectedModel(w,agentId,kind)); args[1]=model; }
 const hash=createHash('sha256').update(JSON.stringify([kind,args[1],args.slice(2).map(v=>v instanceof AbortSignal?null:v)])).digest('hex'),entryId=randomUUID();
 const {result:cached}=await store.mutate(id,w=>{
 const c=init(w); if(!c.enabled) throw new AppError('Configure e ative o orçamento de IA antes de executar.');
 const cache=kind==='text' && c.cache.find(e=>e.hash===hash && Date.now()-e.time<86400000); if(cache) return cache.result;
 const s=publicCosts(w),reserve=c.ceilings[kind],taskSpend=c.entries.filter(e=>e.taskId===taskId).reduce((n,e)=>n+e.reservedMinor,0);
 if(taskSpend+reserve>(c.taskMinor || c.dailyMinor) || reserve>c.callMinor || s.dayMinor+reserve>c.dailyMinor || s.monthMinor+reserve>c.monthlyMinor) throw new AppError('Orçamento de IA insuficiente. Chamada bloqueada antes do envio.');
 c.entries.push({id:entryId,at:new Date().toISOString(),taskId,agentId,model:args[1],kind,reservedMinor:reserve,status:'pending',tokens:0});
 });
 if(cached) return {...cached,tokens:0,cached:true};
 try {const result=await provider[kind](...args); await store.mutate(id,w=>{const c=init(w);Object.assign(c.entries.find(e=>e.id===entryId),{status:'completed',tokens:result.tokens||0,actualModel:result.model || args[1],usage:result.usage,estimatedTextUsd:kind==='image'?null:estimatedTextUsd(args[1],result.usage),searches:result.searches||0});if(kind==='text'&&!result.truncated){c.cache=c.cache.filter(e=>Date.now()-e.time<86400000).slice(-49);c.cache.push({hash,time:Date.now(),result});}});return result;}
 catch(error){await store.mutate(id,w=>{init(w).entries.find(e=>e.id===entryId).status='uncertain';});throw error;}
 }]));
}
