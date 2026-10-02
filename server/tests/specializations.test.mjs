import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { unzipSync, strFromU8 } from 'fflate';
import { thumbnailFiles, normalizeSprite, produceSpecialized } from '../asset-production.mjs';
import { parseFurniture, buildFurniture } from '../furniture.mjs';
import { marketSettings } from '../market.mjs';
import { createApp } from '../app.mjs';
import { createStore } from '../store.mjs';
import { createProject } from '../autonomy.mjs';
import { workspaceId, encryptKey } from '../domain.mjs';
const furniture={title:'Mesa original de teste',materials:[{name:'Madeira',color:'#885533',pattern:'wood'}],parts:[{size:[1.2,.08,.8],position:[0,.75,0],material:0}, ...[-.5,.5].flatMap(x=>[-.3,.3].map(z=>({size:[.07,.71,.07],position:[x,.355,z],material:0})))]};
async function sprite(){return sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp({create:{width:400,height:400,channels:4,background:'#88aa66'}}).png().toBuffer(),left:312,top:312}]).png().toBuffer();}
test('thumbnail delivers exact 16:9 variants, JPEG size cap and editable escaped text',async()=>{
 const png=await sharp({create:{width:1536,height:1024,channels:3,background:'#334455'}}).png().toBuffer();
 const result=await thumbnailFiles(png.toString('base64'),['Título <seguro> & útil','Outra variante']);
 for(let i=1;i<=2;i++){const meta=await sharp(result.files[`thumbnail-${i}.png`]).metadata();assert.equal(meta.width,1280);assert.equal(meta.height,720);assert.ok(result.files[`thumbnail-${i}.jpg`].length<2000000);}
 assert.match(result.files['editable-overlay-1.svg'].toString(),/&lt;seguro&gt; &amp;/);
 await assert.rejects(()=>thumbnailFiles(png.toString('base64'),['x']),/dois/);
});
test('2D rejects fake transparency and produces four assets, atlas and Godot scene',async()=>{
 const png=await sprite();assert.equal((await sharp(await normalizeSprite(png.toString('base64'))).metadata()).width,512);
 const opaque=await sharp({create:{width:512,height:512,channels:4,background:'#ffffff'}}).png().toBuffer();
 await assert.rejects(()=>normalizeSprite(opaque.toString('base64')),/transparente/);
 const result=await produceSpecialized({kind:'sprites',brief:'Quatro móveis',plan:'Estilo comum',phase:async()=>{},stage:async()=>({output:JSON.stringify({style:'Cartoon verde e cinza visto de cima',objects:['mesa','cadeira','armário','terminal']})}),image:async(_prompt,options)=>{assert.equal(options.background,'transparent');return{base64:png.toString('base64')};},vision:async()=>({output:'Revisão simulada, sem teste no motor.'})});
 const files=unzipSync(Buffer.from(result.base64,'base64'));assert.ok(files['sprites/object-4.png']);assert.ok(files['godot/demo.tscn']);
 const meta=await sharp(files['atlas.png']).metadata();assert.equal(meta.width,1024);assert.equal(meta.height,1024);
 assert.equal(JSON.parse(strFromU8(files['manifest.json'])).checks.count,4);
});
test('3D generates valid embedded GLB, actual geometry/UV/materials and bounded specification',async()=>{
 const spec=parseFurniture(JSON.stringify(furniture));const result=await buildFurniture(spec);
 assert.equal(result.report.issues.numErrors,0);assert.equal(result.triangles,60);
 assert.equal(result.files['model.glb'].readUInt32LE(),0x46546c67);
 const obj=result.files['model.obj'].toString();assert.equal(obj.match(/^v /gm).length,120);assert.equal(obj.match(/^vt /gm).length,120);assert.equal(obj.match(/^f /gm).length,30);
 assert.ok(result.files['textures/material-1.png']);
 assert.throws(()=>parseFurniture(JSON.stringify({...furniture,parts:[{...furniture.parts[0],size:[0,1,1]}]})),/Dimensões/);
 assert.throws(()=>marketSettings({specializations:['arbitrary']}),/especializações/);
});
test('specialized research covers each enabled channel, reserves calls, produces protected ZIP/preview',async t=>{
 const token='c'.repeat(64),other='d'.repeat(64),master='f'.repeat(64),id=workspaceId(token),store=await createStore({file:':memory:'});let calls=0;const researched=[];
 const sources=[{url:'https://example.com/asset',title:'Fonte simulada'},{url:'https://example.org/asset',title:'Outra fonte simulada'}];
 const provider={research:async(_k,_m,q)=>{calls++;researched.push(JSON.parse(q).specialization);return{output:'Pesquisa simulada',sources,tokens:20,searches:1};},text:async(_k,_m,instructions,input)=>{calls++;if(instructions.includes('candidates:')){assert.deepEqual(JSON.parse(input).allowedKinds,['thumbnail','sprites','model3d']);return{output:JSON.stringify({candidates:[0,1,2].map(i=>({title:`Mesa ${i}`,audience:'Desenvolvedores',kind:'model3d',rationale:'Hipótese',uncertainty:'Sem vendas verificadas',test:'Publicar manualmente',scores:{demand:4,competition:3,feasibility:4,distribution:3,evidence:3},sourceUrls:[sources[0].url]}))}),tokens:20};}return{output:instructions.includes('parts')?JSON.stringify(furniture):instructions.includes('somente JSON')?JSON.stringify({title:'Mesa',brief:'Criar mesa original'}):'Plano de teste',tokens:20};}};
 const app=createApp({store,provider,masterKey:master});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await app.close();await store.close();});
 await store.mutate(id,w=>{w.secret=encryptKey('sk-not-real',token);createProject(w,{mode:'discover',kind:'text',market:{specializations:['thumbnail','sprites','model3d'],allowImages:true},maxDeliveries:1,maxCalls:12,intervalMinutes:1,research:true,start:true},token,master);});
 await app.runner.tick();await app.runner.tick();const w=(await store.read(id)).workspace;
 assert.deepEqual(researched,['thumbnail','sprites','model3d']);assert.equal(w.autonomy.projects[0].calls,7);assert.equal(calls,7);assert.equal(w.missions[0].status,'review');
 const base=`http://127.0.0.1:${app.server.address().port}/api/agents`,get=(path,access=token)=>fetch(base+path,{headers:{Authorization:`Bearer ${access}`}});
 const publicW=await(await get('/workspace')).json();assert.equal(publicW.missions[0].artifact,undefined);assert.equal(publicW.missions[0].hasPreview,true);
 const mission=w.missions[0].id;assert.equal((await get(`/missions/${mission}/artifact`,other)).status,404);assert.equal((await get(`/missions/${mission}/preview`,other)).status,404);
 const zip=await get(`/missions/${mission}/artifact`);assert.equal(zip.headers.get('content-type'),'application/zip');assert.ok(unzipSync(new Uint8Array(await zip.arrayBuffer()))['model.glb']);
 assert.equal((await get(`/missions/${mission}/preview`)).headers.get('content-type'),'image/png');
});
