import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { unzipSync } from 'fflate';
import { createStore } from '../store.mjs';
import { createRunner } from '../runner.mjs';
import { initialWorkspace, addMission, queueMission, encryptKey, publicWorkspace, reviewMission as reviewWithVersion } from '../domain.mjs';
import { configureCosts, preflightCosts, publicCosts, costProvider } from '../ai-costs.mjs';
import { releaseVersion } from '../shop-release.mjs';
function reviewMission(w,id,body){return reviewWithVersion(w,id,{...body,version:releaseVersion(w.missions.find(m=>m.id===id))});}
const limits={enabled:true,dailyMinor:10000,monthlyMinor:20000,callMinor:100,taskMinor:10000,ceilings:{text:10,research:20,vision:20,image:100}};
const token='a'.repeat(64);

test('preflight identifies the limiting dimension and never pretends reservations are paid costs',async()=>{
 const w=initialWorkspace();configureCosts(w,{...limits,taskMinor:400});
 assert.throws(()=>preflightCosts(w,'m',['text','text','image','image','image','image','vision']),error=>error.budgetBlock.dimension==='task' && error.budgetBlock.requiredMinor===440 && error.budgetBlock.sent===false);
 assert.throws(()=>configureCosts(w,{...limits,callMinor:50}),error=>error.budgetBlock.dimension==='call');
 configureCosts(w,limits);
 const store={mutate:async(_id,fn)=>({result:fn(w)})};let calls=0;
 const p=costProvider(store,{text:async()=>{calls++;return{output:'paid response',tokens:2};}},'w','m','creator',{beforeSend:()=>{throw Error('project limit');}});
 await assert.rejects(()=>p.text('key','model','rules','input',10),/project limit/);
 assert.equal(calls,0);assert.equal(w.aiCosts.entries[0].status,'not_sent');assert.equal(w.aiCosts.entries[0].sentAt,null);assert.equal(publicCosts(w).dayMinor,0);
 const q=costProvider(store,{text:async()=>({output:'real output',tokens:2})},'w','m','creator');
 await q.text('key','model','rules','input2',10);
 const c=publicCosts(w);assert.equal(c.day.confirmedMinor,0);assert.equal(c.day.unknownMinor,10);assert.equal(c.day.reservedMinor,0);assert.equal(c.entries[1].confirmedMinor,null);
});

test('retry preserves output, artifact, events and attempt IDs for legacy missions',()=>{
 const w=initialWorkspace();w.secret=encryptKey('sk-fixture',token);
 const m=addMission(w,{title:'Pack',brief:'Four objects',agentId:'creator',kind:'sprites'});m.status='failed';m.attempt=1;m.executionId='previous';m.output='Useful paid content';m.artifact={base64:'old'};m.events=[{at:'2026-01-01',message:'old'}];
 queueMission(w,m.id);assert.equal(m.output,'Useful paid content');assert.equal(m.artifact.base64,'old');assert.equal(m.events[0].message,'old');assert.equal(m.attempts[0].executionId,'previous');assert.notEqual(m.executionId,'previous');
});

