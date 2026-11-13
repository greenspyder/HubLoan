import {manualFormat} from './creative-formats.mjs';
import {synthesizeVoiceAsset} from './universal-voice.mjs';
import {activeVoice} from './lume-voice.mjs';
import {AppError,decryptKey,addMission,queueMission} from './domain.mjs';
import {COMMENTARY_RULES,commentaryCapabilities,validateCommentaryPlan,renderCommentary} from './visual-commentary.mjs';
import {preflightCosts} from './ai-costs.mjs';
import {executeMediaOperation} from './multimodal-studio.mjs';
export async function planCommentary({store,id,mission,budgeted,checkpoint,signal,token}){
 const w=(await store.read(id)).workspace,c=w.creativeCampaigns.find(c=>c.id===mission.campaignId);if(!w.secret)throw new AppError('MODEL_NOT_CONNECTED: conecte o modelo para a Astra criar o roteiro.');
 await store.mutate(id,w=>preflightCosts(w,mission.id,['text']));const key=decryptKey(w.secret,token),narration=activeVoice(w).engine==='elevenlabs'&&activeVoice(w).approvedSampleId?activeVoice(w):null;
 const result=await checkpoint('text','Astra: plano multimodal',[1,c.request,c.requestedSeconds,narration],()=>budgeted.text(key,c.model,COMMENTARY_RULES+(manualFormat(c.manualFormat)?.direction||''),JSON.stringify({request:c.request,seconds:c.requestedSeconds,capabilities:commentaryCapabilities,narrationAvailable:!!narration,qualityPreference:c.qualityPreference,context:mission.creativeRequest}),5500,signal));
 if(result.truncated)throw new AppError('Plano multimodal truncado.');const raw=JSON.parse(result.output),plan=validateCommentaryPlan(raw.plan);
 if(plan.seconds!==c.requestedSeconds||!Array.isArray(raw.proposals)||raw.proposals.length!==5||!Number.isInteger(raw.selectedIndex)||raw.selectedIndex<0||raw.selectedIndex>4)throw new AppError('Cinco propostas e seleção rastreável obrigatórias.');
 for(const p of raw.proposals)for(const k of ['title','premise','reason'])if(typeof p[k]!=='string'||!p[k].trim()||p[k].length>1000)throw new AppError('Proposta inválida.');
 if(plan.scenes.some(s=>s.narration)&&!narration)throw new AppError('Perfil de narração não configurado.');
 const resources=plan.scenes.flatMap(s=>[...(s.visual==='higgsfield-image'?[{sceneId:s.id,provider:'higgsfield',operation:'image',model:s.model,quantity:1,estimatedMicros:null}]:[]),...(s.narration?[{sceneId:s.id,provider:'elevenlabs',operation:'speech',model:narration.model,quantity:s.narration.length,unit:'characters',estimatedMicros:null}]:[])]);if(resources.length>6)throw new AppError('Plano excede seis operações externas. Astra deve economizar recursos.');
 await store.mutate(id,w=>{const c=w.creativeCampaigns.find(c=>c.id===mission.campaignId),m=w.missions.find(m=>m.id===mission.id);if(c.state==='Cancelled'||m.status!=='running')throw new AppError('Campanha encerrada.');c.proposals=raw.proposals;c.decisions=[{index:raw.selectedIndex,source:'model',model:result.model}];c.plans=[plan];c.narrationSnapshot=narration;c.resourceEstimate=resources;c.actualModel=result.model;c.planVersion=1;c.state='AwaitingBudget';for(const state of ['Ideating','Selecting','Scripting','Planning','AwaitingBudget'])c.events.push({at:new Date().toISOString(),state,detail:state==='AwaitingBudget'?'Plano do modelo pronto. Nenhuma geração de mídia autorizada.':'Decisão estruturada do modelo registrada.'});c.revision++;});
}
export function authorizeCommentary(w,c,input,now){
 if(c.state!=='AwaitingBudget'||input.planVersion!==c.planVersion||w.creativeDirector?.paused)throw new AppError('Plano indisponível ou alterado.',409);
 const count=c.resourceEstimate.length;
 if(count&&(!Number.isSafeInteger(input.maxMicros)||input.maxMicros<=0||input.maxMicros>100e6||input.acceptUnknownCost!==true||input.acceptUnknownBalance!==true))throw new AppError('Autorize explicitamente limite, custo monetário desconhecido e saldo não verificado.');
 if(count&&(!w.multimodal?.dailyLimitMicros||input.maxMicros>w.multimodal.dailyLimitMicros))throw new AppError('Configure limite diário suficiente.');
 for(const resource of c.resourceEstimate)if(!w.multimodal?.connections[resource.provider]?.secret)throw new AppError('PROVIDER_NOT_CONNECTED: '+resource.provider);
 c.mediaAuthorization={maxMicros:count?input.maxMicros:0,operationCapMicros:count?Math.floor(input.maxMicros/count):0,planVersion:c.planVersion,at:new Date(now).toISOString(),unknownCostAccepted:count>0,unknownBalanceAccepted:count>0};
 const planning=w.missions.find(m=>m.id===c.missionId),m=addMission(w,{title:c.plans[0].title,brief:c.plans[0].scenes.map(s=>s.title).join('\n'),kind:'video',agentId:planning?.agentId||w.agents.find(a=>a.enabled)?.id});m.campaignId=c.id;m.visualCommentary={manualFormat:c.manualFormat||'visual-commentary',plan:structuredClone(c.plans[0]),narration:structuredClone(c.narrationSnapshot),planVersion:c.planVersion};c.productionIds=[m.id];c.state='Rendering';c.deadline=now+1800000;c.events.push({at:new Date(now).toISOString(),state:'Rendering',detail:'Orçamento autorizado pelo supervisor; produção na fila existente.'});queueMission(w,m.id);c.revision++;return c;
}
export async function produceCommentary({store,id,token,mission,signal,checkpoint}){
 const w=(await store.read(id)).workspace,c=w.creativeCampaigns.find(c=>c.id===mission.campaignId),config=mission.visualCommentary,assets={};signal=AbortSignal.any([signal,AbortSignal.timeout(Math.max(1,Math.min(480000,c.deadline-Date.now())))]);
 for(const scene of config.plan.scenes){assets[scene.id]={};const common={store,id,token,campaignId:c.id,maxMicros:c.mediaAuthorization.operationCapMicros,signal};
  if(scene.visual==='higgsfield-image')assets[scene.id].image=await executeMediaOperation({...common,operation:'image',input:{model:scene.model,prompt:scene.prompt}});
  if(scene.narration){if(!config.narration)throw new AppError('Perfil de narração ausente.');assets[scene.id].speech=await synthesizeVoiceAsset({...common,scope:'viral',sessionId:mission.id,profile:{...config.narration,engine:'elevenlabs',voice:config.narration.voice||config.narration.voiceId},text:scene.narration});}
 }
 const result=await renderCommentary({plan:config.plan,assets,signal,checkpoint});result.report.manualFormat=config.manualFormat||'visual-commentary';result.report.creativeReview.source=c.source==='manual'?'User-plan':'Astra-plan';return result;
}
export async function estimateCommentary({store,id,token,campaignId,revision,adapters}){
 const w=(await store.read(id)).workspace,c=w.creativeCampaigns?.find(c=>c.id===campaignId);if(!c||c.state!=='AwaitingBudget'||c.revision!==revision)throw new AppError('Plano alterado ou indisponível.',409);
 const resources=[];for(const r of c.resourceEstimate){const scene=c.plans[0].scenes.find(s=>s.id===r.sceneId),connection=w.multimodal?.connections[r.provider];let estimate=null,error=null;
  if(!connection?.secret)error='PROVIDER_NOT_CONNECTED';
  else try{if(r.operation==='image')estimate=(await adapters.estimateImage(decryptKey(connection.secret,token),{model:scene.model,prompt:scene.prompt})).usdMicros;else{const account=await adapters.inspectEleven(decryptKey(connection.secret,token));const model=account.models.find(m=>m.id===c.narrationSnapshot?.model);if(!model)throw Error('MODEL_UNAVAILABLE');r.estimatedCredits=Number.isFinite(model.characterMultiplier)?r.quantity*model.characterMultiplier:null;r.quota=account.quota;}}catch(e){error=e.code||'ESTIMATE_UNAVAILABLE';}
  resources.push({...r,estimatedMicros:estimate,error,estimatedAt:new Date().toISOString()});
 }
 await store.mutate(id,w=>{const current=w.creativeCampaigns.find(c=>c.id===campaignId);if(current.revision!==revision||current.state!=='AwaitingBudget')throw new AppError('Plano mudou durante consulta.',409);current.resourceEstimate=resources;current.revision++;});
}

