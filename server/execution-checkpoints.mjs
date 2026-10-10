import { createHash } from 'node:crypto';
import { AppError, missionById } from './domain.mjs';
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function executionIntent(mission) { return digest(['production-v1',mission.title,mission.brief,mission.kind,mission.agentId]); }
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
  const result=await invoke();
  // Keep paid results even if the user cancelled while the response was in flight.
  await store.mutate(id,w=>{
   const m=missionById(w,missionId);
   m.execution.checkpoints.push({key,kind,label,result,resultHash:digest(result),executionId:m.executionId,componentId,completedAt:new Date().toISOString()});
   m.tokens+=(result.tokens||0);if(kind==='image')m.images++;
  });
  return result;
 };
}
