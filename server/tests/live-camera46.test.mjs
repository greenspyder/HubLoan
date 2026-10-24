import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCameraRig} from '../live-worker/camera-rig.mjs';
import {createDirector} from '../live-director.mjs';
import {createGame,advanceGame} from '../live-game.mjs';
const config={template:'seed-snake',names:['Lume','Faísca'],roundSeconds:22};
test('rig keeps head visible through turns, growth and target loss without changing physics',()=>{
 const camera=new T.PerspectiveCamera(48,9/16,.1,300),rig=createCameraRig(T,camera);
 let g;for(const shot of ['Follow','Front','Tactical','Action']){g=createGame(config,1000);for(let at=1000;at<=25000;at+=100){advanceGame(g,at);const before=JSON.stringify(g),r=rig.update(g,{shot,player:0},at);assert.equal(JSON.stringify(g),before);assert.ok(r.camera.every(Number.isFinite));assert.ok(r.camera[1]>=3);const [x,y,z]=r.head;assert.ok(Math.abs(x)<.91&&y>-.56&&y<.7&&z<1&&z>-1);}}
 const r=rig.update(g,{shot:'Front',player:99},26000);assert.equal(r.shot,'Tactical');assert.equal(r.fallback,'TARGET_LOST');
});
test('director uses contextual shots, stable holds, leader choice and session reset',()=>{
 const g=createGame(config,1000),d=createDirector(),shots=new Set();let last,lastChange=1000;
 for(let at=1000;at<=181000;at+=100){advanceGame(g,at);const r=d.update({sessionId:'a'},g,at);shots.add(r.shot);if(last&&r.shot!==last.shot){assert.ok(at-lastChange>=5000||!g.players[last.player]?.alive||r.shot==='Tactical');lastChange=at;}last=r;}
 for(const shot of ['Tactical','Follow','Front','Action'])assert.ok(shots.has(shot),shot);assert.equal(d.update({sessionId:'b'},g,182000).shot,'Tactical');
});
test('rapid compass turns keep camera travel bounded',()=>{
 const g=createGame(config,1000),rig=createCameraRig(T,new T.PerspectiveCamera(48,9/16,.1,300));let previous;
 for(let i=0;i<600;i++){g.players[0].direction=Math.floor(i/15)%4;const r=rig.update(g,{shot:'Front',player:0},1000+i*1000/30);if(previous)assert.ok(new T.Vector3(...r.camera).distanceTo(new T.Vector3(...previous))<3);previous=r.camera;}
});
