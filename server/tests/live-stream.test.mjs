import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { initialWorkspace, workspaceId } from '../domain.mjs';
import { liveAction, advanceLive, publicLive } from '../live-factory.mjs';
import { authorizeWorker, workerHeartbeat, watchWorker } from '../live-broadcast.mjs';
import { runWorker, validateConfig } from '../live-worker/worker.mjs';
import { videoRuntimeAvailable, mediaCommand } from '../video-production.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const token='a'.repeat(64),wid=workspaceId(token);
function setup(w,n=Date.now()){liveAction(w,'create',{},n);const e=w.liveFactory.experiences[0];liveAction(w,'game-configure',{id:e.id,version:1,config:{template:'seed-snake',names:['Lume','Faísca'],roundSeconds:15}},n);liveAction(w,'start',{id:e.id},n);advanceLive(w,'test',n);return e;}
test('game progresses in existing runtime, rounds restart, collision/scoring/ranking persist and pause freezes',()=>{
 const w=initialWorkspace(),n=100000,e=setup(w,n),start=JSON.stringify(e.game.players);
 for(let i=1;i<=25;i++)advanceLive(w,'test',n+i*2000);
 assert.notEqual(JSON.stringify(e.game.players),start);assert.ok(e.game.round>=2);assert.ok(e.game.history.length>0);assert.ok(e.game.ranking.some(s=>s>0));assert.ok(e.game.frames.length<=30);
 const score=e.game.players[0].score;liveAction(w,'event',{id:e.id,sessionId:e.sessionId,eventId:'test-event-000',type:'celebrate',at:n+50000},n+50000);advanceLive(w,'test',n+50000);assert.equal(e.game.players[0].score,score+1);
 liveAction(w,'event',{id:e.id,sessionId:e.sessionId,eventId:'test-event-000',type:'celebrate',at:n+50000},n+50000);advanceLive(w,'test',n+50000);assert.equal(e.game.players[0].score,score+1);
 liveAction(w,'pause',{id:e.id},n+50100);const step=e.game.step;advanceLive(w,'test',n+52000);assert.equal(e.game.step,step);
 const restored=JSON.parse(JSON.stringify(w));assert.deepEqual(restored.liveFactory.experiences[0].game,e.game);
});
test('worker grants are session-scoped, single-instance, hidden, revocable, bounded and fail closed',()=>{
 const w=initialWorkspace(),n=100000,e=setup(w,n),grant=authorizeWorker(w,e.id,'preview',n),input={instance:'a'.repeat(20),status:'PREVIEW',frames:3,bytes:100};
 assert.throws(()=>workerHeartbeat(initialWorkspace(),e.id,grant.token,input,n),/inválida/);
 assert.throws(()=>workerHeartbeat(w,e.id,'x'.repeat(64),input,n),/inválida/);
 assert.throws(()=>workerHeartbeat(w,e.id,grant.token,{...input,status:'CONFIRMED'},n),/inválida/);
 assert.throws(()=>workerHeartbeat(w,e.id,grant.token,{...input,status:'SENDING_MEDIA'},n),/não autorizada/);
 const response=workerHeartbeat(w,e.id,grant.token,input,n);assert.equal(response.experience.workerGrant,undefined);assert.equal(publicLive(w).experiences[0].workerGrant,undefined);assert.ok(!JSON.stringify(publicLive(w)).includes(grant.token));
 const settled='a'.repeat(36),retained='b'.repeat(36);e.performance.jobs=[{id:settled},{id:retained}];
 assert.throws(()=>workerHeartbeat(w,e.id,grant.token,{...input,settledJobs:['invalid']},n),/atuação/);
 workerHeartbeat(w,e.id,grant.token,{...input,settledJobs:[settled]},n);assert.deepEqual(e.performance.jobs,[{id:retained}]);
 assert.throws(()=>workerHeartbeat(w,e.id,grant.token,{...input,instance:'b'.repeat(20)},n),/Outro worker/);
 assert.throws(()=>authorizeWorker(w,e.id,'stream',n),/anterior/);
 watchWorker(e,n+11000);assert.equal(e.transmission.status,'DEGRADED');assert.throws(()=>workerHeartbeat(w,e.id,grant.token,input,n+11001),/encerrada/);
 const next=authorizeWorker(w,e.id,'stream',n+22000);liveAction(w,'emergency',{id:e.id},n+12000);assert.throws(()=>workerHeartbeat(w,e.id,next.token,input,n+12001),/encerrada/);
 assert.equal(e.transmission.status,'STOPPED');assert.equal(e.transmission.publicStatus,'UNCONFIRMED');
 assert.throws(()=>validateConfig({backend:'http://example.com'},false),/HTTPS/);
});
async function appSetup(t){const dir=await mkdtemp(join(tmpdir(),'live-stream-')),store=await createStore({file:join(dir,'state.sqlite')}),app=createApp({store,provider:new Proxy({}, {get:()=>()=>{throw Error('Paid call forbidden');}})});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();if(!process.env.LIVE_EVIDENCE_DIR)await rm(dir,{recursive:true,force:true});});const backend=`http://127.0.0.1:${app.server.address().port}`;async function api(path,input,access=token){const r=await fetch(backend+'/api/agents'+path,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:r.status,data:await r.json()};}
 const r=await api('/live/create',{name:'Seed Snake · RTMP'});const id=r.data.liveFactory.experiences[0].id;await api('/live/game-configure',{id,version:1,config:{template:'seed-snake',roundSeconds:15,names:['Lume','Faísca']}});await api('/live/start',{id});await app.liveRuntime.tick();return {dir,store,app,api,id,backend};}
