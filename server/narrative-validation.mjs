// Semantic roles are format contracts, not artistic approval. Legacy labels remain valid.
export class PlanValidationError extends Error {
 constructor(rule,field,message,details={}){super(`${rule}: ${message} (${field})`);this.code='CREATIVE_PLAN_INVALID';this.rule=rule;this.field=field;this.category='creative';this.details=details;}
}
export const narrativeRoles={
 traditional:[['hook','setup','introduction'],['development','escalation'],['payoff','conclusion','reveal']],
 comedy:[['hook','setup','premise'],['development','situation','escalation','distortion'],['payoff','twist','punchline','reaction','comic-cut','anticlimax']],
 meme:[['premise','hook','setup'],['distortion','situation','development','escalation'],['reaction','comic-cut','payoff','twist']],
 montage:[['opening','setup','hook'],['variation','progression','escalation','development'],['resolution','payoff','conclusion']],
 commentary:[['explanation','setup','hook'],['evidence','development','escalation'],['conclusion','payoff']]
};
// This object is sent to generators and repairers and is also enforced below.
export function narrativeContract(kind='traditional'){
 const roles=Object.hasOwn(narrativeRoles,kind)?narrativeRoles[kind]:null;if(!roles)throw new PlanValidationError('NARRATIVE_KIND','narrativeKind','Estrutura narrativa desconhecida');
 return {version:2,kind,minScenes:3,opening:{position:'first',allowed:roles[0]},progression:{position:'interior',minimum:1,allowed:roles[1]},ending:{position:'last',allowed:roles[2]},allowed:[...new Set(roles.flat())]};
}
export function validateNarrative(scenes,kind='traditional'){
 const c=narrativeContract(kind);
 if(!Array.isArray(scenes)||scenes.length<c.minScenes)throw new PlanValidationError('NARRATIVE_STRUCTURE','scenes','São necessárias abertura, cena intermediária e conclusão');
 // Invalid vocabulary is a different failure from a missing structural role.
 for(const [i,s] of scenes.entries())if(!c.allowed.includes(s?.beat))throw new PlanValidationError('NARRATIVE_ROLE',`scenes.${i}.beat`,'Papel incompatível com o contrato',{allowed:c.allowed});
 if(!c.opening.allowed.includes(scenes[0].beat))throw new PlanValidationError('NARRATIVE_OPENING','scenes.0.beat',`Início esperado: ${c.opening.allowed.join(', ')}`,{allowed:c.opening.allowed});
 if(!c.ending.allowed.includes(scenes.at(-1).beat))throw new PlanValidationError('NARRATIVE_ENDING',`scenes.${scenes.length-1}.beat`,`Desfecho esperado: ${c.ending.allowed.join(', ')}`,{allowed:c.ending.allowed});
 if(!scenes.slice(1,-1).some(s=>c.progression.allowed.includes(s.beat)))throw new PlanValidationError('NARRATIVE_PROGRESSION','scenes',`Progressão ausente nas cenas intermediárias; papéis permitidos: ${c.progression.allowed.join(', ')}`,{candidateIndices:scenes.slice(1,-1).map((_,i)=>i+1),allowed:c.progression.allowed,minimum:1});
}
export function validateNarrativeFormat(kind,format){
 const compatible={comedy:['comedy','meme','traditional'],battle:['traditional'],mystery:['traditional']};
 if(compatible[format]&&!compatible[format].includes(kind))throw new PlanValidationError('NARRATIVE_FORMAT','narrativeKind','Estrutura incompatível com o adaptador',{format,allowed:compatible[format]});
}
// Only lexical equivalence can be inferred locally; never infer a story beat from position.
export function normalizeNarrative(plan,kind){
 if(!plan||!Array.isArray(plan.scenes)||plan.scenes.some(s=>!s||typeof s!=='object'))throw new PlanValidationError('MODEL_OUTPUT_INVALID','scenes','Lista de cenas inválida');
 const allowed=narrativeContract(kind).allowed,copy=structuredClone(plan),changes=[];
 const aliases={gancho:'hook',situacao:'situation',desenvolvimento:'development',escalada:'escalation',distorcao:'distortion',premissa:'premise',reacao:'reaction',conclusao:'conclusion',introducao:'introduction',evidencia:'evidence',variacao:'variation',resolucao:'resolution'};
 for(const [i,s] of (copy.scenes||[]).entries()){
  if(typeof s.beat!=='string')continue;
  const key=s.beat.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),beat=aliases[key]||key;
  if(allowed.includes(beat)&&beat!==s.beat){changes.push({field:`scenes.${i}.beat`,source:'LEXICAL_NORMALIZATION'});s.beat=beat;}
 }
 return {plan:copy,changes};
}
export const narrativeKindFor=f=>f==='comedy'||f==='absurd-documentary'?'comedy':f==='montage'?'montage':f==='visual-commentary'?'commentary':'traditional';
// Only the failed scalar field can change. Model output never becomes executable code or a broad patch.
export function applyTargetedRepair(original,error,response){
 const path=error.field;if(!(error instanceof PlanValidationError)||!/^(?:scenes\.\d+\.(?:beat|end|seconds|motion)|seconds|narrativeKind)$/.test(path))throw error;
 if(!response||response.field!==path||!['string','number'].includes(typeof response.value))throw new PlanValidationError('REPAIR_SCOPE',path,'Reparo deve alterar somente o campo indicado');
 const copy=structuredClone(original),parts=path.split('.');let node=copy;for(const key of parts.slice(0,-1)){node=node?.[key];if(!node)throw error;}node[parts.at(-1)]=response.value;return copy;
}
