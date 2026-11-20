import {PlanValidationError,narrativeContract,normalizeNarrative,applyTargetedRepair} from './narrative-validation.mjs';

export const NARRATIVE_REPAIR_RULES=`Corrija somente a falha informada, respeitando contract. Não mude orçamento, duração, recursos, ações, câmeras ou roteiro externo.
Para NARRATIVE_PROGRESSION inspecione TODAS as cenas intermediárias em diagnosis.candidateIndices. Responda JSON:
{mode:"relabel",sceneIndex,beat,evidence:{field,quote},reason} se o conteúdo existente já representa progressão. Cite trecho literal substancial de goal, mechanism, prompt, narration ou script.N. Explique a relação narrativa; o índice da cena não é evidência.
Se a progressão realmente não existe, {mode:"revise",sceneIndex,beat,changes:{goal,mechanism,title,prompt,narration},reason}. Revise somente UMA cena intermediária, somente os campos em revisionFields; mantenha intenção e recursos existentes. Narração não pode aumentar de tamanho nem ser adicionada a uma cena silenciosa. Não mude campos não necessários.
Se não houver reparo dentro desses limites, {mode:"unrepairable",reason}.
Para outras falhas, JSON {field,value} alterando exclusivamente o campo indicado. Não troque narrativeKind para burlar validação.`;

function reject(message){throw new PlanValidationError('REPAIR_SCOPE','scenes',message);}
export function applyProgressionRepair(plan,error,response,{kind,script=[]}={}){
 const contract=narrativeContract(kind),r=response;
 if(error.rule!=='NARRATIVE_PROGRESSION')throw error;
 if(r?.mode==='unrepairable')throw new PlanValidationError('NARRATIVE_UNREPAIRABLE','scenes','Progressão não reparável dentro dos recursos e roteiro autorizados');
 if(!r||!['relabel','revise'].includes(r.mode)||!error.details.candidateIndices.includes(r.sceneIndex)||!contract.progression.allowed.includes(r.beat)||typeof r.reason!=='string'||r.reason.trim().length<12)reject('Reparo exige cena intermediária, papel permitido e justificativa');
 const allowed=r.mode==='relabel'?['mode','sceneIndex','beat','evidence','reason']:['mode','sceneIndex','beat','changes','reason'];
 if(Object.keys(r).some(k=>!allowed.includes(k)))reject('Campo fora do escopo de reparo');
 const copy=structuredClone(plan),scene=copy.scenes[r.sceneIndex];
 if(r.mode==='relabel'){
  const e=r.evidence;let source;
  if(['goal','mechanism','prompt','narration'].includes(e?.field))source=scene[e.field];
  else if(/^script\.\d+$/.test(e?.field||'')&&Number(e.field.split('.')[1])===scene.narration)source=script[scene.narration];
  if(typeof source!=='string'||typeof e?.quote!=='string'||e.quote.trim().length<8||!source.includes(e.quote))reject('Reclassificação exige citação verificável do conteúdo da cena');
 }else{
  // Legacy 3D plans reference an external script: do not rewrite it or invent new actions.
  if(typeof scene.goal!=='string'||typeof scene.prompt!=='string')reject('Este adaptador não permite revisão textual de cena sem novo roteiro');
  const changes=r.changes;
  if(!changes||!Object.keys(changes).length||Object.entries(changes).some(([k,v])=>!['goal','mechanism','title','prompt','narration'].includes(k)||typeof v!=='string'||v===scene[k]))reject('Revisão deve alterar apenas conteúdo textual necessário de uma cena');
  if('narration' in changes&&changes.narration.length>(scene.narration||'').length)reject('Revisão não pode aumentar consumo de voz');
  Object.assign(scene,changes);
 }
 scene.beat=r.beat;return copy;
}

// One bounded repair, shared by legacy and one-line campaigns. The caller supplies the existing
// budgeted/checkpointed provider; provider failures propagate, never become creative retries.
export async function validateWithNarrativeRepair({plan,kind,validate,requestRepair,script=[],onDiagnostic=async()=>{}}){
 const normalized=normalizeNarrative(plan,kind),repairs=[...normalized.changes];let draft=normalized.plan,error;
 try{return {plan:validate(draft),draft,repairs};}catch(e){if(!(e instanceof PlanValidationError))throw e;error=e;}
 await onDiagnostic({rule:error.rule,field:error.field,candidateIndices:error.details.candidateIndices||[],status:'DIAGNOSED'});
 if(['NARRATIVE_KIND','NARRATIVE_FORMAT','NARRATIVE_STRUCTURE'].includes(error.rule))throw error;
 const payload={plan:draft,script,contract:narrativeContract(kind),rule:error.rule,field:error.field,diagnosis:error.details,message:error.message,revisionFields:typeof draft.scenes?.[1]?.goal==='string'?['goal','mechanism','title','prompt','narration']:[]};
 await onDiagnostic({rule:error.rule,field:error.field,candidateIndices:error.details.candidateIndices||[],status:'REPAIR_REQUESTED'});
 const result=await requestRepair(payload);
 let response;try{if(result.truncated)throw Error();response=JSON.parse(result.output);}catch{throw new PlanValidationError('MODEL_OUTPUT_INVALID',error.field,'Resposta de reparo incompleta ou JSON inválido');}
 draft=error.rule==='NARRATIVE_PROGRESSION'?applyProgressionRepair(draft,error,response,{kind,script}):applyTargetedRepair(draft,error,response);
 // Full adapter validation is mandatory after the patch, not just beat membership.
 let validated;try{validated=validate(draft);}catch(e){await onDiagnostic({rule:e.rule||'ADAPTER_VALIDATION',field:e.field||'scenes',status:'REPAIR_REJECTED'});throw e;}
 await onDiagnostic({rule:error.rule,field:error.field,sceneIndex:response.sceneIndex,status:'REPAIR_VALIDATED'});
 repairs.push({rule:error.rule,field:error.field,sceneIndex:response.sceneIndex,mode:response.mode||'scalar',source:'MODEL_TARGETED_REPAIR'});
 return {plan:validated,draft,repairs};
}
