import test from 'node:test';import assert from 'node:assert/strict';
import {musicTrack,inspectMusic,queueMusic,repertoireAction} from '../live-music.mjs';
import {testMusic,trackInput} from './fixtures/live-music.mjs';
import {createMixer} from '../live-worker/mixer.mjs';import {decodeMusic} from '../live-worker/repertoire.mjs';
import {createApp} from '../app.mjs';import {createStore} from '../store.mjs';import {performanceDefaults} from '../live-performance.mjs';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const tick=()=>new Promise(r=>setImmediate(r));
test('repertoire validates files, rights, approval hash, versions, limit and rotation/grouping',()=>{
 const bytes=testMusic(),t=musicTrack(trackInput(),bytes);assert.equal(inspectMusic(bytes).seconds,6);assert.throws(()=>inspectMusic(bytes.subarray(0,100)));assert.throws(()=>musicTrack({...trackInput(),commercialLiveRights:false},bytes));assert.throws(()=>musicTrack(trackInput(),testMusic(0,9)));
 const e={status:'STOPPED',configVersion:1,musicCatalog:[],performanceConfig:performanceDefaults(),sessionId:'s',performance:{jobs:[]}};
 for(let i=0;i<3;i++){const track=musicTrack(trackInput('roses',i),testMusic(i));repertoireAction(e,'music-import',{version:e.configVersion,track});assert.throws(()=>repertoireAction(e,'music-approve',{version:e.configVersion,trackId:track.id,hash:'wrong',listened:true,rightsReviewed:true}));repertoireAction(e,'music-approve',{version:e.configVersion,trackId:track.id,hash:track.hash,listened:true,rightsReviewed:true});}
 assert.throws(()=>repertoireAction(e,'music-import',{version:e.configVersion,track:musicTrack(trackInput('roses',3),testMusic(3))}));
 queueMusic(e,'roses','Teste',100000);for(let i=0;i<20;i++)queueMusic(e,'roses','Teste',100001+i);assert.equal(e.performance.jobs.length,1);assert.equal(e.performance.repertoire.grouped,20);
 for(let i=1;i<6;i++)queueMusic(e,'roses','Teste',100000+i*21000);assert.deepEqual(e.performance.repertoire.history.map(h=>e.musicCatalog.findIndex(x=>x.id===h.trackId)),[0,1,0,1,0,2]);
 e.status='TESTING';assert.throws(()=>repertoireAction(e,'music-remove',{version:e.configVersion,trackId:t.id}));assert.equal(queueMusic({...e,performance:{jobs:[]},musicCatalog:[]},'roses','Teste',1),false);
});
test('same mixer plays imported ambient and prioritized jingles, ducks, limits, mutes and recovers missing files',async()=>{
 const a=musicTrack(trackInput('ambient',0),testMusic(0,4)),b=musicTrack(trackInput('roses',1),testMusic(1));a.approved=b.approved=true;
 const mixer=createMixer({synthesize:async()=>new Float32Array(48000).fill(.2)}),now=Date.now(),e={status:'TESTING',sessionId:'s',config:{audio:{muted:false,volume:1}},performanceConfig:{...performanceDefaults(),enabled:true},performance:{jobs:[{id:'j',sessionId:'s',createdAt:now,expiresAt:now+45000,priority:4,segments:[{role:'music',trackId:b.id,hash:b.hash,kind:b.kind,text:b.title}]}]}};
 mixer.setRepertoire({assets:new Map([[a.id,decodeMusic(testMusic(0,4),a)],[b.id,decodeMusic(testMusic(1),b)]]),failures:0});mixer.observe(e,now);await tick();
 for(let i=0;i<105;i++)assert.equal(mixer.mix(e,now+i*100,4800).length,9600);
 assert.equal(mixer.metrics.played.music,1);assert.equal(mixer.metrics.trackPlays[b.id],1);assert.equal(mixer.metrics.ambientFrames,105);assert.ok(mixer.metrics.ambientTransitions>=2);assert.equal(mixer.metrics.ambientTrackId,a.id);assert.ok(mixer.metrics.peak<1);assert.ok(mixer.duck>.9);assert.equal(mixer.metrics.synthesized,0);
 e.config.audio.muted=true;mixer.observe(e,now+12000);assert.ok(mixer.mix(e,now+12000).every(x=>x===0));mixer.close();
 const broken=createMixer();e.config.audio.muted=false;broken.observe(e,now);await tick();broken.mix(e,now);assert.equal(broken.metrics.musicFailures,1);broken.close();
});
test('API persists audio, protects preview and worker access, rejects unapproved and revoked grants',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'lf42-')),file=join(dir,'state.sqlite'),store=await createStore({file}),app=createApp({store,provider:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();await rm(dir,{recursive:true,force:true});});const base=`http://127.0.0.1:${app.server.address().port}/api/agents`,token='a'.repeat(64);
 const post=async(path,input,status=200)=>{const r=await fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;};
 let e=(await post('/live/create',{name:'Lume'})).liveFactory.experiences[0];e=(await post('/live/music-import',{id:e.id,version:1,...trackInput(),audio:testMusic().toString('base64')})).liveFactory.experiences[0];const song=e.musicCatalog[0],path=`/live/${e.id}/music/${song.id}`;
 assert.equal((await fetch(base+path,{headers:{Authorization:`Bearer ${'b'.repeat(64)}`}})).status,404);const r=await fetch(base+path,{headers:{Authorization:`Bearer ${token}`}});assert.deepEqual(Buffer.from(await r.arrayBuffer()),testMusic());
 const reopened=await createStore({file});assert.ok((await reopened.read((await import('../domain.mjs')).workspaceId(token))).workspace.liveFactory.experiences[0].musicCatalog[0]);await reopened.close();
 await post('/live/start',{id:e.id});await app.liveRuntime.tick();let grant=await post('/live/worker-authorize',{id:e.id,mode:'preview'});const media=base.replace('/api/agents','')+grant.workerPath+'/music/'+song.id;assert.equal((await fetch(media,{headers:{Authorization:`Bearer ${grant.token}`}})).status,404);
 await post('/live/stop',{id:e.id});await post('/live/music-approve',{id:e.id,version:2,trackId:song.id,hash:song.hash,listened:true,rightsReviewed:true});await post('/live/start',{id:e.id});await app.liveRuntime.tick();grant=await post('/live/worker-authorize',{id:e.id,mode:'preview'});assert.equal((await fetch(media,{headers:{Authorization:`Bearer ${grant.token}`}})).status,200);await post('/live/worker-stop',{id:e.id});assert.equal((await fetch(media,{headers:{Authorization:`Bearer ${grant.token}`}})).status,403);
});
test('provider preparation cannot authorize cost or replace approved music',()=>{
 const e={status:'STOPPED',configVersion:1,musicCatalog:[]},i={version:1,provider:'elevenlabs',category:'roses',seconds:6,lyrics:'Uma rosa chegou',style:'Voz feminina',costAuthorized:true};
 repertoireAction(e,'music-prepare',i);assert.equal(e.musicPreparation.costAuthorized,false);assert.equal(e.musicPreparation.generated,false);assert.equal(e.musicPreparation.status,'NOT_CONFIGURED');assert.equal(e.musicCatalog.length,0);
 assert.throws(()=>repertoireAction(e,'music-prepare',{...i,version:2,provider:'unofficial'}));assert.throws(()=>repertoireAction(e,'music-prepare',{...i,version:2,seconds:9}));assert.equal(e.configVersion,2);
});
test('vocal windows exclude instrumental intros, pause cancels performance',async()=>{
 const b=testMusic(),i={...trackInput(),kind:'AI_SINGING',vocalWindows:[[1,2],[3,4]]},t=musicTrack(i,b);
 assert.throws(()=>musicTrack({...i,vocalWindows:[[2,3],[1,4]]},b));assert.throws(()=>musicTrack({...i,vocalWindows:[[1,7]]},b));assert.throws(()=>musicTrack({...i,kind:'ORIGINAL_INSTRUMENTAL'},b));
 const m=createMixer(),now=Date.now(),e={status:'TESTING',sessionId:'s',config:{audio:{muted:false,volume:1}},performanceConfig:{...performanceDefaults(),enabled:true},performance:{jobs:[{id:'vocal',sessionId:'s',createdAt:now,expiresAt:now+45000,priority:2,segments:[{role:'music',trackId:t.id,hash:t.hash,kind:t.kind,text:'Synthetic unit fixture; not singing evidence'}]}]}};
 m.setRepertoire({assets:new Map([[t.id,decodeMusic(b,t)]]),failures:0});m.observe(e,now);await tick();m.mix(e,now,48000);assert.equal(m.presentation().vocalActive,false);m.mix(e,now,48000);assert.equal(m.presentation().vocalActive,true);m.mix(e,now,48000);assert.equal(m.presentation().vocalLevel,0);e.config.audio.muted=true;m.observe(e,now);assert.equal(m.presentation(),null);m.close();
});
test('jingle finishes before queued speech; repeated gifts do not regenerate audio',async()=>{
 const b=testMusic(),t=musicTrack(trackInput(),b),now=Date.now();let calls=0;const m=createMixer({synthesize:async()=>{calls++;return new Float32Array(4800).fill(.2);}}),job=(id,priority,segments)=>({id,priority,segments,sessionId:'s',createdAt:now,expiresAt:now+45000});
 const e={status:'TESTING',sessionId:'s',config:{audio:{muted:false,volume:1}},performanceConfig:{...performanceDefaults(),enabled:true},performance:{jobs:[job('speech',1,[{role:'host',voice:'host',text:'Olá'}]),job('jingle',4,[{role:'music',trackId:t.id,hash:t.hash,kind:t.kind}])]}};
 m.setRepertoire({assets:new Map([[t.id,decodeMusic(b,t)]]),failures:0});m.observe(e,now);await tick();for(let i=0;i<60;i++){m.mix(e,now,4800);assert.equal(m.presentation().role,'music');}m.mix(e,now,4800);assert.equal(m.presentation().role,'host');m.observe(e,now);await tick();m.mix(e,now,4800);assert.equal(m.presentation(),null);assert.equal(calls,1);assert.equal(m.metrics.played.music,1);m.close();
});
test('preloaded special bypasses blocked synthesis in less than two seconds',async()=>{
 let now=100000,release;const blocked=new Promise(r=>release=r),m=createMixer({clock:()=>now,synthesize:async()=>{await blocked;return new Float32Array(48000).fill(.2);}}),t=musicTrack(trackInput('special'),testMusic());const mk=(id,priority,segments)=>({id,priority,segments,sessionId:'s',createdAt:now,expiresAt:now+45000}),e={status:'TESTING',sessionId:'s',config:{audio:{volume:1}},performanceConfig:{...performanceDefaults(),enabled:true},performance:{jobs:[mk('slow',0,[{role:'host',voice:'host',text:'Lenta'}])]}};
 m.setRepertoire({assets:new Map([[t.id,decodeMusic(testMusic(),t)]]),failures:0});m.observe(e,now);e.performance.jobs.push(mk('special',4,[{role:'music',trackId:t.id,hash:t.hash,kind:t.kind}]));now+=500;m.observe(e,now);m.mix(e,now);assert.equal(m.presentation().role,'music');assert.equal(m.metrics.latency.preloaded.maxMs,500);release();await tick();m.close();
});
test('special fades lower priority and stale speech does not play',async()=>{
 let now=100000;const m=createMixer({clock:()=>now,synthesize:async()=>new Float32Array(48000)}),t=musicTrack(trackInput(),testMusic()),mk=(id,priority,segments)=>({id,priority,segments,sessionId:'s',createdAt:now,expiresAt:now+45000}),seg={role:'music',trackId:t.id,hash:t.hash,kind:t.kind},e={status:'TESTING',sessionId:'s',config:{audio:{volume:1}},performanceConfig:{...performanceDefaults(),enabled:true},performance:{jobs:[mk('ordinary',2,[seg])]}};
 m.setRepertoire({assets:new Map([[t.id,decodeMusic(testMusic(),t)]]),failures:0});m.observe(e,now);m.mix(e,now);now+=500;e.performance.jobs.push(mk('special',4,[seg]));m.observe(e,now);m.mix(e,now);now+=67;m.mix(e,now);assert.equal(m.metrics.interrupted,1);assert.equal(m.metrics.played.music,2);assert.equal(m.metrics.latency.preloaded.maxMs,67);m.close();
 const stale=createMixer({clock:()=>now,synthesize:async()=>new Float32Array(48000)});e.performance.jobs=[mk('stale',0,[{role:'host',voice:'host',text:'Já passou'}])];stale.observe(e,now);await tick();now+=6001;stale.mix(e,now);assert.equal(stale.presentation(),null);assert.equal(stale.metrics.staleDropped,1);stale.close();
});
test('Brazilian proposal and approved ambient selection never authorize cost or replace approval',()=>{
 const a=musicTrack(trackInput('ambient'),testMusic(0,4)),e={status:'STOPPED',configVersion:1,musicCatalog:[a]};assert.throws(()=>repertoireAction(e,'music-select',{version:1,trackId:a.id}));a.approved=true;repertoireAction(e,'music-select',{version:1,trackId:a.id});assert.equal(e.musicAmbientTrackId,a.id);
 repertoireAction(e,'music-prepare',{version:2,provider:'manual',category:'ambient',seconds:48,proposalId:'signature',lyrics:'Instrumental',style:'brief'});assert.equal(e.musicPreparation.bpm,132);assert.equal(e.musicPreparation.generated,false);assert.equal(e.musicPreparation.costAuthorized,false);assert.equal(e.musicCatalog.length,1);repertoireAction(e,'music-remove',{version:3,trackId:a.id});assert.equal(e.musicAmbientTrackId,null);
});
test('main ambient and brief persist and reach only the authorized worker',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'lf42-choice-')),file=join(dir,'state.sqlite'),store=await createStore({file}),app=createApp({store,provider:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();await rm(dir,{recursive:true,force:true});});const base=`http://127.0.0.1:${app.server.address().port}/api/agents`,token='d'.repeat(64);
 const post=async(path,input)=>{const r=await fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
 let e=(await post('/live/create',{name:'Brasil'})).liveFactory.experiences[0];e=(await post('/live/music-import',{id:e.id,version:e.configVersion,...trackInput('ambient'),audio:testMusic(0,4).toString('base64')})).liveFactory.experiences[0];const track=e.musicCatalog[0];e=(await post('/live/music-approve',{id:e.id,version:e.configVersion,trackId:track.id,hash:track.hash,listened:true,rightsReviewed:true})).liveFactory.experiences[0];e=(await post('/live/music-select',{id:e.id,version:e.configVersion,trackId:track.id})).liveFactory.experiences[0];e=(await post('/live/music-prepare',{id:e.id,version:e.configVersion,provider:'manual',category:'ambient',seconds:48,proposalId:'signature',lyrics:'Instrumental',style:'Brief'})).liveFactory.experiences[0];
 const reopened=await createStore({file});const saved=(await reopened.read((await import('../domain.mjs')).workspaceId(token))).workspace.liveFactory.experiences[0];assert.equal(saved.musicAmbientTrackId,track.id);assert.equal(saved.musicPreparation.proposalId,'signature');await reopened.close();await post('/live/start',{id:e.id});await app.liveRuntime.tick();const grant=await post('/live/worker-authorize',{id:e.id,mode:'preview'}),url=base.replace('/api/agents','')+grant.workerPath;
 const beat=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${grant.token}`,'Content-Type':'application/json'},body:JSON.stringify({instance:'selection-test-worker',status:'STARTING',frames:0,bytes:0})});assert.equal(beat.status,200);assert.equal((await beat.json()).experience.musicAmbientTrackId,track.id);assert.equal((await fetch(base+`/live/${e.id}/music/${track.id}`,{headers:{Authorization:`Bearer ${'e'.repeat(64)}`}})).status,404);
});

test('mixer acknowledges completed and interrupted jobs without replay',async()=>{
 const now=Date.now(),e={status:'TESTING',sessionId:'session',performanceConfig:{...performanceDefaults(),enabled:true},config:{audio:{muted:false,volume:1}},performance:{}};e.performance.jobs=[{id:'a'.repeat(36),sessionId:'session',createdAt:now,expiresAt:now+45000,priority:0,segments:[{role:'host',voice:'host',text:'Oi'}]}];
 const m=createMixer({synthesize:async()=>new Float32Array(100)});m.observe(e,now);await new Promise(r=>setTimeout(r,10));m.mix(e,now);assert.deepEqual(m.settledJobs,['a'.repeat(36)]);m.observe(e,now);assert.equal(m.metrics.synthesized,1);m.close();
});

test('radio: complete 24kHz tracks, duration and decoded-memory budgets remain bounded',()=>{
 const long=testMusic(0,212),track=musicTrack(trackInput('ambient'),long);
 assert.equal(track.seconds,212);assert.equal(track.approved,false);
 const decoded=decodeMusic(long,track);assert.equal(decoded.pcm.length,212*48000);
 assert.throws(()=>musicTrack(trackInput('special'),long));
 assert.throws(()=>musicTrack(trackInput('ambient'),testMusic(0,241)));
 const high=Buffer.from(long);high.writeUInt32LE(48000,24);high.writeUInt32LE(96000,28);
 assert.throws(()=>inspectMusic(high),/24 kHz/);
 const e={status:'STOPPED',configVersion:1,musicCatalog:[{...track,seconds:719,bytes:100,hash:'other'}]};
 assert.throws(()=>repertoireAction(e,'music-import',{version:1,track}),/12 minutos/);
 assert.equal(e.musicCatalog.length,1);
});
