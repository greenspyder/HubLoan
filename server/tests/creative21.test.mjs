import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../store.mjs';
import {createRunner} from '../runner.mjs';
import {initialWorkspace,encryptKey} from '../domain.mjs';
import {configureCosts} from '../ai-costs.mjs';
import {campaignAction,reconcileCampaigns} from '../creative-campaign.mjs';
import {validateScenePlan,scriptSimilarity} from '../creative-plan.mjs';
import {recordGameplay,detectHighlights,createEditorial} from '../viral-director.mjs';
const request={action:'start',request:'Pesquise oportunidades e produza três vídeos distintos.',authorizeModelCall:true,voiceMode:'technical'};
test('missing real model fails persistently without proposals, videos or fixture fallback',async()=>{
 const store=await createStore({file:':memory:'}),runner=createRunner(store,{}, {intervalMs:86400000});try{
 await store.mutate('a',w=>campaignAction(w,request));runner.unlock('a','a'.repeat(64));await runner.tick();const w=(await store.read('a')).workspace;
 assert.equal(w.creativeCampaigns[0].state,'Failed');assert.match(w.creativeCampaigns[0].error,/MODEL_NOT_CONNECTED/);assert.equal(w.creativeDirector?.proposals?.length||0,0);assert.equal(w.missions.filter(m=>m.artifact).length,0);assert.equal((await store.read('b')).workspace.creativeCampaigns,undefined);
 }finally{await runner.close();await store.close();}
});
test('campaign bounds, cancellation and stale revision remain isolated',()=>{
 const w=initialWorkspace(),c=campaignAction(w,request,1000);assert.throws(()=>campaignAction(w,request,1000),/vez/);assert.throws(()=>campaignAction(initialWorkspace(),{action:'cancel',id:c.id,revision:0}),/encontrada/);
 reconcileCampaigns(w,c.deadline+1);assert.equal(c.state,'Failed');assert.equal(w.missions[0].status,'cancelled');assert.throws(()=>campaignAction(w,{action:'resume',id:c.id,revision:0}),/mudou/);
 assert.throws(()=>campaignAction(w,{action:'resume',id:c.id,revision:c.revision},c.deadline+2),/Conecte/);assert.equal(c.recoveryAttempts,undefined);w.secret=encryptKey('test-key','a'.repeat(64));configureCosts(w,{enabled:true,dailyMinor:1000,monthlyMinor:1000,callMinor:100,taskMinor:500,ceilings:{text:100,research:100,vision:100,image:100}});campaignAction(w,{action:'resume',id:c.id,revision:c.revision},c.deadline+2);assert.equal(c.recoveryAttempts.length,1);
});
test('plan rejects fake events, static scenes and timing gaps; text similarity is only a repetition signal',()=>{
 assert.throws(()=>validateScenePlan({version:1,scenes:[]},'battle',['a','b']),/incompatível/);assert.equal(scriptSimilarity('Mesma ideia','mesma ideia'),1);
 const scenes=['approach','signal','reveal'].map((action,i)=>({start:i*6,end:(i+1)*6,action,camera:'wide',transition:'cut',beat:['hook','development','payoff'][i],narration:i}));assert.equal(validateScenePlan({version:1,scenes},'mystery',['a','b','c']).scenes.length,3);
 scenes[1].start=7;assert.throws(()=>validateScenePlan({version:1,scenes},'mystery',['a','b','c']),/contínua/);
});
test('controlled model contract selects and enqueues three formats automatically; not a real-model acceptance test',async()=>{
 const store=await createStore({file:':memory:'}),token='a'.repeat(64),events=detectHighlights(recordGameplay({characters:['Lume','Faísca','Jade','Ember']}).frames);
 const proposals=['comedy','battle','mystery','champion','hybrid'].map((format,i)=>({format,title:format,concept:format+' conceito',audience:'Brasil',hypothesis:'Teste interno',hook:'Observe.',rationale:'Comparação interna',primaryMetric:'Conclusão',script:i===2?['Porta distante.','Eco responde.','Luz regressa.']:i===0?['Plano perfeito.','Curva imprevista.']:['Distância diminui.','Espaço muda.']}));
 for(const [i,format] of ['comedy','battle','mystery'].entries()){const count=i===2?3:4,seconds=i===1?25:18;proposals[i].visualPlan={version:1,scenes:Array.from({length:count},(_,j)=>({start:j*seconds/count,end:(j+1)*seconds/count,action:i===2?['approach','signal','reveal'][j]:i===1?j===2?'replay':'event':j%2?'gameplay':'performance',camera:i===2?'wide':'Front',transition:'cut',beat:j===0?'hook':j===count-1?'payoff':'development',narration:i===2?j:j<2?0:1,...(i===1?{eventId:events[0].id}:{})}))};}
 const output=JSON.stringify({proposals,selection:[0,1,2].map(index=>({index,reason:'Categorias e ações distintas'})),rejected:[3,4].map(index=>({index,reason:'Fora do escopo deste teste'}))});
 const runner=createRunner(store,{text:async()=>({output,model:'controlled-test',tokens:1})},{intervalMs:86400000});try{
 await store.mutate('a',w=>{w.secret=encryptKey('test-key',token);configureCosts(w,{enabled:true,dailyMinor:1000,monthlyMinor:1000,callMinor:100,taskMinor:500,ceilings:{text:100,research:100,vision:100,image:100}});campaignAction(w,request);});runner.unlock('a',token);await runner.tick();const w=(await store.read('a')).workspace,c=w.creativeCampaigns[0];assert.equal(c.state,'Rendering',w.missions.find(m=>m.kind==='text').error);assert.equal(c.productionIds.length,3);assert.equal(w.creativeDirector.proposals.length,5);assert.equal(w.missions.filter(m=>m.kind==='video'&&m.status==='queued').length,3);
 const m=w.missions.find(m=>m.liveShort?.format==='battle');assert.equal(createEditorial(m.liveShort,recordGameplay(m.liveShort)).scenes[0].id,'astra-0');
 }finally{await runner.close();await store.close();}
});

test('quality failure is observable and cannot consume a resume without retryable work',()=>{
 const w=initialWorkspace(),c=campaignAction(w,request,1000);
 w.missions[0].status='review';
 c.productionIds=['video-a','video-b','video-c'];
 for(const id of c.productionIds)w.missions.push({id,status:'review'});
 reconcileCampaigns(w,2000);
 assert.equal(c.state,'Failed');
 assert.match(c.error,/CREATIVE_QUALITY_FAILED.*INVALID_ARTIFACT/);
 const before=structuredClone(c);
 assert.throws(()=>campaignAction(w,{action:'resume',id:c.id,revision:c.revision},3000),/revisão do plano/);
 assert.deepEqual(c,before);
});
