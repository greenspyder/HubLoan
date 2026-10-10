import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWorkspace, addMission } from '../domain.mjs';
import { createProject, projectAction } from '../autonomy.mjs';
import { configureCosts, preflightCosts, projectCostScope } from '../ai-costs.mjs';
import { createExperiment, experimentAction } from '../experiments.mjs';
import { itchReadiness, recordItchReadiness } from '../itch-readiness.mjs';
import { authorizeItchRelease, itchReleaseCurrent } from '../itch-release.mjs';
import { releaseVersion } from '../shop-release.mjs';
import { firstSaleSummary } from '../first-sale.mjs';
const input={name:'Primeira Venda Autônoma',goal:'Primeira venda independente',firstSale:true,budgetMinor:100,kind:'text',maxDeliveries:1,intervalMinutes:5,research:true,start:false,maxCalls:12};
function setup(){const w=initialWorkspace();configureCosts(w,{enabled:true,dailyMinor:10000,monthlyMinor:10000,taskMinor:10000,callMinor:100,ceilings:{text:20,research:20,vision:20,image:20}});const p=createProject(w,input);return{w,p};}
test('project budget covers planning, linked experiment calls, missions, retries and uncertain charges',()=>{
 const {w,p}=setup();const e=createExperiment(w,{projectId:p.id,name:'Teste',hypothesis:'Hipótese',audience:'Devs',channel:'itch.io',budgetMinor:100,days:7,minSales:1,minNetMinor:1,missionIds:[]});
 const m=addMission(w,{title:'Amostra',brief:'Conteúdo de teste',kind:'text',agentId:'creator'});m.projectId=p.id;e.missionIds.push(m.id);
 const at=new Date().toISOString();w.aiCosts.entries=[{taskId:p.id,at,status:'completed',confirmedMinor:30,reservedMinor:30},{taskId:e.id,at,status:'uncertain',reservedMinor:30},{taskId:m.id,at,status:'pending',reservedMinor:30},{taskId:m.id,at,status:'not_sent',reservedMinor:99}];
 assert.equal(projectCostScope(w,p.id).exposureMinor,90);
 for(const id of [p.id,e.id,m.id])assert.throws(()=>preflightCosts(w,id,['text']),err=>err.budgetBlock?.dimension==='project'&&err.budgetBlock.sent===false&&err.budgetBlock.requiredMinor===20);
 w.aiCosts.entries[2].status='not_sent';assert.equal(preflightCosts(w,m.id,['text']).requiredMinor,20);
 e.costs.push({amountMinor:25});assert.throws(()=>preflightCosts(w,p.id,['text']),/projeto/);
});
test('legacy projects remain readable, invalid budgets rejected and discovery cannot blindly rerun',()=>{
 const {w,p}=setup();assert.throws(()=>createProject(w,{...input,budgetMinor:0}),/teto/);assert.throws(()=>createProject(w,{...input,budgetMinor:undefined}),/teto/);
 const legacy=createProject(w,{...input,firstSale:false,budgetMinor:undefined});assert.equal(firstSaleSummary(w,legacy).budgetMinor,null);
 p.decisions.push({selected:null});assert.throws(()=>projectAction(w,p.id,'resume'),/pesquisa paga/);
 assert.throws(()=>createExperiment(w,{projectId:'foreign',name:'X',hypothesis:'X',audience:'X',channel:'itch',budgetMinor:1,days:1,minSales:1,minNetMinor:0,missionIds:[]}),/Projeto não encontrado/);
});
test('itch readiness cannot be inferred from API, Stripe live, tax interview or historical revenue',()=>{
 const {w,p}=setup();w.commerce={secret:'encrypted',games:[{published:true,purchases:5,earnings:[{currency:'USD',grossMinor:1000}]}]};w.shop={livemode:true};
 assert.equal(itchReadiness(w).paymentReadiness,'needs-check');const checks={seller:'confirmed',taxInterview:'confirmed',taxApproval:'pending',payoutDestination:'unknown',acceptsPayments:'unknown'};
 recordItchReadiness(w,{checks,note:'Entrevista concluída; restantes não conferidos'});assert.equal(itchReadiness(w).paymentReadiness,'needs-check');
 checks.acceptsPayments='confirmed';recordItchReadiness(w,{checks,note:'Painel indica aceitar pagamentos'});w.shop.livemode=false;
 assert.equal(itchReadiness(w).paymentReadiness,'owner-reported-ready');assert.equal(itchReadiness(w).apiVerifiedPayments,false);assert.equal(firstSaleSummary(w,p).netProfitMinor,null);
 assert.equal(itchReadiness(w,Date.now()+31*86400000).paymentReadiness,'needs-check');
});
test('itch authorization binds approved bytes, target, license, price and expiry; review is never enough',()=>{
 const {w}=setup();w.commerce={secret:'encrypted',license:'Seller license',targets:{sprites:{id:7,url:'https://seller.itch.io/pack'}}};
 const m=addMission(w,{title:'Pack',brief:'Test pack',kind:'sprites',agentId:'creator'});m.artifact={mime:'application/zip',base64:'fixture'};m.status='review';
 const authorize=()=>authorizeItchRelease(w,m,{authorize:true,version:releaseVersion(m),priceMinor:500,currency:'USD',rationale:'Observed comparable; uncertain demand'});
 assert.throws(authorize,/qualidade/);m.status='approved';authorize();assert.equal(itchReleaseCurrent(w,m),true);
 m.artifact.base64='changed';assert.equal(itchReleaseCurrent(w,m),false);authorize();w.commerce.license='new';assert.equal(itchReleaseCurrent(w,m),false);authorize();w.commerce.targets.sprites.id=8;assert.equal(itchReleaseCurrent(w,m),false);authorize();assert.equal(itchReleaseCurrent(w,m,Date.now()+73*3600000),false);
});