test('fourth sprite retry survives SQLite restart and never regenerates the first three',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'hubloan-resume-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const file=join(directory,'workspace.sqlite');let store=await createStore({file});
 const sprite=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp({create:{width:400,height:400,channels:4,background:'#88aa66'}}).png().toBuffer(),left:312,top:312}]).png().toBuffer();
 let texts=0,images=0,visions=0;
 const provider={text:async(_key,_model,instructions)=>{texts++;return{output:instructions.includes('objects')?JSON.stringify({style:'Top-down green palette',objects:['desk','chair','cabinet','terminal']}):'Original plan',tokens:5};},image:async()=>{images++;if(images===4)throw Error('fourth sprite timeout');return{base64:sprite.toString('base64'),tokens:7};},vision:async()=>{visions++;return{output:'Fixture visual assessment',tokens:3};}};
 let id;
 await store.mutate('w',w=>{w.secret=encryptKey('sk-fixture',token);configureCosts(w,limits);id=addMission(w,{title:'Props',brief:'Four original top-down props',kind:'sprites',agentId:'creator'}).id;queueMission(w,id);});
 let runner=createRunner(store,provider);runner.unlock('w',token);await runner.tick();await runner.close();
 let w=(await store.read('w')).workspace;assert.equal(w.missions[0].status,'failed');assert.equal(images,4);assert.equal(w.missions[0].execution.checkpoints.length,5);assert.equal(w.aiCosts.entries.at(-1).status,'uncertain');
 await store.close();store=await createStore({file});
 await store.mutate('w',w=>queueMission(w,id));
 runner=createRunner(store,provider);runner.unlock('w',token);await runner.tick();await runner.close();
 w=(await store.read('w')).workspace;const m=w.missions[0];
 assert.equal(m.status,'review');assert.equal(images,5);assert.equal(texts,2);assert.equal(visions,1);assert.equal(m.images,4);assert.equal(m.tokens,41);assert.equal(m.attempt,2);assert.ok(m.attempts[0].error);
 const files=unzipSync(Buffer.from(m.artifact.base64,'base64'));assert.ok(files['sprites/object-4.png']);assert.ok(files['atlas.png']);assert.ok(files['README.md']);
 const published=publicWorkspace(w,'sqlite');assert.equal(published.missions[0].execution,undefined);assert.equal(published.missions[0].executionHistory,undefined);assert.ok(!JSON.stringify(published).includes(sprite.toString('base64')));
 await store.close();
});

test('whole-delivery preflight blocks before spending any tokens',async()=>{
 const store=await createStore({file:':memory:'});let calls=0;
 await store.mutate('w',w=>{w.secret=encryptKey('sk-fixture',token);configureCosts(w,{...limits,taskMinor:100});const m=addMission(w,{title:'Props',brief:'Four props',kind:'sprites',agentId:'creator'});queueMission(w,m.id);});
 const runner=createRunner(store,{text:async()=>{calls++;return{output:'unexpected'};}});runner.unlock('w',token);await runner.tick();await runner.close();
 const w=(await store.read('w')).workspace;assert.equal(calls,0);assert.equal(w.aiCosts.entries.length,0);assert.equal(w.missions[0].budgetBlock.dimension,'task');assert.match(w.missions[0].error,/necessário/);await store.close();
});

test('expired budget reservations do not masquerade as new attempt spend and corrupted checkpoints block reuse',async()=>{
 const w=initialWorkspace();configureCosts(w,limits);
 const old=new Date(Date.now()-86400000*60).toISOString();
 w.aiCosts.entries.push({taskId:'m',at:old,reservedMinor:100,status:'uncertain',confirmedMinor:null});
 assert.equal(publicCosts(w).dayMinor,0);assert.equal(publicCosts(w).day.hasConfirmedCosts,false);
 assert.throws(()=>preflightCosts({...w,aiCosts:{...w.aiCosts,taskMinor:100}},'m',['text']),e=>e.budgetBlock.dimension==='task');
 const {checkpointCall,digest}=await import('../execution-checkpoints.mjs');
 const m={id:'m',status:'running',execution:{checkpoints:[{key:digest(['text','plan',['input']]),result:{output:'changed'},resultHash:digest({output:'original'})}]}};w.missions=[m];
 const store={mutate:async(_id,fn)=>({result:fn(w)})};let calls=0;
 await assert.rejects(()=>checkpointCall(store,'w','m')('text','plan',['input'],async()=>{calls++;}),/Checkpoint inválido/);assert.equal(calls,0);
});

