import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../store.mjs';
import {createRunner} from '../runner.mjs';
import {initialWorkspace,encryptKey,publicWorkspace} from '../domain.mjs';
import {configureCosts} from '../ai-costs.mjs';
import {campaignAction} from '../creative-campaign.mjs';
import {validateScenePlan} from '../creative-plan.mjs';
import {validateCommentaryPlan} from '../visual-commentary.mjs';
import {validateIntent,astraCapabilities,normalizeResearch,contextualResearch} from '../astra-one-line.mjs';
import {validateNarrative,PlanValidationError,applyTargetedRepair} from '../narrative-validation.mjs';
import {ProviderFailure} from '../provider-failures.mjs';
const token='a'.repeat(64);
const intent=(kind='comedy',quantity=1)=>({theme:'Cotidiano',objective:'Entretenimento',audience:'Brasil',language:'pt-BR',tone:kind==='traditional'?'sério':'irônico',genre:kind,references:[],characters:[],complexity:'2D',needsResearch:false,researchQuery:'',seconds:15,quantity,constraints:[],narrativeKind:kind});
const beats={comedy:['hook','situation','twist'],meme:['premise','distortion','reaction'],traditional:['introduction','development','conclusion'],montage:['opening','variation','resolution'],commentary:['explanation','evidence','conclusion']};
const plan=(kind='comedy')=>({version:1,narrativeKind:kind,seconds:15,title:'Teste controlado',premise:'Ensaio técnico local',creativeReview:'Hipótese interna sem aprovação artística',scenes:beats[kind].map((beat,i)=>({seconds:5,goal:'Mudança visual '+i,mechanism:'Contraste',narration:'',title:'Etapa '+i,prompt:'Diagrama abstrato original',visual:'local-diagram',motion:['push-in','pan-left','reveal'][i],annotation:'none',tone:'restrained',beat,transition:'cut'}))});
const output=(kind='comedy',quantity=1)=>({proposals:['Uma reunião decide demitir o relógio','Um elevador exige avaliação de desempenho','O café entrega seu pedido de férias'].map(premise=>({title:premise,premise,reason:'Contraste claro',contrast:'Banal e solene',surprise:'Inversão',timing:'Reação depois do corte',originality:'Premissa ficcional',culturalRelevance:'Escritório brasileiro'})),selectedIndices:[0,1,2].slice(0,quantity),selectionReasons:Array(quantity).fill('Comparação qualitativa, não previsão'),adaptation:'Diagramas abstratos locais; sem atores ou áudio. Limitação declarada.',plans:Array.from({length:quantity},()=>plan(kind))});
const configure=w=>{w.secret=encryptKey('test-only-key',token);configureCosts(w,{enabled:true,dailyMinor:2000,monthlyMinor:2000,callMinor:100,taskMinor:1000,ceilings:{text:100,research:100,vision:100,image:100}});};