test('real FFmpeg RTMP receiver receives continuous H264 + AAC, and encoder failure is observable', {timeout:60000,skip:!videoRuntimeAvailable()},async t=>{
 const {dir,store,api,id,backend}=await appSetup(t);
 assert.equal((await api('/live/worker-authorize',{id,mode:'stream'},'b'.repeat(64))).status,409);
 const grant=(await api('/live/worker-authorize',{id,mode:'stream'})).data;
 const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const destination=`rtmp://127.0.0.1:${port}/live/controlled-test`,output=join(dir,'received.flv');
 const receiver=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-listen','1','-i',destination,'-c','copy',output],{stdio:['ignore','ignore','pipe']});let receiverLog='';receiver.stderr.on('data',b=>receiverLog+=b);const reception=new Promise(r=>receiver.once('close',r));t.after(()=>receiver.kill('SIGKILL'));await wait(500);
 const report=await runWorker({backend,...grant,destination,authorizedDestination:true},{transmit:true,seconds:18});await Promise.race([reception,wait(4000)]);
 assert.ok(report.preparationMs>=0);assert.equal(report.failureReason,null);assert.equal(report.heartbeatIntervalMs,750);assert.ok(report.frames>150,JSON.stringify(report));assert.equal(report.publicTransmission,'UNCONFIRMED');
 const probe=JSON.parse(await mediaCommand('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output]));assert.ok(probe.streams.some(s=>s.codec_name==='h264'&&s.width===360&&s.height===640));assert.ok(probe.streams.some(s=>s.codec_name==='aac'));assert.ok(Number(probe.format.duration)>=15);
 await mediaCommand('ffmpeg',['-v','error','-threads','1','-i',output,'-f','null','-']);
 const hashes=await mediaCommand('ffmpeg',['-v','error','-i',output,'-map','0:v','-frames:v','120','-f','framemd5','-']);assert.ok(new Set(hashes.split('\n').filter(x=>!x.startsWith('#')).map(x=>x.split(',').at(-1))).size>5,'received frames must change');
 const pcmPath=join(dir,'audio.raw');await mediaCommand('ffmpeg',['-v','error','-y','-i',output,'-map','0:a','-f','s16le',pcmPath]);const {readFile}=await import('node:fs/promises');const audio=await readFile(pcmPath);assert.ok(audio.some(b=>b!==0),'audio contains actual effects');
 const e=(await store.read(wid)).workspace.liveFactory.experiences[0];assert.equal(e.transmission.status,'STOPPED');assert.ok(e.logs.some(l=>l.status==='SENDING_MEDIA'));assert.ok(e.game.history.length>0);
 if(process.env.LIVE_EVIDENCE_DIR){const {mkdir,copyFile}=await import('node:fs/promises');const path=process.env.LIVE_EVIDENCE_DIR;await mkdir(path,{recursive:true});await copyFile(output,join(path,'received.flv'));await mediaCommand('ffmpeg',['-v','error','-y','-i',output,'-c','copy','-movflags','+faststart',join(path,'received.mp4')]);await writeFile(join(path,'report.json'),JSON.stringify({report,receiver:{video:'h264',audio:'aac',duration:probe.format.duration,size:probe.format.size},gameRounds:e.game.history.length,receiverLog},null,2));}
 const grant2=(await api('/live/worker-authorize',{id,mode:'preview'})).data;
 await assert.rejects(runWorker({backend,...grant2},{seconds:10,output:join(dir,'interrupted.mp4'),onEncoder:child=>setTimeout(()=>child.kill('SIGKILL'),2000)}),/interrompido/);
 assert.equal((await store.read(wid)).workspace.liveFactory.experiences[0].transmission.status,'ERROR');
 const grant3=(await api('/live/worker-authorize',{id,mode:'preview'})).data;await assert.rejects(runWorker({backend,...grant3},{seconds:5,output:join(dir,'render-failure.mp4'),renderFrame:async()=>{throw Error('controlled render failure');}}),/interrompido/);
 assert.equal((await store.read(wid)).workspace.liveFactory.experiences[0].transmission.status,'ERROR');
 const grant4=(await api('/live/worker-authorize',{id,mode:'preview'})).data;
 await assert.rejects(runWorker({backend,...grant4},{seconds:8,output:join(dir,'overloaded.mp4'),renderFrame:async()=>{await wait(650);return Buffer.alloc(360*640*3);}}),error=>error.report?.failureReason==='FRAME_BUDGET_EXCEEDED'&&error.report.maxPipelineLagMs>2000);
 assert.equal((await store.read(wid)).workspace.liveFactory.experiences[0].transmission.status,'ERROR');
});
