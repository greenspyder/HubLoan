import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSentinelReview, VISUAL_CRITERIA } from '../sentinel-review.mjs';
import { initialWorkspace, addMission, approveMission } from '../domain.mjs';
import { releaseVersion, approveShopRelease } from '../shop-release.mjs';
const components=[1,2,3,4].map(i=>`sprites/object-${i}.png`);
function assessment(){return {decision:'APPROVE',summary:'Faces superiores coerentes; julgamento visual sem teste no motor.',criteria:VISUAL_CRITERIA.map(id=>({id,status:'PASS',evidence:'Faces superiores, paleta verde e luz superior semelhantes.',components:[],adjustment:''})),objects:components.map(file=>({file,apparentPerspective:'top-down',evidence:'Tampo superior visível sem face frontal dominante.'}))};}
test('perspective failures override optimistic approval and identify only affected sprites',()=>{
 const data=assessment();data.objects[0].apparentPerspective='frontal';data.objects[2].apparentPerspective='3/4';data.criteria[1]={id:'perspective',status:'FAIL',evidence:'Mesa frontal e armário 3/4 contrastam com objetos vistos de cima.',components:[components[0],components[2]],adjustment:'Corrigir para vista de cima.'};
 const r=parseSentinelReview(JSON.stringify(data),components,'TOP_DOWN');assert.equal(r.decision,'REGENERATE_PARTIAL');assert.deepEqual(r.components,[components[0],components[2]]);assert.equal(r.commerciallyReady,null);assert.equal(r.approvedForRelease,false);
});
test('missing, malformed, uncertain and fabricated evidence never approves',()=>{
 assert.equal(parseSentinelReview('Ótimo pack!',components).inconclusive,true);
 for(const modify of [d=>d.criteria.pop(),d=>d.criteria[1].status='UNKNOWN',d=>d.objects[0].apparentPerspective='unknown',d=>d.criteria[0].evidence='',d=>d.criteria[0].components=['not-a-file'],d=>d.objects[0].file='fake.png']){const data=assessment();modify(data);assert.equal(parseSentinelReview(JSON.stringify(data),components).decision,'REJECT');}
 const data=assessment();data.criteria[0]={id:'visual_consistency',status:'FAIL',components,evidence:'Todos têm estilos incompatíveis.',adjustment:'Revisar conjunto.'};assert.equal(parseSentinelReview(JSON.stringify(data),components).decision,'REJECT');
});
test('structured visual approval does not authorize commerce',()=>{const r=parseSentinelReview(JSON.stringify(assessment()),components);assert.equal(r.decision,'APPROVE');assert.equal(r.inconclusive,false);assert.equal(r.approvedForRelease,false);});
test('failed Sentinel requires version-bound human override and preserves legacy approval',()=>{
 const w=initialWorkspace();const m=addMission(w,{title:'Pack',brief:'Top-down',kind:'sprites',agentId:'creator'});m.status='review';m.qualityReview=parseSentinelReview('invalid',components);
 assert.throws(()=>approveMission(w,m.id),/Sentinel/);assert.equal(m.status,'review');assert.throws(()=>approveMission(w,m.id,{override:true,version:'stale',reason:'Reviewed'}),/Sentinel/);assert.throws(()=>approveShopRelease(w,m,{authorize:true,version:releaseVersion(m),priceMinor:2500}),/qualidade/);
 approveMission(w,m.id,{override:true,version:releaseVersion(m),reason:'Revisei os quatro arquivos no motor; perspectiva intencional.'});assert.equal(m.status,'approved');assert.equal(m.reviews[0].decision,'HUMAN_OVERRIDE');assert.equal(m.shopRelease,undefined);
 const old=addMission(w,{title:'Legacy',brief:'Old content',kind:'text',agentId:'creator'});old.status='review';approveMission(w,old.id);assert.equal(old.status,'approved');
});

test('contradictory object descriptions cannot pass perspective even when every criterion says PASS',()=>{
 const d=assessment();d.objects[0].apparentPerspective='frontal';d.objects[2].apparentPerspective='3/4';
 const r=parseSentinelReview(JSON.stringify(d),components,'TOP_DOWN');assert.equal(r.decision,'REGENERATE_PARTIAL');assert.deepEqual(r.components,[components[0],components[2]]);assert.match(r.criteria[1].evidence,/Contradição/);
 assert.equal(parseSentinelReview(JSON.stringify(d),components).decision,'REJECT');
});

test('production review receives actual inventory and saves a structured rejection without discarding the ZIP',async()=>{
 const sharp=(await import('sharp')).default;const {unzipSync}=await import('fflate');const {produceSpecialized}=await import('../asset-production.mjs');
 const sprite=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp({create:{width:400,height:400,channels:4,background:'#88aa66'}}).png().toBuffer(),left:312,top:312}]).png().toBuffer();
 const d=assessment();d.objects[0].apparentPerspective='frontal';
 const result=await produceSpecialized({kind:'sprites',brief:'Top-down props',plan:'Four props',corrections:{},stage:async()=>({output:JSON.stringify({style:'Top-down green',objects:['desk','chair','cabinet','terminal']})}),image:async()=>({base64:sprite.toString('base64')}),phase:async()=>{},vision:async(_instructions,input,images)=>{const context=JSON.parse(input);assert.equal(images.length,4);assert.ok(context.inventory.includes('atlas.png'));assert.ok(context.inventory.includes('README.md'));assert.ok(context.inventory.includes('godot/demo.tscn'));assert.equal(context.technicalChecks.alpha,true);return {output:JSON.stringify(d)};}});
 assert.equal(result.qualityReview.decision,'REGENERATE_PARTIAL');assert.deepEqual(result.qualityReview.components,[components[0]]);
 const files=unzipSync(Buffer.from(result.base64,'base64'));assert.ok(files['quality-review.json']);assert.ok(files['atlas.png']);assert.equal(JSON.parse(Buffer.from(files['manifest.json']).toString()).qualityReview.decision,'REGENERATE_PARTIAL');
});