test('project linkage survives first-sale sample creation and keeps evidence provenance without paid production',()=>{
 const {w,p}=setup();p.decisions=[{selected:{marketReferences:[{id:'r',origin:'provider-inference-with-sources'}],marketComparison:{sufficient:false}}}];
 const e=createExperiment(w,{projectId:p.id,name:'Pack',hypothesis:'Testar utilidade',audience:'Devs',channel:'itch.io',budgetMinor:100,days:7,minSales:1,minNetMinor:1,missionIds:[],salesChannel:{factoryId:'factory-sprites',channel:'itchio'}});
 assert.equal(e.marketReferences[0].origin,'provider-inference-with-sources');assert.notEqual(e.marketReferences,p.decisions[0].selected.marketReferences);
 // Reference fixture above is intentionally minimal; sample uses the real reference validator separately.
 e.marketReferences=[];
 experimentAction(w,e.id,'validation-evidence',{url:'https://example.org/request',summary:'Observed fixture request, not sale',observedAt:new Date().toISOString()});
 experimentAction(w,e.id,'validation-offer',{scope:'Original pack',criteria:'Consistent perspective',priceMinor:500,deliveryDays:2});
 experimentAction(w,e.id,'validation-sample',{kind:'sprites',agentId:'creator',allowImages:true});
 const m=w.missions[0];assert.equal(m.projectId,p.id);assert.equal(m.status,'draft');assert.equal(m.images,0);assert.equal(e.validation.evidence.origin,'owner-reported-not-independently-verified');
 assert.equal(firstSaleSummary(w,p).experimentIds[0],e.id);
});

test('concurrent paid calls cannot both consume the remaining project exposure',async t=>{
 const {createStore}=await import('../store.mjs');const {costProvider}=await import('../ai-costs.mjs');
 const store=await createStore({file:':memory:'});t.after(()=>store.close());let projectId;
 await store.mutate('budget-concurrent',w=>{configureCosts(w,{enabled:true,dailyMinor:1000,monthlyMinor:1000,taskMinor:1000,callMinor:100,ceilings:{text:20,research:20,vision:20,image:20}});projectId=createProject(w,{...input,budgetMinor:30}).id;});
 let sent=0;const provider=costProvider(store,{image:async()=>{sent++;return{output:'fixture'};}},'budget-concurrent',projectId,'creator');
 const results=await Promise.allSettled([provider.image('mock','mock','one'),provider.image('mock','mock','two')]);
 assert.equal(sent,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(projectCostScope((await store.read('budget-concurrent')).workspace,projectId).exposureMinor,20);
});
