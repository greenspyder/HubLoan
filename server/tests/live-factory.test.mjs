import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { initialWorkspace } from '../domain.mjs';
import { projectAction } from '../autonomy.mjs';
import { liveAction, advanceLive, publicLive, createLiveRuntime } from '../live-factory.mjs';
const provider=new Proxy({}, {get:()=>()=>{throw Error('Paid calls forbidden');}});
const token='a'.repeat(64);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const event=(e,at,id='test-event-1',type='greet')=>({id:e.id,sessionId:e.sessionId,eventId:id,type,at});
test('live deterministic controls, dedup, expiry, bounds, isolation from paid autonomy and economics',()=>{
 const w=initialWorkspace(),now=100000;
 assert.deepEqual(publicLive(w).experiences,[]);
 liveAction(w,'create',{name:'Lume'},now);const e=w.liveFactory.experiences[0];
 assert.equal(w.autonomy.projects[0].businessType,'live');
 assert.throws(()=>projectAction(w,e.projectId,'resume',token,token),/jornada/);
 liveAction(w,'start',{id:e.id},now);advanceLive(w,'worker-a',now+1000);
 assert.equal(e.status,'TESTING');
 liveAction(w,'event',event(e,now+1100),now+1100);
 liveAction(w,'event',event(e,now+1100),now+1100);
 assert.equal(e.queue.length,1);
 assert.throws(()=>liveAction(w,'event',event(e,now+1100,'test-event-2'),now+1100),/Limite/);
 assert.throws(()=>liveAction(w,'event',event(e,now-50000,'stale-event-1'),now+1700),/atrasado/); // new ID below ensures duplicate does not mask validation
 assert.throws(()=>liveAction(w,'event',event(e,now+1700,'test-event-2','eval'),now+1700),/inválido/);
 advanceLive(w,'worker-a',now+2000);assert.equal(e.character.expression,'happy');assert.equal(e.processed,1);
 const ticks=e.ticks;liveAction(w,'pause',{id:e.id},now+2100);advanceLive(w,'worker-a',now+3000);assert.equal(e.ticks,ticks);
 assert.throws(()=>liveAction(w,'event',event(e,now+3000),now+3000),/Inicie/);
 liveAction(w,'resume',{id:e.id},now+3100);advanceLive(w,'worker-a',now+4000);assert.ok(e.ticks>ticks);
 liveAction(w,'event',event(e,now+4500,'test-event-3'),now+4500);
 liveAction(w,'emergency',{id:e.id},now+4600);advanceLive(w,'worker-a',now+5000);
 assert.equal(e.status,'STOPPED_FINAL');assert.equal(e.queue.length,0);assert.equal(e.sessions.length,1);
 assert.equal(publicLive(w).profitMinor,null);assert.equal(publicLive(w).revenueMinor,null);assert.equal(publicLive(w).apiCostMinor,0);
 assert.equal(publicLive(w).experiences[0].seen,undefined);
 assert.throws(()=>liveAction(initialWorkspace(),'start',{id:e.id}),/não encontrada/);
});
test('persistent scheduler progresses without HTTP or frontend, survives restart safely, prevents competing executors',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'hubloan-live-')),file=join(dir,'state.sqlite');let store=await createStore({file});
 await store.mutate('space',w=>{liveAction(w,'create',{});liveAction(w,'start',{id:w.liveFactory.experiences[0].id});});
 let runtime=createLiveRuntime(store,{intervalMs:40,owner:'one'});
 await wait(180);let e=(await store.read('space')).workspace.liveFactory.experiences[0];assert.ok(e.ticks>=2);const before=e.ticks;
 await runtime.close();await store.close();store=await createStore({file});
 await store.mutate('space',w=>advanceLive(w,'two',e.heartbeat+5000));assert.equal((await store.read('space')).workspace.liveFactory.experiences[0].ticks,before);
 await store.mutate('space',w=>advanceLive(w,'two',e.heartbeat+11000));e=(await store.read('space')).workspace.liveFactory.experiences[0];assert.equal(e.status,'DEGRADED');
 await store.mutate('space',w=>liveAction(w,'resume',{id:e.id}));runtime=createLiveRuntime(store,{intervalMs:40,owner:'two'});
 t.after(async()=>{await runtime.close();await store.close();await rm(dir,{recursive:true,force:true});});
 await wait(150);e=(await store.read('space')).workspace.liveFactory.experiences[0];assert.equal(e.owner,'two');assert.ok(e.ticks>before);
});
test('authenticated HTTP journey: create, start, event, reaction, pause, resume, stop; second workspace cannot control it',async t=>{
 const store=await createStore({file:':memory:'}),app=createApp({store,provider});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();});
 async function req(path,body,access=token){const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/agents${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 let r=await req('/live/create',{name:'Lume HTTP'});assert.equal(r.status,200);let e=r.data.liveFactory.experiences[0];
 assert.equal((await req('/live/start',{id:e.id},'b'.repeat(64))).status,404);
 assert.equal((await req('/live',undefined,'invalid')).status,401);
 await req('/live/start',{id:e.id});await app.liveRuntime.tick();e=(await req('/live')).data.experiences[0];
 await req('/live/event',event(e,Date.now()));await app.liveRuntime.tick();e=(await req('/live')).data.experiences[0];assert.equal(e.character.expression,'happy');assert.equal(e.processed,1);assert.ok(e.logs.some(l=>l.rule==='character.greet.v1'));
 await req('/live/pause',{id:e.id});const ticks=e.ticks;await app.liveRuntime.tick();assert.equal((await req('/live')).data.experiences[0].ticks,ticks);
 await req('/live/resume',{id:e.id});await app.liveRuntime.tick();assert.equal((await req('/live')).data.experiences[0].status,'TESTING');
 await req('/live/stop',{id:e.id});assert.equal((await req('/live')).data.experiences[0].status,'STOPPED_FINAL');
});
test('stale queues expire, heartbeat loss degrades, timeout ends, old sessions cannot replay',()=>{
 const w=initialWorkspace(),n=100000;liveAction(w,'create',{},n);const e=w.liveFactory.experiences[0];liveAction(w,'start',{id:e.id},n);advanceLive(w,'one',n);
 const old=e.sessionId;liveAction(w,'event',event(e,n+1000),n+1000);
 advanceLive(w,'one',n+11001);assert.equal(e.status,'DEGRADED');assert.equal(e.queue.length,0);
 liveAction(w,'resume',{id:e.id},n+12000);advanceLive(w,'one',n+13000);
 advanceLive(w,'one',e.deadline);assert.equal(e.status,'STOPPED_FINAL');
 liveAction(w,'start',{id:e.id},e.deadline+1);advanceLive(w,'one',e.startedAt+1);
 assert.notEqual(old,e.sessionId);assert.throws(()=>liveAction(w,'event',{...event(e,n+1000),sessionId:old},n+1000));
});

