import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceProfile,voiceStudioAction,voiceStudioState,activeVoice,directedSpeed} from '../lume-voice.mjs';
import {shortConfig} from '../viral-content.mjs';
import {initialWorkspace,addMission} from '../domain.mjs';
import {liveAction,advanceLive} from '../live-factory.mjs';
import {authorizeWorker} from '../live-broadcast.mjs';
test('global voice remains active until explicit approval of previewed draft',()=>{
 const w={},other={},original=activeVoice(w);
 voiceStudioAction(w,{action:'save',revision:0,profile:{candidateId:'dora-calm'}});
 assert.deepEqual(activeVoice(w),original);assert.deepEqual(activeVoice(other),original);
 assert.throws(()=>voiceStudioAction(w,{action:'approve',revision:1,listened:true}));
 w.voiceStudio.previewed=JSON.stringify(w.voiceStudio.draft);
 assert.throws(()=>voiceStudioAction(w,{action:'approve',revision:1,listened:false}));
 voiceStudioAction(w,{action:'approve',revision:1,listened:true});
 assert.equal(activeVoice(w).candidateId,'dora-calm');assert.equal(activeVoice(w).version,2);
 assert.deepEqual(activeVoice(other),original);assert.equal(voiceStudioState(w).draft,null);
});
test('voice revision prevents stale approval and new edit invalidates sample',()=>{
 const w={};voiceStudioAction(w,{action:'save',revision:0,profile:{}});w.voiceStudio.previewed=JSON.stringify(w.voiceStudio.draft);
 assert.throws(()=>voiceStudioAction(w,{action:'approve',revision:0,listened:true}));
 voiceStudioAction(w,{action:'save',revision:1,profile:{speed:.9}});
 assert.throws(()=>voiceStudioAction(w,{action:'approve',revision:2,listened:true}));
});
test('production profile is a validated immutable snapshot',()=>{
 const profile=voiceProfile({candidateId:'dora-calm'}),c=shortConfig({format:'comedy',seconds:12,characters:['Lume','Jade'],lines:['Um plano.','Uma curva.'],hypothesis:'Teste',audience:'Teste',voiceProfile:profile});
 profile.speed=1.1;assert.equal(c.voiceProfile.speed,.9);
 assert.throws(()=>voiceProfile({speed:Infinity}));assert.throws(()=>voiceProfile({candidateId:'external-paid'}));
 for(const state of ['mysterious','playful','suspense','surprised','warm','celebration','calm'])assert.ok(directedSpeed(c.voiceProfile,state)>=.85&&directedSpeed(c.voiceProfile,state)<=1.12);
});
test('offline jobs and live grants share active identity without client overrides',()=>{
 const w=initialWorkspace();w.voiceStudio={active:voiceProfile({candidateId:'dora-flow',version:3}),revision:2};
 const m=addMission(w,{title:'Profile',brief:'Test',kind:'video',agentId:w.agents.find(a=>a.enabled).id,liveShort:{format:'comedy',seconds:12,characters:['Lume','Jade'],lines:['Um plano.','Uma curva.'],hypothesis:'Teste',audience:'Teste',voiceProfile:{candidateId:'dora-calm'}}});
 assert.equal(m.liveShort.voiceProfile.candidateId,'dora-flow');
 const at=100000;liveAction(w,'create',{},at);const e=w.liveFactory.experiences[0];liveAction(w,'game-configure',{id:e.id,version:1,config:{template:'seed-snake',names:['Lume','Jade'],roundSeconds:15}},at);liveAction(w,'start',{id:e.id},at);advanceLive(w,'test',at);
 const grant=authorizeWorker(w,e.id,'preview',at);assert.equal(grant.voiceProfile.version,3);assert.equal(grant.voice,'kokoro');
 w.voiceStudio.active=voiceProfile({candidateId:'dora-calm',version:4});assert.equal(m.liveShort.voiceProfile.version,3);assert.equal(grant.voiceProfile.version,3);
});
