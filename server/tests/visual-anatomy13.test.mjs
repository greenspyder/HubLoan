import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {inspectVisualAnatomy} from '../live-worker/visual-anatomy.mjs';
import {createEditorial,recordGameplay,editorialFrame,detectHighlights} from '../viral-director.mjs';
import {audiovisualEligibility} from '../viral-quality.mjs';
test('visual gate distinguishes an intact spine from an offscreen or obstructed silhouette',()=>{
 const curve=new T.CatmullRomCurve3([new T.Vector3(0,1,0),new T.Vector3(-1,.5,0),new T.Vector3(-2,.5,-1),new T.Vector3(-3,.5,0)]),head=new T.Group(),body=new T.Mesh(new T.TubeGeometry(curve,30,.3,8),new T.MeshBasicMaterial());head.position.set(0,1,0);head.add(new T.Mesh(new T.SphereGeometry(.5),new T.MeshBasicMaterial()));head.updateMatrixWorld(true);body.updateMatrixWorld(true);
 const a={head:{g:head},body,spineCurve:curve},camera=new T.PerspectiveCamera(48,360/640,.1,300);camera.position.set(0,4,10);camera.lookAt(-1,1,0);
 const clear=inspectVisualAnatomy(T,camera,[a],0,{showcase:true});assert.ok(clear.bodyVisibleFraction>.5);assert.ok(clear.neckVisibleFraction>0);
 camera.lookAt(100,100,100);const outside=inspectVisualAnatomy(T,camera,[a],0,{showcase:true});assert.ok(outside.issues.includes('BODY_CROPPED'));assert.ok(outside.issues.includes('NECK_NOT_VISIBLE'));
 camera.lookAt(-1,1,0);const blocker=new T.Mesh(new T.BoxGeometry(10,10,.2),new T.MeshBasicMaterial());blocker.position.set(0,1,4);blocker.updateMatrixWorld(true);const blocked=inspectVisualAnatomy(T,camera,[a,{body:blocker,head:{g:new T.Group()}}],0,{showcase:true});assert.ok(blocked.bodyVisibleFraction<clear.bodyVisibleFraction);assert.ok(blocked.issues.includes('BODY_HIDDEN'));
});
test('every champion has five explicit presentation beats without mutating gameplay',()=>{
 const c={format:'champion',seconds:20,characters:['Lume','Faísca','Jade','Ember']},r=recordGameplay(c),before=JSON.stringify(r),t=createEditorial(c,r);assert.equal(t.scenes.length,20);
 for(let p=0;p<4;p++){const scenes=t.scenes.filter(s=>s.player===p);assert.deepEqual(scenes.map(s=>s.stage),[0,1,2,3,4]);assert.ok(scenes.every(s=>s.showcase&&s.speed===0));}
 for(let time=0;time<20;time+=.25){const f=editorialFrame(r,t,time,100000+time*1000);assert.equal(f.direction.showcase,true);assert.ok(f.direction.showcaseStage>=0);}
 assert.equal(JSON.stringify(r),before);
});
test('event direction has measured simulation evidence, not invented crowd interactions',()=>{
 const r=recordGameplay({characters:['Lume','Faísca','Jade','Ember']}),events=detectHighlights(r.frames);assert.ok(events.some(e=>e.type==='approach'));assert.ok(events.some(e=>e.type==='escape'));
 for(const e of events)assert.ok(r.frames.some(f=>f.at===e.at));
});
test('version 4 cannot be eligible with geometric checks alone',()=>{
 const report={technicalStatus:'TECHNICALLY_VALID',voice:{neural:1,fallback:0,failures:0},music:[{}],timeline:{version:4},renderer:{frames:1,framingQuality:{checked:1,issues:{}}}};
 assert.equal(audiovisualEligibility(report).eligible,false);report.renderer.visualQuality={checked:1,failures:[]};assert.equal(audiovisualEligibility(report).eligible,true);assert.equal(audiovisualEligibility(report).humanReviewRequired,true);
});

test('comedy holds recorded poses for performance and retains two moving action scenes',()=>{
 const config={format:'comedy',seconds:18,characters:['Lume','Faísca','Jade','Ember']},recording=recordGameplay(config),before=JSON.stringify(recording),timeline=createEditorial(config,recording);
 assert.equal(timeline.scenes.filter(s=>s.hold).length,2);assert.equal(timeline.scenes.filter(s=>s.speed===1).length,2);
 for(const scene of timeline.scenes.filter(s=>s.hold)){
  const a=editorialFrame(recording,timeline,scene.start+.1,100000),b=editorialFrame(recording,timeline,scene.start+.5,100500);
  assert.equal(a.sourceAt,b.sourceAt);assert.equal(a.direction.performanceHold,true);assert.match(a.direction.title,/pausa/);
 }
 assert.equal(JSON.stringify(recording),before);
});
