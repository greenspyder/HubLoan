import { createSpeechCache } from './speech.mjs';
import { pcm as gamePcm } from './render.mjs';
// Original procedural score: two alternating four-bar motifs, no external music.
export function musicSample(t,style='groove'){
 const beat=style==='calm'?60/90:.5,phase=t%beat,bar=Math.floor(t/(beat*4)),notes=[220,261.63,329.63,293.66],next=[196,246.94,293.66,261.63];
 const blend=Math.min(1,(t%32)/2),melody=(sequence)=>Math.sin(2*Math.PI*sequence[bar%4]*t)*Math.exp(-phase*5)*.22;
 const a=Math.floor(t/32)%2?next:notes,b=Math.floor(t/32)%2?notes:next;
 return melody(a)*blend+melody(b)*(1-blend)+Math.sin(2*Math.PI*55*phase)*Math.exp(-phase*22)*.35+Math.sin(2*Math.PI*3600*t)*Math.exp(-(t%(beat/2))*80)*.035;
}
export function createMixer({synthesize}={}){
 const speech=createSpeechCache({synthesize}),seen=new Set(),pending=[],ready=[];let current=null,busy=false,closed=false,sample=0,duck=1,lastMinute=-1,generated=0,epoch=0,presentation=null;
 const metrics={synthesized:0,cacheHits:0,ttsFailures:0,dropped:0,ttsMs:0,maxPlaybackLatencyMs:0,played:{host:0,comment:0,chant:0},peak:0,aiCalls:0};
 async function prepare(){if(busy||closed)return;busy=true;try{while(pending.length&&!closed){const job=pending.shift(),segments=[],generation=epoch;for(const segment of job.segments){const started=Date.now();let pcm;try{const result=await speech.get(segment);pcm=result.pcm;metrics[result.cached?'cacheHits':'synthesized']++;}catch{metrics.ttsFailures++;pcm=new Float32Array(48000*2);}metrics.ttsMs+=Date.now()-started;segments.push({...segment,pcm});}if(!closed&&generation===epoch){ready.push({...job,segments});ready.sort((a,b)=>b.priority-a.priority||a.createdAt-b.createdAt);}}}finally{busy=false;}}
 return {metrics,observe(e,now=Date.now()){
  const minute=Math.floor(now/60000);if(minute!==lastMinute){generated=0;lastMinute=minute;}
  if(!e.performanceConfig?.enabled||e.status!=='TESTING'){epoch++;presentation=null;current=null;ready.length=0;pending.length=0;return;}
  for(const job of e.performance?.jobs||[]){if(seen.has(job.id))continue;seen.add(job.id);if(seen.size>500)seen.delete(seen.values().next().value);
   if(job.sessionId!==e.sessionId||job.expiresAt<=now||now-job.createdAt>12000||pending.length+ready.length>=6||generated+job.segments.length>12){metrics.dropped++;continue;}generated+=job.segments.length;pending.push(job);
  }void prepare();
 },mix(e,at,samples=3200,direction=null){
  const c=e.performanceConfig;if(!c?.enabled){presentation=null;return gamePcm(e,at,samples);}
  const playing=e.status==='TESTING'&&!e.config.audio.muted;
  if(!playing){presentation=null;current=null;ready.length=0;pending.length=0;return Buffer.alloc(samples*2);}
  while(!current&&ready.length){const job=ready.shift();if(job.expiresAt<Date.now()){metrics.dropped++;continue;}current={...job,segment:0,offset:0};metrics.maxPlaybackLatencyMs=Math.max(metrics.maxPlaybackLatencyMs,Date.now()-job.createdAt);metrics.played[job.segments[0].role]++;}
  const out=Buffer.alloc(samples*2),effects=gamePcm(e,at,samples),seg=current?.segments[current.segment];
  let energy=0;if(seg){for(let i=0;i<samples;i++)energy+=(seg.pcm[current.offset+i]||0)**2;}
  presentation=seg?{text:seg.text,role:seg.role,level:Math.min(1,Math.sqrt(energy/samples)*5),elapsedMs:current.offset/48}:null;
  for(let i=0;i<samples;i++){
   const t=(sample+i)/48000,target=seg?.role==='chant'?.3:seg?.role? .22:direction?.cue?.kind==='near-miss'?.5:1;duck+=(target-duck)/2400;
   let value=c.music?musicSample(t,c.style)*c.musicGain*duck:0;
   if(seg){value+=(seg.pcm[current.offset+i]||0)*c.voiceGain;if(seg.role==='chant'){const pulse=t%.5;value+=Math.sin(2*Math.PI*90*pulse)*Math.exp(-pulse*25)*c.effectsGain*.25;}}
   value+=effects.readInt16LE(i*2)/32768*c.effectsGain;
   if(direction?.cue?.kind==='near-miss'){const age=(direction.age+i/48)/1000;if(age>=0&&age<.2)value+=Math.sin(age*2*Math.PI*320)*Math.exp(-age*25)*c.effectsGain*.16;}
   value=Math.tanh(value)*.92*e.config.audio.volume;metrics.peak=Math.max(metrics.peak,Math.abs(value));out.writeInt16LE(Math.round(value*32767),i*2);
  }
  sample+=samples;if(current){current.offset+=samples;if(current.offset>=seg.pcm.length){current.segment++;current.offset=0;if(current.segment>=current.segments.length)current=null;else metrics.played[current.segments[current.segment].role]++;}}
  return out;
 },presentation(){return presentation;},close(){closed=true;presentation=null;current=null;pending.length=0;ready.length=0;speech.close();},get busy(){return busy;},get duck(){return duck;}};
}
