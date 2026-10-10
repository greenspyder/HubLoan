import { selectedModel, estimatedTextUsd } from './models.mjs';
import { randomUUID, createHash } from 'node:crypto';
import { AppError } from './domain.mjs';
const kinds = ['text', 'research', 'vision', 'image'];
const init = w => w.aiCosts ||= { enabled:false, dailyMinor:500, monthlyMinor:5000, callMinor:500, taskMinor:500, ceilings:{text:100,research:200,vision:200,image:500}, entries:[], cache:[] };
// Unknown charges retain conservative budget exposure; they are never labelled actual spend.
export function costExposure(entry) {
 if (entry.status === 'not_sent') return 0;
 return Number.isSafeInteger(entry.confirmedMinor) && entry.confirmedMinor >= 0 ? entry.confirmedMinor : entry.reservedMinor;
}
export function configureCosts(w,input) {
 for(const k of ['dailyMinor','monthlyMinor','callMinor']) if(!Number.isSafeInteger(input[k]) || input[k]<1 || input[k]>10000000) throw new AppError('Limites devem ser centavos positivos.');
 for(const k of kinds) if(!Number.isSafeInteger(input.ceilings?.[k]) || input.ceilings[k]<1 || input.ceilings[k]>10000000) throw new AppError('Informe a reserva por chamada em centavos.');
 if(input.taskMinor !== undefined && (!Number.isSafeInteger(input.taskMinor) || input.taskMinor < 1 || input.taskMinor > 10000000)) throw new AppError('Limite por tarefa inválido.');
 const taskMinor=input.taskMinor || input.dailyMinor;
 for(const kind of kinds) for(const [dimension,limit] of Object.entries({call:input.callMinor,task:taskMinor,day:input.dailyMinor,month:input.monthlyMinor})) {
  if(input.ceilings[kind]>limit) throw budgetError(dimension,0,0,limit,input.ceilings[kind],kind,'configuração');
 }
 Object.assign(init(w),{taskMinor,enabled:input.enabled===true,dailyMinor:input.dailyMinor,monthlyMinor:input.monthlyMinor,callMinor:input.callMinor,ceilings:{...input.ceilings}});
}
export function costTotals(entries) {
 return { hasConfirmedCosts:entries.some(e=>e.confirmedMinor!=null), confirmedMinor:entries.reduce((n,e)=>n+(e.confirmedMinor ?? 0),0), reservedMinor:entries.filter(e=>e.status==='pending').reduce((n,e)=>n+e.reservedMinor,0), unknownMinor:entries.filter(e=>e.status!=='pending' && e.status!=='not_sent' && e.confirmedMinor==null).reduce((n,e)=>n+e.reservedMinor,0), exposureMinor:entries.reduce((n,e)=>n+costExposure(e),0) };
}
export function publicCosts(w,now=Date.now()) {
 const c=init(w),date=new Date(now).toISOString();
 const day=costTotals(c.entries.filter(e=>e.at.startsWith(date.slice(0,10)))),month=costTotals(c.entries.filter(e=>e.at.startsWith(date.slice(0,7))));
 return {...c,cache:undefined,dayMinor:day.exposureMinor,monthMinor:month.exposureMinor,day,month,entries:c.entries.slice(-100).map(e=>({...e,exposureMinor:costExposure(e)}))};
}
function budgetError(dimension,used,reserved,limit,required,kind,operation='chamada') {
 const labels={call:'por chamada',task:'da tarefa',day:'diário',month:'mensal',experiment:'do experimento',project:'do projeto'};
 const money=n=>`R$ ${(n/100).toFixed(2)}`;
 const error=new AppError(`${dimension==='experiment'?'Limite de orçamento do experimento':'Orçamento'} insuficiente: limite ${labels[dimension] || dimension}. Exposição existente ${money(used+reserved)}, limite ${money(limit)}, necessário ${money(required)}. Operação ${operation} (${kind}) bloqueada antes do envio.`);
 error.budgetBlock={dimension,usedMinor:used,reservedMinor:reserved,limitMinor:limit,requiredMinor:required,operation,kind,sent:false};
 return error;
}
// One lifetime scope shared by coordination, experiments, production and retries.
export function projectCostScope(w, projectId) {
 const experiments=(w.experiments || []).filter(e=>e.projectId===projectId);
 const ids=new Set([projectId,...(w.missions || []).filter(m=>m.projectId===projectId).map(m=>m.id),...experiments.flatMap(e=>[e.id,...e.missionIds])]);
 return { ...costTotals((w.aiCosts?.entries || []).filter(e=>ids.has(e.taskId))), declaredMinor:experiments.flatMap(e=>e.costs || []).filter(c=>!c.voidedAt).reduce((n,c)=>n+c.amountMinor,0), ids };
}
export function preflightCosts(w,taskId,operations,now=Date.now()) {
 if(!operations.length)return {requiredMinor:0,operations};
 const c=init(w);if(!c.enabled)throw new AppError('Configure e ative o orçamento de IA antes de executar.');
 for(const kind of operations) if(!kinds.includes(kind))throw new AppError('Operação de IA inválida.');
 const required=operations.reduce((n,k)=>n+c.ceilings[k],0),date=new Date(now).toISOString();
 for(const kind of operations)if(c.ceilings[kind]>c.callMinor)throw budgetError('call',0,0,c.callMinor,c.ceilings[kind],kind);
 const scopes=[['task',c.entries.filter(e=>e.taskId===taskId),c.taskMinor || c.dailyMinor],['day',c.entries.filter(e=>e.at.startsWith(date.slice(0,10))),c.dailyMinor],['month',c.entries.filter(e=>e.at.startsWith(date.slice(0,7))),c.monthlyMinor]];
 const experiment=(w.experiments||[]).find(e=>e.id===taskId||e.missionIds?.includes(taskId));
 if(experiment){
  if(experiment.closedAt||Date.parse(experiment.endsAt)<=now)throw new AppError('Janela ou orçamento do experimento bloqueou a chamada antes do envio.');
  const ids=new Set([experiment.id,...experiment.missionIds]);
  scopes.push(['experiment',c.entries.filter(e=>ids.has(e.taskId)),experiment.budgetMinor-experiment.costs.filter(e=>!e.voidedAt).reduce((n,e)=>n+e.amountMinor,0)]);
 }
 const projectId=(w.autonomy?.projects || []).find(p=>p.id===taskId)?.id || (w.missions || []).find(m=>m.id===taskId)?.projectId || experiment?.projectId;
 const project=(w.autonomy?.projects || []).find(p=>p.id===projectId);
 if(project?.budgetMinor!=null) {
  const scope=projectCostScope(w,project.id);
  scopes.push(['project',c.entries.filter(e=>scope.ids.has(e.taskId)),project.budgetMinor-scope.declaredMinor]);
 }
 for(const [dimension,entries,limit] of scopes){const t=costTotals(entries);if(t.exposureMinor+required>limit)throw budgetError(dimension,t.confirmedMinor+t.unknownMinor,t.reservedMinor,limit,required,operations.join('+'),'preflight');}
 return {requiredMinor:required,operations};
}
export function costProvider(store,provider,id,taskId,agentId,{beforeSend=async()=>{}}={}) {
 return Object.fromEntries(kinds.map(kind=>[kind,async(...args)=>{
 if(kind!=='image') { const {result:model}=await store.mutate(id,w=>selectedModel(w,agentId,kind)); args[1]=model; }
 const hash=createHash('sha256').update(JSON.stringify([kind,args[1],args.slice(2).map(v=>v instanceof AbortSignal?null:v)])).digest('hex'),entryId=randomUUID();
 const {result:cached}=await store.mutate(id,w=>{
 const c=init(w);if(!c.enabled)throw new AppError('Configure e ative o orçamento de IA antes de executar.');
 const cache=kind==='text' && c.cache.find(e=>e.hash===hash && Date.now()-e.time<86400000); if(cache) return cache.result;
 preflightCosts(w,taskId,[kind]);
 c.entries.push({id:entryId,at:new Date().toISOString(),taskId,executionId:w.missions?.find(m=>m.id===taskId)?.executionId,agentId,model:args[1],kind,reservedMinor:c.ceilings[kind],confirmedMinor:null,status:'pending',tokens:0,sentAt:null});
 });
 if(cached) return {...cached,tokens:0,cached:true};
 let sent=false;
 try {
  // Cancellation or project call limits must not consume a reservation or a call.
  if(args.some(v=>v instanceof AbortSignal && v.aborted))throw new AppError('Execução cancelada antes do envio.',409);
  await beforeSend(kind);
  await store.mutate(id,w=>{init(w).entries.find(e=>e.id===entryId).sentAt=new Date().toISOString();});
  sent=true;
  const result=await provider[kind](...args);
  await store.mutate(id,w=>{const c=init(w);Object.assign(c.entries.find(e=>e.id===entryId),{status:'completed',tokens:result.tokens||0,actualModel:result.model || args[1],usage:result.usage,estimatedTextUsd:kind==='image'?null:estimatedTextUsd(args[1],result.usage),searches:result.searches||0});if(kind==='text'&&!result.truncated){c.cache=c.cache.filter(e=>Date.now()-e.time<86400000).slice(-49);c.cache.push({hash,time:Date.now(),result});}});return result;
 } catch(error){await store.mutate(id,w=>{init(w).entries.find(e=>e.id===entryId).status=sent?'uncertain':'not_sent';});throw error;}
 }]));
}
