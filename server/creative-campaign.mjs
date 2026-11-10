import {audienceLearning} from './viral-distribution.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {AppError,text,addMission,queueMission,missionById,cancelMission,decryptKey} from './domain.mjs';
import {creativeAction,acceptCreativeModelResult,CREATIVE_MODEL_RULES} from './creative-director.mjs';
import {sceneCapabilities,validateScenePlan,scriptSimilarity} from './creative-plan.mjs';
import {recordGameplay,detectHighlights} from './viral-director.mjs';
import {preflightCosts,costExposure} from './ai-costs.mjs';
const terminal=new Set(['ReadyForReview','Failed','Cancelled']);
const list=w=>w.creativeCampaigns ||= [];
const event=(c,state,detail)=>{c.state=state;c.events.push({at:new Date().toISOString(),state,detail});};
export function campaignAction(w,input,now=Date.now()){
 if(input.action==='start'){
  if(w.creativeDirector?.paused)throw new AppError('Direção criativa pausada.',409);
  if(list(w).length>=30||list(w).some(c=>!terminal.has(c.state)))throw new AppError('Uma campanha por vez; máximo 30 no histórico.',409);
  if(input.authorizeModelCall!==true)throw new AppError('Autorize o modelo e os limites existentes.');
  if(!['neural','technical'].includes(input.voiceMode))throw new AppError('Selecione a execução vocal.');
  const request=text(input.request,'Solicitação',1000),agent=w.agents.find(a=>a.enabled);if(!agent)throw new AppError('Nenhum agente ativo.');
  const m=addMission(w,{title:'Astra: campanha autônoma',brief:request,kind:'text',agentId:agent.id});
  const c={id:randomUUID(),revision:0,request,state:'Researching',createdAt:new Date(now).toISOString(),deadline:now+1800000,missionId:m.id,voiceMode:input.voiceMode,webResearch:input.webResearch===true,attemptLimit:2,model:w.settings.model,events:[],sources:[],decisions:[],productionIds:[],publication:{enabled:false,approval:'human',officialAuthenticationRequired:true,schedulerImplemented:false,metrics:[]}};
  m.campaignId=c.id;m.creativeRequest={version:1,theme:request,sources:structuredClone((w.creativeDirector?.sources||[]).filter(s=>s.kind!=='fixture')),rejected:(w.creativeDirector?.experiments||[]).filter(e=>e.reviews.some(r=>r.decision==='reject')).map(e=>({title:e.proposal.title,concept:e.proposal.concept,reasons:e.reviews})),audienceEvidence:(w.experiments||[]).filter(e=>e.kind==='audience').map(audienceLearning)};
  event(c,'Researching','Solicitação recebida; nenhuma proposta ou cena fornecida pelo operador.');list(w).push(c);queueMission(w,m.id);return c;
 }
 const c=list(w).find(c=>c.id===input.id);if(!c)throw new AppError('Campanha não encontrada.',404);
 if(input.revision!==c.revision)throw new AppError('Campanha mudou. Recarregue.',409);
 if(input.action==='resume'){
  if(c.state!=='Failed'||(c.resumes||0)>=1||w.creativeDirector?.paused)throw new AppError('Retomada indisponível ou limite atingido.',409);
  const ids=c.productionIds.length?c.productionIds:[c.missionId];
  if(!ids.some(id=>['failed','cancelled'].includes(missionById(w,id).status)))throw new AppError('Falha de qualidade exige revisão do plano e nova campanha; não há tarefa interrompida para retomar.',409);
  event(c,c.productionIds.length?'Rendering':'Researching','Retomada explícita autorizada.');
  for(const id of ids){const m=missionById(w,id);if(['failed','cancelled'].includes(m.status))queueMission(w,id);}
  c.resumes=(c.resumes||0)+1;c.deadline=now+1800000;delete c.error;delete c.endedAt;event(c,c.productionIds.length?'Rendering':'Researching','Retomada explícita; checkpoints preservados.');c.revision++;return c;
 }
 if(input.action!=='cancel'||terminal.has(c.state))throw new AppError('Ação indisponível.',409);
 for(const id of [c.missionId,...c.productionIds]){const m=w.missions.find(m=>m.id===id);if(m&&['queued','running'].includes(m.status))cancelMission(w,id);}
 event(c,'Cancelled','Interrompida pelo supervisor.');c.endedAt=new Date(now).toISOString();c.revision++;return c;
}
export function reconcileCampaigns(w,now=Date.now()){
 for(const c of list(w)){
  if(terminal.has(c.state))continue;
  const charges=(w.aiCosts?.entries||[]).filter(e=>[c.missionId,...c.productionIds].includes(e.taskId));c.costs={calls:charges.filter(e=>e.status!=='not_sent').length,exposureMinor:charges.reduce((n,e)=>n+costExposure(e),0),confirmedMinor:charges.every(e=>e.confirmedMinor!=null)?charges.reduce((n,e)=>n+e.confirmedMinor,0):null,infrastructureMinor:null};
  const m=w.missions.find(m=>m.id===c.missionId),jobs=c.productionIds.map(id=>w.missions.find(m=>m.id===id));
  const failure=!m||['failed','cancelled'].includes(m.status)||jobs.some(m=>!m||['failed','cancelled'].includes(m.status));
  if(now>c.deadline||failure){
   for(const job of [m,...jobs])if(job&&['queued','running'].includes(job.status))cancelMission(w,job.id);
   c.error=now>c.deadline?'CAMPAIGN_DEADLINE_EXCEEDED':m?.error||jobs.find(m=>m?.error)?.error||'PRODUCTION_INTERRUPTED';event(c,'Failed',c.error);c.endedAt=new Date(now).toISOString();c.revision++;continue;
  }
  if(jobs.length===3&&jobs.every(m=>['review','approved','rejected'].includes(m.status))){
   event(c,'Validating','Verificar três artefatos, planos e integridade técnica.');
   const issues=jobs.flatMap(m=>!m.artifact||m.videoReport?.technicalStatus!=='TECHNICALLY_VALID'?['INVALID_ARTIFACT:'+m.id]:[]);
   // Existing renderer numeric tests are not sufficient for artistic approval.
   for(const m of jobs){if((m.videoReport?.distinctFrames||0)<(m.videoReport?.seconds||0)*2)issues.push('LOW_FRAME_DIVERSITY:'+m.id);if(Object.keys(m.videoReport?.renderer?.framingQuality?.issues||{}).length)issues.push('FRAMING_FAILURE:'+m.id);}
   c.quality={technical:issues.length?'FAIL':'PASS',artistic:'HUMAN_REVIEW_REQUIRED',issues,artifacts:jobs.map(m=>({missionId:m.id,sha256:m.artifact?createHash('sha256').update(Buffer.from(m.artifact.base64,'base64')).digest('hex'):null,report:m.videoReport}))};
   if(issues.length)c.error='CREATIVE_QUALITY_FAILED: '+issues.join(';');
   event(c,issues.length?'Failed':'ReadyForReview',issues.length?issues.join(';'):'Artefatos tecnicamente válidos; revisão humana pendente.');c.endedAt=new Date(now).toISOString();c.revision++;
  }
 }
}
export const CAMPAIGN_RULES=CREATIVE_MODEL_RULES+' Acrescente selection: [{index:0,reason:"comparação e justificativa"}] com exatamente três índices únicos: comedy, battle e mystery. Acrescente rejected:[{index:1,reason:"motivo"}] para os outros dois. Cada proposta selecionada deve incluir visualPlan:{version:1,scenes:[{start:0,end:6,action:"enum",camera:"enum",transition:"cut",beat:"hook",narration:0,eventId:"somente battle"}]}. Consulte capabilities e events. Para comedy use quatro cenas contínuas em 18 segundos, battle quatro em 25, mystery três de seis segundos em 18. Use apenas ações executáveis, sem inventar ações físicas ou resultados. As avaliações são julgamentos criativos, não previsões de viralidade.';
export async function executeCampaign({store,id,mission,budgeted,checkpoint,signal,token}){
 const update=fn=>store.mutate(id,w=>{const c=list(w).find(c=>c.id===mission.campaignId);if(!c||terminal.has(c.state)||missionById(w,mission.id).status!=='running')throw new AppError('Campanha encerrada.',409);fn(c,w);c.revision++;});
 let w=(await store.read(id)).workspace,c=list(w).find(c=>c.id===mission.campaignId);
 if(!w.secret)throw new AppError('MODEL_NOT_CONNECTED: conecte o modelo no workspace; não existe fallback de roteiros.');
 const key=decryptKey(w.secret,token),bounded=AbortSignal.any([signal,AbortSignal.timeout(Math.max(1,Math.min(480000,c.deadline-Date.now())))]);
 await store.mutate(id,w=>preflightCosts(w,mission.id,[...(c.webResearch?['research']:[]),'text','text']));
 let research={output:'Sem pesquisa externa autorizada. Usar somente contexto interno; não afirmar tendência.',sources:[],origin:'INTERNAL_CONTEXT_ONLY'};
 if(c.webResearch){research=await checkpoint('research','Pesquisar campanha',[c.request],()=>budgeted.research(key,c.model,c.request,bounded,{maxToolCalls:1}));if(research.truncated)throw new AppError('Pesquisa incompleta.');}
 await update(c=>{c.sources=research.sources||[];c.research=research;event(c,'Ideating','Fontes disponíveis registradas; solicitar propostas e comparação ao modelo.');});
 const researchContext={output:research.output,sources:research.sources||[],origin:research.origin||'CONNECTED_RESEARCH'};
 const recording=recordGameplay({characters:['Lume','Faísca','Jade','Ember']}),events=detectHighlights(recording.frames).slice(0,40);
 let lastError=null;
 for(let attempt=1;attempt<=c.attemptLimit;attempt++){
  await update(c=>{c.attempt=attempt;});
  const result=await checkpoint('text','Planejar campanha',[1,c.request,attempt,lastError,researchContext],()=>budgeted.text(key,c.model,CAMPAIGN_RULES,JSON.stringify({request:c.request,research:researchContext,context:mission.creativeRequest,capabilities:sceneCapabilities,events,previousError:lastError}),7000,bounded));
  try{
   if(result.truncated)throw Error('Resposta truncada.');const raw=JSON.parse(result.output);
   if(!Array.isArray(raw.selection)||raw.selection.length!==3||new Set(raw.selection.map(s=>s.index)).size!==3||raw.selection.some(s=>!Number.isInteger(s.index)||s.index<0||s.index>4||typeof s.reason!=='string'||!s.reason.trim()))throw Error('Seleção deve comparar três propostas.');
   if(!Array.isArray(raw.rejected)||raw.rejected.length!==2||new Set([...raw.selection,...raw.rejected].map(s=>s.index)).size!==5||raw.rejected.some(s=>!Number.isInteger(s.index)||s.index<0||s.index>4||typeof s.reason!=='string'||!s.reason.trim()))throw Error('Rejeições precisam justificar os dois conceitos restantes.');
   const selected=raw.selection.map(s=>raw.proposals?.[s.index]);if(new Set(selected.map(p=>p?.format)).size!==3||selected.some(p=>!sceneCapabilities[p?.format]))throw Error('Selecionar três adaptadores suportados distintos.');
   const plans=selected.map(p=>validateScenePlan(p.visualPlan,p.format,p.script,events.map(e=>e.id)));
   const scripts=selected.map(p=>p.script.join(' '));for(let i=0;i<scripts.length;i++)for(let j=0;j<i;j++)if(scriptSimilarity(scripts[i],scripts[j])>.75)throw Error('Roteiros excessivamente semelhantes.');
   await update((c,w)=>{
    const old=(w.creativeDirector?.experiments||[]).map(e=>e.proposal.script.join(' '));if(scripts.some(s=>old.some(o=>scriptSimilarity(s,o)>.85)))throw Error('Roteiro repete experimento anterior.');
    const proposals=acceptCreativeModelResult(w,mission.id,result.output,result.model||null);
    event(c,'Selecting','Seleção comparativa fornecida pelo modelo.');c.decisions=raw.selection;c.rejected=raw.rejected;c.proposalIds=proposals.map(p=>p.id);c.actualModel=result.model||null;
    event(c,'Scripting','Roteiros gerados pelo modelo e validados.');event(c,'Planning','Planos executáveis validados contra capacidades e eventos reais.');
    raw.selection.forEach((selection,i)=>{const p=proposals[selection.index];p.visualPlan=plans[i];const e=creativeAction(w,{revision:w.creativeDirector.revision,action:'produce',proposalId:p.id,voiceMode:c.voiceMode}),m=missionById(w,e.missionId);m.campaignId=c.id;if(m.liveShort)m.liveShort.visualPlan=plans[i];else m.motionStory.visualPlan=plans[i];e.proposal.visualPlan=plans[i];c.productionIds.push(m.id);});
    c.plans=plans;event(c,'Rendering','Três produções enfileiradas automaticamente no runner existente.');
   });return;
  }catch(error){lastError=String(error.message).slice(0,1200);await update(c=>{c.lastError=lastError;c.events.push({at:new Date().toISOString(),state:'Ideating',detail:'Plano recusado; tentativa '+attempt+': '+lastError});});}
 }
 throw new AppError('CREATIVE_ATTEMPTS_EXHAUSTED: '+lastError);
}