export function editManualPlan(w,c,input){
 if(c.state!=='AwaitingBudget')throw new AppError('O plano só pode ser editado antes da produção.',409);
 const format=manualFormat(input.format||c.manualFormat);
 if(format?.adapter!=='visual-commentary')throw new AppError('Formato narrativo indisponível.');
 let plan;try{plan=validateCommentaryPlan(input.plan);}catch(e){throw new AppError(e.message);}
 const narration=activeVoice(w),hasVoice=plan.scenes.some(s=>s.narration);
 if(hasVoice&&(narration.engine!=='elevenlabs'||!narration.approvedSampleId))throw new AppError('VOICE_PROVIDER_NOT_CONFIGURED: aprove uma voz ElevenLabs global antes de salvar narração neste adaptador. Nenhum fallback será usado.');
 if(!hasVoice&&input.silent!==true)throw new AppError('Confirme explicitamente produção sem narração.');
 const resources=plan.scenes.flatMap(s=>[...(s.visual==='higgsfield-image'?[{sceneId:s.id,provider:'higgsfield',operation:'image',model:s.model,quantity:1,estimatedMicros:null}]:[]),...(s.narration?[{sceneId:s.id,provider:'elevenlabs',operation:'speech',model:narration.model,quantity:s.narration.length,unit:'characters',estimatedMicros:null}]:[])]);
 if(resources.length>6)throw new AppError('Máximo de seis operações externas.');
 c.planHistory=[...(c.planHistory||[]),...(c.plans?.length?[{version:c.planVersion,plan:c.plans[0]}]:[])].slice(-10);
 c.plans=[plan];c.manualFormat=format.id;c.narrationSnapshot=hasVoice?structuredClone(narration):null;c.resourceEstimate=resources;c.planVersion=(c.planVersion||0)+1;delete c.mediaAuthorization;
 c.events.push({at:new Date().toISOString(),state:'Planning',detail:'Roteiro e cenas definidos pelo usuário; estimativas e autorizações anteriores invalidadas.'});c.revision++;return c;
}
