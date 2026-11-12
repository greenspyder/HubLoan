// Real integration attempt: no scripts, selections, fake provider or render bypass.
import {createStore} from './store.mjs';
import {createApp} from './app.mjs';
import {createProvider} from './provider.mjs';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const dir=resolve(process.argv[2]||'../creative21-attempt');await mkdir(dir,{recursive:true});const file=process.env.HUBLOAN_CAMPAIGN_DB||join(dir,'workspace.sqlite'),store=await createStore({file}),app=createApp({store,provider:createProvider()}),token=process.env.HUBLOAN_CAMPAIGN_TOKEN||randomBytes(32).toString('hex');
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}/api/agents`,headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
try{
 const response=await fetch(base+'/creative-campaigns',{method:'POST',headers,body:JSON.stringify({action:'start',...(process.env.HUBLOAN_CAMPAIGN_MODE==='visual-commentary'?{mode:'visual-commentary',seconds:18}:{}),request:process.env.HUBLOAN_CAMPAIGN_MODE==='visual-commentary'?'Crie um falso documentário absurdamente sério sobre um acontecimento cotidiano insignificante. Invente uma nomenclatura pseudocientífica original, produza uma narração documental convincente e escolha imagens ou movimentos que tornem a situação progressivamente mais absurda.':'Pesquise oportunidades criativas e produza três vídeos curtos, em formatos distintos, para avaliação.',voiceMode:'neural',authorizeModelCall:true,webResearch:true})});if(response.status!==200)throw Error('Campanha não criada: '+response.status);
 let snapshot;for(let tick=0;tick<12;tick++){await app.runner.tick();snapshot=await (await fetch(base+'/workspace',{headers})).json();const campaign=snapshot.creativeCampaigns.at(-1);if(['Failed','ReadyForReview','Cancelled','AwaitingBudget'].includes(campaign.state))break;}
 const campaign=snapshot.creativeCampaigns.at(-1);
 for(const mid of campaign.productionIds){const mission=snapshot.missions.find(m=>m.id===mid);if(mission?.hasArtifact){const artifact=await fetch(base+'/missions/'+mid+'/artifact',{headers});if(!artifact.ok)throw Error('Artefato indisponível.');await writeFile(join(dir,mid+'.mp4'),Buffer.from(await artifact.arrayBuffer()));}}
 await writeFile(join(dir,'execution.json'),JSON.stringify({input:'Solicitação genérica, sem roteiro ou plano fornecido',httpStatus:response.status,campaigns:snapshot.creativeCampaigns,proposals:snapshot.creativeDirector.proposals,artifacts:snapshot.missions.filter(m=>m.hasArtifact).map(m=>m.id)},null,2));
 console.log(snapshot.creativeCampaigns.at(-1).id,snapshot.creativeCampaigns.at(-1).state,snapshot.creativeCampaigns.at(-1).error);
}finally{await app.close();await store.close();}
const reopened=await createStore({file});const spaces=await reopened.read((await import('./domain.mjs')).workspaceId(token));await writeFile(join(dir,'persistence.json'),JSON.stringify({reopened:true,campaignId:spaces.workspace.creativeCampaigns.at(-1).id,state:spaces.workspace.creativeCampaigns.at(-1).state}));await reopened.close();
