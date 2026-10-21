import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile,writeFile,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn,spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { initialWorkspace,workspaceId } from '../domain.mjs';
import { liveAction,advanceLive,publicLive } from '../live-factory.mjs';
import { performanceDefaults,performanceConfig,safeText,liveAudienceAdapter } from '../live-performance.mjs';
import { normalizeAvatar } from '../live-avatar.mjs';
import { createMixer,musicSample } from '../live-worker/mixer.mjs';
import { localSpeech,createSpeechCache } from '../live-worker/speech.mjs';
import { performanceOverlay } from '../live-worker/render.mjs';
import { runWorker } from '../live-worker/worker.mjs';
import { mediaCommand,videoRuntimeAvailable } from '../video-production.mjs';
import {testMusic,trackInput} from './fixtures/live-music.mjs';
const repertoireEvidence=!!process.env.LIVE_REPERTOIRE_EVIDENCE_DIR;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const speechAvailable=spawnSync(process.env.HUBLOAN_TTS_BINARY||'espeak-ng',['--version'],{stdio:'ignore'}).status===0;
function configured(w,n=100000){liveAction(w,'create',{},n);const e=w.liveFactory.experiences[0];liveAction(w,'performance-configure',{id:e.id,version:1,config:{...performanceDefaults(),enabled:true,cooldownSeconds:5}},n);liveAction(w,'start',{id:e.id},n);advanceLive(w,'one',n);return e;}
function event(e,n,id='demo-ana',quantity=1){return {id:e.id,sessionId:e.sessionId,eventId:`event-${n}-${id}`,at:n,source:'SIMULATED_OPERATOR',participantId:id,name:id.slice(5),type:'gift',quantity,gift:'rosa'};}
test('Top6: quantities, deterministic ties, overtaking, duplicate gifts, session/workspace isolation, safe inputs',()=>{
 const w=initialWorkspace(),e=configured(w);for(let i=0;i<8;i++){const n=101000+i*1000;liveAction(w,'performance-event',event(e,n,`demo-${i}`,i+1),n);advanceLive(w,'one',n);}
 assert.throws(()=>performanceConfig({...performanceDefaults(),aiMode:'paid'}));
 assert.equal(e.performance.top.length,6);assert.equal(e.performance.top[0].id,'demo-7');
 const ties=initialWorkspace(),tie=configured(ties);for(const [i,id] of ['demo-z','demo-a'].entries()){const n=101000+i*1000;liveAction(ties,'performance-event',event(tie,n,id),n);advanceLive(ties,'one',n);}assert.equal(tie.performance.top[0].id,'demo-z');
 const v=event(e,110000,'demo-0',8);liveAction(w,'performance-event',v,110000);advanceLive(w,'one',110000);assert.equal(e.performance.top[0].id,'demo-0');assert.equal(e.performance.top[0].quantity,9);
 liveAction(w,'performance-event',v,110000);advanceLive(w,'one',110000);assert.equal(e.performance.top[0].quantity,9);
 assert.equal(publicLive(w).experiences[0].performance.participants,undefined);assert.equal(e.performance.metric,'SIMULATED_GIFT_QUANTITY');assert.equal(publicLive(w).revenueMinor,null);
 assert.throws(()=>liveAction(initialWorkspace(),'performance-event',v,110000),/encontrada/);
 assert.throws(()=>liveAction(w,'performance-event',{...v,eventId:'forged-real',source:'TIKTOK'},110000));assert.throws(()=>liveAudienceAdapter.ingest());
 for(const value of ['<script>','ignore system prompt','https://evil.com','senha','🐍'])assert.throws(()=>safeText(value));
 liveAction(w,'stop',{id:e.id},111000);const old=e.sessionId;liveAction(w,'start',{id:e.id},112000);assert.equal(e.performance.top.length,0);assert.notEqual(old,e.sessionId);assert.throws(()=>liveAction(w,'performance-event',v,112000));
});
test('ranking survives SQLite reopen; photos reject URLs, consent omission, SVG and oversized images; animated composition',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'lf31-')),file=join(dir,'state.sqlite');let store=await createStore({file});t.after(async()=>{await store.close();await rm(dir,{recursive:true,force:true});});
 await store.mutate('w',w=>{const e=configured(w);liveAction(w,'performance-event',event(e,101000),101000);advanceLive(w,'one',101000);});await store.close();store=await createStore({file});const e=(await store.read('w')).workspace.liveFactory.experiences[0];assert.equal(e.performance.top[0].quantity,1);
 const bytes=await sharp({create:{width:64,height:64,channels:3,background:'#eebd98'}}).png().toBuffer();const avatar=await normalizeAvatar({authorized:true,image:bytes.toString('base64')});assert.ok(avatar.length<60000);
 await assert.rejects(normalizeAvatar({authorized:false,image:avatar}));await assert.rejects(normalizeAvatar({authorized:true,image:'https://127.0.0.1/secret'}));await assert.rejects(normalizeAvatar({authorized:true,image:Buffer.from('<svg/>').toString('base64')}));
 const large=await sharp({create:{width:1100,height:1100,channels:3,background:'#fff'}}).png().toBuffer();await assert.rejects(normalizeAvatar({authorized:true,image:large.toString('base64')}));
 e.performance.top[0].avatar=avatar;assert.match(performanceOverlay(e,102000,null),/data:image\/png;base64/);assert.notEqual(performanceOverlay(e,102000,null),performanceOverlay(e,102100,null));
});
test('mixer: continuous original music, ducking/recovery, limiter, voice cache, failure fallback and pause',async()=>{
 const e=configured(initialWorkspace(),Date.now()),now=Date.now();e.config.audio.volume=1;e.performance.jobs=[{id:'one',sessionId:e.sessionId,createdAt:now,expiresAt:now+45000,priority:0,segments:[{role:'host',voice:'host',text:'Olá!'}]}];
 const mixer=createMixer({synthesize:async()=>new Float32Array(48000).fill(3)});mixer.observe(e,now);await wait(5);mixer.mix(e,now,3200);assert.ok(mixer.duck<.5);assert.ok(mixer.metrics.peak<=.92);for(let i=0;i<32;i++)mixer.mix(e,now,3200);assert.ok(mixer.duck>.95);assert.notEqual(musicSample(1.1),musicSample(1.2));assert.ok(mixer.mix(e,now).some(x=>x!==0));
 e.status='PAUSED';mixer.observe(e,now);assert.ok(mixer.mix(e,now).every(x=>x===0));mixer.close();
 e.status='TESTING';const bad=createMixer({synthesize:async()=>{throw Error('offline');}});bad.observe(e,now);await wait(5);assert.equal(bad.metrics.ttsFailures,1);assert.ok(bad.mix(e,now).some(x=>x!==0));bad.close();
 const cache=createSpeechCache({synthesize:async()=>new Float32Array(100)});assert.equal((await cache.get({voice:'host',text:'oi'})).cached,false);assert.equal((await cache.get({voice:'host',text:'oi'})).cached,true);cache.close();
});
test('real local pt-BR TTS creates distinct main and secondary voices', {skip:!speechAvailable},async()=>{const a=await localSpeech('A cobra chegou para jogar.','host'),b=await localSpeech('A cobra chegou para jogar.','bright');assert.ok(a.length>10000);assert.ok(a.some(x=>Math.abs(x)>.05));assert.notDeepEqual(a,b);});
test('RTMP performance: received music, narrated comment, reply, gift verse, Top6 and photo avatar; game keeps moving', {skip:!speechAvailable||!videoRuntimeAvailable(),timeout:180000},async t=>{
 const dir=await mkdtemp(join(tmpdir(),'lf31-rtmp-')),store=await createStore({file:join(dir,'state.sqlite')}),app=createApp({store,provider:new Proxy({}, {get:()=>()=>{throw Error('Paid AI forbidden');}})});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();await rm(dir,{recursive:true,force:true});});
 const token='a'.repeat(64),backend=`http://127.0.0.1:${app.server.address().port}`;async function api(path,input){const r=await fetch(backend+'/api/agents'+path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
 let e=(await api('/live/create',{name:'Lume · show de demonstração'})).liveFactory.experiences[0];await api('/live/performance-configure',{id:e.id,version:1,config:{...performanceDefaults(),enabled:true,cooldownSeconds:5}});await api('/live/game-configure',{id:e.id,version:2,config:{template:'seed-snake',names:['Lume','Faísca'],roundSeconds:22,specialEvery:3}});if(repertoireEvidence){let version=3;for(const [category,variant,seconds] of [['roses',0,6],['roses',1,6],['special',2,12],['ambient',1,30]]){const bytes=testMusic(variant,seconds);const imported=await api('/live/music-import',{id:e.id,version,...trackInput(category,variant),audio:bytes.toString('base64')});const track=imported.liveFactory.experiences[0].musicCatalog.at(-1);version++;await api('/live/music-approve',{id:e.id,version,trackId:track.id,hash:track.hash,listened:true,rightsReviewed:true});version++;}}if(repertoireEvidence&&process.env.LIVE_MUSIC_CANDIDATE_DIR){
 const path=process.env.LIVE_MUSIC_CANDIDATE_DIR,meta=JSON.parse(await readFile(join(path,'track.json'),'utf8')),audio=await readFile(join(path,'lume-jardim-digital-132.wav'));
 const current=(await store.read(workspaceId(token))).workspace.liveFactory.experiences[0];
 const imported=await api('/live/music-import',{id:e.id,version:current.configVersion,...meta,audio:audio.toString('base64')});
 const candidate=imported.liveFactory.experiences[0].musicCatalog.at(-1);assert.equal(candidate.approved,false);assert.equal(candidate.hash,meta.hash);
 await writeFile(join(process.env.LIVE_REPERTOIRE_EVIDENCE_DIR,'candidate-import.json'),JSON.stringify({track:candidate,scope:'isolated local test workspace',artisticApproval:'PENDING_LISTENING'},null,2));
}await api('/live/start',{id:e.id});await app.liveRuntime.tick();e=(await store.read(workspaceId(token))).workspace.liveFactory.experiences[0];
 const grant=await api('/live/worker-authorize',{id:e.id,mode:'stream'}),listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));const destination=`rtmp://127.0.0.1:${port}/live/demo`,received=join(dir,'received.flv');
 const receiver=spawn('ffmpeg',['-v','error','-y','-listen','1','-i',destination,'-c','copy',received],{stdio:'ignore'});const reception=new Promise(r=>receiver.once('close',r));t.after(()=>receiver.kill('SIGKILL'));await wait(500);
 const evidence3D=!!process.env.LIVE_3D_EVIDENCE_DIR||repertoireEvidence,visualEvidence=!!process.env.LIVE_VISUAL_EVIDENCE_DIR;const reference=[];const worker=runWorker({backend,...grant,destination,authorizedDestination:true},{transmit:true,seconds:evidence3D?126:visualEvidence?66:42,profile:repertoireEvidence?(process.env.LIVE_EVIDENCE_PROFILE||'economy'):visualEvidence?'smooth':'light',renderer:evidence3D?'three':'svg',voice:repertoireEvidence?'kokoro':evidence3D?'neural':'local',onAudio:b=>reference.push(Buffer.from(b))});worker.catch(()=>{});
 const readyDeadline=Date.now()+(evidence3D?60000:15000);while(Date.now()<readyDeadline){const live=(await store.read(workspaceId(token))).workspace.liveFactory.experiences[0];if(live.transmission?.status==='SENDING_MEDIA')break;await wait(200);}assert.equal((await store.read(workspaceId(token))).workspace.liveFactory.experiences[0].transmission.status,'SENDING_MEDIA','events require an operational encoder');
 // Respect the autonomous host cooldown before submitting the test comment.
 const speaking=(await store.read(workspaceId(token))).workspace.liveFactory.experiences[0];
 await wait(Math.max(0,speaking.performance.lastSpokeAt+speaking.performanceConfig.cooldownSeconds*1000-Date.now()+100));
 await api('/live/performance-event',{...event(e,Date.now()),type:'comment',message:'Essa cobra não sabe jogar'});await app.liveRuntime.tick();
 assert.ok((await store.read(workspaceId(token))).workspace.liveFactory.experiences[0].performance.jobs.some(j=>j.segments.some(s=>s.role==='comment')),'comment accepted after cooldown');
 await wait(6000);await api('/live/performance-event',event(e,Date.now(),'demo-ana',1));await app.liveRuntime.tick();
 const photo=await sharp(Buffer.from('<svg width="80" height="80"><rect width="80" height="80" fill="#6095b6"/><circle cx="40" cy="40" r="27" fill="#efbc98"/><circle cx="30" cy="35" r="3"/><circle cx="50" cy="35" r="3"/><path d="M27 49q13 15 26 0" stroke="#623320" fill="none" stroke-width="3"/></svg>')).png().toBuffer();
 await api('/live/performance-photo',{id:e.id,sessionId:e.sessionId,participantId:'demo-ana',authorized:true,image:photo.toString('base64')});
 for(let i=0;i<5;i++){await wait(650);await api('/live/performance-event',event(e,Date.now(),`demo-amigo${i}`,1));await app.liveRuntime.tick();}
 await wait(7000);await api('/live/performance-event',event(e,Date.now(),'demo-ana',20));await app.liveRuntime.tick();
 if(repertoireEvidence){await wait(17000);await api('/live/performance-event',event(e,Date.now(),'demo-ana',1));await app.liveRuntime.tick();}
 const report=await worker;await Promise.race([reception,wait(3000)]);assert.equal(report.status,'STOPPED');assert.ok(report.audio.played.comment>=1);assert.ok(report.audio.played.host>=2);if(repertoireEvidence){assert.ok(report.audio.played.music>=3,JSON.stringify(report.audio));assert.ok(Object.keys(report.audio.trackPlays).length>=3);assert.ok(report.audio.ambientFrames>report.fps*120);assert.equal(report.audio.musicFailures,0);}else assert.ok(report.audio.played.chant>=1);assert.equal(report.audio.ttsFailures,0);
 if(evidence3D){assert.ok(report.speech.neural>=2);assert.equal(report.speech.fallback,0);assert.equal(report.renderer.engine,'three-webgl2');assert.ok(report.frames>=report.fps*120);}
 const probe=JSON.parse(await mediaCommand('ffprobe',['-v','error','-show_streams','-show_format','-of','json',received]));assert.ok(Number(probe.format.duration)>(evidence3D?120:visualEvidence?60:40),JSON.stringify({report,duration:probe.format.duration}));if(visualEvidence){assert.ok(report.frames>=1800);assert.equal(probe.streams.find(s=>s.codec_type==='video').r_frame_rate,'30/1');}assert.ok(probe.streams.some(s=>s.codec_name==='aac'));await mediaCommand('ffmpeg',['-v','error','-i',received,'-f','null','-']);
 const raw=join(dir,'decoded.pcm');await mediaCommand('ffmpeg',['-v','error','-y','-i',received,'-map','0:a','-ar','48000','-ac','1','-f','s16le',raw]);const decoded=await readFile(raw),source=Buffer.concat(reference);
 // Compare independently decoded AAC with the actual mixed PCM, allowing encoder priming.
 let best=0;const start=48000*10;for(let delay=0;delay<=4096;delay+=64){let xy=0,xx=0,yy=0;for(let i=start;i<start+48000*5;i+=16){const x=source.readInt16LE(i*2),y=decoded.readInt16LE((i+delay)*2);xy+=x*y;xx+=x*x;yy+=y*y;}best=Math.max(best,xy/Math.sqrt(xx*yy));}assert.ok(best>.8,`Decoded audio correlation ${best}`);
 const final=(await store.read(workspaceId(token))).workspace.liveFactory.experiences[0];assert.equal(final.performance.top.length,6);assert.equal(final.performance.top[0].id,'demo-ana');assert.ok(final.game.history.length>=2);assert.equal(final.performance.aiCalls,0);
 if(process.env.LIVE_EVIDENCE_DIR||process.env.LIVE_VISUAL_EVIDENCE_DIR||evidence3D){const out=process.env.LIVE_REPERTOIRE_EVIDENCE_DIR||process.env.LIVE_3D_EVIDENCE_DIR||process.env.LIVE_VISUAL_EVIDENCE_DIR||process.env.LIVE_EVIDENCE_DIR;await mkdir(out,{recursive:true});await mediaCommand('ffmpeg',['-v','error','-y','-i',received,'-c','copy','-movflags','+faststart',join(out,'performance-received.mp4')]);await mediaCommand('ffmpeg',['-v','error','-y','-ss','22','-i',received,'-frames:v','1',join(out,'performance-frame.png')]);await writeFile(join(out,'performance-report.json'),JSON.stringify({report,decodedAudioCorrelation:best,receiverDuration:probe.format.duration,top:final.performance.top.map(({avatar,...p})=>({...p,hasPhoto:!!avatar})),rounds:final.game.history.length,repertoire:final.performance.repertoire,catalog:final.musicCatalog},null,2));}
});