test('paid response arriving after cancellation is saved without reviving the mission',async()=>{
 const store=await createStore({file:':memory:'});let release,started;
 const ready=new Promise(resolve=>{started=resolve;});
 await store.mutate('w',w=>{w.secret=encryptKey('sk-fixture',token);configureCosts(w,limits);const m=addMission(w,{title:'Text',brief:'Original text',agentId:'creator',kind:'text'});queueMission(w,m.id);});
 const runner=createRunner(store,{text:async()=>{started();return new Promise(resolve=>{release=()=>resolve({output:'Paid plan',tokens:5});});}});runner.unlock('w',token);
 const tick=runner.tick();await ready;
 await store.mutate('w',w=>{w.missions[0].status='cancelled';});release();await tick;await runner.close();
 const w=(await store.read('w')).workspace;assert.equal(w.missions[0].status,'cancelled');assert.equal(w.missions[0].execution.checkpoints[0].result.output,'Paid plan');assert.equal(w.missions[0].tokens,5);await store.close();
});

test('daily, monthly and experiment preflight diagnostics identify their own restrictions',()=>{
 for(const dimension of ['day','month','experiment']){
  const w=initialWorkspace();configureCosts(w,limits);
  w.aiCosts.entries=[{taskId:'other',at:new Date().toISOString(),reservedMinor:dimension==='day'?10000:dimension==='month'?20000:0,status:'uncertain'}];
  if(dimension==='day')w.aiCosts.monthlyMinor=30000;
  if(dimension==='month')w.aiCosts.dailyMinor=30000;
  if(dimension==='experiment')w.experiments=[{id:'e',missionIds:['m'],costs:[],budgetMinor:5,endsAt:new Date(Date.now()+60000).toISOString()}];
  assert.throws(()=>preflightCosts(w,'m',['text']),error=>error.budgetBlock.dimension===dimension && error.budgetBlock.requiredMinor===10);
 }
});


test('partial review preserves other sprites, versions and costs and resumes a failed adjustment', async t => {
 const directory=await mkdtemp(join(tmpdir(),'hubloan-review-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const store=await createStore({file:join(directory,'w.sqlite')});
 const sprite=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp({create:{width:400,height:400,channels:4,background:'#88aa66'}}).png().toBuffer(),left:312,top:312}]).png().toBuffer();
 let images=0,texts=0,visions=0,failReview=false;const prompts=[];
 const provider={text:async(_k,_m,instructions)=>{texts++;return {output:instructions.includes('objects')?JSON.stringify({style:'Top-down green',objects:['desk','chair','cabinet','terminal']}):'plan',tokens:5};},image:async(_k,_m,prompt)=>{images++;prompts.push(prompt);return {base64:sprite.toString('base64'),tokens:7};},vision:async()=>{visions++;if(failReview)throw Error('review timeout');return {output:'Fixture assessment',tokens:3};}};
 let id;await store.mutate('w',w=>{w.secret=encryptKey('sk-fixture',token);configureCosts(w,limits);id=addMission(w,{title:'Pack',brief:'Four top-down props',kind:'sprites',agentId:'creator'}).id;queueMission(w,id);});
 async function run(){const r=createRunner(store,provider);r.unlock('w',token);await r.tick();await r.close();}
 await run();let w=(await store.read('w')).workspace;const oldArtifact=w.missions[0].artifact.base64;const oldFiles=unzipSync(Buffer.from(oldArtifact,'base64'));const oldEntries=w.aiCosts.entries.length;
 await store.mutate('w',w=>reviewMission(w,id,{decision:'adjust',feedback:'Corrigir perspectiva da mesa',components:['sprites/object-1.png']}));
 failReview=true;await run();w=(await store.read('w')).workspace;assert.equal(w.missions[0].status,'failed');assert.equal(images,5);assert.equal(texts,2);
 failReview=false;await store.mutate('w',w=>queueMission(w,id));await run();w=(await store.read('w')).workspace;let m=w.missions[0];
 assert.equal(images,5);assert.equal(texts,2);assert.equal(m.status,'review');assert.equal(m.revisions[0].artifact.base64,oldArtifact);assert.equal(m.reviews[0].feedback,'Corrigir perspectiva da mesa');assert.match(prompts[4],/Corrigir perspectiva/);assert.equal(w.aiCosts.entries.length,oldEntries+3);
 const files=unzipSync(Buffer.from(m.artifact.base64,'base64'));for(const i of [2,3,4])assert.deepEqual(files[`sprites/object-${i}.png`],oldFiles[`sprites/object-${i}.png`]);assert.ok(files['atlas.png']);
 const pub=publicWorkspace(w,'sqlite').missions[0];assert.equal(pub.revisions,undefined);assert.equal(pub.reviewVersions.length,1);assert.equal(pub.reviewComponents.length,4);
 await store.mutate('w',w=>reviewMission(w,id,{decision:'adjust',feedback:'Corrigir armário',components:['sprites/object-3.png']}));await run();assert.equal(images,6);assert.equal(texts,2);
 await store.mutate('w',w=>reviewMission(w,id,{decision:'reject',feedback:'Perspectiva ainda inconsistente'}));w=(await store.read('w')).workspace;m=w.missions[0];assert.equal(m.status,'rejected');assert.ok(m.artifact);assert.equal(m.revisions.length,2);assert.equal(m.images,6);await store.close();
});

