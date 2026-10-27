import test from 'node:test';
import assert from 'node:assert/strict';
import {audiovisualEligibility} from '../viral-quality.mjs';
import {initialWorkspace,addMission,approveMission} from '../domain.mjs';
const valid={technicalStatus:'TECHNICALLY_VALID',voice:{neural:3,fallback:0,failures:0},music:[{hash:'approved'}]};
test('artistic eligibility never mistakes technical success, fallback or absent music for complete AV',()=>{
 assert.equal(audiovisualEligibility(valid).eligible,true);assert.equal(audiovisualEligibility(valid).humanReviewRequired,true);
 for(const r of [undefined,{}, {...valid,voice:{neural:2,fallback:1,failures:1}},{...valid,music:[]},{...valid,technicalStatus:'FAILED'}])assert.equal(audiovisualEligibility(r).eligible,false);
});
test('fallback approval is blocked on backend even with human override',()=>{
 const w=initialWorkspace(),m=addMission(w,{title:'AV',brief:'Review',kind:'video',agentId:w.agents.find(a=>a.enabled).id,liveShort:{format:'comedy',seconds:15,characters:['Lume','Faísca'],lines:['Oi!','Uma maçã!'],hypothesis:'Teste',audience:'Adultos'}});
 m.status='review';m.videoReport={...valid,voice:{neural:0,fallback:2,failures:0}};assert.throws(()=>approveMission(w,m.id,{override:true}),/bloqueada/);assert.equal(m.status,'review');
 m.videoReport=valid;approveMission(w,m.id);assert.equal(m.status,'approved');
});
