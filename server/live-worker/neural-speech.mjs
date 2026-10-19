import {rssOf} from './process-usage.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodeWav, localSpeech, voiceProfiles } from './speech.mjs';

// Owned by one worker; no HTTP listener, secrets or paid APIs. One request in flight.
export async function createNeuralSpeech({engine='piper',model=process.env[engine==='kokoro'?'HUBLOAN_KOKORO_MODEL':'HUBLOAN_PIPER_MODEL'],python=process.env[engine==='kokoro'?'HUBLOAN_KOKORO_PYTHON':'HUBLOAN_PIPER_PYTHON']||'python3',timeout=5000,fallback=localSpeech}={}) {
 const metrics={engine,voice:engine==='kokoro'?'pf_dora (pt-BR feminina)':'Faber',quality:'HUMAN_REVIEW_REQUIRED',ready:false,neural:0,fallback:0,failures:0,maxSynthesisMs:0};
 if(!model)throw Error('Configure HUBLOAN_PIPER_MODEL para usar voz neural.');
 let child,buffer='',pending=null,closed=false,failed=false;
 const fail=()=>{failed=true;metrics.ready=false;pending?.reject(Error('Piper indisponível'));pending=null;};
 function request(write,limit,signal){return new Promise((resolve,reject)=>{
  if(closed||failed||pending||signal?.aborted)return reject(Error('Piper indisponível ou ocupado'));
  const finish=(error,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);pending=null;error?reject(error):resolve(value);};
  const abort=()=>{finish(Error('Piper timeout/cancelado'));failed=true;metrics.ready=false;child.kill('SIGKILL');};
  const timer=setTimeout(abort,limit);signal?.addEventListener('abort',abort,{once:true});pending={resolve:v=>finish(null,v),reject:e=>finish(e)};write?.();
 });}
 child=spawn(python,['-u',fileURLToPath(new URL(engine==='kokoro'?'./kokoro_bridge.py':'./piper_bridge.py',import.meta.url)),model],{shell:false,stdio:['pipe','pipe','ignore'],env:{...process.env,OMP_NUM_THREADS:'2',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}});
 child.stdin.on('error',fail);child.on('error',fail);child.on('close',fail);
 child.stdout.on('data',data=>{buffer+=data.toString();if(buffer.length>1100000){fail();child.kill('SIGKILL');return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const result=JSON.parse(line);if(result.error)pending?.reject(Error('Piper falhou'));else pending?.resolve(result);}catch{fail();child.kill('SIGKILL');}}});
 try{const result=await request(null,30000);if(!result.ready)throw Error();metrics.ready=true;}catch{child.kill('SIGKILL');failed=true;metrics.failures++;}
 return {metrics,async inspect(){metrics.rssBytes=await rssOf(child.pid);return metrics;},async synthesize(text,voice='host',{signal,musical=false}={}){
  if(typeof text!=='string'||!text.trim()||text.length>200||text.includes('[[')||!voiceProfiles[voice])throw Error('Fala inválida');
  if(closed||signal?.aborted)throw Error('TTS cancelado');const started=Date.now();
  try{const result=await request(()=>child.stdin.write(JSON.stringify({text,voice,musical})+'\n'),timeout,signal);const pcm=decodeWav(Buffer.from(result.wav,'base64'));metrics.neural++;return pcm;}
  catch{metrics.failures++;if(signal?.aborted||closed)throw Error('TTS cancelado');metrics.fallback++;return await fallback(text,voice,{signal,musical});}
  finally{metrics.maxSynthesisMs=Math.max(metrics.maxSynthesisMs,Date.now()-started);}
 },close(){closed=true;fail();child.kill('SIGKILL');}};
}
