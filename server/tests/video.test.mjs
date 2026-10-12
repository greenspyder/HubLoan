import test from 'node:test';
import assert from 'node:assert/strict';
import { videoScenes, mediaCommand } from '../video-production.mjs';
import { createStore } from '../store.mjs';
import { createRunner } from '../runner.mjs';
import { addMission, queueMission, publicWorkspace } from '../domain.mjs';
import { checkpointCall } from '../execution-checkpoints.mjs';

test('storyboards are bounded and no shell is involved', async()=>{
 assert.throws(()=>videoScenes('one'));
 assert.throws(()=>videoScenes('x'.repeat(121)+'\nsecond'));
 assert.throws(()=>videoScenes(Array(7).fill('scene').join('\n')));
 assert.deepEqual(videoScenes('instruções\nsegunda cena'),['instruções','segunda cena']);
 const controller=new AbortController();controller.abort();
 await assert.rejects(mediaCommand('ffmpeg',['-version'],{signal:controller.signal}),/cancelada/);
 await assert.rejects(mediaCommand('hubloan-does-not-exist',[]),/indisponível/);
});
test('real video uses existing queue, checkpoint, artifact and human review without provider calls',async t=>{
 const store=await createStore({file:':memory:'});
 const runner=createRunner(store,new Proxy({}, {get:()=>()=>{throw Error('Provider must not be called');}}));
 t.after(async()=>{await runner.close();await store.close();});
 let id;
 await store.mutate('video-space',w=>{id=addMission(w,{title:'Demonstração',kind:'video',agentId:'creator',brief:'Organize uma tarefa por vez.\nRevise antes de publicar.'}).id;queueMission(w,id);});
 runner.unlock('video-space','a'.repeat(64));await runner.tick();
 const w=(await store.read('video-space')).workspace,m=w.missions[0];
 assert.equal(m.status,'review',m.error);
 assert.equal(m.artifact.mime,'video/mp4');assert.ok(Buffer.from(m.artifact.base64,'base64').includes(Buffer.from('ftyp')));
 assert.equal(m.videoReport.seconds,8);assert.equal(m.videoReport.infrastructureCost,'UNKNOWN');
 assert.equal(m.tokens,0);assert.equal(m.images,0);assert.equal(m.publication,undefined);
 assert.equal(m.execution.checkpoints.length,3);
 assert.equal(publicWorkspace(w,'sqlite').missions[0].artifact,undefined);
 // Simulate interruption after checkpoint persistence: identical render output is reused.
 await store.mutate('video-space',w=>{w.missions[0].status='running';});
 const c=m.execution.checkpoints.at(-1);
 const cached=await checkpointCall(store,'video-space',id)(c.kind,c.label,[1,videoScenes(m.brief)],()=>{throw Error('Must reuse existing render');});
 assert.equal(cached.resumed,true);assert.equal(cached.base64,m.artifact.base64);
 const other=(await store.read('other-space')).workspace;assert.equal(other.missions.length,0);
});
