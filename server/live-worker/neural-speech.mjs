import {voiceProfile,directedSpeed} from '../lume-voice.mjs';
import {rssOf} from './process-usage.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodeWav, localSpeech, voiceProfiles } from './speech.mjs';

// Owned by one worker; no HTTP listener, secrets or paid APIs. One request in flight.
export async function createNeuralSpeech({engine='piper',model=process.env[`HUBLOAN_${engine.toUpperCase()}_MODEL`],python=process.env[`HUBLOAN_${engine.toUpperCase()}_PYTHON`]||'python3',timeout=5000,initializationTimeout=30000,maxSeconds=8,fallback=localSpeech,profile}={}) {
 if(!['piper','kokoro','chatterbox'].includes(engine))throw Error('Motor inválido');
 if(!Number.isFinite(maxSeconds)||maxSeconds<1||maxSeconds>20)throw Error('Duração inválida');
 const identity=voiceProfile(profile);
 const metrics={profile:engine!=='piper'?identity:null,engine,voice:engine==='chatterbox'?identity.voice:engine==='kokoro'?'pf_dora (pt-BR feminina)':'Faber',quality:'HUMAN_REVIEW_REQUIRED',ready:false,neural:0,fallback:0,failures:0,maxSynthesisMs:0};
 if(!model)throw Error(`Configure ${`HUBLOAN_${engine.toUpperCase()}_MODEL`} para usar voz neural.`);
 let child,buffer='',pending=null,closed=false,failed=false;
 const fail=()=>{failed=true;metrics.ready=false;pending?.reject(Error('TTS indisponível'));pending=null;};
 function request(write,limit,signal){return new Promise((resolve,reject)=>{
  if(closed||failed||pending||signal?.aborted)return reject(Error('TTS indisponível ou ocupado'));
  const finish=(error,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);pending=null;error?reject(error):resolve(value);};
  const abort=()=>{finish(Error('TTS timeout/cancelado'));failed=true;metrics.ready=false;child.kill('SIGKILL');};
  const timer=setTimeout(abort,limit);signal?.addEventListener('abort',abort,{once:true});pending={resolve:v=>finish(null,v),reject:e=>finish(e)};write?.();
 });}
 child=spawn(python,['-u',fileURLToPath(new URL(engine==='chatterbox'?'./chatterbox_bridge.py':engine==='kokoro'?'./kokoro_bridge.py':'./piper_bridge.py',import.meta.url)),model],{shell:false,stdio:['pipe','pipe','ignore'],env:{...process.env,OMP_NUM_THREADS:'2',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}});
 child.stdin.on('error',fail);child.on('error',fail);child.on('close',fail);
 child.stdout.on('data',data=>{buffer+=data.toString();if(buffer.length>3000000){fail();child.kill('SIGKILL');return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const result=JSON.parse(line);if(result.error)pending?.reject(Error('TTS falhou'));else pending?.resolve(result);}catch{fail();child.kill('SIGKILL');}}});
 try{const began=performance.now(),result=await request(null,initializationTimeout);metrics.initializationMs=performance.now()-began;metrics.peakRssBytes=result.peakRssBytes||null;metrics.vramBytes=result.vramBytes??null;if(!result.ready)throw Error();metrics.ready=true;}catch{child.kill('SIGKILL');failed=true;metrics.failures++;}
 return {metrics,async inspect(){metrics.rssBytes=await rssOf(child.pid);return metrics;},async synthesize(text,voice='host',{signal,musical=false,delivery='warm'}={}){
  if(typeof text!=='string'||!text.trim()||text.length>200||text.includes('[[')||!voiceProfiles[voice])throw Error('Fala inválida');
  if(closed||signal?.aborted)throw Error('TTS cancelado');if(pending)throw Error('TTS ocupado');const started=Date.now();
  try{const result=await request(()=>child.stdin.write(JSON.stringify({text,voice,musical,reference:identity.reference,exaggeration:identity.exaggeration,maxSeconds,speed:directedSpeed(identity,delivery),delivery:['warm','wry','excited'].includes(delivery)?delivery:'warm'})+'\n'),timeout,signal);const pcm=decodeWav(Buffer.from(result.wav,'base64'),maxSeconds);metrics.peakRssBytes=result.peakRssBytes||metrics.peakRssBytes;metrics.neural++;return pcm;}
  catch{metrics.failures++;if(signal?.aborted||closed)throw Error('TTS cancelado');metrics.fallback++;return await fallback(text,voice,{signal,musical});}
  finally{metrics.maxSynthesisMs=Math.max(metrics.maxSynthesisMs,Date.now()-started);}
 },close(){closed=true;fail();child.kill('SIGKILL');}};
}
