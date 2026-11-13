import {providerOperationContext} from './provider-operation-context.mjs';
import {ProviderFailure,failureInfo} from './provider-failures.mjs';
import {randomUUID} from 'node:crypto';
import { createHash } from 'node:crypto';
import { AppError, missionById } from './domain.mjs';
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function executionIntent(mission) { const intent=['production-v1',mission.title,mission.brief,mission.kind,mission.agentId];if(mission.visualCommentary)intent.push(mission.visualCommentary);if(mission.liveShort)intent.push(mission.liveShort);if(mission.motionStory)intent.push(mission.motionStory);if(mission.creativeRequest)intent.push(mission.creativeRequest);return digest(intent); }
export function remainingOperations(kind,checkpoints=[]) {
 const required={sprites:['text','text','image','image','image','image','vision'],thumbnail:['text','text','image','vision'],model3d:['text','text'],image:['text','text','image'],text:['text','text','text']}[kind];
 const remaining=[...required];
 for(const checkpoint of checkpoints){if(checkpoint.result && checkpoint.resultHash===digest(checkpoint.result)){const i=remaining.indexOf(checkpoint.kind);if(i>=0)remaining.splice(i,1);}}
 return remaining;
}
// Persist provider outputs before dependent processing (normalization, atlas, ZIP).
// A reused result has zero incremental tokens/images; original accounting remains in the ledger.
export function checkpointCall(store,id,missionId) {
 return async (kind,label,input,invoke,componentId)=>{
  const key=digest([kind,label,input]);
  const {result:existing}=await store.mutate(id,w=>{
   const m=missionById(w,missionId);if(m.status!=='running')throw new AppError('Execução encerrada.',409);
   return m.execution.checkpoints.find(c=>c.key===key);
  });
  if(existing){
   if(existing.resultHash!==digest(existing.result))throw new AppError('Checkpoint inválido. Preserve os arquivos e solicite revisão antes de regenerar.',409);
   return {...existing.result,tokens:0,cached:true,resumed:true};
  }
  const snapshot=(await store.read(id)).workspace,m=snapshot.missions.find(m=>m.id===missionId);
  let operation,context;
  if(m.campaignId&&['text','research','vision','image'].includes(kind)){
   const claim=await store.mutate(id,w=>{
    const mission=missionById(w,missionId),ops=mission.externalOperations ||= [];
    if(mission.status!=='running')throw new ProviderFailure('RECOVERY_BLOCKED');
    const previous=[...ops].reverse().find(o=>o.key===key);
    if(previous?.state==='SENDING')throw new ProviderFailure('RECOVERY_BLOCKED');
    if(previous?.state==='UNKNOWN'&&!previous.externalId&&!previous.repeatAuthorizedAt)throw new ProviderFailure('PROVIDER_OUTCOME_UNKNOWN',{outcomeUnknown:true});
    if(previous?.state==='UNKNOWN'&&previous.externalId&&!previous.repeatAuthorizedAt){previous.state='SENDING';previous.reconciliations=(previous.reconciliations||0)+1;return {...previous,resuming:true};}
    const c=w.creativeCampaigns.find(c=>c.id===mission.campaignId),limit=c?.recoveryPolicy?.stageLimit||3;
    if(ops.filter(o=>o.key===key).length>=limit)throw new ProviderFailure('RECOVERY_BLOCKED');
    const op={id:randomUUID(),key,campaignId:mission.campaignId,stage:label,provider:'openai',kind,state:'SENDING',startedAt:new Date().toISOString(),executionId:mission.executionId,reconciliation:'NOT_REQUIRED'};ops.push(op);return op;
   });operation=claim.result;
   const patch=fn=>store.mutate(id,w=>{const op=missionById(w,missionId).externalOperations.find(o=>o.id===operation.id);fn(op);});
   context={campaignId:m.campaignId,operationId:operation.id,resumeExternalId:operation.resuming?operation.externalId:null,costEntryId:operation.costEntryId,onExternalId:externalId=>patch(o=>{o.externalId=externalId;o.reconciliation='POLLING';}),onCostEntry:costEntryId=>patch(o=>{o.costEntryId=costEntryId;})};
  }
  let result;
  try{result=await (context?providerOperationContext.run(context,invoke):invoke());}
  catch(error){if(operation)await store.mutate(id,w=>{const mission=missionById(w,missionId),op=mission.externalOperations.find(o=>o.id===operation.id);const entry=w.aiCosts?.entries.find(e=>e.id===op.costEntryId);const unknown=error.outcomeUnknown===true||(!error.code&&entry?.status==='uncertain');Object.assign(op,{state:unknown?'UNKNOWN':'FAILED',endedAt:new Date().toISOString(),failure:failureInfo(error),usage:error.usage||null,partialOutput:error.partialOutput||null,externalId:error.externalId||op.externalId||null,reconciliation:unknown?'REQUIRES_RECONCILIATION':'NOT_REQUIRED'});});throw error;}

  // Keep paid results even if the user cancelled while the response was in flight.
  await store.mutate(id,w=>{
   const m=missionById(w,missionId);
   if(operation){const op=m.externalOperations.find(o=>o.id===operation.id);Object.assign(op,{state:'COMPLETE',endedAt:new Date().toISOString(),resultHash:digest(result),resultCheckpoint:key,usage:result.usage||null,externalId:result.externalId||op.externalId||null,reconciliation:'CONFIRMED'});}
   m.execution.checkpoints.push({key,kind,label,result,resultHash:digest(result),executionId:m.executionId,componentId,completedAt:new Date().toISOString()});
   m.tokens+=(result.tokens||0);if(kind==='image')m.images++;
  });
  return result;
 };
}
