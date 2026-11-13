// Real manual HTTP -> campaign -> shared queue -> FFmpeg -> stored artifact.
// Authored manual validation scripts, not autonomous Astra or external-provider proofs.
import {createStore} from './store.mjs';
import {createApp} from './app.mjs';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const scratch=await mkdtemp(resolve(tmpdir(),'hubloan-manual251-'));const file=resolve(scratch,'workspace.sqlite');const dir=resolve('docs/evidence/manual251');await mkdir(dir,{recursive:true});const store=await createStore({file:file}),app=createApp({store,provider:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}/api/agents`,token='b'.repeat(64),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
async function api(path,input){const res=await fetch(base+path,{method:input?'POST':'GET',headers,...(input?{body:JSON.stringify(input)}:{})});const w=await res.json();if(!res.ok)throw Error(w.error);return w;}
const results=[];
try{for(const [format,titles] of [['absurd-documentary',['A colher em repouso','Migração de três centímetros','A pia explica tudo']],['visual-commentary',['Como ler um deslocamento','A seta indica a mudança','Posição não é velocidade']]]){
 const plan={version:1,title:titles[0],premise:format==='absurd-documentary'?'Um falso estudo sobre uma colher deslocada, mostrado como diagrama abstrato.':'Explicação gráfica da diferença entre posição e movimento.',creativeReview:'Composição diagramática deliberada, sem narração nesta verificação local.',seconds:15,scenes:['setup','escalation','payoff'].map((beat,i)=>({seconds:5,goal:titles[i],mechanism:format==='absurd-documentary'?'Seriedade documental fictícia':'Explicação diagramática',narration:'',title:titles[i],prompt:'Diagrama abstrato de trajetória e posição',visual:'local-diagram',motion:['push-in','pan-left','reveal'][i],annotation:['circle','arrow','none'][i],tone:'documentary',beat,transition:'cut'}))};
 let w=await api('/creative-campaigns',{action:'manual-plan',format,request:plan.premise,plan,silent:true}),c=w.creativeCampaigns.at(-1);assert.equal(c.state,'AwaitingBudget');assert.equal(c.productionIds.length,0);w=await api('/creative-campaigns',{action:'authorize-media',id:c.id,revision:c.revision,planVersion:c.planVersion,maxMicros:0});await app.runner.tick();
 for(let i=0;i<100;i++){w=await api('/workspace');c=w.creativeCampaigns.find(x=>x.id===c.id);if(['ReadyForReview','Failed'].includes(c.state))break;await new Promise(r=>setTimeout(r,300));}
 assert.equal(c.state,'ReadyForReview',JSON.stringify(w.missions.map(m=>({status:m.status,error:m.error}))));const m=w.missions.find(m=>m.id===c.productionIds[0]);assert.equal(m.liveShort,undefined);assert.equal(m.status,'review');const res=await fetch(base+`/missions/${m.id}/artifact`,{headers});assert.equal(res.status,200);const bytes=Buffer.from(await res.arrayBuffer());await writeFile(resolve(dir,format+'.mp4'),bytes);results.push({format,campaign:c,mission:m,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,paidCalls:0,realProviderValidation:false});const other=await fetch(base+`/missions/${m.id}/artifact`,{headers:{Authorization:'Bearer '+'c'.repeat(64)}});assert.equal(other.status,404);
 }
 await writeFile(resolve(dir,'manual-runs.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({format:r.format,campaignId:r.campaign.id,state:r.campaign.state,bytes:r.bytes,sha256:r.sha256}))));
}finally{await app.close();await store.close();}
const reopened=await createStore({file});try{const w=(await reopened.read(createHash('sha256').update(token).digest('hex'))).workspace;assert.equal(w.creativeCampaigns.length,2);assert.equal(w.missions.filter(m=>m.artifact).length,2);console.log('PASS: campaign and MP4 persistence after reopening SQLite');}finally{await reopened.close();await rm(scratch,{recursive:true,force:true});}
