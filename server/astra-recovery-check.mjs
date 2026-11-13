// CONTROLLED E2E: fake OpenAI transport, real HTTP/store/queue/FFmpeg. No paid calls.
import {createStore} from './store.mjs';
import {createApp} from './app.mjs';
import {createProvider} from './provider.mjs';
import {encryptKey,workspaceId} from './domain.mjs';
import {configureCosts} from './ai-costs.mjs';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const scratch=await mkdtemp(resolve(tmpdir(),'hubloan-recovery-')),file=resolve(scratch,'state.sqlite'),dir=resolve('docs/evidence/astra-recovery');await mkdir(dir,{recursive:true});
const token='d'.repeat(64),id=workspaceId(token),calls=[];let disconnect=true,failPlanCommit=false,serial=0,store,app,base;
const plan={version:1,title:'Recuperação controlada',premise:'Verificar continuidade sem cobrança real.',creativeReview:'Teste técnico, não avaliação artística.',seconds:15,scenes:['setup','escalation','payoff'].map((beat,i)=>({seconds:5,title:['Sinal enviado','Resposta recuperada','Resultado preservado'][i],goal:'Validar recuperação',mechanism:'Teste de contrato',prompt:'Diagrama abstrato local',narration:'',visual:'local-diagram',motion:['push-in','pan-left','reveal'][i],annotation:'none',tone:'documentary',transition:'cut',beat}))};
const generated={proposals:Array.from({length:5},(_,i)=>({title:'Proposta controlada '+i,premise:'Teste sem inferência real',reason:'Contrato de recuperação'})),selectedIndex:0,plan};
const provider=createProvider(async(url,options)=>{calls.push({method:options.method,path:new URL(url).pathname});if(options.method==='POST')return new Response(JSON.stringify({id:'resp_controlled'+(++serial),status:'queued'}));if(disconnect){disconnect=false;throw Error('controlled disconnection');}return new Response(JSON.stringify({id:url.split('/').at(-1),status:'completed',model:'controlled-transport',output:[{content:[{type:'output_text',text:JSON.stringify(generated)}]}],usage:{total_tokens:10}}));},{sleep:async()=>{}});
async function open(){store=await createStore({file});const mutate=store.mutate.bind(store);store.mutate=(id,fn)=>mutate(id,w=>{const r=fn(w);if(failPlanCommit&&w.creativeCampaigns?.at(-1)?.state==='AwaitingBudget'){failPlanCommit=false;throw Error('controlled crash after checkpoint');}return r;});app=createApp({store,provider});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.server.address().port}/api/agents`;}
async function api(path,input){const res=await fetch(base+path,{method:input?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});const body=await res.json();if(!res.ok)throw Error(body.error);return body;}
async function close(){await app.close();await store.close();}
const results=[];
try{await open();await store.mutate(id,w=>{w.secret=encryptKey('controlled-key',token);configureCosts(w,{enabled:true,dailyMinor:1000,monthlyMinor:1000,callMinor:100,taskMinor:500,ceilings:{text:100,research:100,vision:100,image:100}});});
 for(const scenario of ['network-after-submission','interruption-after-checkpoint']){
  if(scenario==='interruption-after-checkpoint')failPlanCommit=true;
  await api('/creative-campaigns',{action:'start',request:'Produza um vídeo curto para verificar recuperação.',mode:'visual-commentary',seconds:15,voiceMode:'neural',authorizeModelCall:true});await app.runner.tick();let w=await api('/workspace'),c=w.creativeCampaigns.at(-1);assert.equal(c.state,'Failed');const failed=structuredClone(c);const checkpointCount=w.missions.find(m=>m.id===c.missionId).completedSteps;
  if(scenario==='network-after-submission'){assert.equal((await store.read(id)).workspace.aiCosts.entries.at(-1).status,'uncertain');assert.equal(c.recovery.canReconcile,true);assert.equal(c.recovery.needsAuthorization,false);}else assert.equal(checkpointCount,1);
  await close();await open();w=await api('/workspace');c=w.creativeCampaigns.at(-1);const before=calls.length;
  await api('/creative-campaigns',{action:'resume',id:c.id,revision:c.revision});await app.runner.tick();w=await api('/workspace');c=w.creativeCampaigns.at(-1);assert.equal(c.state,'AwaitingBudget',w.missions.find(m=>m.id===c.missionId).error);assert.equal(w.missions.find(m=>m.id===c.missionId).status,'review');if(scenario==='interruption-after-checkpoint')assert.equal(calls.length,before);
  await api('/creative-campaigns',{action:'authorize-media',id:c.id,revision:c.revision,planVersion:c.planVersion,maxMicros:0});await app.runner.tick();w=await api('/workspace');c=w.creativeCampaigns.at(-1);assert.equal(c.state,'ReadyForReview',JSON.stringify(w.missions.map(m=>m.error)));const m=w.missions.find(m=>m.id===c.productionIds[0]);const artifact=await fetch(base+`/missions/${m.id}/artifact`,{headers:{Authorization:'Bearer '+token}});assert.equal(artifact.status,200);await writeFile(resolve(dir,scenario+'.mp4'),Buffer.from(await artifact.arrayBuffer()));results.push({scenario,failed,recovered:c,report:m.videoReport,checkpointCount,externalOperations:(await store.read(id)).workspace.missions.find(m=>m.id===c.missionId).externalOperations.map(({partialOutput,...o})=>o)});
 }
 assert.equal(calls.filter(c=>c.method==='POST').length,2);assert.equal((await store.read(id)).workspace.aiCosts.entries.length,2);await writeFile(resolve(dir,'e2e.json'),JSON.stringify({controlledTransport:true,realOpenAI:false,paidCalls:0,calls,results},null,2));console.log('PASS: two interrupted campaigns recovered after SQLite reopen; one GET-only reconciliation, one checkpoint reuse with zero extra calls; two real local MP4s ready for review; planning leases released; no paid API.');
}finally{await close();await rm(scratch,{recursive:true,force:true});}