test('flow A: configure -> save -> test event -> configured reaction/log -> reopen persisted workspace',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'live-editor-')),file=join(dir,'state.sqlite');let store=await createStore({file}),app=createApp({store,provider});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await app.close();await store.close();await rm(dir,{recursive:true,force:true});});
 const url=`http://127.0.0.1:${app.server.address().port}/api/agents`;
 async function req(path,body,access=token){const r=await fetch(url+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 let r=await req('/live/create',{name:'Persistência'});let e=r.data.liveFactory.experiences[0];const config=structuredClone(e.config);
 config.name='Lume azul';config.personality='Explorador que comemora descobertas.';config.scene='cosmos';config.rules.celebrate={expression:'focused',animation:'spin',sound:'drum',phrases:['Vitória configurada!','Outro passo!'],durationMs:4000};
 assert.equal((await req('/live/configure',{id:e.id,version:1,config},'b'.repeat(64))).status,404);
 assert.equal((await req('/live/configure',{id:e.id,version:1,config:{...config,voice:'paid'}})).status,400);
 r=await req('/live/configure',{id:e.id,version:1,config});assert.equal(r.status,200);assert.equal(r.data.liveFactory.experiences[0].configVersion,2);
 assert.equal((await req('/live/configure',{id:e.id,version:1,config})).status,409);
 await req('/live/start',{id:e.id});await app.liveRuntime.tick();e=(await req('/live')).data.experiences[0];
 assert.equal((await req('/live/configure',{id:e.id,version:2,config})).status,409);
 await req('/live/event',event(e,Date.now(),'celebration-1','celebrate'));await app.liveRuntime.tick();e=(await req('/live')).data.experiences[0];
 assert.equal(e.character.speech,'Vitória configurada!');assert.equal(e.character.animation,'spin');assert.equal(e.action.sound,'drum');assert.equal(e.action.sessionId,e.sessionId);
 assert.ok(e.logs.some(l=>l.rule==='character.celebrate.v2'&&l.animation==='spin'&&l.aiUsed===false));
 const action=e.action.id;await req('/live/event',event(e,Date.now(),'celebration-1','celebrate'));await app.liveRuntime.tick();assert.equal((await req('/live')).data.experiences[0].action.id,action);
 await req('/live/emergency',{id:e.id});assert.equal((await req('/live')).data.experiences[0].action,null);
 await app.close();await store.close();store=await createStore({file});app=createApp({store,provider});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const restored=publicLive((await store.read((await import('../domain.mjs')).workspaceId(token))).workspace).experiences[0];
 assert.deepEqual(restored.config,config);assert.equal(restored.configVersion,2);assert.equal(restored.status,'STOPPED_FINAL');
});

test('creative proposals are bounded, explicit, version-bound, no automatic mutation; malformed rules rejected',()=>{
 const w=initialWorkspace();liveAction(w,'create',{},100000);const e=w.liveFactory.experiences[0],before=structuredClone(e.config);
 liveAction(w,'suggest',{id:e.id},101000);assert.deepEqual(e.config,before);assert.equal(e.suggestions[0].source,'LOCAL_RULES');
 liveAction(w,'apply-suggestion',{id:e.id,version:1,suggestionId:e.suggestions[0].id},102000);assert.equal(e.configVersion,2);assert.equal(e.config.rules.celebrate.animation,'wave');
 assert.throws(()=>liveAction(w,'apply-suggestion',{id:e.id,version:2,suggestionId:e.suggestions[0].id},103000),/vencida/);
 for(const bad of [{audio:{volume:2,muted:false}},{rules:{}},{scene:'https://untrusted.test/image'},{rules:{...e.config.rules,greet:{...e.config.rules.greet,animation:'eval'}}}]) assert.throws(()=>liveAction(w,'configure',{id:e.id,version:2,config:{...e.config,...bad}}));
 const c=structuredClone(e.config);c.audio.muted=true;liveAction(w,'configure',{id:e.id,version:2,config:c});liveAction(w,'start',{id:e.id},104000);advanceLive(w,'a',104000);liveAction(w,'event',event(e,105000),105000);advanceLive(w,'a',106000);assert.equal(e.action.sound,'none');
});
