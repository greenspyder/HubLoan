import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCameraRig} from '../live-worker/camera-rig.mjs';
import {createDirector} from '../live-director.mjs';
import {createLumeFace} from '../live-worker/lume-face.mjs';
import {createGame,advanceGame} from '../live-game.mjs';
import {lumeLine,lumeLines} from '../live-lume-lines.mjs';
const config={template:'seed-snake',names:['Lume','Faísca'],roundSeconds:22};
test('establishing view yields to immersion without random cuts or invented social events',()=>{
 const game=createGame(config,1000),director=createDirector(),counts={};let previous;
 for(let at=1000;at<181000;at+=100){advanceGame(game,at);const state=director.update({sessionId:'47'},game,at);counts[state.shot]=(counts[state.shot]||0)+1;assert.ok(['exploration','tension','reaction','reward'].includes(state.pacing));if(previous&&previous.round===game.round&&state.shot!==previous.shot&&previous.shot!=='Tactical'&&game.players[previous.player].alive)assert.ok(at-previous.changed>=5000);previous={...state,round:game.round,changed:!previous||state.shot!==previous.shot||previous.round!==game.round?at:previous.changed};}
 assert.ok(counts.Follow+counts.Front+counts.Action>counts.Tactical);
 assert.equal(director.counts.community,undefined);
});
test('occlusion correction checks body in front of face without hiding it or changing physics',()=>{
 const game=createGame(config,1000);game.players[0].body=[{x:8,y:12},{x:7,y:12},{x:6,y:12},{x:5,y:12}];game.players[0].direction=0;
 game.players[1].body=[{x:9,y:12},{x:9.5,y:12},{x:10,y:12}];
 const before=JSON.stringify(game),rig=createCameraRig(T,new T.PerspectiveCamera(48,9/16,.1,300));
 const state=rig.update(game,{shot:'Front',player:0},1000);
 assert.equal(state.occlusionCorrected,true);assert.equal(JSON.stringify(game),before);assert.ok(state.camera.every(Number.isFinite));
});
test('expressions blend, keep distinct poses, and preserve audio-envelope disclosure',()=>{
 const face=createLumeFace(T,'#67caaa'),poses=[];let at=1000;
 for(const emotion of ['joy','surprise','fear','suspicious','determined','frustrated','proud','confused','teasing','celebrating']){for(let i=0;i<30;i++){face.animate(at,0,false,false,emotion);at+=33;}poses.push(face.inspect().jawOpen);assert.equal(face.inspect().expression,emotion);assert.equal(face.inspect().lipSync,'audio-envelope');}
 assert.ok(new Set(poses.map(v=>v.toFixed(3))).size>=7);
});
test('expanded contextual repertoire avoids repetition until category exhaustion',()=>{
 for(const category of ['contest','risk','food','victory','defeat']){const memory={};const lines=lumeLines[category].map((_,i)=>lumeLine(memory,category,'playful',i*15000));assert.equal(new Set(lines).size,lines.length);assert.ok(lines.length>=6);}
});
