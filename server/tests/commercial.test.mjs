import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspace} from '../domain.mjs';
import {createExperiment,experimentAction,publicExperiments} from '../experiments.mjs';
import {commercialLearning} from '../learning.mjs';
import {costProvider,configureCosts} from '../ai-costs.mjs';
import {createProvider} from '../provider.mjs';
const now=Date.now();
function setup(w=initialWorkspace()){
 const e=createExperiment(w,{name:'Thumbnail',hypothesis:'Uma hipótese',audience:'Creators',channel:'Fiverr',budgetMinor:5000,days:7,minSales:1,minNetMinor:1,missionIds:[]},now);
 const action=(name,input)=>experimentAction(w,e.id,name,input,now);
 action('validation-enable',{});action('validation-evidence',{url:'https://example.com/request',summary:'Pedido público observado',observedAt:new Date(now).toISOString()});action('validation-offer',{scope:'Uma thumbnail original',criteria:'Legibilidade',priceMinor:1000,deliveryDays:3});
 action('marketplace-offer',{factoryId:'factory-thumbnail',channel:'fiverr',title:'Thumbnail original',description:'Oferta',tags:'creator',license:'Direitos próprios'});
 return {w,e,action};
}
const report={listing:'https://www.fiverr.com/owner/gig',reference:'Extrato sem dados pessoais',period:'Janela do experimento; BRL',grossMinor:1000,refundedMinor:100,sales:1,visits:null};
test('external snapshots never become verified Stripe payments, replacement invalidates review and preserves unknown values',()=>{
 const {w,e,action}=setup();action('marketplace-results',report);
 let p=publicExperiments(w)[0];assert.equal(p.metrics.grossMinor,0);assert.equal(p.marketplaceMetrics.resultMinor,null);assert.equal(p.marketplaceMetrics.visits,null);assert.equal(p.marketplaceMetrics.conversion,null);
 action('cost',{category:'fees',amountMinor:200,note:'Taxas efetivas'});action('review',{complete:true});p=publicExperiments(w)[0];assert.equal(p.marketplaceMetrics.resultMinor,700);
 action('marketplace-results',{...report,grossMinor:2000});p=publicExperiments(w)[0];assert.equal(p.marketplaceMetrics.grossMinor,2000);assert.equal(p.marketplaceMetrics.resultMinor,null);assert.equal(e.marketplace.history.length,1);
 assert.equal(commercialLearning(w).experiments[0].paymentOrigin,'owner-declared-not-api-verified');
 const other=setup(w);assert.throws(()=>other.action('marketplace-results',report),/duplicar/);assert.throws(()=>action('marketplace-results',{...report,listing:'https://fiverr.com.evil.example/x'}),/HTTPS/);assert.throws(()=>action('marketplace-results',{...report,refundedMinor:2000}),/Reembolso/);
});
test('cost routing uses configured principal only for economic coordination and keeps reservations and usage distinct',async()=>{
 const w={settings:{workerModel:'gpt-5.6-luna',decisionModel:'gpt-6-astra'}};configureCosts(w,{enabled:true,dailyMinor:100,monthlyMinor:100,callMinor:50,ceilings:{text:10,research:10,vision:10,image:10}});
 const store={mutate:async(_,fn)=>({result:fn(w)})};const seen=[];const provider={text:async(_,model)=>{seen.push(model);return {output:'ok',tokens:1100,usage:{input_tokens:1000,output_tokens:100}};}};
 await costProvider(store,provider,'w','a','creator').text('key','ignored','rules','input',100);
 await costProvider(store,provider,'w','b','coordinator').text('key','ignored','rules','input',100);
 assert.deepEqual(seen,['gpt-5.6-luna','gpt-6-astra']);assert.equal(w.aiCosts.entries[1].estimatedTextUsd,0.015);assert.equal(w.aiCosts.entries[1].reservedMinor,10);
});
test('reasoning request preserves policy and bounded output while worker disables unnecessary reasoning',async()=>{
 const bodies=[];const p=createProvider(async(_,options)=>{bodies.push(JSON.parse(options.body));return new Response(JSON.stringify({model:'gpt-6-astra',output:[{content:[{type:'output_text',text:'ok'}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}));});
 await p.text('key','gpt-6-astra','rules','input',900);await p.text('key','gpt-5.6-luna','rules','input',900);
 assert.equal(bodies[0].max_output_tokens,4000);assert.equal(bodies[0].reasoning.effort,'medium');assert.equal(bodies[1].reasoning.effort,'none');assert.match(bodies[0].instructions,/Fiverr/);
});
