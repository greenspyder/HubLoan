import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../store.mjs';
import {createApp} from '../app.mjs';
import {recordFinancialChange} from '../financial-audit.mjs';
test('financial controls preserve authentication, CAS, isolated persistence and no key disclosure',async t=>{
 const store=await createStore({file:':memory:'}),app=createApp({store,provider:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();});const base=`http://127.0.0.1:${app.server.address().port}/api/agents`;
 const call=async(path,input,token='a'.repeat(64))=>{const r=await fetch(base+path,{method:input?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:input?JSON.stringify(input):undefined});return {status:r.status,data:await r.json()};};
 assert.equal((await call('/workspace',null,'invalid')).status,401);
 const limits={enabled:true,dailyMinor:100,monthlyMinor:200,callMinor:20,taskMinor:50,ceilings:{text:10,research:10,vision:10,image:20},revision:0};
 const results=await Promise.all([call('/ai-costs',limits),call('/ai-costs',limits)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const voice=await call('/voice-studio',{action:'budget',revision:0,scope:'live',characters:500,sessionCharacters:50,acceptUnknownCost:true});assert.equal(voice.status,200);assert.equal(voice.data.voiceStudio.budgets.live.sessionCharacters,50);
 assert.notEqual((await call('/voice-studio',{action:'budget',revision:1,scope:'samples',characters:50,sessionCharacters:50,acceptUnknownCost:false})).status,200);
 const media=await call('/media-providers',{action:'limit',revision:0,dailyLimitMicros:2000000});assert.equal(media.status,200);
 const w=(await call('/workspace')).data;assert.equal(w.aiCosts.revision,1);assert.equal(w.multimodal.dailyLimitMicros,2000000);assert.equal(w.financialAudit.length,3);assert.ok(!JSON.stringify(w).includes('secret'));
 assert.equal((await call('/workspace',null,'b'.repeat(64))).data.aiCosts.enabled,false);
 assert.equal((await call('/ai-costs',{...limits,revision:1,callMinor:1})).status,400);
 // Legacy callers without a revision still work, but new clients reject stale edits.
 const {revision,...legacy}=limits;assert.equal((await call('/ai-costs',legacy)).status,200);
});
test('financial audit whitelists limits and never stores arbitrary credential input',()=>{const w={};recordFinancialChange(w,'media','connect',{key:'private-secret',dailyLimitMicros:10,prompt:'private'});assert.deepEqual(w.financialAudit[0].limits,{dailyLimitMicros:10});assert.ok(!JSON.stringify(w).includes('private'));});
test('studio transport returns only selected campaign and video details without mutating stored records',async()=>{
 const {studioWorkspaceView}=await import('../studio-workspace-view.mjs');
 const data={creativeCampaigns:[{id:'a',plans:['private-plan'],decisions:['decision'],quality:{},events:[{at:'now',state:'Planning',detail:'full log'}]},{id:'b',plans:['other-plan'],events:[]}],missions:[{id:'v1',videoReport:{frames:1},output:'full report',logs:['log']},{id:'v2',videoReport:{frames:2},logs:['another']}]};
 const result=studioWorkspaceView(data,{campaignIds:['a'],productionId:'v1'});
 assert.deepEqual(result.creativeCampaigns[0].plans,['private-plan']);assert.equal(result.creativeCampaigns[1].plans,undefined);assert.equal(result.missions[1].videoReport,undefined);assert.equal(result.missions[0].videoReport.frames,1);assert.deepEqual(data.missions[1].logs,['another']);
});
