import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNarrative} from '../narrative-validation.mjs';
// The pre-fix execution and exact message are preserved in docs/evidence/astra2531.
const oldValidate=scenes=>{if(!scenes.slice(1,-1).some(s=>['development','situation','escalation','distortion'].includes(s.beat)))throw Error('NARRATIVE_PROGRESSION: Progressão esperada: development, situation, escalation, distortion (scenes.1.beat)');};
test('reproduces original exact error with deterministic old validator',()=>{
 assert.throws(()=>oldValidate([{beat:'hook'},{beat:'hook'},{beat:'setup'},{beat:'payoff'}]),{message:'NARRATIVE_PROGRESSION: Progressão esperada: development, situation, escalation, distortion (scenes.1.beat)'});
});
test('regression: progression diagnoses every intermediate candidate, not an arbitrary scalar',()=>{
 assert.throws(()=>validateNarrative([{beat:'hook'},{beat:'hook'},{beat:'setup'},{beat:'payoff'}],'comedy'),e=>e.field==='scenes'&&JSON.stringify(e.details.candidateIndices)==='[1,2]');
});
import {narrativeContract,PlanValidationError} from '../narrative-validation.mjs';
import {validateWithNarrativeRepair} from '../narrative-repair.mjs';
import {validateCommentaryPlan} from '../visual-commentary.mjs';
import {validateScenePlan} from '../creative-plan.mjs';
import {ProviderFailure} from '../provider-failures.mjs';
const beats={comedy:['hook','situation','punchline'],meme:['premise','distortion','reaction'],traditional:['introduction','development','reveal'],montage:['opening','variation','resolution'],commentary:['explanation','evidence','conclusion']};
const make=(kind='comedy')=>({version:1,narrativeKind:kind,seconds:15,title:'O relógio pede demissão',premise:'Contraste ficcional no escritório',creativeReview:'Hipótese de humor',scenes:beats[kind].map((beat,i)=>({seconds:5,beat,goal:['A equipe exige pontualidade','O relógio entrega uma carta de demissão','A equipe passa a chegar antes de ontem'][i],mechanism:'Inversão de autoridade',narration:'',title:'Etapa '+i,prompt:'Diagrama de relógio e carta no escritório',visual:'local-diagram',motion:['push-in','pan-left','reveal'][i],annotation:'none',tone:'deadpan',transition:'cut'}))});
const response=r=>({output:JSON.stringify(r)});
const repair={mode:'relabel',sceneIndex:1,beat:'situation',evidence:{field:'goal',quote:'O relógio entrega uma carta de demissão'},reason:'A carta transforma a exigência inicial em um conflito concreto.'};
const run=(plan,requestRepair)=>validateWithNarrativeRepair({plan,kind:plan.narrativeKind,validate:validateCommentaryPlan,requestRepair});
for(const kind of Object.keys(beats))test(`shared contract accepts ${kind} with full adapter validation and zero repair calls`,async()=>{
 const p=make(kind),result=await run(p,()=>assert.fail('unnecessary paid call'));
 assert.equal(result.plan.narrativeKind,kind);assert.deepEqual(result.draft,p);assert.ok(narrativeContract(kind).progression.allowed.includes(beats[kind][1]));
});
test('lexical equivalence is repaired locally, never labels a hook by position',async()=>{
 const p=make();p.scenes[1].beat=' Situação ';const r=await run(p,()=>assert.fail('no paid call'));assert.equal(r.plan.scenes[1].beat,'situation');assert.equal(r.repairs[0].source,'LEXICAL_NORMALIZATION');
 p.scenes[1].beat='hook';let calls=0;await assert.rejects(run(p,async()=>{calls++;return response({mode:'unrepairable',reason:'Não há conteúdo suficiente'});}),e=>e.rule==='NARRATIVE_UNREPAIRABLE');assert.equal(calls,1);
});
test('exact failing plan advances after evidence-based relabel; other scenes and fields untouched',async()=>{
 const p=make();p.scenes[1].beat='hook';assert.throws(()=>oldValidate(p.scenes),/NARRATIVE_PROGRESSION/);let calls=0;
 const r=await run(p,async payload=>{calls++;assert.deepEqual(payload.diagnosis.candidateIndices,[1]);assert.deepEqual(payload.contract,narrativeContract('comedy'));return response(repair);});
 assert.equal(calls,1);assert.equal(r.plan.scenes.length,3);const expected=structuredClone(p);expected.scenes[1].beat='situation';assert.deepEqual(r.draft,expected);assert.equal(p.scenes[1].beat,'hook');
});
test('all middle scenes inspected; correct candidate need not be index one',async()=>{
 const p=make();p.seconds=20;p.scenes.splice(1,0,{...p.scenes[0],goal:'Repetição deliberada da premissa'});p.scenes[2].beat='hook';
 const r=await run(p,async payload=>{assert.deepEqual(payload.diagnosis.candidateIndices,[1,2]);return response({...repair,sceneIndex:2});});assert.deepEqual(r.draft.scenes[1],p.scenes[1]);assert.equal(r.draft.scenes[2].beat,'situation');
});
test('genuinely absent progression permits one bounded scene rewrite without changing assets or cost',async()=>{
 const p=make();p.scenes[1]={...p.scenes[0],motion:'pan-left'};
 const r=await run(p,async()=>response({mode:'revise',sceneIndex:1,beat:'situation',changes:{goal:'O relógio entrega uma carta de demissão',title:'Pedido de demissão'},reason:'Insere conflito na cena intermediária usando o diagrama já disponível.'}));
 assert.deepEqual(r.draft.scenes[0],p.scenes[0]);assert.deepEqual(r.draft.scenes[2],p.scenes[2]);for(const k of ['visual','prompt','seconds','motion','narration'])assert.equal(r.draft.scenes[1][k],p.scenes[1][k]);assert.equal(validateCommentaryPlan(r.draft).seconds,15);
});
test('rejects invented evidence, arbitrary budgets/assets, extra narration, wrong candidate and unrepaired output',async()=>{
 const p=make();p.scenes[1].beat='hook';for(const r of [{...repair,evidence:{field:'goal',quote:'Invented justification'}},{...repair,budget:100},{...repair,sceneIndex:0},{mode:'revise',sceneIndex:1,beat:'situation',reason:'Alteração indevida de recursos',changes:{visual:'higgsfield-image'}},{mode:'revise',sceneIndex:1,beat:'situation',reason:'Adiciona voz sem autorização',changes:{narration:'Uma fala paga nova'}},{...repair,beat:'hook'}])await assert.rejects(run(p,async()=>response(r)),e=>e.rule==='REPAIR_SCOPE');
 await assert.rejects(run(p,async()=>({output:'{invalid'})),e=>e.rule==='MODEL_OUTPUT_INVALID');
});
test('full validation after patch rejects illegal timing; does not loop or increase attempts',async()=>{
 const p=make();p.scenes[1].beat='hook';let calls=0;await assert.rejects(validateWithNarrativeRepair({plan:p,kind:'comedy',validate:draft=>{const r=validateCommentaryPlan(draft);throw new PlanValidationError('OTHER_GATE','scenes','Another gate still fails');},requestRepair:async()=>{calls++;return response(repair);}}),e=>e.rule==='OTHER_GATE');assert.equal(calls,1);
});
test('budget failure and unknown paid outcome propagate unchanged, no second call',async()=>{
 const p=make();p.scenes[1].beat='hook';for(const e of [Object.assign(Error('budget'),{budgetBlock:true}),new ProviderFailure('PROVIDER_OUTCOME_UNKNOWN',{outcomeUnknown:true})]){let calls=0;await assert.rejects(run(p,async()=>{calls++;throw e;}),x=>x===e);assert.equal(calls,1);}
});
test('invalid role, missing structure and incompatible 3D narrative kind stay distinct',()=>{
 assert.throws(()=>validateNarrative([{beat:'hook'},{beat:'banana'},{beat:'payoff'}],'comedy'),e=>e.rule==='NARRATIVE_ROLE');
 assert.throws(()=>validateNarrative([{beat:'hook'},{beat:'payoff'}],'comedy'),e=>e.rule==='NARRATIVE_STRUCTURE');
 const p={version:1,narrativeKind:'meme',scenes:['approach','signal','reveal'].map((action,i)=>({start:i*6,end:(i+1)*6,action,camera:'wide',transition:'cut',narration:i,beat:beats.meme[i]}))};assert.throws(()=>validateScenePlan(p,'mystery',['a','b','c']),e=>e.rule==='NARRATIVE_FORMAT');
});

