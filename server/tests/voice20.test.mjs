import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {voiceProfile,voiceStudioAction,activeVoice} from '../lume-voice.mjs';
import {pcmWav} from '../live-worker/voice-sample.mjs';
import {archivedSpeech} from '../live-worker/archived-speech.mjs';
import {createCameraRig} from '../live-worker/camera-rig.mjs';
import {createNeuralSpeech} from '../live-worker/neural-speech.mjs';
test('distinct references remain drafts and never overwrite active workspace identity',()=>{
 const a=voiceProfile({candidateId:'chatterbox-heart'}),b=voiceProfile({candidateId:'chatterbox-emma'}),w={},other={},original=activeVoice(w);
 assert.notEqual(a.voice,b.voice);assert.notEqual(a.voice,'pf_dora');assert.equal(a.liveValidated,false);
 voiceStudioAction(w,{action:'save',revision:0,profile:a});assert.deepEqual(activeVoice(w),original);assert.deepEqual(activeVoice(other),original);
 assert.throws(()=>voiceStudioAction(w,{action:'approve',revision:1,listened:true}));
 assert.throws(()=>voiceProfile({candidateId:a.candidateId,exaggeration:.9}));
});
test('archived speech binds exact text, hash and identity, and rejects truncation and fallback',async()=>{
 const bytes=pcmWav(new Float32Array(48000)),profile=voiceProfile({candidateId:'chatterbox-heart'}),r={file:'take.wav',text:'Oi.',voice:'af_heart',model:profile.model,fallback:false,reference:{synthetic:true,realPersonImitation:false},seconds:1,initialization:{ready:true},metrics:{synthesisMs:10},sha256:createHash('sha256').update(bytes).digest('hex')},files=new Map([[r.file,bytes]]);
 const speech=archivedSpeech(profile,[r],files);assert.equal((await speech.synthesize('Oi.')).length,48000);assert.equal(speech.metrics.synthesisCalls,0);await assert.rejects(speech.synthesize('Outro texto.'));speech.close();
 for(const change of [{fallback:true},{sha256:'bad'},{seconds:9}])assert.throws(()=>archivedSpeech(profile,[{...r,...change}],files));
 const other=archivedSpeech(voiceProfile({candidateId:'chatterbox-emma'}),[r],files);await assert.rejects(other.synthesize('Oi.'));other.close();
});
test('mesh visibility detects obstruction missed by logical head-center probes',()=>{
 const camera=new T.PerspectiveCamera(48,360/640,.1,300);camera.position.set(0,4,9);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const head=new T.Group();head.add(new T.Mesh(new T.SphereGeometry(.7),new T.MeshBasicMaterial()));head.updateMatrixWorld(true);
 const body=new T.Mesh(new T.BoxGeometry(4,4,4),new T.MeshBasicMaterial({side:T.DoubleSide}));body.updateMatrixWorld(true);
 const framing=createCameraRig(T,camera).refine({}, {shot:'Front'},[{head:{g:head},body}],{player:0,cut:true,quality:{issues:[],corrected:false}},1000);
 assert.ok(framing.quality.issues.includes('MESH_FACE_OCCLUSION'));assert.equal(framing.quality.blockedFaceRays,9);
});
test('unavailable Chatterbox sample never silently becomes fallback audio',async()=>{
 const s=await createNeuralSpeech({engine:'chatterbox',profile:{candidateId:'chatterbox-emma'},model:'/missing',python:'/missing',fallback:async()=>{throw Error('No fallback sample');}});
 try{await assert.rejects(s.synthesize('Oi.'),/No fallback sample/);assert.equal(s.metrics.neural,0);assert.equal(s.metrics.ready,false);}finally{s.close();}
});

import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('resident protocol rejects simultaneous speech and aborts without fallback',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tts-protocol-')),python=join(dir,'fixture');let calls=0,s;
 await writeFile(python,`#!${process.execPath}\nconsole.log(JSON.stringify({ready:true}));process.stdin.resume();setInterval(()=>{},1000);`,{mode:0o700});
 try{s=await createNeuralSpeech({engine:'chatterbox',profile:{candidateId:'chatterbox-heart'},python,model:dir,timeout:3000,fallback:async()=>{calls++;return new Float32Array(10);}});
 const control=new AbortController(),first=s.synthesize('Espera.','host',{signal:control.signal});await assert.rejects(s.synthesize('Outra fala.'),/ocupado/);control.abort();await assert.rejects(first,/cancelado/);assert.equal(calls,0);
 }finally{s?.close();await rm(dir,{recursive:true,force:true});}
});

test('editorial camera anticipates a turning face without crossing its center',()=>{
 const camera=new T.PerspectiveCamera(48,360/640,.1,300);camera.position.set(0,4,9);camera.lookAt(0,0,0);
 const head=new T.Group();head.add(new T.Mesh(new T.SphereGeometry(.7),new T.MeshBasicMaterial()));
 const body=new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshBasicMaterial());body.position.y=-4;body.updateMatrixWorld(true);
 const rig=createCameraRig(T,camera),actors=[{head:{g:head},body}];
 for(let n=0;n<20;n++){
  head.rotation.y=n*.12;head.updateMatrixWorld(true);
  const out=rig.refine({}, {shot:'Action',format:'battle'},actors,{player:0,cut:n===0,quality:{issues:[],corrected:false}},n*1000/15);
  assert.deepEqual(out.quality.issues,[],`frame ${n}`);assert.ok(out.quality.cameraJump<3);
  assert.ok(camera.position.distanceTo(head.position)>5);
 }
});

test('scenery occlusion is measured even with no blocking snake body',()=>{
 const camera=new T.PerspectiveCamera(48,360/640,.1,300);camera.position.set(0,4,9);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const head=new T.Group();head.add(new T.Mesh(new T.SphereGeometry(.7),new T.MeshBasicMaterial()));head.updateMatrixWorld(true);
 const body=new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshBasicMaterial());body.visible=false;
 const scenery=new T.InstancedMesh(new T.BoxGeometry(4,4,4),new T.MeshBasicMaterial({side:T.DoubleSide}),1);scenery.setMatrixAt(0,new T.Matrix4());scenery.updateMatrixWorld(true);
 const out=createCameraRig(T,camera).refine({}, {shot:'Front'},[{head:{g:head},body}],{player:0,cut:true,quality:{issues:[],corrected:false}},1000,[scenery]);
 assert.ok(out.quality.issues.includes('MESH_FACE_OCCLUSION'));assert.equal(out.quality.blockedFaceRays,9);
});
