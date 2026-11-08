import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspace} from '../domain.mjs';
import {creativeAction,creativeState,validateCreativeSource} from '../creative-director.mjs';
import {storyConfig,storyFrame} from '../motion-story.mjs';
import {createStore} from '../store.mjs';
const act=(w,input)=>creativeAction(w,{revision:w.creativeDirector?.revision||0,...input});
test('five proposals, distinct categories, provenance, unsupported formats cannot produce',()=>{
 const w=initialWorkspace();const p=act(w,{action:'propose',theme:'Mistério'});assert.equal(p.length,5);assert.equal(new Set(p.map(x=>x.category)).size,4);assert.ok(p.every(x=>x.evidence==='CREATIVE_HYPOTHESIS'));
 assert.throws(()=>act(w,{action:'produce',proposalId:p[4].id,voiceMode:'technical'}),/implementação/);
 const e=act(w,{action:'produce',proposalId:p[2].id,voiceMode:'technical'});assert.equal(w.missions[0].status,'queued');assert.equal(w.missions[0].motionStory.lines.length,3);assert.equal(creativeState(w).experiments[0].artifact,null);assert.equal(e.metrics,null);
 assert.throws(()=>act(w,{action:'produce',proposalId:p[2].id,voiceMode:'technical'}),/já produzida/);
});
test('sources reject invented provenance and require explicit fixture mode',()=>{
 assert.throws(()=>validateCreativeSource({kind:'verified-trend'}));assert.throws(()=>validateCreativeSource({kind:'public-reference',title:'x',summary:'x',url:'file:///etc/passwd',observedAt:'2020-01-01'}));
 const w=initialWorkspace();act(w,{action:'source',source:{kind:'fixture',title:'fixture',summary:'Dados sintéticos'}});const id=w.creativeDirector.sources[0].id;
 assert.throws(()=>act(w,{action:'propose',theme:'teste',sourceIds:[id]}),/fixtures/);
 assert.equal(act(w,{action:'propose',theme:'teste',sourceIds:[id],fixtureMode:true})[0].evidence,'SIMULATED_CONTEXT');
 assert.throws(()=>act(initialWorkspace(),{action:'propose',theme:'teste',sourceIds:[id]}),/espaço/);
});
test('workspace CAS, pause, immutable revisions, no approval before artifact',()=>{
 const w=initialWorkspace(),p=act(w,{action:'propose',theme:'Teste'});
 assert.throws(()=>creativeAction(w,{revision:0,action:'pause'}),/mudou/);
 const e=act(w,{action:'produce',proposalId:p[0].id,voiceMode:'technical'});act(w,{action:'pause'});assert.equal(w.missions[0].status,'cancelled');
 assert.throws(()=>act(w,{action:'produce',proposalId:p[1].id,voiceMode:'technical'}),/pausada/);
 assert.throws(()=>act(w,{action:'review',experimentId:e.id,decision:'approve',version:'fake',reason:'ok'}));
 const q=act(w,{action:'revise',proposalId:p[0].id,lines:['Uma nova fala.','Outra fala.'],reason:'Mais clara'});assert.equal(q.version,2);assert.notEqual(p[0].script[0],q.script[0]);assert.deepEqual(e.proposal.script,p[0].script);
 assert.equal(creativeState(w).autonomy.publishingEnabled,false);
});
test('persistent creative state uses existing store isolation',async()=>{
 const store=await createStore({file:':memory:'});try{await store.mutate('one',w=>act(w,{action:'propose',theme:'Teste'}));assert.equal((await store.read('one')).workspace.creativeDirector.proposals.length,5);assert.equal((await store.read('two')).workspace.creativeDirector,undefined);}finally{await store.close();}
});
test('motion story has bounded scenes and actual changing geometry',()=>{
 assert.throws(()=>storyConfig({version:1,seconds:18,voiceMode:'technical',lines:['a','b','<bad>']}));assert.notEqual(storyFrame(0),storyFrame(10));assert.notEqual(storyFrame(10),storyFrame(17));
});
test('rejected concepts require justification and failed jobs never expose a finished artifact',()=>{
 const w=initialWorkspace(),p=act(w,{action:'propose',theme:'Teste'}),e=act(w,{action:'produce',proposalId:p[0].id,voiceMode:'technical'});w.missions[0].status='failed';w.missions[0].error='Modelo ausente';
 assert.equal(creativeState(w).experiments[0].status,'failed');assert.equal(creativeState(w).experiments[0].artifact,null);
 e.reviews.push({decision:'reject',reason:'Repetitivo'});const next=act(w,{action:'propose',theme:'Novo'});assert.ok(next.every(p=>p.format!=='comedy'));
 assert.equal(act(w,{action:'propose',theme:'Novo',repeatReason:'Novo roteiro solicitado pelo operador'}).length,5);
});

import {acceptCreativeModelResult} from '../creative-director.mjs';
test('connected-model planning requires consent, validates the entire response atomically, and preserves provenance',()=>{
 const w=initialWorkspace();w.secret={configured:true};
 assert.throws(()=>act(w,{action:'propose-model',theme:'Tema'}),/Autorize/);
 const id=act(w,{action:'propose-model',theme:'Tema',authorizeModelCall:true});const m=w.missions.find(m=>m.id===id);m.status='running';
 assert.throws(()=>acceptCreativeModelResult(w,id,'not json'),/JSON/);assert.equal(w.creativeDirector.proposals.length,0);
 const raw={proposals:['comedy','battle','mystery','champion','hybrid'].map(format=>({format,title:format,concept:'Um conceito original',audience:'Público brasileiro',hypothesis:'Curiosidade pode aumentar interesse',hook:'Veja o detalhe.',rationale:'Teste pequeno sem dados de audiência',primaryMetric:'Conclusão observada',script:format==='mystery'?['Uma porta.','Uma resposta.','Uma luz.']:['Veja o detalhe.','Algo pode mudar.']}))};
 const p=acceptCreativeModelResult(w,id,JSON.stringify(raw));assert.equal(p.length,5);assert.equal(p[0].generator,'CONNECTED_MODEL');assert.ok(p.every(x=>x.evidence==='CREATIVE_HYPOTHESIS'));assert.equal(m.status,'review');
});
import {createRunner} from '../runner.mjs';
import {encryptKey} from '../domain.mjs';
import {configureCosts} from '../ai-costs.mjs';
test('existing runner sends one budgeted planning call and fails closed on malformed model output',async()=>{
 const store=await createStore({file:':memory:'});let calls=0;const runner=createRunner(store,{text:async()=>{calls++;return {output:'malformed',tokens:1};}},{intervalMs:86400000}),token='a'.repeat(64);
 try{
  await store.mutate('test',w=>{w.secret=encryptKey('test-only',token);configureCosts(w,{enabled:true,dailyMinor:1000,monthlyMinor:1000,callMinor:100,taskMinor:500,ceilings:{text:100,research:100,vision:100,image:100}});act(w,{action:'propose-model',theme:'Teste',authorizeModelCall:true});});
  runner.unlock('test',token);await runner.tick();const w=(await store.read('test')).workspace;assert.equal(calls,1);assert.equal(w.missions[0].status,'failed');assert.equal(w.creativeDirector.proposals.length,0);assert.equal(w.aiCosts.entries.length,1);
 }finally{await runner.close();await store.close();}
});
