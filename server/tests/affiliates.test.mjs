import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { createRunner } from '../runner.mjs';
import { workspaceId, publicWorkspace, queueMission, initialWorkspace } from '../domain.mjs';
import { affiliateAction, publicAffiliates } from '../affiliates.mjs';
import { normalizeVideoImages } from '../video-production.mjs';
import { projectAction } from '../autonomy.mjs';
import { approveShopRelease } from '../shop-release.mjs';
const token='a'.repeat(64), now=()=>new Date().toISOString();
const account={handle:'example_test',program:'external',authorized:true,evidence:'https://example.com/program',conditions:'Synthetic test account; permitted promotion',observedAt:now()};
const product=accountId=>({accountId,name:'Produto sintético de teste',seller:'Fornecedor de teste',platform:'Programa externo de teste',externalId:'test-001',officialUrl:'https://example.com/product',affiliateUrl:'https://example.com/ref/test',priceMinor:1990,currency:'BRL',commissionType:'percent',commissionValue:1000,commissionSource:'https://example.com/terms',conditions:'Test fixture only; no real commission',rights:'Original test fixture created for automated testing',rightsSource:'https://example.com/test-license',audience:'Testers',hypothesis:'Unproven hypothesis',observedAt:now(),verified:true,available:true});
const provider=new Proxy({}, {get:()=>()=>{throw Error('No paid/external calls allowed');}});
async function image(){return (await sharp({create:{width:400,height:400,channels:3,background:'#397b94'}}).png().toBuffer()).toString('base64');}
async function fixture(t){
 const store=await createStore({file:':memory:'}),app=createApp({store,provider});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const runner=createRunner(store,provider,{intervalMs:3600000});
 t.after(async()=>{await runner.close();await app.close();await store.close();});
 async function req(path,body,access=token){const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/agents${path}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 return {store,app,runner,req};
}
test('affiliate campaign renders and prepares third-party publication with NO shop, Stripe or AI key',async t=>{
 const {store,runner,req}=await fixture(t);
 let r=await req('/affiliates/project',{budgetMinor:0});assert.equal(r.status,200);const projectId=r.data.autonomy.projects[0].id;
 r=await req('/affiliates/account',account);assert.equal(r.status,200);const accountId=r.data.affiliates.accounts[0].id;
 r=await req('/affiliates/product',product(accountId));assert.equal(r.status,200);const productId=r.data.affiliates.products[0].id;
 r=await req('/affiliates/campaign',{projectId,productId,brief:'Conheça o produto de teste.\nConfira as condições do fornecedor.',caption:'#publi · Link afiliado de teste.',claimsReviewed:true,images:[await image()]});
 assert.equal(r.status,200,JSON.stringify(r.data));const c=r.data.affiliates.campaigns[0],missionId=c.missionId;
 assert.equal(r.data.settings.configured,false);assert.equal(r.data.missions[0].videoImages,undefined);assert.equal(r.data.missions[0].videoImageCount,1);
 assert.equal((await req('/affiliates/authorize',{campaignId:c.id,version:c.version,authorize:true,disclosure:true,claimsReviewed:true})).status,409);
 assert.equal((await req('/affiliates/campaign',{projectId,productId,brief:'Outra cena.\nNova cena.',caption:'#publi',claimsReviewed:true,images:[await image()]})).status,409);
 runner.unlock(workspaceId(token),token);await runner.tick();
 r=await req('/workspace');let m=r.data.missions[0];assert.equal(m.status,'review',m.error);assert.equal(m.artifactMime,'video/mp4');assert.equal(m.publication,undefined);
 const internal=(await store.read(workspaceId(token))).workspace;
 assert.equal(internal.shop?.secret,undefined);assert.equal(internal.missions[0].videoReport.providerCalls,0);assert.equal(internal.missions[0].videoReport.infrastructureCost,'UNKNOWN');
 assert.throws(()=>approveShopRelease(internal,internal.missions[0],{}));
 assert.equal((await req(`/missions/${missionId}/approve`,{})).status,200);
 r=await req('/workspace');let version=r.data.affiliates.campaigns[0].version;
 const consent={campaignId:c.id,version,authorize:true,disclosure:true,claimsReviewed:true};
 assert.equal((await req('/affiliates/authorize',{...consent,version:'stale'})).status,409);
 r=await req('/affiliates/authorize',consent);assert.equal(r.status,200);assert.equal(r.data.affiliates.campaigns[0].authorizationCurrent,true);
 // Correct the SAME task; archive previous paid/produced material and invalidate approval.
 r=await req('/affiliates/revise',{campaignId:c.id,version,brief:'Descrição corrigida do teste.\nConfira as condições do fornecedor.',caption:'#publi · Condições corrigidas.',feedback:'Corrigir afirmação do primeiro quadro',claimsReviewed:true});
 assert.equal(r.status,200);assert.equal(r.data.missions[0].reviewVersions.length,1);assert.equal(r.data.affiliates.campaigns[0].authorizationCurrent,false);
 await runner.tick();r=await req('/workspace');assert.equal(r.data.missions[0].status,'review');
 await req(`/missions/${missionId}/approve`,{});r=await req('/workspace');version=r.data.affiliates.campaigns[0].version;
 await req('/affiliates/authorize',{...consent,version});
 assert.equal((await req('/affiliates/published',{campaignId:c.id,url:'https://www.tiktok.com/@wrong/video/123'})).status,400);
 r=await req('/affiliates/published',{campaignId:c.id,url:'https://www.tiktok.com/@example_test/video/123'});assert.equal(r.status,200);assert.match(r.data.affiliates.campaigns[0].publication.origin,/OWNER_REPORTED/);
 r=await req('/affiliates/report',{campaignId:c.id,views:0,clicks:null,orders:0,estimatedMinor:100,approvedMinor:null,receivedMinor:null,observedAt:now(),source:'https://example.com/report',note:'Synthetic cumulative test snapshot'});
 assert.equal(r.status,200);assert.equal(r.data.affiliates.campaigns[0].latest.receivedMinor,null);assert.equal(r.data.affiliates.campaigns[0].netMinor,null);
 r=await req('/affiliates/report',{campaignId:c.id,views:2,orders:0,observedAt:now(),source:'https://example.com/report',note:'Replacement snapshot, not additional sales'});
 assert.equal(r.data.affiliates.campaigns[0].latest.views,2);assert.equal(r.data.affiliates.campaigns[0].latest.estimatedMinor,null);
 assert.equal((await req('/workspace',undefined,'b'.repeat(64))).data.affiliates.campaigns.length,0);
 assert.equal((await req('/affiliates/authorize',consent,'b'.repeat(64))).status,404);
 assert.equal((await req('/affiliates/revise',{campaignId:c.id,version,claimsReviewed:true})).status,409);
});
test('affiliate evidence, zero paid budget and input bounds fail closed; legacy projections survive',async()=>{
 const w=initialWorkspace();assert.deepEqual(publicAffiliates(w).campaigns,[]);assert.doesNotThrow(()=>publicWorkspace(w,'sqlite'));
 affiliateAction(w,'project',{budgetMinor:0});const p=w.autonomy.projects[0];
 assert.equal(p.budgetMinor,0);assert.throws(()=>projectAction(w,p.id,'resume',token,token),/jornada/);
 assert.throws(()=>affiliateAction(w,'project',{budgetMinor:100}),/R\$ 0/);
 assert.throws(()=>affiliateAction(w,'account',{...account,authorized:false}));
 assert.throws(()=>affiliateAction(w,'account',{...account,evidence:'javascript:alert(1)'}));
 affiliateAction(w,'account',account);const id=w.affiliates.accounts[0].id;
 assert.throws(()=>affiliateAction(w,'product',{...product(id),commissionValue:0}),/comissão/);
 assert.throws(()=>affiliateAction(w,'product',{...product(id),observedAt:'2020-01-01'}),/30 dias/);
 assert.throws(()=>affiliateAction(w,'product',{...product(id),affiliateUrl:'https://user:secret@example.com'}),/credenciais/);
 await assert.rejects(normalizeVideoImages([]));await assert.rejects(normalizeVideoImages(['not an image']));
 await assert.rejects(normalizeVideoImages([Buffer.from('<svg/>').toString('base64')]));
 await assert.rejects(normalizeVideoImages(['a'.repeat(3500001)]));
});
test('failed affiliate render resumes same checkpoints without discarding images or history',async t=>{
 const store=await createStore({file:':memory:'}),runner=createRunner(store,provider,{intervalMs:3600000});t.after(async()=>{await runner.close();await store.close();});
 const images=await normalizeVideoImages([await image()]);
 await store.mutate('resume',w=>{affiliateAction(w,'project',{budgetMinor:0});affiliateAction(w,'account',account);affiliateAction(w,'product',product(w.affiliates.accounts[0].id));affiliateAction(w,'campaign',{projectId:w.autonomy.projects[0].id,productId:w.affiliates.products[0].id,brief:'Cena inicial de teste.\nConfira a fonte.',caption:'#publi teste',claimsReviewed:true,images});});
 runner.unlock('resume',token);await runner.tick();const before=(await store.read('resume')).workspace.missions[0];assert.equal(before.status,'review');
 await store.mutate('resume',w=>{w.missions[0].status='failed';queueMission(w,w.missions[0].id);});await runner.tick();
 const after=(await store.read('resume')).workspace.missions[0];assert.equal(after.artifact.base64,before.artifact.base64);assert.equal(after.execution.checkpoints.length,before.execution.checkpoints.length);assert.equal(after.attempts.length,1);assert.deepEqual(after.videoImages,before.videoImages);
});
