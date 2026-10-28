import {activeVoice} from './lume-voice.mjs';
import { publicPerformance } from './live-performance.mjs';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from './domain.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const valid=e=>e&&['TESTING','PAUSED','INITIALIZING'].includes(e.status);
export function authorizeWorker(w,id,mode,now=Date.now()){
 const e=w.liveFactory?.experiences.find(e=>e.id===id);
 if(!valid(e))throw new AppError('Inicie a experiência antes de autorizar o worker.',409);
 if(!['preview','stream'].includes(mode))throw new AppError('Modo inválido.');
 if(e.workerGrant?.revokedAt&&e.workerGrant.instance&&now-e.workerGrant.revokedAt<10000&&e.transmission?.status!=='STOPPED'&&e.transmission?.status!=='ERROR')throw new AppError('Aguarde a parada do worker anterior (até 10 segundos).',409);
 if(e.workerGrant&&!e.workerGrant.revoked&&e.workerGrant.expiresAt>now)throw new AppError('Encerre o worker anterior antes de gerar outra autorização.',409);
 const token=randomBytes(32).toString('hex');e.workerGrant={hash:hash(token),sessionId:e.sessionId,expiresAt:e.deadline,mode};
 e.transmission={status:'READY',mode,publicStatus:'UNCONFIRMED',heartbeat:null,frames:0,bytes:0,error:null};
 return {token,expiresAt:e.deadline,voiceProfile:activeVoice(w),voice:activeVoice(w).engine};
}
export function revokeWorker(e,now=Date.now()) {if(e.workerGrant){e.workerGrant.revoked=true;e.workerGrant.revokedAt=now;}if(e.transmission){e.transmission.status=e.workerGrant?.instance&&['STARTING','PREVIEW','SENDING_MEDIA'].includes(e.transmission.status)?'STOP_REQUESTED':'STOPPED';e.transmission.endedAt=now;}}
export function workerHeartbeat(w,id,token,input,now=Date.now()){
 const e=w.liveFactory?.experiences.find(e=>e.id===id),g=e?.workerGrant;
 if(!g||typeof token!=='string'||!/^\w{64}$/.test(token)||g.hash!==hash(token))throw new AppError('Credencial do worker inválida.',401);
 const terminal=['ERROR','STOPPED'].includes(input.status)&&g.instance===input.instance;
 if(!terminal&&(g.revoked||g.expiresAt<=now||g.sessionId!==e.sessionId||!valid(e)))throw new AppError('Autorização encerrada. Pare o encoder.',403);
 if(!/^[a-zA-Z0-9-]{16,64}$/.test(input.instance||''))throw new AppError('Instância inválida.');
 if(g.instance&&g.instance!==input.instance)throw new AppError('Outro worker já utiliza esta autorização.',409);
 if(!['STARTING','PREVIEW','SENDING_MEDIA','ERROR','STOPPED'].includes(input.status)||!Number.isSafeInteger(input.frames)||input.frames<0||!Number.isSafeInteger(input.bytes)||input.bytes<0)throw new AppError('Telemetria inválida.');
 if(g.mode==='preview'&&input.status==='SENDING_MEDIA')throw new AppError('Transmissão não autorizada.',403);
 if(input.audio){const audio={};for(const key of ['synthesized','cacheHits','ttsFailures','dropped','ttsMs','maxPlaybackLatencyMs']){const value=input.audio[key];if(!Number.isFinite(value)||value<0||value>100000000)throw new AppError('Telemetria de áudio inválida.');audio[key]=Math.round(value);}if(input.audio.latency){audio.latency={};for(const key of ['reaction','queue','synthesis','pending','segment','preloaded','firstSpeech','firstMusic','firstEffect','complete']){const v=input.audio.latency[key];if(!v)continue;if(!['count','meanMs','p95Ms','maxMs'].every(k=>Number.isFinite(v[k])&&v[k]>=0&&v[k]<=100000000))throw new AppError('Latência inválida.');audio.latency[key]=Object.fromEntries(['count','meanMs','p95Ms','maxMs'].map(k=>[k,Math.round(v[k])]));}}e.transmission.audio=audio;}
 // Authenticated, session-scoped acknowledgement; history and ranking are retained.
 if(input.settledJobs!==undefined){if(!Array.isArray(input.settledJobs)||input.settledJobs.length>64||input.settledJobs.some(id=>typeof id!=='string'||!/^[-a-f0-9]{36}$/.test(id)))throw new AppError('Confirmação de atuação inválida.');if(e.performance)e.performance.jobs=e.performance.jobs.filter(j=>!input.settledJobs.includes(j.id));}
 g.instance=input.instance;
 const t=e.transmission,prior=t.status;
 Object.assign(t,{status:input.status,heartbeat:now,frames:input.frames,bytes:input.bytes,publicStatus:'UNCONFIRMED',error:input.status==='ERROR'?'Worker interrompido; revise localmente e autorize nova execução.':null});
 if(prior!==t.status){e.logs.push({id:randomBytes(12).toString('hex'),at:new Date(now).toISOString(),kind:'encoder',status:t.status,source:'LOCAL_WORKER_REPORT',aiUsed:false});e.logs=e.logs.slice(-200);}
 if(['ERROR','STOPPED'].includes(t.status)){g.revoked=true;g.revokedAt=now;}
 // No workspace credentials, logs, grant or other projects sent to worker.
 return {serverTime:now,expiresAt:g.expiresAt,mode:g.mode,experience:{id:e.id,sessionId:e.sessionId,status:e.status,heartbeat:e.heartbeat,name:e.name,config:e.config,character:e.character,action:e.action,game:e.game,musicAmbientTrackId:e.musicAmbientTrackId||null,musicCatalog:(e.musicCatalog||[]).filter(t=>t.approved),performanceConfig:e.performanceConfig,performance:publicPerformance(e.performance)}};
}
export function watchWorker(e,now){const t=e.transmission;if(t&&['STARTING','PREVIEW','SENDING_MEDIA','STOP_REQUESTED'].includes(t.status)&&now-t.heartbeat>10000){t.status='DEGRADED';t.error='Heartbeat do worker perdido. Nova autorização necessária.';if(e.workerGrant){e.workerGrant.revoked=true;e.workerGrant.revokedAt=now;}e.logs.push({id:randomBytes(12).toString('hex'),at:new Date(now).toISOString(),kind:'encoder',status:'DEGRADED',aiUsed:false});e.logs=e.logs.slice(-200);}}

export function workerMusic(w,id,token,trackId,now=Date.now()){
 const e=w.liveFactory?.experiences.find(x=>x.id===id),g=e?.workerGrant;
 if(!g||typeof token!=='string'||g.hash!==hash(token)||g.revoked||g.expiresAt<=now||g.sessionId!==e.sessionId||!valid(e))throw new AppError('Autorização indisponível.',403);
 if(!e.musicCatalog?.some(t=>t.id===trackId&&t.approved))throw new AppError('Faixa indisponível.',404);
}
