import {preflightCosts} from './ai-costs.mjs';
import {createHash} from 'node:crypto';
export const credentialFingerprint=w=>createHash('sha256').update(JSON.stringify([w.secret,w.settings?.model])).digest('hex');
export function campaignRecovery(w,c,now=Date.now()){
 const jobs=(c.productionIds?.length?c.productionIds:[c.missionId]).map(id=>w.missions.find(m=>m.id===id)).filter(Boolean),failed=jobs.filter(m=>['failed','cancelled'].includes(m.status));
 const attempts=c.recoveryAttempts||[],policy={campaignLimit:3,stageLimit:3,...c.recoveryPolicy};
 const ops=failed.flatMap(m=>(m.externalOperations||[]).filter(o=>o.state==='UNKNOWN'&&!o.repeatAuthorizedAt));
 const legacy=failed.flatMap(m=>(w.aiCosts?.entries||[]).filter(e=>e.taskId===m.id&&!['not_sent','rejected'].includes(e.status)&&!(m.externalOperations||[]).some(o=>o.costEntryId===e.id)&&!m.legacyRecoveryAuthorized?.includes(e.id)));
 const needsAuthorization=legacy.length>0||ops.some(o=>!o.externalId)||failed.some(m=>m.failure?.code==='PROVIDER_RESPONSE_INVALID'),canReconcile=ops.some(o=>o.externalId),canReplaceExternal=canReconcile&&ops.filter(o=>o.externalId).every(o=>o.failure?.code==='PROVIDER_OUTCOME_UNKNOWN');
 const failure=failed.find(m=>m.failure)?.failure,code=failure?.code|| (needsAuthorization?'PROVIDER_OUTCOME_UNKNOWN':'EXECUTION_INTERRUPTED');
 let blocked='';
 if(!['Failed','Cancelled'].includes(c.state))blocked='A campanha não está interrompida.';
 else if(w.creativeDirector?.paused)blocked='Direção criativa pausada. Retome a direção primeiro.';
 else if(jobs.some(m=>['running','queued'].includes(m.status)))blocked='Uma etapa ainda está em execução ou na fila.';
 else if(!failed.length)blocked='A validação do resultado exige revisão do plano; não há tarefa interrompida.';
 else if(attempts.length>=policy.campaignLimit)blocked='Limite configurado de recuperação atingido. Revise a política da campanha.';
 else if(failed.some(m=>(m.externalOperations||[]).some(o=>o.state==='SENDING')))blocked='Operação em andamento. Aguarde a expiração do lease e recarregue.';
 else if(failed.some(m=>(m.externalOperations||[]).some(o=>o.state!=='COMPLETE'&&!m.execution?.checkpoints?.some(p=>p.key===o.key)&&m.externalOperations.findLast(p=>p.key===o.key)===o&&!(o.state==='UNKNOWN'&&o.externalId)&&m.externalOperations.filter(p=>p.key===o.key).length>=policy.stageLimit)))blocked='Limite da etapa atingido. Revise a política antes de continuar.';
 else if(failure?.requiresNewPlan)blocked='O plano retornado é inválido. Revise o briefing e solicite uma nova proposta; o resultado anterior foi preservado.';
 else if(failure?.retryAt>now)blocked='Aguarde o prazo de Retry-After.';
 else if(code==='AUTHENTICATION_FAILED'&&failed.some(m=>m.credentialFingerprint===credentialFingerprint(w)))blocked='Reconecte a chave nas configurações antes de retomar.';
 else if(code==='CONTENT_REJECTED')blocked='Conteúdo recusado: revise o briefing em uma nova proposta; não há repetição automática.';
 else if(['MODEL_UNAVAILABLE'].includes(code)&&failed.some(m=>m.credentialFingerprint===credentialFingerprint(w)))blocked='Corrija o briefing ou o modelo. Conteúdo recusado exige uma nova proposta.';
 else if(!w.secret&&failed.some(m=>m.kind!=='video'))blocked='Conecte o modelo da Astra nas configurações.';
 else if(!w.aiCosts?.enabled&&!canReconcile&&failed.some(m=>m.kind!=='video'))blocked='Ative o orçamento de IA nas configurações.';
 else if(failed.some(m=>!w.agents.some(a=>a.id===m.agentId&&a.enabled)))blocked='Reative o agente responsável.';
 if(!blocked)for(const m of failed.filter(m=>m.kind!=='video')){const pending=(m.externalOperations||[]).filter(o=>!m.execution?.checkpoints?.some(p=>p.key===o.key)&&m.externalOperations.findLast(p=>p.key===o.key)===o&&(o.state==='FAILED'||(o.state==='UNKNOWN'&&!o.externalId))).map(o=>o.kind);if(!m.externalOperations?.length&&!m.execution?.checkpoints?.length)pending.push('text');try{preflightCosts(w,m.id,[...new Set(pending)]);}catch(e){blocked=e.message;break;}}
 const completed=jobs.reduce((n,m)=>n+(m.execution?.checkpoints?.length||0),0);
 return {allowed:!blocked,blocked,needsAuthorization,canReconcile,canReplaceExternal,code,stage:failure?.stage||failed[0]?.phase||'Etapa pendente',completed,attempts:attempts.length,legacyResumes:c.resumes||0,policy,unknownOperations:ops.map(o=>({id:o.id,stage:o.stage,externalId:o.externalId||null})),legacyEntries:legacy.map(e=>e.id),status:jobs.some(m=>(m.externalOperations||[]).some(o=>o.state==='SENDING'&&o.externalId))?'WAITING_PROVIDER':blocked?'BLOCKED':needsAuthorization?'REQUIRES_AUTHORIZATION':canReconcile?'RECONCILE':'RECOVERABLE'};
}
