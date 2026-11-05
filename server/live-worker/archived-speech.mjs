// Offline-only reuse of measured neural takes. No network, cloning or synthesis.
import {createHash} from 'node:crypto';
import {voiceProfile} from '../lume-voice.mjs';
import {decodeWav} from './speech.mjs';
export function archivedSpeech(profile,records,files){
 const identity=voiceProfile(profile),takes=new Map();
 if(identity.engine!=='chatterbox'||identity.exaggeration!==.35)throw Error('Perfil incompatível com as amostras');
 for(const r of records.filter(r=>r.voice===identity.reference)){
  const bytes=files.get(r.file);if(!bytes)continue;
  if(r.model!==identity.model||r.fallback!==false||!r.reference?.synthetic||r.reference.realPersonImitation!==false||createHash('sha256').update(bytes).digest('hex')!==r.sha256)throw Error('Proveniência de áudio inválida');
  if(r.initialization?.ready!==true||!Number.isFinite(r.metrics?.synthesisMs)||r.metrics.synthesisMs<=0)throw Error('Inferência anterior não comprovada');
  const pcm=decodeWav(bytes);if(Math.abs(pcm.length/48000-r.seconds)>.01)throw Error('Duração incompatível; amostras nunca truncadas');
  takes.set(r.text,{pcm,sha256:r.sha256,sourceSynthesisMs:r.metrics.synthesisMs});
 }
 const metrics={engine:identity.engine,voice:identity.voice,profile:identity,neural:0,fallback:0,failures:0,synthesisCalls:0,source:'VERIFIED_ARCHIVED_NEURAL_TAKES',used:[]};
 return {metrics,cacheKey:[...takes].map(([text,t])=>[text,t.sha256]),async synthesize(text,_voice,{signal}={}){
  if(signal?.aborted)throw Error('Cancelado');const take=takes.get(text);if(!take)throw Error('Texto sem amostra neural verificada');
  metrics.neural++;metrics.used.push({text,sha256:take.sha256,sourceSynthesisMs:take.sourceSynthesisMs});return take.pcm.slice();
 },close(){takes.clear();}};
}
