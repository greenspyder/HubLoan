import test from 'node:test';
import assert from 'node:assert/strict';
import {create3DRenderer} from '../live-worker/render3d.mjs';
import {createNeuralSpeech} from '../live-worker/neural-speech.mjs';
import {createGame,advanceGame} from '../live-game.mjs';
import {initialWorkspace} from '../domain.mjs';
import {liveAction,advanceLive} from '../live-factory.mjs';
import {performanceDefaults,advanceGamePerformance} from '../live-performance.mjs';

test('autonomous presentation comments on real results, respects cooldown, never fills audience',()=>{
 const w=initialWorkspace();liveAction(w,'create',{},1000);const e=w.liveFactory.experiences[0];liveAction(w,'performance-configure',{id:e.id,version:1,config:{...performanceDefaults(),enabled:true}},1000);liveAction(w,'game-configure',{id:e.id,version:2,config:{template:'seed-snake',names:['Lume','Faísca'],roundSeconds:15}},1000);liveAction(w,'start',{id:e.id},1000);
 for(let at=1000;at<60000;at+=1000)advanceLive(w,'test',at);
 assert.ok(e.performance.jobs.some(j=>j.source==='INTERNAL_GAME'));assert.equal(e.performance.top.length,0);assert.equal(e.performance.accepted,0);assert.equal(e.performance.aiCalls,0);
 const count=e.performance.jobs.length;advanceGamePerformance(e,59001);assert.equal(e.performance.jobs.length,count);
});
test('neural unavailable falls back locally, rejects unsafe input and cancels',async()=>{
 let calls=0;const engine=await createNeuralSpeech({python:'/does/not/exist',model:'/missing',fallback:async()=>{calls++;return new Float32Array(100);}});
 try{assert.equal((await engine.synthesize('Olá','host')).length,100);assert.equal(calls,1);assert.equal(engine.metrics.neural,0);assert.equal(engine.metrics.fallback,1);await assert.rejects(engine.synthesize('[[internal phonemes]]','host'));const abort=new AbortController();abort.abort();await assert.rejects(engine.synthesize('Oi','host',{signal:abort.signal}));}finally{engine.close();}
});
test('real neural pt-BR synthesis, bounded PCM and model reuse',{skip:!process.env.HUBLOAN_PIPER_MODEL,timeout:30000},async()=>{
 const engine=await createNeuralSpeech();try{const a=await engine.synthesize('Olha essa maçã! Hoje eu acerto a curva.','host'),b=await engine.synthesize('Olha essa maçã! Hoje eu acerto a curva.','bright');assert.ok(a.length>48000&&a.length<=384000);assert.ok(a.some(x=>Math.abs(x)>.1));assert.notDeepEqual(a,b);assert.equal(engine.metrics.neural,2);assert.equal(engine.metrics.fallback,0);}finally{engine.close();}
});
test('real WebGL frames, camera, PCM mouth, game immutable, avatars, bounded geometry and cleanup',{skip:!process.env.HUBLOAN_CHROMIUM,timeout:30000},async()=>{
 const r=await create3DRenderer();try{const g=createGame({template:'seed-snake',names:['Lume','Faísca'],roundSeconds:20},1000);advanceGame(g,5000);const e={game:g,status:'TESTING',performance:{top:[{id:'demo-1',name:'Teste',avatar:'https://localhost/secret'}],avatarUntil:15000}},before=JSON.stringify(g);
 const a=await r.render(e,4000,{role:'host',level:.8,text:'Olá!'}),first=await r.inspect();assert.equal(a.length,360*640*3);assert.equal(first.mouth,.8);for(const [x,y] of first.anchors){assert.ok(Math.abs(x)<.78);assert.ok(y>-.46&&y<.66);}assert.equal(first.avatarCount,1);assert.equal(first.textures,0);
 for(let i=0;i<20;i++)await r.render(e,4100+i*20,{role:'comment',level:1,text:'Olá'});const last=await r.inspect();assert.equal(last.mouth,0);assert.notDeepEqual(last.camera,first.camera);assert.ok(last.geometries<=40);assert.equal(JSON.stringify(g),before);assert.ok(a.some(x=>x>150));
 for(let i=0;i<30;i++){advanceGame(g,6000+i*1000);const snapshot=JSON.stringify(g);await r.render(e,g.lastAt-400);const inspected=await r.inspect();for(const [x,y] of inspected.anchors){assert.ok(Math.abs(x)<.8,`head/target horizontal ${x}`);assert.ok(y>-.46&&y<.68,`head/target vertical ${y}`);}assert.equal(JSON.stringify(g),snapshot);}
 }finally{await r.close();}await assert.rejects(r.render({},0));
});
