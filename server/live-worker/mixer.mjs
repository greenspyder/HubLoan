import { createSpeechCache } from './speech.mjs';
import { pcm as gamePcm } from './render.mjs';
// Original procedural score: two alternating four-bar motifs, no external music.
export function musicSample(t,style='groove'){
 const beat=style==='calm'?60/90:.5,phase=t%beat,bar=Math.floor(t/(beat*4)),notes=[220,261.63,329.63,293.66],next=[196,246.94,293.66,261.63];
 const blend=Math.min(1,(t%32)/2),melody=(sequence)=>Math.sin(2*Math.PI*sequence[bar%4]*t)*Math.exp(-phase*5)*.22;
 const a=Math.floor(t/32)%2?next:notes,b=Math.floor(t/32)%2?notes:next;
 return melody(a)*blend+melody(b)*(1-blend)+Math.sin(2*Math.PI*55*phase)*Math.exp(-phase*22)*.35+Math.sin(2*Math.PI*3600*t)*Math.exp(-(t%(beat/2))*80)*.035;
}
export function createMixer({synthesize,clock=Date.now}={}){
 const speech=createSpeechCache({synthesize}),seen=new Set(),settled=new Set(),pending=[],ready=[];let current=null,busy=false,closed=false,sample=0,duck=1,lastMinute=-1,generated=0,epoch=0,presentation=null,accent=null;
 const latencySamples={reaction:[],queue:[],synthesis:[],pending:[],segment:[],preloaded:[],firstSpeech:[],firstMusic:[],complete:[],firstEffect:[]};
 const measure=(key,value)=>{const a=latencySamples[key];a.push(Math.max(0,value));if(a.length>256)a.shift();const sorted=[...a].sort((x,y)=>x-y);metrics.latency[key]={count:a.length,meanMs:a.reduce((x,y)=>x+y,0)/a.length,p95Ms:sorted[Math.ceil(a.length*.95)-1],maxMs:sorted.at(-1)};};
 const settle=id=>{settled.add(id);if(settled.size>64)settled.delete(settled.values().next().value);};
 const order=(a,b)=>b.priority-a.priority||a.createdAt-b.createdAt;
 const stale=(job,now)=>job.expiresAt<=now||now-job.createdAt>(job.segments.some(s=>s.role==='music')?12000:6000);
 const readyJob=(job,segments)=>{ready.push({...job,segments,readyAt:clock()});ready.sort(order);};
 let assets=new Map(),ambient=[],ambientIndex=0,ambientOffset=0;
 const metrics={playback:[],latency:{},interrupted:0,staleDropped:0,synthesized:0,cacheHits:0,ttsFailures:0,dropped:0,ttsMs:0,maxPlaybackLatencyMs:0,musicFailures:0,ambientFrames:0,ambientTransitions:0,ambientTrackId:null,trackPlays:{},played:{host:0,comment:0,chant:0,music:0},peak:0,aiCalls:0};
 async function prepare(){if(busy||closed)return;busy=true;try{while(pending.length&&!closed){pending.sort(order);const job=pending.shift(),segments=[],generation=epoch;if(stale(job,clock())){metrics.staleDropped++;metrics.dropped++;settle(job.id);continue;}const preparationStarted=clock();measure('pending',preparationStarted-job.observedAt);for(const segment of job.segments){const started=Date.now();let pcm,vocalWindows=[];try{if(segment.role==='music'){const item=assets.get(segment.trackId);if(!item||item.track.hash!==segment.hash)throw Error('Faixa indisponível');pcm=item.pcm;vocalWindows=item.track.vocalWindows||[];}else{const result=await speech.get(segment);pcm=result.pcm;metrics[result.cached?'cacheHits':'synthesized']++;}}catch{if(segment.role==='music'){metrics.musicFailures++;continue;}metrics.ttsFailures++;pcm=new Float32Array(48000*2);}metrics.ttsMs+=Date.now()-started;segments.push({...segment,pcm,vocalWindows});}if(segments.length&&!closed&&generation===epoch){measure('synthesis',clock()-preparationStarted);readyJob(job,segments);}else settle(job.id);}}finally{busy=false;}}
 return {metrics,async prime(segments,onPrepared=async()=>{}){if(busy||closed)throw Error('Mixer ocupado');for(const segment of segments.slice(0,7)){if(closed)break;try{await speech.get(segment);}catch{metrics.warmupFailures=(metrics.warmupFailures||0)+1;}await onPrepared();}},setRepertoire(r,mainTrackId){assets=r.assets;metrics.musicFailures+=r.failures;ambient=[...assets.values()].filter(x=>x.track.category==='ambient').sort((a,b)=>Number(b.track.id===mainTrackId)-Number(a.track.id===mainTrackId));ambientOffset=0;ambientIndex=0;},observe(e,now=clock()){
  const minute=Math.floor(now/60000);if(minute!==lastMinute){generated=0;lastMinute=minute;}
  if(!e.performanceConfig?.enabled||e.status!=='TESTING'||e.config.audio.muted){epoch++;presentation=null;accent=null;current=null;ready.length=0;pending.length=0;return;}
  for(const job of e.performance?.jobs||[]){if(seen.has(job.id))continue;seen.add(job.id);if(seen.size>500)seen.delete(seen.values().next().value);
   if(job.sessionId!==e.sessionId||job.expiresAt<=now||now-job.createdAt>(job.segments.some(s=>s.role==='music')?45000:12000)||pending.length+ready.length>=6||generated+job.segments.length>12){metrics.dropped++;settle(job.id);continue;}generated+=job.segments.length;
   if(job.source==='SIMULATED_OPERATOR'&&job.priority>=2&&(!accent||job.priority>accent.priority))accent={createdAt:job.createdAt,priority:job.priority,offset:0,measured:false};
   const loaded=job.segments.map(s=>{if(s.role!=='music'){const pcm=speech.peek(s);return pcm?{...s,pcm,vocalWindows:[]}:null;}const a=assets.get(s.trackId);return a&&a.track.hash===s.hash?{...s,pcm:a.pcm,vocalWindows:a.track.vocalWindows||[]}:null;});
   if(loaded.every(Boolean)){metrics.cacheHits+=job.segments.filter(s=>s.role!=='music').length;readyJob({...job,preloaded:true},loaded);}
   else pending.push({...job,observedAt:clock()});
  }void prepare();
 },mix(e,at,samples=3200,direction=null){
  const c=e.performanceConfig;if(!c?.enabled){presentation=null;return gamePcm(e,at,samples);}
  const playing=e.status==='TESTING'&&!e.config.audio.muted;
  if(!playing){epoch++;presentation=null;accent=null;current=null;ready.length=0;pending.length=0;return Buffer.alloc(samples*2);}
  const now=clock();if(accent&&!accent.measured){measure('firstEffect',now-accent.createdAt);accent.measured=true;}
  for(let i=ready.length-1;i>=0;i--)if(stale(ready[i],now)){settle(ready[i].id);ready.splice(i,1);metrics.staleDropped++;metrics.dropped++;}
  if(current&&ready[0]?.priority>=4&&ready[0].priority>current.priority&&current.fadeRemaining==null)current.fadeRemaining=1920;
  while(!current&&ready.length){const job=ready.shift();current={...job,segment:0,offset:0};const latency=now-job.createdAt;measure('reaction',latency);measure('queue',now-job.readyAt);if(job.preloaded)measure('preloaded',latency);metrics.maxPlaybackLatencyMs=Math.max(metrics.maxPlaybackLatencyMs,latency);metrics.played[job.segments[0].role]++;if(job.segments[0].trackId)metrics.trackPlays[job.segments[0].trackId]=(metrics.trackPlays[job.segments[0].trackId]||0)+1;}
  if(current&&!current.segmentMeasured){const delay=now-current.createdAt;measure('segment',delay);metrics.maxPlaybackLatencyMs=Math.max(metrics.maxPlaybackLatencyMs,delay);const role=current.segments[current.segment].role,key=role==='music'?'firstMusic':'firstSpeech';if(!current[key]){measure(key,delay);current[key]=true;}metrics.playback.push({text:current.segments[current.segment].text,role,createdAt:current.createdAt,startedAt:now,source:current.source});metrics.playback=metrics.playback.slice(-64);current.segmentMeasured=true;}
  const out=Buffer.alloc(samples*2),effects=gamePcm(e,at,samples),seg=current?.segments[current.segment];
  let energy=0;if(seg){for(let i=0;i<samples;i++)energy+=(seg.pcm[current.offset+i]||0)**2;}
  presentation=seg?{text:seg.text,role:seg.role,level:Math.min(1,Math.sqrt(energy/samples)*5),elapsedMs:current.offset/48,durationMs:seg.pcm.length/48,kind:seg.kind,trackId:seg.trackId}:null;
  if(presentation){const start=current.offset/48000,end=(current.offset+samples)/48000;presentation.vocalActive=seg.role!=='music'||(['AI_SINGING','HUMAN_SINGING'].includes(seg.kind)&&seg.vocalWindows.some(([a,b])=>start>=a&&end<=b));presentation.vocalLevel=presentation.vocalActive?presentation.level:0;}
  for(let i=0;i<samples;i++){
   const t=(sample+i)/48000,target=seg?.role==='music'?.12:seg?.role==='chant'?.3:seg?.role? .22:direction?.cue?.kind==='near-miss'?.5:1;duck+=(target-duck)/2400;
   let bed=musicSample(t,c.style);if(ambient.length){metrics.ambientTrackId=ambient[ambientIndex].track.id;const a=ambient[ambientIndex].pcm,b=ambient[(ambientIndex+1)%ambient.length].pcm,left=a.length-ambientOffset,blend=left<48000?1-left/48000:0;bed=a[ambientOffset]*(1-blend)+(b[48000-left]||0)*blend;ambientOffset++;if(ambientOffset>=a.length){metrics.ambientTransitions++;ambientIndex=(ambientIndex+1)%ambient.length;ambientOffset=48000;}}let value=c.music?bed*c.musicGain*duck:0;
   if(seg){const edge=Math.min(1,(current.offset+i)/480,(seg.pcm.length-current.offset-i)/480)*(current.fadeRemaining==null?1:Math.max(0,(current.fadeRemaining-i)/1920));value+=(seg.pcm[current.offset+i]||0)*c.voiceGain*Math.max(0,edge);if(seg.role==='chant'){const pulse=t%.5;value+=Math.sin(2*Math.PI*90*pulse)*Math.exp(-pulse*25)*c.effectsGain*.25;}}
   value+=effects.readInt16LE(i*2)/32768*c.effectsGain;
   if(accent){const age=(accent.offset+i)/48000;if(age<.16)value+=Math.sin(2*Math.PI*660*age)*Math.sin(Math.PI*age/.16)*Math.exp(-age*15)*c.effectsGain*.2;}
   if(direction?.cue?.kind==='near-miss'){const age=(direction.age+i/48)/1000;if(age>=0&&age<.2)value+=Math.sin(age*2*Math.PI*320)*Math.exp(-age*25)*c.effectsGain*.16;}
   value=Math.tanh(value)*.92*e.config.audio.volume;metrics.peak=Math.max(metrics.peak,Math.abs(value));out.writeInt16LE(Math.round(value*32767),i*2);
  }
  if(accent){accent.offset+=samples;if(accent.offset>=7680)accent=null;}if(ambient.length&&c.music)metrics.ambientFrames++;sample+=samples;if(current?.fadeRemaining!=null){current.fadeRemaining-=samples;if(current.fadeRemaining<=0){settle(current.id);current=null;metrics.interrupted++;}}if(current){current.offset+=samples;if(current.offset>=seg.pcm.length){current.segment++;current.offset=0;current.segmentMeasured=false;if(current.segment>=current.segments.length){measure('complete',now+samples/48-current.createdAt);settle(current.id);current=null;}else {const next=current.segments[current.segment];metrics.played[next.role]++;if(next.trackId)metrics.trackPlays[next.trackId]=(metrics.trackPlays[next.trackId]||0)+1;}}}
  return out;
 },presentation(){return presentation;},close(){closed=true;presentation=null;accent=null;current=null;pending.length=0;ready.length=0;speech.close();},get settledJobs(){return [...settled];},get busy(){return busy;},get duck(){return duck;}};
}
