import test from 'node:test';
import assert from 'node:assert/strict';
import {createMixer} from '../live-worker/mixer.mjs';
import {workerAudioTelemetry,videoProfiles} from '../live-worker/worker.mjs';
import {warmupSegments,hostSegment} from '../live-lume-lines.mjs';
import {performanceDefaults,resetPerformance,advanceGamePerformance,advancePerformance} from '../live-performance.mjs';
import {createGame,advanceGame} from '../live-game.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
const experience=()=>({sessionId:'one',status:'TESTING',queue:[],config:{audio:{volume:1,muted:false}},performanceConfig:{...performanceDefaults(),enabled:true,humor:'cheeky'}});
test('prepared reply bypasses blocked dynamic synthesis; first effect, speech and completion measured separately',async()=>{
 let now=100000,calls=0,release;const slow=new Promise(r=>release=r),m=createMixer({clock:()=>now,synthesize:async text=>{calls++;if(text==='Dinâmica')await slow;return new Float32Array(4800).fill(.2);}}),e=experience();resetPerformance(e);
 try{const line=warmupSegments()[0];await m.prime([line]);assert.equal(calls,1);
 const mk=(id,priority,segments)=>({id,sessionId:e.sessionId,createdAt:100000,expiresAt:145000,priority,source:'SIMULATED_OPERATOR',segments});
 e.performance.jobs=[mk('slow',0,[hostSegment('Dinâmica')])];m.observe(e);await tick();
 e.performance.jobs.push(mk('special',4,[line]));now=100750;m.observe(e);m.mix(e,now,4800);
 assert.equal(m.presentation().text,line.text);assert.equal(m.metrics.latency.firstSpeech.maxMs,750);assert.equal(m.metrics.latency.firstEffect.maxMs,750);assert.equal(m.metrics.latency.preloaded.maxMs,750);assert.equal(calls,2);assert.equal(m.metrics.latency.complete.maxMs,850);assert.equal(m.metrics.latency.firstMusic,undefined);
 release();await tick();e.status='PAUSED';m.observe(e);assert.ok(m.mix(e,now).every(v=>v===0));
 }finally{release();m.close();}
});
test('no audience: sparse contextual autonomy never changes physics or creates gifts',()=>{
 const e=experience();resetPerformance(e);e.game=createGame({template:'seed-snake',names:['Lume','Faísca'],roundSeconds:22},1000);const spoken=[];
 for(let now=1000;now<=181000;now+=200){advanceGame(e.game,now);const before=JSON.stringify(e.game),old=e.performance.lastSpokeAt;advanceGamePerformance(e,now);assert.equal(JSON.stringify(e.game),before);if(old!==e.performance.lastSpokeAt)spoken.push({at:now,text:e.performance.jobs.at(-1)?.segments.at(-1).text});}
 assert.ok(spoken.length>=5&&spoken.length<=15);for(let i=1;i<spoken.length;i++)assert.ok(spoken[i].at-spoken[i-1].at>=12000);assert.ok(new Set(spoken.map(s=>s.text)).size>=4);assert.deepEqual(e.performance.top,[]);assert.equal(e.performance.accepted,0);assert.equal(e.performance.aiCalls,0);
});
test('gift reply precedes music, grouping and warmup limits preserved',()=>{
 const e=experience();resetPerformance(e);e.musicCatalog=[{id:'t',approved:true,category:'special',hash:'h',kind:'INSTRUMENTAL_TEST',title:'Teste'}];const gift={type:'gift',gift:'rosa',quantity:20,participantId:'demo-ana',name:'Ana'};
 advancePerformance(e,gift,100000);assert.deepEqual(e.performance.jobs[0].segments.map(s=>s.role),['host','music']);assert.equal(e.performance.jobs[0].priority,4);advancePerformance(e,gift,100500);assert.equal(e.performance.jobs.length,1);assert.equal(e.performance.top[0].quantity,40);assert.equal(warmupSegments().length,7);
});
test('warmup failure does not stop media; emergency mutes everything',async()=>{
 const e=experience();resetPerformance(e);const m=createMixer({synthesize:async()=>{throw Error('unavailable');}});try{await m.prime([hostSegment('Teste')]);assert.equal(m.metrics.warmupFailures,1);assert.ok(m.mix(e,1000).some(v=>v!==0));e.config.audio.muted=true;m.observe(e);assert.ok(m.mix(e,1001).every(v=>v===0));}finally{m.close();}
});
test('heartbeat telemetry excludes local speech journal and fits unchanged 2048-byte body limit',()=>{
 const fields=['reaction','segment','preloaded','firstSpeech','firstMusic','firstEffect','complete'];const latency=Object.fromEntries(fields.map(k=>[k,{count:256,meanMs:99999999,p95Ms:99999999,maxMs:99999999}]));
 const audio=workerAudioTelemetry({playback:Array(64).fill({text:'x'.repeat(200)}),latency,synthesized:100000000,cacheHits:100000000,ttsFailures:100000000,dropped:100000000,ttsMs:100000000,maxPlaybackLatencyMs:100000000});
 const payload={instance:'x'.repeat(36),status:'SENDING_MEDIA',frames:9999999,bytes:999999999999,audio,settledJobs:Array(8).fill('a'.repeat(36))};assert.ok(Buffer.byteLength(JSON.stringify(payload))<=2048);assert.equal(audio.playback,undefined);assert.equal(audio.latency.firstSpeech.maxMs,99999999);
});

test('CPU profile is optional; light and HD remain unchanged',()=>{assert.deepEqual(videoProfiles.cpu,{fps:8,width:360,height:640});assert.deepEqual(videoProfiles.light,{fps:15,width:360,height:640});assert.deepEqual(videoProfiles.hd,{fps:30,width:720,height:1280});});
