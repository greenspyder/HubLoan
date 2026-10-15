import { performanceDefaults, performanceConfig, resetPerformance, demoEvent, advancePerformance, advanceGamePerformance, publicPerformance } from './live-performance.mjs';
// Original deterministic runtime. Uses the existing transactional workspace store.
import { gameTemplates } from './live-game.mjs';
import { revokeWorker, watchWorker } from './live-broadcast.mjs';
import { randomUUID } from 'node:crypto';
import { defaultCharacter, validateCharacter, characterOptions, creativeProposal } from './live-character.mjs';
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
  init(w).experiences.push({id:randomUUID(),projectId:p.id,name,version:1,status:'STOPPED',broadcast:'NOT_CONNECTED',config:defaultCharacter(),configVersion:1,suggestions:[],character:{animation:'idle',behavior:'resting',expression:'calm',pose:0,speech:'Personagem virtual · pronto para teste'},queue:[],seen:[],logs:[],sessions:[],processed:0,ticks:0,activeMs:0,heartbeat:null,error:null});return;
 }
 const e=find(w,input.id);
 e.config ||= defaultCharacter(); e.configVersion ||= 1; e.suggestions ||= [];
 if(action==='performance-configure'){if(!['STOPPED','STOPPED_FINAL'].includes(e.status)||input.version!==e.configVersion)throw new AppError('Encerre a sessão e atualize a versão.',409);e.performanceConfig=performanceConfig(input.config);e.configVersion++;return;}
 if(action==='performance-bind'){if(e.status!=='TESTING'||input.sessionId!==e.sessionId||!e.game||!['0','1'].includes(input.playerId))throw new AppError('Sessão/jogador inválido.',409);const person=e.performance?.participants.find(x=>x.id===input.participantId);if(!person)throw new AppError('Participante não encontrado.',404);e.performance.bindings=e.performance.bindings.filter(b=>b.playerId!==input.playerId);e.performance.bindings.push({playerId:input.playerId,participantId:person.id,name:person.name,mode:'FREE_OPERATOR_SELECTION'});log(e,'performance',{action,source:'SIMULATED_OPERATOR',result:'Vínculo visual gratuito; regras do jogo preservadas.'},now);return;}
 if(action==='performance-photo'){if(input.sessionId!==e.sessionId||e.status!=='TESTING')throw new AppError('Sessão inválida.',409);const p=e.performance?.participants.find(x=>x.id===input.participantId);if(!p)throw new AppError('Participante de teste não encontrado.',404);if(!p.avatar&&e.performance.participants.filter(x=>x.avatar).length>=12)throw new AppError('Limite de doze fotos por sessão.',409);p.avatar=input.normalizedImage;for(const x of e.performance.top)if(x.id===p.id)x.avatar=p.avatar;return;}
 if(action==='worker-stop'){revokeWorker(e,now);return;}
 if(action==='game-configure'){
  if(!['STOPPED','STOPPED_FINAL'].includes(e.status)||input.version!==e.configVersion)throw new AppError('Encerre a sessão e atualize a versão.',409);
  e.gameConfig=gameTemplates['seed-snake'].configure(input.config);e.game=null;e.configVersion++;log(e,'configuration',{action,version:e.configVersion,aiUsed:false},now);return;
 }
 if(action==='configure'||action==='apply-suggestion') {
  if(!['STOPPED','STOPPED_FINAL'].includes(e.status)) throw new AppError('Encerre o teste antes de editar o personagem.',409);
  if(input.version!==e.configVersion) throw new AppError('O personagem mudou. Reabra o editor antes de salvar.',409);
  const proposal=action==='apply-suggestion'?e.suggestions.find(s=>s.id===input.suggestionId):null;
  if(action==='apply-suggestion'&&(!proposal||proposal.baseVersion!==e.configVersion||proposal.appliedAt)) throw new AppError('Sugestão vencida ou já aplicada.',409);
  e.config=validateCharacter(proposal?proposal.config:input.config);e.configVersion++;
  e.character={expression:'calm',animation:'idle',behavior:'resting',pose:0,speech:e.config.idlePhrase};
  if(proposal)proposal.appliedAt=iso(now);
  log(e,'configuration',{action,version:e.configVersion,aiUsed:false},now);return;
 }
 if(action==='suggest') {
  if(e.lastSuggestedAt&&now-e.lastSuggestedAt<1000) throw new AppError('Aguarde antes de gerar outra sugestão.',429);
  e.lastSuggestedAt=now;e.suggestions.push({id:randomUUID(),baseVersion:e.configVersion,at:iso(now),...creativeProposal(e)});e.suggestions=e.suggestions.slice(-5);
  log(e,'suggestion',{action:'creative-review',aiUsed:false},now);return;
 }
 if(action==='start') {
  if(!['STOPPED','STOPPED_FINAL'].includes(e.status)) throw new AppError('Encerre a sessão atual antes de iniciar outra.',409);
  revokeWorker(e,now);e.game=e.gameConfig?gameTemplates[e.gameConfig.template].create(e.gameConfig,now):null;e.sessionId=randomUUID();e.startedAt=now;e.deadline=now+30*60000;e.status='INITIALIZING';e.seen=[];e.queue=[];e.processed=0;e.ticks=0;e.activeMs=0;e.owner=null;e.heartbeat=null;e.error=null;e.action=null;e.reactionUntil=0;e.character={expression:'calm',animation:'idle',behavior:'resting',pose:0,speech:e.config.idlePhrase};
  resetPerformance(e);
 } else if(action==='pause') {
  if(!['TESTING','READY','INITIALIZING'].includes(e.status)) throw new AppError('Runtime não está em teste.',409);
  e.status='PAUSED';if(e.performance)e.performance.jobs=[];e.action=null;e.reactionUntil=0;e.character.animation='idle';e.character.behavior='paused';
 } else if(action==='resume') {
  if(!['PAUSED','DEGRADED'].includes(e.status)) throw new AppError('Runtime não está pausado/degradado.',409);
  if(now>=e.deadline) throw new AppError('Sessão expirada. Encerre e inicie novo teste.',409);
  if(e.status==='DEGRADED') { e.owner=null;e.heartbeat=null; }
  e.status='INITIALIZING';e.error=null;
 } else if(action==='stop'||action==='emergency') {
  if(!active.includes(e.status)&&e.status!=='DEGRADED') throw new AppError('Nenhuma sessão ativa.',409);
  revokeWorker(e,now);if(e.performance)e.performance.jobs=[];e.status='STOPPED_FINAL';cancelQueue(e,now);e.character.expression='calm';e.character.speech='Sessão encerrada';e.character.animation='idle';e.character.behavior='stopped';e.action=null;
  e.sessions.push({id:e.sessionId,startedAt:iso(e.startedAt),endedAt:iso(now),activeMs:e.activeMs,processed:e.processed,reason:action});e.sessions=e.sessions.slice(-30);
 } else if(action==='event'||action==='performance-event') {
  if(e.status!=='TESTING'||input.sessionId!==e.sessionId) throw new AppError('Inicie um teste e use a sessão atual.',409);
  const performance=action==='performance-event'?demoEvent(input):null;if(performance&&!e.performanceConfig?.enabled)throw new AppError('Habilite atuação antes de enviar eventos.',409);
  if(!(performance||['greet','challenge','celebrate'].includes(input.type))||!/^[a-zA-Z0-9_-]{8,80}$/.test(input.eventId||'')) throw new AppError('Evento de teste inválido.');
  if(e.seen.includes(input.eventId)) return;
  if(!Number.isSafeInteger(input.at)||input.at<now-30000||input.at>now+5000) throw new AppError('Evento atrasado ou horário inválido.');
  if(e.queue.length>=20||e.seen.length>=5000||now-(e.lastAccepted||0)<500) throw new AppError('Limite de eventos atingido. Aguarde ou encerre a sessão.',429);
  const event={...performance,performance:!!performance,sessionId:e.sessionId,id:input.eventId,type:input.type,source:'SIMULATED_OPERATOR',at:input.at,receivedAt:now,status:'QUEUED',priority:input.type==='challenge'?1:0};
  e.seen.push(event.id);e.queue.push(event);e.lastAccepted=now;log(e,'event',event,now);return;
 } else throw new AppError('Comando não permitido.');
 log(e,'control',{action,status:e.status,aiUsed:false},now);
}
export function advanceLive(w,owner,now=Date.now()) {
 for(const e of init(w).experiences) {
  watchWorker(e,now);
  if(!active.includes(e.status)) continue;
  if(e.owner&&e.owner!==owner) {
   if(now-(e.heartbeat||0)>10000) {e.status='DEGRADED';e.error='Executor anterior indisponível. Revise e retome manualmente.';cancelQueue(e,now);log(e,'failure',{reason:e.error},now);}
   continue;
  }
  e.owner=owner;
  if(now>=e.deadline) { liveAction(w,'stop',{id:e.id},now);continue; }
  if(e.heartbeat&&now-e.heartbeat>10000) {e.status='DEGRADED';e.error='Heartbeat interrompido. Retomada humana necessária.';cancelQueue(e,now);log(e,'failure',{reason:e.error},now);continue;}
  const elapsed=e.heartbeat?Math.max(0,Math.min(5000,now-e.heartbeat)):0;e.heartbeat=now;
  if(e.status==='PAUSED'){if(e.game)e.game.lastAt=now;continue;}
  if(e.status==='INITIALIZING') {e.status='TESTING';log(e,'lifecycle',{status:'READY',mode:'SIMULATION_ONLY'},now);}
  if(e.game){const rounds=e.game.round;gameTemplates[e.game.template].advance(e.game,now);if(e.game.round!==rounds)log(e,'game',{action:'round-start',source:'INTERNAL_GAME',result:`Rodada ${e.game.round}`,aiUsed:false},now);for(const result of e.game.history.filter(r=>r.at>(e.lastGameResultAt||0))){log(e,'game',{action:'round-end',source:'INTERNAL_GAME',result:`${result.winner} · ${result.scores.join(' x ')}`,aiUsed:false},now);e.lastGameResultAt=result.at;}}
  advanceGamePerformance(e,now);
  e.ticks++;e.activeMs+=elapsed;e.character.pose=e.ticks%4;
  e.queue.sort((a,b)=>b.priority-a.priority||a.receivedAt-b.receivedAt);
  const event=e.queue.shift();
  if(event) {
   if(now-event.receivedAt>30000) {log(e,'event',{eventId:event.id,status:'EXPIRED'},now);continue;}
   if(event.performance){advancePerformance(e,event,now);e.processed++;log(e,'performance',{eventId:event.id,type:event.type,source:event.source,status:'PROCESSED',aiUsed:false},now);continue;}
   if(e.game)gameTemplates[e.game.template].event(e.game,event);
   const config=e.config||defaultCharacter(),rule=config.rules[event.type],version=e.configVersion||1;
   const speech=rule.phrases[e.processed%rule.phrases.length];
   Object.assign(e.character,{expression:rule.expression,animation:rule.animation,behavior:'reacting',speech});e.reactionUntil=now+rule.durationMs;e.processed++;e.latencyMs=now-event.receivedAt;
   e.action={id:randomUUID(),eventId:event.id,sessionId:e.sessionId,startedAt:now,expiresAt:e.reactionUntil,expression:rule.expression,animation:rule.animation,sound:config.audio.muted?'none':rule.sound,volume:config.audio.volume,speech};
   log(e,'action',{eventId:event.id,type:event.type,source:event.source,rule:`character.${event.type}.v${version}`,configVersion:version,state:'reacting',animation:rule.animation,sound:e.action.sound,action:rule.expression,result:speech,status:'PROCESSED',latencyMs:e.latencyMs,aiUsed:false,presentation:'REQUESTED_NOT_CONFIRMED'},now);
  } else if(now>=(e.reactionUntil||0)) { e.character.expression='calm';e.character.speech=(e.config||defaultCharacter()).idlePhrase;e.character.animation='idle';e.character.behavior='resting';e.action=null; }
 }
}
export function publicLive(w,now=Date.now()) {
 return {options:characterOptions,aiCalls:0,voice:'LOCAL_WORKER_TTS_OPTIONAL',mode:'SIMULATION_ONLY',tiktok:'NOT_CONNECTED',eligibility:'UNVERIFIED',apiCostMinor:0,infrastructureCostMinor:null,revenueMinor:null,profitMinor:null,experiences:(w.liveFactory?.experiences||[]).map(({seen,queue,owner,workerGrant,...e})=>({...e,performance:publicPerformance(e.performance),performanceConfig:e.performanceConfig||performanceDefaults(),config:e.config||defaultCharacter(),configVersion:e.configVersion||1,suggestions:e.suggestions||[],pending:queue.length,executor:owner||null,connected:active.includes(e.status)&&e.heartbeat!=null&&now-e.heartbeat<=10000}))};
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