import {createStore} from '../store.mjs';
import {createRunner} from '../runner.mjs';
import {encryptKey} from '../domain.mjs';
import {configureCosts} from '../ai-costs.mjs';
import {campaignAction} from '../creative-campaign.mjs';
import {recordGameplay,detectHighlights,createEditorial} from '../viral-director.mjs';
const request={action:'start',request:'Três vídeos de teste controlado',authorizeModelCall:true,voiceMode:'technical'};
test('legacy campaign: missing progression repaired once and enqueues without regenerating valid proposals',async()=>{
 const store=await createStore({file:':memory:'}),token='a'.repeat(64),events=detectHighlights(recordGameplay({characters:['Lume','Faísca','Jade','Ember']}).frames);
 const proposals=['comedy','battle','mystery','champion','hybrid'].map((format,i)=>({format,title:format,concept:format+' conceito',audience:'Brasil',hypothesis:'Teste interno',hook:'Observe.',rationale:'Comparação interna',primaryMetric:'Conclusão',script:i===2?['Porta distante.','Eco responde.','Luz regressa.']:i===0?['Plano perfeito.','Curva imprevista.']:['Distância diminui.','Espaço muda.']}));
 for(const [i,format] of ['comedy','battle','mystery'].entries()){const count=i===2?3:4,seconds=i===1?25:18;proposals[i].visualPlan={version:1,scenes:Array.from({length:count},(_,j)=>({start:j*seconds/count,end:(j+1)*seconds/count,action:i===2?['approach','signal','reveal'][j]:i===1?j===2?'replay':'event':j%2?'gameplay':'performance',camera:i===2?'wide':'Front',transition:'cut',beat:j===0?'hook':j===count-1?'payoff':'development',narration:i===2?j:j<2?0:1,...(i===1?{eventId:events[0].id}:{})}))};}
 proposals[0].visualPlan.scenes[1].beat='hook';proposals[0].visualPlan.scenes[2].beat='setup';
 let calls=0;
 const output=JSON.stringify({proposals,selection:[0,1,2].map(index=>({index,reason:'Categorias e ações distintas'})),rejected:[3,4].map(index=>({index,reason:'Fora do escopo deste teste'}))});
 const runner=createRunner(store,{text:async(k,m,rules,input)=>{calls++;if(rules.startsWith('Corrija somente')){const p=JSON.parse(input);assert.deepEqual(p.diagnosis.candidateIndices,[1,2]);return {output:JSON.stringify({mode:'relabel',sceneIndex:2,beat:'situation',evidence:{field:'script.1',quote:'Curva imprevista.'},reason:'A curva quebra o plano perfeito e desenvolve a disputa.'}),tokens:1};}assert.ok(JSON.parse(input).narrativeContracts.comedy.progression.allowed.includes('situation'));return {output,model:'controlled-test',tokens:1};}},{intervalMs:86400000});try{
 await store.mutate('a',w=>{w.secret=encryptKey('test-key',token);configureCosts(w,{enabled:true,dailyMinor:1000,monthlyMinor:1000,callMinor:100,taskMinor:500,ceilings:{text:100,research:100,vision:100,image:100}});campaignAction(w,request);});runner.unlock('a',token);await runner.tick();const w=(await store.read('a')).workspace,c=w.creativeCampaigns[0];assert.equal(calls,2);assert.equal(c.attempt,1);assert.equal(c.repairs[0].sceneIndex,2);assert.equal(c.narrativeDiagnostics.at(-1).status,'REPAIR_VALIDATED');assert.equal(c.state,'Rendering',w.missions.find(m=>m.kind==='text').error);assert.equal(c.productionIds.length,3);assert.equal(w.creativeDirector.proposals.length,5);assert.equal(w.missions.filter(m=>m.kind==='video'&&m.status==='queued').length,3);
 const m=w.missions.find(m=>m.liveShort?.format==='battle');assert.equal(createEditorial(m.liveShort,recordGameplay(m.liveShort)).scenes[0].id,'astra-0');
 }finally{await runner.close();await store.close();}
});
import {checkpointCall,digest} from '../execution-checkpoints.mjs';
test('changed repair contract cannot bypass unknown legacy paid operation; completed outputs are reused',async()=>{
 const store=await createStore({file:':memory:'});try{
 let mid;await store.mutate('a',w=>{const c=campaignAction(w,request);mid=c.missionId;const m=w.missions.find(x=>x.id===mid);m.status='running';m.execution={checkpoints:[]};m.externalOperations=[{id:'old-repair',key:'old-contract',state:'UNKNOWN',externalId:'external-job'}];});
 const checkpoint=checkpointCall(store,'a',mid);let calls=0;await assert.rejects(checkpoint('text','Corrigir contrato narrativo',[2],async()=>{calls++;return response({});}),e=>e.code==='PROVIDER_OUTCOME_UNKNOWN');assert.equal(calls,0);
 const result=response({ready:true}),key=digest(['text','completed',[1]]);await store.mutate('a',w=>{w.missions.find(m=>m.id===mid).execution.checkpoints.push({key,result,resultHash:digest(result)});});
 assert.equal((await checkpoint('text','completed',[1],()=>assert.fail('checkpoint replay'))).cached,true);
 }finally{await store.close();}
});
