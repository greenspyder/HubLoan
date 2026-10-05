import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReferences,referenceComparison,productionBottleneck,originalityFingerprint} from '../market-references.mjs';
import {initialWorkspace} from '../domain.mjs';
import {createExperiment,experimentAction,publicExperiments} from '../experiments.mjs';
const now=Date.now(),ref=i=>({marketplace:'Test',seller:`Seller ${i}`,category:'Icons',product:`Pack ${i}`,url:`https://example.com/product/${i}`,observedAt:new Date(now).toISOString(),observedPrice:null,signals:[{kind:'review',value:'Product review fixture',scope:'product',sourceUrl:`https://example.com/product/${i}`}],features:['Editable UI icons'],inference:'Possible demand',hypothesis:'Test original pack',ipRisk:'unknown',opportunity:'Distinct composition'});
test('reference comparison uses distinct sellers and supported signals, rejects fabricated sources/dates',()=>{
 const raw=[0,1,2].map(ref),refs=normalizeReferences(raw,raw);assert.equal(referenceComparison(refs).sufficient,true);assert.equal(refs[0].observedPrice,null);
 assert.equal(referenceComparison(refs.map(r=>({...r,seller:'same'}))).sufficient,false);assert.equal(referenceComparison(refs.map(r=>({...r,signals:[{kind:'favorite'}]}))).sufficient,false);
 assert.throws(()=>normalizeReferences(raw,[raw[0]]),/fora das fontes/);assert.throws(()=>normalizeReferences([{...ref(0),observedAt:'2099-01-01'}],[ref(0)]),/30 dias/);
});
test('reference freeze, production briefing, original version approval and distribution gate',()=>{
 const w=initialWorkspace(),e=createExperiment(w,{name:'Pack',hypothesis:'Original UI',audience:'Creators',channel:'Etsy',budgetMinor:5000,days:7,minSales:1,minNetMinor:1,missionIds:[],salesChannel:{factoryId:'factory-sprites',channel:'etsy'}},now);
 for(const i of [0,1,2])experimentAction(w,e.id,'market-reference',ref(i),now);
 experimentAction(w,e.id,'validation-evidence',{url:ref(0).url,summary:'Demand fixture',observedAt:ref(0).observedAt},now);experimentAction(w,e.id,'validation-offer',{scope:'Four icons',criteria:'Own silhouettes',priceMinor:1000,deliveryDays:2},now);experimentAction(w,e.id,'validation-sample',{kind:'sprites',agentId:'creator',allowImages:true},now);
 const m=w.missions[0];assert.match(m.brief,/Editable UI icons/);m.status='review';m.output='Own sample';experimentAction(w,e.id,'originality-review',{approved:true,reason:'Compared all references; own composition'},now);assert.equal(publicExperiments(w,now)[0].originalityCurrent,true);
 const before=originalityFingerprint(e,m);m.output+=' changed';assert.notEqual(originalityFingerprint(e,m),before);assert.equal(publicExperiments(w,now)[0].originalityCurrent,false);assert.throws(()=>experimentAction(w,e.id,'market-reference',ref(3),now),/congeladas/);assert.ok(productionBottleneck(w,'sprites'));
});
test('experiment budget blocks paid calls before send and completed preparation uses the existing offer',async()=>{
 const {costProvider,configureCosts}=await import('../ai-costs.mjs');const {createOfferPreparation}=await import('../reference-research.mjs');const {encryptKey}=await import('../domain.mjs');
 const token='a'.repeat(64),w=initialWorkspace();w.secret=encryptKey('sk-test-key',token);configureCosts(w,{enabled:true,dailyMinor:1000,monthlyMinor:5000,callMinor:500,ceilings:{text:100,research:200,vision:200,image:300}});
 const e=createExperiment(w,{name:'Gig',hypothesis:'Original thumbnail',audience:'Creators',channel:'Fiverr',budgetMinor:50,days:7,minSales:1,minNetMinor:1,missionIds:[],salesChannel:{factoryId:'factory-thumbnail',channel:'fiverr'}},now);experimentAction(w,e.id,'validation-evidence',{url:'https://example.com/request',summary:'Demand fixture',observedAt:new Date(now).toISOString()},now);experimentAction(w,e.id,'validation-offer',{scope:'Original thumbnail',criteria:'Own composition',priceMinor:1000,deliveryDays:2},now);
 const store={read:async()=>({workspace:structuredClone(w)}),mutate:async(_,op)=>({result:op(w),workspace:structuredClone(w)})};let calls=0;const provider={text:async()=>{calls++;return{output:JSON.stringify({title:'Original thumbnail service',description:'Own composition reviewed by humans',tags:'thumbnail',category:'Design',packages:'Basic: one thumbnail; proposed BRL 10',faq:'No guaranteed CTR',requirements:'Provide video summary'}),tokens:10};}};
 await assert.rejects(()=>costProvider(store,provider,'test',e.id,'creator').text('key','model','rules','input',100),/orçamento do experimento/);assert.equal(calls,0);e.budgetMinor=1000;
 await createOfferPreparation(store,provider)('test',token,e.id,{authorize:true,license:'Own work rights only'});assert.equal(calls,1);assert.equal(w.experiments.length,1);assert.equal(e.marketplace.channel,'fiverr');assert.match(e.marketplace.packages,/Basic/);assert.equal(e.marketplace.publication,undefined);
});
