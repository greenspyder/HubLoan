import test from 'node:test';
import assert from 'node:assert/strict';
import {recordGameplay,createEditorial,editorialFrame} from '../viral-director.mjs';
import {create3DRenderer} from '../live-worker/render3d.mjs';
test('battle mouth and neck remain inspectable in four previously blocked real frames',{skip:!process.env.HUBLOAN_CHROMIUM},async()=>{
 const c={format:'battle',seconds:25,characters:['Lume','Faísca','Jade','Ember']},recording=recordGameplay(c),timeline=createEditorial(c,recording),before=JSON.stringify(recording),renderer=await create3DRenderer();
 try{for(const i of [7,195,207,208]){
  const at=100000+i/15*1000,edit=editorialFrame(recording,timeline,i/15,at);
  await renderer.render({game:edit.game,status:'TESTING',offline:true,performance:{top:[]}},at,null,{...edit.direction,collectCameraViews:true});
  assert.ok(renderer.planningFrames.at(-1).views.length>0,`No safe view at frame ${i}`);
  const pose=await renderer.inspect();assert.ok(pose.anatomy.every(a=>a.issues.length===0));
 }
 assert.equal(JSON.stringify(recording),before);
 }finally{await renderer.close();}
});