test('invalid review scope and legacy checkpoints cannot silently regenerate paid work',()=>{
 const w=initialWorkspace();w.secret=encryptKey('sk-fixture',token);const m=addMission(w,{title:'Legacy',brief:'Old pack',kind:'sprites',agentId:'creator'});m.status='review';m.artifact={base64:'keep'};
 assert.throws(()=>reviewMission(w,m.id,{decision:'adjust',feedback:'Fix',components:['sprites/object-1.png']}),/checkpoints/);assert.equal(m.status,'review');assert.equal(m.artifact.base64,'keep');
 assert.throws(()=>reviewWithVersion(w,m.id,{decision:'reject',feedback:'Stale',version:'old'}),/mudou/);
 assert.throws(()=>reviewMission(w,m.id,{decision:'reject',feedback:''}),/Feedback/);assert.equal(m.status,'review');
});


test('archived downloads require workspace authentication and rejection blocks shop release',async t=>{
 const {createApp}=await import('../app.mjs');const {workspaceId}=await import('../domain.mjs');const {approveShopRelease}=await import('../shop-release.mjs');
 const store=await createStore({file:':memory:'});const app=createApp({store,provider:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();});
 let id;await store.mutate(workspaceId(token),w=>{const m=addMission(w,{title:'Versioned',brief:'Pack',kind:'sprites',agentId:'creator'});id=m.id;m.status='review';m.artifact={base64:Buffer.from('current').toString('base64'),mime:'application/zip',filename:'pack.zip'};m.revisions=[{id:'prior',artifact:{...m.artifact,base64:Buffer.from('previous').toString('base64')}}];});
 const base=`http://127.0.0.1:${app.server.address().port}/api/agents/missions/${id}`;
 const get=(path,access=token)=>fetch(base+path,{headers:{Authorization:`Bearer ${access}`}});
 assert.equal((await get('/artifact?version=prior','b'.repeat(64))).status,404);assert.equal((await get('/artifact?version=missing')).status,404);assert.equal(await (await get('/artifact?version=prior')).text(),'previous');assert.equal(await (await get('/artifact')).text(),'current');
 const w=(await store.read(workspaceId(token))).workspace;const version=releaseVersion(w.missions[0]);
 const response=await fetch(base+'/review',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({decision:'reject',feedback:'Perspectiva inconsistente',version})});assert.equal(response.status,200);assert.equal((await response.json()).missions[0].status,'rejected');
 const rejected=(await store.read(workspaceId(token))).workspace;assert.throws(()=>approveShopRelease(rejected,rejected.missions[0],{authorize:true,version}),/qualidade/);
});
