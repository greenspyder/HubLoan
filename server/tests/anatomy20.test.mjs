import test from 'node:test';
import assert from 'node:assert/strict';
import {create3DRenderer} from '../live-worker/render3d.mjs';
import {createGame,advanceGame} from '../live-game.mjs';

test('shared WebGL spine stays inside every skull through turns, elimination and replay',{skip:!process.env.HUBLOAN_CHROMIUM,timeout:60000},async()=>{
 const r=await create3DRenderer();
 try{
  const g=createGame({template:'seed-snake',names:['Lume','Faísca'],roundSeconds:20},1000);
  for(let at=1100;at<21000;at+=100)advanceGame(g,at);
  const e={game:g,status:'TESTING',performance:{top:[]}},snapshot=JSON.stringify(g);
  for(const editorial of [false,true])for(const at of [2000,2050,2200,4500,9000,15000,20000,2050]){
   await r.render(e,at,null,{editorial,format:'comedy',presenter:true,player:0,shot:'Front',cutId:'anatomy'});
   const view=await r.inspect();
   for(const a of view.anatomy){assert.deepEqual(a.issues,[]);assert.ok(a.gap<1e-5);assert.ok(a.skullNormalizedRadius<.8);assert.ok(a.projectedGapPixels<.01);assert.ok(a.orientationError<.01);assert.ok(a.finite);}
  }
  assert.equal(JSON.stringify(g),snapshot);assert.ok(r.metrics.anatomyQuality.checked>=32);assert.deepEqual(r.metrics.anatomyQuality.failures,[]);
 }finally{await r.close();}
});

// Controlled turns supplement recorded gameplay, including all species and time reversal.
test('all archetypes retain their transformed neck socket in tight turns and slow replay',{skip:!process.env.HUBLOAN_CHROMIUM,timeout:60000},async()=>{
 const r=await create3DRenderer();try{
 const game=createGame({template:'seed-snake',names:['Lume','Faísca'],roundSeconds:20},1000),base=structuredClone(game.frames.at(-1)||game);
 for(const archetype of ['snake','dragon','cat','crocodile','fox']){
 const a=structuredClone(base);a.at=1000;a.players=a.players.slice(0,1);Object.assign(a.players[0],{archetype,direction:0,eatenAt:-10000,body:[{x:8,y:12},{x:7,y:12},{x:7,y:11},{x:6,y:11}]});
 const b=structuredClone(a);b.at=1200;b.players[0].direction=1;b.players[0].body[0]={x:8,y:13};game.frames=[a,b];
 const e={game,status:'TESTING',offline:true,performance:{top:[]}},before=JSON.stringify(game),poses=[];
 for(const at of [1000,1050,1100,1150,1199,1100]){
 await r.render(e,at,null,{editorial:true,presenter:true,format:'comedy',player:0,shot:'Front',cutId:'poses'});
 const pose=(await r.inspect()).anatomy[0];assert.deepEqual(pose.issues,[]);assert.ok(pose.skullNormalizedRadius<.8);assert.ok(pose.projectedGapPixels<.01);poses.push(pose);
 }
 assert.deepEqual(poses[2].socket,poses[5].socket,'replay socket is independent of previous playback');assert.equal(JSON.stringify(game),before);
 }
 }finally{await r.close();}
});
