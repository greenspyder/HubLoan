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
 assert.equal(mixer.metrics.played.music,1);assert.equal(mixer.metrics.trackPlays[b.id],1);assert.equal(mixer.metrics.ambientFrames,105);assert.ok(mixer.metrics.peak<1);assert.ok(mixer.duck>.9);assert.equal(mixer.metrics.synthesized,0);
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