test('regression: short comedy rejected by original exact condition is valid without weakening timeline/actions',()=>{
 const scenes=Array.from({length:4},(_,i)=>({start:i*4.5,end:(i+1)*4.5,action:i%2?'gameplay':'performance',camera:'Front',transition:'cut',beat:i===0?'hook':i===3?'payoff':'hook',narration:i<2?0:1}));
 const original=p=>{if(p.scenes[0].beat!=='hook'||p.scenes.at(-1).beat!=='payoff'||!p.scenes.some(s=>s.beat==='development'))throw Error('Faltam começo, desenvolvimento ou conclusão.');};
 const p={version:1,narrativeKind:'comedy',scenes};assert.throws(()=>original(p),/Faltam começo/);
 // Original model had only legacy enum labels. Repair the one mislabelled situation, not the whole script.
 let error;try{validateScenePlan(p,'comedy',['O plano.','A quebra.']);}catch(e){error=e;}
 assert.equal(error.field,'scenes.1.beat');const repaired=applyTargetedRepair(p,error,{field:'scenes.1.beat',value:'situation'});
 assert.equal(validateScenePlan(repaired,'comedy',['O plano.','A quebra.']).scenes.length,4);assert.deepEqual(repaired.scenes[2],p.scenes[2]);
 const short={...repaired,scenes:repaired.scenes.map((s,i)=>({...s,beat:i===3?'twist':s.beat}))};assert.equal(validateScenePlan(short,'comedy',['O plano.','A quebra.']).scenes[3].beat,'twist');
 short.scenes[3].end=19;assert.throws(()=>validateScenePlan(short,'comedy',['a','b']),e=>e.rule==='TIMELINE_DURATION'&&e.field==='scenes.3.end');
 short.scenes[0].action='arbitrary-code';assert.throws(()=>validateScenePlan(short,'comedy',['a','b']),/suportada/);
});
test('narrative grammar respects meme, montage, commentary and traditional arcs; targeted repair rejects unrelated edits',()=>{
 for(const k of Object.keys(beats))assert.equal(validateCommentaryPlan(plan(k)).narrativeKind,k);
 const p=plan('traditional');p.scenes[2].beat='reaction';assert.throws(()=>validateCommentaryPlan(p),e=>e.rule==='NARRATIVE_ENDING');
 const e=new PlanValidationError('NARRATIVE_ENDING','scenes.2.beat','fim');assert.throws(()=>applyTargetedRepair(p,e,{field:'title',value:'overwrite'}),/REPAIR_SCOPE/);
 assert.throws(()=>validateNarrative([{beat:'hook'},{beat:'hook'},{beat:'payoff'}],'comedy'),/PROGRESSION/);
});
test('briefing only creates one-line campaign without requiring voice/format, preserves long input and legacy counts',()=>{
 for(const request of ['Uma ideia.','Uma ideia.\nCom duas linhas.','Ideia '.repeat(600),'Make a serious thriller in English.']){const w=initialWorkspace(),c=campaignAction(w,{action:'start',mode:'astra',request,authorizeModelCall:true});assert.equal(c.targetCount,1);assert.equal(c.voiceMode,'neural');assert.equal(c.state,'Interpreting');assert.equal(c.request,request.trim());}
 const raw=intent();delete raw.language;assert.equal(validateIntent(raw).language,'pt-BR');assert.equal(validateIntent({...intent(),language:'en'}).language,'en');assert.throws(()=>validateIntent({...intent(),quantity:4}),/INVALID/);
 const w=initialWorkspace();assert.throws(()=>campaignAction(w,{action:'start',mode:'astra',request:'Teste',authorizeModelCall:false}),/Autorize/);
});
test('registry does not mistake saved credentials for available remote generation, never exposes keys',()=>{
 const w=initialWorkspace();w.multimodal={connections:{}};w.multimodal.connections.higgsfield={status:'SAVED_NOT_VERIFIED',secret:'private'};assert.deepEqual(astraCapabilities(w).scene.visuals,['local-diagram']);w.multimodal.connections.higgsfield.status='CONNECTED';assert.ok(astraCapabilities(w).scene.visuals.includes('higgsfield-image'));assert.ok(!JSON.stringify(astraCapabilities(w)).includes('private'));assert.equal(astraCapabilities(w).voice.available,false);
});
test('research sources, bounded workspace cache, expiry, absent data and unknown paid errors',async()=>{
 const store=await createStore({file:':memory:'});try{let calls=0;const args={store,id:'a',intent:{...intent(),needsResearch:true,researchQuery:'Referência brasileira'},authorized:true,key:'test',model:'test',signal:new AbortController().signal,checkpoint:async(k,l,i,f)=>f(),budgeted:{research:async()=>{calls++;return {output:'Contexto controlado',searches:1,sources:[{url:'https://example.org/context',title:'Fixture source'}]};}},now:1000};
 assert.equal((await contextualResearch(args)).status,'SOURCED_CONTEXT');assert.equal((await contextualResearch({...args,now:2000})).cacheHit,true);assert.equal(calls,1);
 await contextualResearch({...args,id:'b'});assert.equal(calls,2);await contextualResearch({...args,now:7*3600000});assert.equal(calls,3);
 assert.equal((await contextualResearch({...args,authorized:false})).status,'NOT_AUTHORIZED');assert.equal(normalizeResearch({output:'Alegação sem fonte',sources:[],searches:1}).status,'UNVERIFIED_CONTEXT');assert.equal(normalizeResearch({sources:[{url:'https://key:secret@example.org'}],searches:1}).sources.length,0);
 await assert.rejects(contextualResearch({...args,id:'c',budgeted:{research:async()=>{throw new ProviderFailure('PROVIDER_NETWORK_ERROR',{outcomeUnknown:true});}}}),e=>e.outcomeUnknown);
 }finally{await store.close();}
});
for(const [name,request,kind,needsResearch] of [
 ['A','Crie um vídeo engraçado do velho do Private Property encontrando Neymar em um campinho, falando português brasileiro.','meme',true],
 ['B','Um documentário sério sobre capivaras que controlam o trânsito de São Paulo.','comedy',false],
 ['C','Um homem entra numa estação de metrô abandonada e descobre que o tempo parou.','traditional',false],
 ['D','Faça algo muito engraçado sobre a vida no escritório.','comedy',false]
])test(`controlled planning acceptance ${name}: system orchestration, not real-model artistic proof`,async()=>{
 const store=await createStore({file:':memory:'});let calls=0;const provider={text:async(k,m,rules)=>{calls++;return {output:JSON.stringify(rules.includes('Interprete o briefing')?{...intent(kind),needsResearch,researchQuery:'Referência cultural pública'}:output(kind)),model:'CONTROLLED_TEST',tokens:1};},research:async()=>({output:'Fonte controlada, sem métricas',searches:1,sources:[{url:'https://example.org/fixture',title:'TEST ONLY'}],tokens:1})};const runner=createRunner(store,provider,{intervalMs:86400000});
 try{await store.mutate('a',w=>{configure(w);campaignAction(w,{action:'start',mode:'astra',request,webResearch:true,authorizeModelCall:true});});runner.unlock('a',token);await runner.tick();let w=(await store.read('a')).workspace,c=w.creativeCampaigns[0];assert.equal(c.state,'AwaitingBudget',w.missions[0].error);assert.equal(c.proposals.length,3);assert.equal(c.plans.length,1);assert.equal(c.productionIds.length,0);assert.equal(calls,2);assert.equal(c.intent.narrativeKind,kind);assert.equal(c.research.status,needsResearch?'SOURCED_CONTEXT':'NOT_NEEDED');assert.equal(w.multimodal?.ledger?.length||0,0);
 assert.ok(!JSON.stringify(publicWorkspace(w,'file',false)).includes('test-only-key'));
 await store.mutate('a',w=>campaignAction(w,{action:'authorize-media',id:c.id,revision:c.revision,planVersion:1,maxMicros:0}));w=(await store.read('a')).workspace;assert.equal(w.creativeCampaigns[0].productionIds.length,1);
 }finally{await runner.close();await store.close();}
});
test('multiple videos require per-plan authorization and no model or media call before consent',async()=>{
 const store=await createStore({file:':memory:'});const provider={text:async(k,m,r)=>({output:JSON.stringify(r.includes('Interprete o briefing')?intent('comedy',3):output('comedy',3)),model:'CONTROLLED',tokens:1})},runner=createRunner(store,provider,{intervalMs:86400000});try{
 await store.mutate('a',w=>{configure(w);campaignAction(w,{action:'start',mode:'astra',request:'Produza três vídeos diferentes.',authorizeModelCall:true});});runner.unlock('a',token);await runner.tick();let w=(await store.read('a')).workspace,c=w.creativeCampaigns[0];assert.equal(c.plans?.length,3,w.missions[0].error);assert.equal(c.productionIds.length,0);
 await store.mutate('a',w=>campaignAction(w,{action:'authorize-media',id:c.id,revision:c.revision,planVersion:1,maxMicros:0}));w=(await store.read('a')).workspace;assert.equal(w.creativeCampaigns[0].productionIds.length,3);
 }finally{await runner.close();await store.close();}
});
test('targeted correction changes one beat while keeping all valid plan content',async()=>{
 const store=await createStore({file:':memory:'});let repairs=0;const initial=output();initial.plans[0].scenes[1].beat='hook';const provider={text:async(k,m,r)=>({output:JSON.stringify(r.includes('Interprete o briefing')?intent():r.startsWith('Corrija somente')?(repairs++,{field:'scenes.1.beat',value:'situation'}):initial),model:'CONTROLLED',tokens:1})},runner=createRunner(store,provider,{intervalMs:86400000});try{await store.mutate('a',w=>{configure(w);campaignAction(w,{action:'start',mode:'astra',request:'Humor no escritório.',authorizeModelCall:true});});runner.unlock('a',token);await runner.tick();const w=(await store.read('a')).workspace,c=w.creativeCampaigns[0];assert.equal(c.state,'AwaitingBudget',w.missions[0].error);assert.equal(repairs,1);assert.equal(c.repairs[0].field,'scenes.1.beat');assert.equal(c.plans[0].scenes[0].prompt,initial.plans[0].scenes[0].prompt);}finally{await runner.close();await store.close();}
});

