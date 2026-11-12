import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {decryptKey} from './domain.mjs';
import {voiceProfile,voiceInstalled} from './lume-voice.mjs';
import {VoiceError,voiceError} from './voice-errors.mjs';
import {createMediaProviders} from './media-providers/index.mjs';
import {executeMediaOperation} from './multimodal-studio.mjs';
import {createNeuralSpeech} from './live-worker/neural-speech.mjs';
import {localSpeech} from './live-worker/speech.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const voiceIdentityHash=p=>{const {version:_version,approvedSampleId:_approved,...identity}=voiceProfile(p);return digest(identity);};
export function voiceBudgetAction(w,input){
 const s=w.voiceStudio||={active:voiceProfile(),revision:0};if(input.revision!==s?.revision)throw new VoiceError('VOICE_SYNTHESIS_BUSY');
 if(!['samples','viral','live'].includes(input.scope)||input.acceptUnknownCost!==true||!Number.isSafeInteger(input.characters)||input.characters<0||input.characters>100000||!Number.isSafeInteger(input.sessionCharacters)||input.sessionCharacters<0||input.sessionCharacters>input.characters)throw new VoiceError('VOICE_BUDGET_REQUIRED');
 s.budgets||={};s.budgets[input.scope]={characters:input.characters,sessionCharacters:input.sessionCharacters,unknownCostAccepted:true,at:new Date().toISOString()};s.revision++;
}
// Persistent conservative character reservations; unknown charges are never released automatically.
export async function synthesizeVoiceAsset({store,id,token,profile,text,scope='samples',sessionId='samples',signal,adapters=createMediaProviders(),campaignId,maxMicros,authorize=false}){
 profile=voiceProfile(profile);if(profile.engine!=='elevenlabs')throw new VoiceError('VOICE_MODEL_UNAVAILABLE');
 if(typeof text!=='string'||!text.trim()||text.length>200)throw new VoiceError('VOICE_SYNTHESIS_FAILED');
 const {approvedSampleId:_approved,version:_version,...identity}=profile;const keyHash=digest([identity,text]),w=(await store.read(id)).workspace,cache=w.voiceStudio?.audioCache?.find(x=>x.key===keyHash);
 if(cache)return {...cache.result,cached:true,sampleId:cache.id};
 const connection=w.multimodal?.connections.elevenlabs;if(!connection?.secret||!token)throw new VoiceError('VOICE_PROVIDER_NOT_CONFIGURED');
 const secret=decryptKey(connection.secret,token),account=await adapters.inspectEleven(secret,signal).catch(e=>{throw voiceError(e);}),model=account.models.find(m=>m.id===profile.model);
 if(!model?.languages.some(l=>l.language_id==='pt')||!account.voices.some(v=>v.id===profile.voice)||(profile.settings.style!==undefined&&!model.style))throw new VoiceError('VOICE_MODEL_UNAVAILABLE');
 const credits=text.length*model.characterMultiplier;if(!Number.isFinite(credits)||credits<=0||!Number.isFinite(account.quota.limit)||!Number.isFinite(account.quota.used)||credits>account.quota.limit-account.quota.used)throw new VoiceError('VOICE_QUOTA_EXCEEDED');
 const day=new Date().toISOString().slice(0,10),requestKey=digest([scope,sessionId,keyHash]);
 const {result:entry}=await store.mutate(id,w=>{const s=w.voiceStudio,policy=s?.budgets?.[scope];if(!policy?.unknownCostAccepted||(scope==='samples'&&!authorize))throw new VoiceError('VOICE_BUDGET_REQUIRED');
 const ledger=s.usage||=[];if(ledger.some(e=>e.key===requestKey))throw new VoiceError('VOICE_RESULT_UNCERTAIN');
 if(ledger.some(e=>e.state==='SENDING'&&Date.now()-Date.parse(e.at)<95000))throw new VoiceError('VOICE_SYNTHESIS_BUSY');
 const used=ledger.filter(e=>e.scope===scope&&e.day===day).reduce((n,e)=>n+e.characters,0),session=ledger.filter(e=>e.scope===scope&&e.sessionId===sessionId).reduce((n,e)=>n+e.characters,0);
 if(used+text.length>policy.characters||session+text.length>policy.sessionCharacters)throw new VoiceError('VOICE_BUDGET_EXCEEDED');
 const e={id:randomUUID(),key:requestKey,scope,sessionId,day,characters:text.length,estimatedCredits:credits,actualCost:null,state:'SENDING',at:new Date().toISOString(),identity:voiceIdentityHash(profile)};ledger.push(e);return e;});
 const start=performance.now();try{signal?.throwIfAborted();const result=campaignId?await executeMediaOperation({store,id,token,campaignId,operation:'speech',input:{voiceId:profile.voice,model:profile.model,settings:profile.settings,text},maxMicros,signal,adapters}):await adapters.speech(secret,{voiceId:profile.voice,model:profile.model,settings:profile.settings,text},signal);
 if(!result.base64||result.fallback!==false)throw new VoiceError('VOICE_SYNTHESIS_FAILED');result.latencyMs=performance.now()-start;result.identity=voiceIdentityHash(profile);result.provider='elevenlabs';
 await store.mutate(id,w=>{const s=w.voiceStudio,e=s.usage.find(e=>e.id===entry.id);Object.assign(e,{state:'COMPLETE',requestId:result.requestId,latencyMs:result.latencyMs});const cache=s.audioCache||=[];cache.push({id:entry.id,key:keyHash,result});while(cache.length>20||cache.reduce((n,e)=>n+e.result.base64.length,0)>12000000)cache.shift();});return {...result,sampleId:entry.id};
 }catch(error){const safe=voiceError(error);await store.mutate(id,w=>{const e=w.voiceStudio.usage.find(e=>e.id===entry.id);e.state='UNCERTAIN';e.error=safe.code;});throw safe;}
}
export function decodeSpeechAsset(asset,signal,maxSeconds=20){return new Promise((resolve,reject)=>{
 const child=spawn('ffmpeg',['-v','error','-i','pipe:0','-f','f32le','-ar','48000','-ac','1','pipe:1'],{stdio:['pipe','pipe','ignore']});const chunks=[];let bytes=0,done=false;const finish=(e,v)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);e?reject(e):resolve(v);};const abort=()=>{child.kill('SIGKILL');finish(new VoiceError('VOICE_CANCELLED'));};const timer=setTimeout(abort,10000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();child.stdin.on('error',()=>{});child.on('error',()=>finish(new VoiceError('VOICE_SYNTHESIS_FAILED')));child.stdout.on('data',b=>{bytes+=b.length;if(bytes>maxSeconds*48000*4){child.kill('SIGKILL');finish(new VoiceError('VOICE_SYNTHESIS_FAILED'));}else chunks.push(b);});child.on('close',code=>{if(code||!bytes)return finish(new VoiceError('VOICE_SYNTHESIS_FAILED'));const b=Buffer.concat(chunks),pcm=new Float32Array(b.length/4);for(let i=0;i<pcm.length;i++)pcm[i]=b.readFloatLE(i*4);finish(null,pcm);});child.stdin.end(Buffer.from(asset.base64,'base64'));
});}
export async function createUniversalVoice({profile,remote,mode='studio',allowFallback=false,technicalFallback=localSpeech,...options}){
 const identity=voiceProfile(profile),metrics={profile:identity,engine:identity.engine,neural:0,fallback:0,failures:0,providerCalls:0,maxSynthesisMs:0,liveValidated:false};let local;
 if(identity.engine!=='elevenlabs'){
  if(!voiceInstalled(identity.candidateId)&&!allowFallback)throw new VoiceError('VOICE_MODEL_UNAVAILABLE');
  if(voiceInstalled(identity.candidateId))local=await createNeuralSpeech({engine:identity.engine,profile:identity,strict:true,...options,timeout:mode==='live'?4000:180000,initializationTimeout:60000,fallback:async()=>{throw new VoiceError('VOICE_SYNTHESIS_FAILED');}});
 }
 return {metrics,cacheKey:voiceIdentityHash(identity),async synthesize(text,voice='host',opts={}){const start=performance.now();try{let pcm;if(identity.engine==='elevenlabs'){if(!remote)throw new VoiceError('VOICE_PROVIDER_NOT_CONFIGURED');const asset=await remote(text,opts.signal);if(!asset.cached)metrics.providerCalls++;pcm=await decodeSpeechAsset(asset,opts.signal,mode==='live'?8:20);}else{if(!local)throw new VoiceError('VOICE_MODEL_UNAVAILABLE');pcm=await local.synthesize(text,voice,opts);}metrics.neural++;return pcm;}catch(e){metrics.failures++;metrics.lastError=voiceError(e).code;if(!allowFallback||opts.signal?.aborted)throw voiceError(e);metrics.fallbackAttempts=(metrics.fallbackAttempts||0)+1;try{const pcm=await technicalFallback(text,voice,opts);metrics.fallback++;return pcm;}catch{metrics.lastError='VOICE_TECHNICAL_UNAVAILABLE';throw new VoiceError('VOICE_TECHNICAL_UNAVAILABLE');}}finally{metrics.maxSynthesisMs=Math.max(metrics.maxSynthesisMs,performance.now()-start);}},async inspect(){return metrics;},close(){local?.close();}};
}
