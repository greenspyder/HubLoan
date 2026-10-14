// Original deterministic runtime. Uses the existing transactional workspace store.
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { AppError, text } from './domain.mjs';
import { createProject } from './autonomy.mjs';
const active = ['INITIALIZING','READY','TESTING','RUNNING','PAUSED','STOPPING'];
const iso = n => new Date(n).toISOString();
const init = w => w.liveFactory ||= { experiences: [] };
const find = (w,id) => { const e=init(w).experiences.find(e=>e.id===id); if(!e) throw new AppError('Experiência não encontrada.',404); return e; };
function log(e,kind,data,now) { e.logs.push({id:randomUUID(),at:iso(now),kind,...data}); e.logs=e.logs.slice(-200); }
function cancelQueue(e,now) { for(const event of e.queue) log(e,'event',{eventId:event.id,type:event.type,status:'CANCELLED'},now); e.queue=[]; }
export function liveAction(w,action,input,now=Date.now()) {
 if(action==='create') {
  if(init(w).experiences.length>=5) throw new AppError('Limite de cinco experiências.');
  const name=text(input.name||'Lume, o guardião das sementes','Nome',80);
  const p=createProject(w,{name,goal:'Validar uma experiência interativa original em teste, sem transmissão ou receita presumida.',kind:'text',maxDeliveries:1,maxCalls:1,intervalMinutes:60,research:false,start:false},null,null);
  p.businessType='live';p.budgetMinor=0;p.phase='Live Factory · teste supervisionado';
  init(w).experiences.push({id:randomUUID(),projectId:p.id,name,version:1,status:'STOPPED',broadcast:'NOT_CONNECTED',character:{expression:'calm',pose:0,speech:'Personagem virtual · pronto para teste'},queue:[],seen:[],logs:[],sessions:[],processed:0,ticks:0,activeMs:0,heartbeat:null,error:null});return;
 }
 const e=find(w,input.id);
 if(action==='start') {
  if(!['STOPPED','STOPPED_FINAL'].includes(e.status)) throw new AppError('Encerre a sessão atual antes de iniciar outra.',409);
  e.sessionId=randomUUID();e.startedAt=now;e.deadline=now+30*60000;e.status='INITIALIZING';e.seen=[];e.queue=[];e.processed=0;e.ticks=0;e.activeMs=0;e.owner=null;e.heartbeat=null;e.error=null;
 } else if(action==='pause') {
  if(!['TESTING','READY','INITIALIZING'].includes(e.status)) throw new AppError('Runtime não está em teste.',409);
  e.status='PAUSED';
 } else if(action==='resume') {
  if(!['PAUSED','DEGRADED'].includes(e.status)) throw new AppError('Runtime não está pausado/degradado.',409);
  if(now>=e.deadline) throw new AppError('Sessão expirada. Encerre e inicie novo teste.',409);
  if(e.status==='DEGRADED') { e.owner=null;e.heartbeat=null; }
  e.status='INITIALIZING';e.error=null;
 } else if(action==='stop'||action==='emergency') {
  if(!active.includes(e.status)&&e.status!=='DEGRADED') throw new AppError('Nenhuma sessão ativa.',409);
  e.status='STOPPED_FINAL';cancelQueue(e,now);e.character.expression='calm';e.character.speech='Sessão encerrada';
  e.sessions.push({id:e.sessionId,startedAt:iso(e.startedAt),endedAt:iso(now),activeMs:e.activeMs,processed:e.processed,reason:action});e.sessions=e.sessions.slice(-30);
 } else if(action==='event') {
  if(e.status!=='TESTING'||input.sessionId!==e.sessionId) throw new AppError('Inicie um teste e use a sessão atual.',409);
  if(!['greet','challenge','celebrate'].includes(input.type)||!/^[a-zA-Z0-9_-]{8,80}$/.test(input.eventId||'')) throw new AppError('Evento de teste inválido.');
  if(e.seen.includes(input.eventId)) return;
  if(!Number.isSafeInteger(input.at)||input.at<now-30000||input.at>now+5000) throw new AppError('Evento atrasado ou horário inválido.');
  if(e.queue.length>=20||e.seen.length>=5000||now-(e.lastAccepted||0)<500) throw new AppError('Limite de eventos atingido. Aguarde ou encerre a sessão.',429);
  const event={id:input.eventId,type:input.type,source:'SIMULATED_OPERATOR',at:input.at,receivedAt:now,status:'QUEUED',priority:input.type==='challenge'?1:0};
  e.seen.push(event.id);e.queue.push(event);e.lastAccepted=now;log(e,'event',event,now);return;
 } else throw new AppError('Comando não permitido.');
 log(e,'control',{action,status:e.status,aiUsed:false},now);
}
export function advanceLive(w,owner,now=Date.now()) {
 for(const e of init(w).experiences) {
  if(!active.includes(e.status)) continue;
  if(e.owner&&e.owner!==owner) {
   if(now-(e.heartbeat||0)>10000) {e.status='DEGRADED';e.error='Executor anterior indisponível. Revise e retome manualmente.';cancelQueue(e,now);log(e,'failure',{reason:e.error},now);}
   continue;
  }
  e.owner=owner;
  if(now>=e.deadline) { liveAction(w,'stop',{id:e.id},now);continue; }
  if(e.heartbeat&&now-e.heartbeat>10000) {e.status='DEGRADED';e.error='Heartbeat interrompido. Retomada humana necessária.';cancelQueue(e,now);log(e,'failure',{reason:e.error},now);continue;}
  const elapsed=e.heartbeat?Math.max(0,Math.min(5000,now-e.heartbeat)):0;e.heartbeat=now;
  if(e.status==='PAUSED')continue;
  if(e.status==='INITIALIZING') {e.status='TESTING';log(e,'lifecycle',{status:'READY',mode:'SIMULATION_ONLY'},now);}
  e.ticks++;e.activeMs+=elapsed;e.character.pose=e.ticks%4;
  e.queue.sort((a,b)=>b.priority-a.priority||a.receivedAt-b.receivedAt);
  const event=e.queue.shift();
  if(event) {
   if(now-event.receivedAt>30000) {log(e,'event',{eventId:event.id,status:'EXPIRED'},now);continue;}
   const reactions={greet:['happy','Olá, explorador! Este é um teste.'],challenge:['curious','Desafio aceito: encontrar uma nova semente!'],celebrate:['joy','Uma pequena conquista merece uma grande dança!']};
   const [expression,speech]=reactions[event.type];Object.assign(e.character,{expression,speech});e.reactionUntil=now+6000;e.processed++;e.latencyMs=now-event.receivedAt;
   log(e,'action',{eventId:event.id,type:event.type,source:event.source,rule:`character.${event.type}.v1`,action:expression,result:speech,status:'PROCESSED',latencyMs:e.latencyMs,aiUsed:false},now);
  } else if(now>=(e.reactionUntil||0)) { e.character.expression='calm';e.character.speech='Observando o jardim de estrelas…'; }
 }
}
export function publicLive(w,now=Date.now()) {
 return {mode:'SIMULATION_ONLY',tiktok:'NOT_CONNECTED',eligibility:'UNVERIFIED',apiCostMinor:0,infrastructureCostMinor:null,revenueMinor:null,profitMinor:null,experiences:(w.liveFactory?.experiences||[]).map(({seen,queue,owner,...e})=>({...e,pending:queue.length,executor:owner||null,connected:active.includes(e.status)&&e.heartbeat!=null&&now-e.heartbeat<=10000}))};
}
export function createLiveRuntime(store,{intervalMs=2000,owner=`${hostname()}:${randomUUID()}`}={}) {
 let closed=false,inflight=null;
 async function work(){let cursor='';do{const rows=await store.liveSpaces(cursor);for(const {id} of rows){if(closed)return;await store.mutate(id,w=>advanceLive(w,owner));}if(rows.length<100)break;cursor=rows.at(-1).id;}while(!closed);}
 function tick(){if(closed)return Promise.resolve();if(inflight)return inflight;inflight=work().catch(()=>{console.error('Live runtime: persistência indisponível; heartbeat não atualizado.');}).finally(()=>{inflight=null;});return inflight;}
 const timer=setInterval(tick,intervalMs);timer.unref();
 return {tick,close:async()=>{
  closed=true;clearInterval(timer);await inflight;
  let cursor='';
  try { do { const rows=await store.liveSpaces(cursor); for(const {id} of rows) await store.mutate(id,w=>{
    for(const e of init(w).experiences) if(e.owner===owner&&active.includes(e.status)) {
      e.status='DEGRADED';e.error='Executor encerrado. Retomada humana necessária.';cancelQueue(e,Date.now());log(e,'lifecycle',{status:e.status,reason:e.error},Date.now());
    }
  });if(rows.length<100)break;cursor=rows.at(-1).id;}while(true); } catch { console.error('Live runtime: shutdown sem persistência; heartbeat expirará.'); }
 }};
}
