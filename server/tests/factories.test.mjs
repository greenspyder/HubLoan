import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWorkspace, addMission, encryptKey, workspaceId, publicWorkspace } from '../domain.mjs';
import { factories, createFactory, publicFactories, missionFactoryId, factoryById } from '../factories.mjs';
import { createProject, enqueueAssignment } from '../autonomy.mjs';
import { configureCosts } from '../ai-costs.mjs';
import { createStore } from '../store.mjs';
import { createRunner } from '../runner.mjs';
import { createApp } from '../app.mjs';
const token='f'.repeat(64), masterKey='a'.repeat(64), id=workspaceId(token);
const factoryInput={name:'Guias de jardinagem',kind:'text',role:'Ensinar cultivo de hortaliças com etapas verificáveis.',audience:'Hortas urbanas',channel:'Loja própria'};
const projectInput={name:'Teste de guia',goal:'Criar um guia original de horta.',kind:'text',mode:'goal',maxDeliveries:1,maxCalls:15,intervalMinutes:5,research:false,start:false};
const missionInput={agentId:'creator',kind:'text',title:'Guia',brief:'Escrever guia original.'};
test('legacy missions route by format while private preparation is excluded',()=>{
 const w=initialWorkspace();assert.equal(factories(w).length,5);assert.equal(factories(w).length,5);
 const m=addMission(w,missionInput);assert.equal(missionFactoryId(w,m),'factory-text');m.purpose='experiment-preparation';assert.equal(missionFactoryId(w,m),null);
 const f=createFactory(w,factoryInput);assert.equal(factoryById(w,f.id),f);
 assert.throws(()=>createFactory(w,{...factoryInput,name:factoryInput.name.toUpperCase()}),/Já existe/);
 assert.throws(()=>factoryById(initialWorkspace(),f.id),/não encontrada/);
 assert.throws(()=>addMission(w,{...missionInput,kind:'image',factoryId:f.id}),/especialidade/);assert.equal(w.missions.length,1);
});
test('factory ownership follows projects into tasks and unsupported capabilities cannot execute',()=>{
 const w=initialWorkspace(),f=createFactory(w,factoryInput),p=createProject(w,{...projectInput,factoryId:f.id},token,masterKey);
 assert.equal(p.status,'paused');assert.match(p.goal,/hortaliças/);w.secret=encryptKey('sk-test-only',token);
 const m=enqueueAssignment(w,p,missionInput);assert.equal(m.factoryId,f.id);assert.equal(publicWorkspace(w,'sqlite').factories.find(x=>x.id===f.id).projects,1);
 assert.throws(()=>createProject(w,{...projectInput,factoryId:f.id,mode:'discover'},token,masterKey),/descoberta ampla/);
 const future=createFactory(w,{...factoryInput,name:'Vídeo de hortas',kind:'video'});
 assert.throws(()=>createProject(w,{...projectInput,factoryId:future.id,kind:'video'},token,masterKey),/não integradas/);
 assert.ok(publicFactories(w).find(x=>x.id===future.id).blocker);
});
test('financial totals exclude mixed tests and shared discovery, with unknown profit before cost review',()=>{
 const w=initialWorkspace(),m=addMission(w,missionInput);w.autonomy={projects:[{id:'project',factoryId:'factory-text'}]};
 w.aiCosts={entries:[{taskId:m.id,reservedMinor:20},{taskId:'project',reservedMinor:30},{taskId:'broad-discovery',reservedMinor:500}]};
 const e={id:'e',missionIds:[m.id],metrics:{grossMinor:1000,costMinor:200,resultMinor:700,costComplete:true}};
 let f=publicFactories(w,[e])[0];assert.equal(f.reservedMinor,50);assert.equal(f.resultMinor,700);assert.equal(f.grossMinor,1000);
 f=publicFactories(w,[e,{...e,id:'mixed',missionIds:[m.id,'other']}])[0];assert.equal(f.mixedExperiments,1);assert.equal(f.grossMinor,1000);assert.equal(f.resultMinor,null);
 assert.equal(publicFactories(w,[{...e,metrics:{...e.metrics,costComplete:false,resultMinor:null}}])[0].resultMinor,null);assert.equal(publicFactories(w,[])[0].resultMinor,null);
 const repeated=publicFactories(w,[e,{...e,id:'duplicate'}])[0];assert.equal(repeated.grossMinor,0);assert.equal(repeated.resultMinor,null);assert.equal(repeated.mixedExperiments,2);
});
test('runner sends factory responsibilities to coordinator, producer and reviewer',async t=>{
 const store=await createStore({file:':memory:'}),prompts=[];
 const provider={text:async(_key,_model,instructions,prompt)=>{prompts.push(prompt);return {output:instructions.includes('somente JSON')?JSON.stringify({title:'Guia de horta',brief:'Produza o guia completo.'}):'Guia completo de teste',tokens:10};}};
 await store.mutate(id,w=>{w.secret=encryptKey('sk-test-only',token);configureCosts(w,{enabled:true,dailyMinor:10000,monthlyMinor:10000,callMinor:1000,ceilings:{text:10,research:20,vision:20,image:50}});const f=createFactory(w,factoryInput);createProject(w,{...projectInput,start:true,factoryId:f.id},token,masterKey);});
 const runner=createRunner(store,provider,{masterKey,intervalMs:100000});t.after(async()=>{await runner.close();await store.close();});await runner.tick();await runner.tick();
 const w=(await store.read(id)).workspace;assert.equal(w.missions[0].status,'review');assert.equal(w.missions[0].factoryId,w.factories.at(-1).id);assert.equal(prompts.length,4);assert.ok(prompts.every(p=>p.includes('hortaliças')&&p.includes('Hortas urbanas')));
});
test('factory API persists without execution and requires authentication',async t=>{
 const store=await createStore({file:':memory:'}),app=createApp({store,provider:{},masterKey});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await app.close();await store.close();});
 const url=`http://127.0.0.1:${app.server.address().port}/api/agents/factories`;
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(factoryInput)});
 assert.equal(response.status,201);const w=await response.json();assert.equal(w.factories.length,6);assert.equal(w.missions.length,0);assert.equal(w.autonomy.enabled,false);assert.equal((await store.read(id)).workspace.factories.at(-1).name,factoryInput.name);
 assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(factoryInput)})).status,401);
 assert.throws(()=>factoryById(initialWorkspace(),w.factories.at(-1).id),/não encontrada/);
});
