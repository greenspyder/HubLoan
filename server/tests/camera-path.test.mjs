import test from 'node:test';
import assert from 'node:assert/strict';
import {planCameraPath} from '../camera-path.mjs';
const view=(x,facing=1)=>({position:[x,4,8],quaternion:[0,0,0,1],facing,blocked:0,height:.45});
test('global camera path avoids a locally attractive dead end',()=>{
 const frames=[{cut:true,views:[view(0),view(4,.8)]},{cut:false,views:[view(1),view(5,.8)]},{cut:false,views:[view(6)]}];
 const plan=planCameraPath(frames);assert.deepEqual(plan.path.map(v=>v.position[0]),[4,5,6]);assert.equal(plan.metrics.addedCuts,0);
});
test('unreachable or missing safe views fail closed without inventing cuts',()=>{
 assert.throws(()=>planCameraPath([{cut:true,views:[view(0)]},{cut:false,views:[view(10)]}]),/quadro 2/);
 assert.throws(()=>planCameraPath([{cut:true,views:[]}]),/Nenhum plano seguro/);
 assert.throws(()=>planCameraPath([{cut:true,views:[{...view(0),position:[NaN,0,0]}]}]),/inválida/);
});
test('only existing scene cuts may disconnect a camera path',()=>{
 const plan=planCameraPath([{cut:true,views:[view(0)]},{cut:true,views:[view(100)]}]);assert.equal(plan.path.length,2);assert.equal(plan.metrics.addedCuts,0);
});
test('rotation discontinuity is rejected even when position stays fixed',()=>{
 const rotated={...view(0),quaternion:[0,Math.sin(.5),0,Math.cos(.5)]};
 assert.throws(()=>planCameraPath([{cut:true,views:[view(0)]},{cut:false,views:[rotated]}]),/Sem trajetória contínua/);
});

test('editorial repair records action cuts and refuses rapid or unmotivated cuts',async()=>{
 const {planEditorialCamera}=await import('../camera-path.mjs');
 const frames=Array.from({length:25},(_,i)=>({cut:i===0,views:[view(i<20?0:10)]}));
 assert.throws(()=>planEditorialCamera(frames,frames.map(()=>null)),/Sem trajetória/);
 const actions=frames.map((_,i)=>i===20?'TURN_IN_RECORDED_SIMULATION':null),result=planEditorialCamera(frames,actions);
 assert.equal(result.metrics.addedCuts,1);assert.equal(result.metrics.corrections[0].frame,20);assert.equal(frames[20].cut,false);
 assert.throws(()=>planEditorialCamera(frames.slice(15),actions.slice(15)),/Sem trajetória/);
});
