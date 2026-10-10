import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { unzipSync } from 'fflate';
import { createStore } from '../store.mjs';
import { createRunner } from '../runner.mjs';
import { initialWorkspace, addMission, queueMission, encryptKey, publicWorkspace } from '../domain.mjs';
import { configureCosts, preflightCosts, publicCosts, costProvider } from '../ai-costs.mjs';
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
