import test from 'node:test';
import assert from 'node:assert/strict';
import {audiovisualEligibility} from '../viral-quality.mjs';
import {initialWorkspace,addMission,approveMission} from '../domain.mjs';
const valid={technicalStatus:'TECHNICALLY_VALID',voice:{neural:3,fallback:0,failures:0},music:[{hash:'approved'}],renderer:{frames:3,framingQuality:{checked:3,issues:{}}}};
test('artistic eligibility never mistakes technical success, fallback or absent music for complete AV',()=>{
 assert.equal(audiovisualEligibility(valid).eligible,true);assert.equal(audiovisualEligibility(valid).humanReviewRequired,true);
 for(const r of [undefined,{}, {...valid,voice:{neural:2,fallback:1,failures:1}},{...valid,music:[]},{...valid,technicalStatus:'FAILED'}])assert.equal(audiovisualEligibility(r).eligible,false);
});
test('fallback approval is blocked on backend even with human override',()=>{
 const w=initialWorkspace(),m=addMission(w,{title:'AV',brief:'Review',kind:'video',agentId:w.agents.find(a=>a.enabled).id,liveShort:{format:'comedy',seconds:15,characters:['Lume','Faísca'],lines:['Oi!','Uma maçã!'],hypothesis:'Teste',audience:'Adultos'}});
 m.status='review';m.videoReport={...valid,voice:{neural:0,fallback:2,failures:0}};assert.throws(()=>approveMission(w,m.id,{override:true}),/bloqueada/);assert.equal(m.status,'review');
 m.videoReport=valid;approveMission(w,m.id);assert.equal(m.status,'approved');
});

import {shortConfig} from '../viral-content.mjs';
test('AV controls are bounded and neural is the default',()=>{
 const c={format:'comedy',seconds:15,characters:['Lume','Faísca'],lines:['Oi!','Uma maçã!'],hypothesis:'Teste',audience:'Adultos'};
 assert.equal(shortConfig(c).voiceMode,'neural');assert.equal(shortConfig({...c,voiceMode:'technical'}).voiceMode,'technical');
 for(const change of [{voiceMode:'remote-paid'},{headScale:2},{headScale:NaN},{effectsGain:-1},{effectsGain:2}])assert.throws(()=>shortConfig({...c,...change}));
});

test('framing failures block even technically valid neural exports',()=>{for(const framingQuality of [{checked:2,issues:{}},{checked:3,issues:{MESH_FACE_OCCLUSION:1}}])assert.equal(audiovisualEligibility({...valid,renderer:{frames:3,framingQuality}}).eligible,false);});