test('unknown planner outcome survives runner restart; completed intent and research are reused without new paid submission',async()=>{
 const store=await createStore({file:':memory:'});let textCalls=0,researchCalls=0;
 const provider={text:async(k,m,r)=>{textCalls++;if(r.includes('Interprete o briefing'))return {output:JSON.stringify({...intent(),needsResearch:true,researchQuery:'Contexto'}),model:'CONTROLLED',tokens:1};throw new ProviderFailure('PROVIDER_NETWORK_ERROR',{submitted:true,outcomeUnknown:true});},research:async()=>{researchCalls++;return {output:'Fonte de teste',searches:1,sources:[{url:'https://example.org/source'}],tokens:1};}};
 let runner=createRunner(store,provider,{intervalMs:86400000});try{
 await store.mutate('a',w=>{configure(w);campaignAction(w,{action:'start',mode:'astra',request:'Humor cultural de teste',webResearch:true,authorizeModelCall:true});});runner.unlock('a',token);await runner.tick();let w=(await store.read('a')).workspace,c=w.creativeCampaigns[0];assert.equal(c.state,'Failed');assert.equal(w.missions[0].execution.checkpoints.length,2);assert.equal(w.missions[0].failure.outcomeUnknown,true);
 await assert.rejects(store.mutate('a',w=>campaignAction(w,{action:'resume',id:c.id,revision:c.revision})),/OUTCOME_UNKNOWN/);assert.equal(textCalls,2);assert.equal(researchCalls,1);
 await runner.close();runner=createRunner(store,{text:async()=>{textCalls++;return {output:JSON.stringify(output()),model:'CONTROLLED',tokens:1};},research:async()=>{researchCalls++;throw Error('Must not repeat');}},{intervalMs:86400000});
 // Explicit test-only consent for the unknown outcome. Never supplied automatically in production.
 await store.mutate('a',w=>campaignAction(w,{action:'resume',id:c.id,revision:c.revision,authorizeUnknown:true}));runner.unlock('a',token);await runner.tick();w=(await store.read('a')).workspace;c=w.creativeCampaigns[0];assert.equal(c.state,'AwaitingBudget',w.missions[0].error);assert.equal(textCalls,3);assert.equal(researchCalls,1);assert.equal(c.recoveryAttempts.length,1);
 }finally{await runner.close();await store.close();}
});
test('budget refusal and provider timeout do not consume creative repair attempts',async()=>{
 for(const budget of [false,true]){const store=await createStore({file:':memory:'});let calls=0;const runner=createRunner(store,{text:async()=>{calls++;throw new ProviderFailure('PROVIDER_TIMEOUT',{outcomeUnknown:true,submitted:true});}},{intervalMs:86400000});try{await store.mutate('a',w=>{configure(w);if(!budget)w.aiCosts.enabled=false;campaignAction(w,{action:'start',mode:'astra',request:'Um vídeo sério',authorizeModelCall:true});});runner.unlock('a',token);await runner.tick();const w=(await store.read('a')).workspace;assert.equal(w.creativeCampaigns[0].state,'Failed');assert.equal(calls,budget?1:0);assert.equal(w.creativeCampaigns[0].repairs,undefined);assert.equal(w.missions[0].failure.code,budget?'PROVIDER_TIMEOUT':'BUDGET_REQUIRED');}finally{await runner.close();await store.close();}}
});
test('end-to-end local MP4 through existing runner, controlled model only, no paid providers or synthetic voice',async()=>{
 const store=await createStore({file:':memory:'}),provider={text:async(k,m,r)=>({output:JSON.stringify(r.includes('Interprete o briefing')?intent():output()),model:'CONTROLLED_TEST_NOT_REAL_ASTRA',tokens:1})},runner=createRunner(store,provider,{intervalMs:86400000});try{
 await store.mutate('local',w=>{configure(w);campaignAction(w,{action:'start',mode:'astra',request:'Faça algo engraçado sobre escritório.',authorizeModelCall:true});});runner.unlock('local',token);await runner.tick();let w=(await store.read('local')).workspace,c=w.creativeCampaigns[0];assert.equal(c.state,'AwaitingBudget');
 await store.mutate('local',w=>campaignAction(w,{action:'authorize-media',id:c.id,revision:c.revision,planVersion:1,maxMicros:0}));await runner.tick();w=(await store.read('local')).workspace;c=w.creativeCampaigns[0];const m=w.missions.find(m=>m.id===c.productionIds[0]);assert.equal(m.status,'review',m.error);assert.equal(c.state,'ReadyForReview',c.error);assert.equal(m.videoReport.audio,false);assert.equal(m.videoReport.technicalStatus,'TECHNICALLY_VALID');assert.equal(c.quality.artistic,'HUMAN_REVIEW_REQUIRED');assert.equal(w.multimodal?.ledger?.length||0,0);
 if(process.env.ASTRA253_EVIDENCE){const {mkdir,writeFile}=await import('node:fs/promises');const dir=process.env.ASTRA253_EVIDENCE;await mkdir(dir,{recursive:true});await writeFile(dir+'/controlled-local-composition.mp4',Buffer.from(m.artifact.base64,'base64'));await writeFile(dir+'/controlled-local-run.json',JSON.stringify({notice:'Controlled model fixtures. Real local renderer/runner MP4; NOT real-model creativity, narration or external generation.',campaignId:c.id,productionId:m.id,events:c.events,plans:c.plans,report:m.videoReport,sha256:c.quality.artifacts[0].sha256},null,2));}
 }finally{await runner.close();await store.close();}
});
