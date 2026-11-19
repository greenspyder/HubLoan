// Semantic roles are format contracts, not artistic approval. Legacy labels remain valid.
export class PlanValidationError extends Error {
 constructor(rule,field,message){super(`${rule}: ${message} (${field})`);this.code='CREATIVE_PLAN_INVALID';this.rule=rule;this.field=field;this.category='creative';}
}
export const narrativeRoles={
 traditional:[['hook','setup','introduction'],['development','escalation'],['payoff','conclusion','reveal']],
 comedy:[['hook','setup','premise'],['development','situation','escalation','distortion'],['payoff','twist','punchline','reaction','comic-cut','anticlimax']],
 meme:[['premise','hook','setup'],['distortion','situation','development','escalation'],['reaction','comic-cut','payoff','twist']],
 montage:[['opening','setup','hook'],['variation','progression','escalation','development'],['resolution','payoff','conclusion']],
 commentary:[['explanation','setup','hook'],['evidence','development','escalation'],['conclusion','payoff']]
};
export function validateNarrative(scenes,kind='traditional'){
 const roles=narrativeRoles[kind];if(!roles)throw new PlanValidationError('NARRATIVE_KIND','narrativeKind','Estrutura narrativa desconhecida');
 if(!roles[0].includes(scenes[0]?.beat))throw new PlanValidationError('NARRATIVE_OPENING','scenes.0.beat',`Início esperado: ${roles[0].join(', ')}`);
 if(!roles[2].includes(scenes.at(-1)?.beat))throw new PlanValidationError('NARRATIVE_ENDING',`scenes.${scenes.length-1}.beat`,`Desfecho esperado: ${roles[2].join(', ')}`);
 if(!scenes.slice(1,-1).some(s=>roles[1].includes(s.beat)))throw new PlanValidationError('NARRATIVE_PROGRESSION','scenes.1.beat',`Progressão esperada: ${roles[1].join(', ')}`);
 for(const [i,s] of scenes.entries())if(!roles.flat().includes(s.beat))throw new PlanValidationError('NARRATIVE_ROLE',`scenes.${i}.beat`,'Papel incompatível com o formato');
}
export const narrativeKindFor=f=>f==='comedy'||f==='absurd-documentary'?'comedy':f==='montage'?'montage':f==='visual-commentary'?'commentary':'traditional';
// Only the failed scalar field can change. Model output never becomes executable code or a broad patch.
export function applyTargetedRepair(original,error,response){
 const path=error.field;if(!(error instanceof PlanValidationError)||!/^(?:scenes\.\d+\.(?:beat|end|seconds|motion)|seconds|narrativeKind)$/.test(path))throw error;
 if(!response||response.field!==path||!['string','number'].includes(typeof response.value))throw new PlanValidationError('REPAIR_SCOPE',path,'Reparo deve alterar somente o campo indicado');
 const copy=structuredClone(original),parts=path.split('.');let node=copy;for(const key of parts.slice(0,-1)){node=node?.[key];if(!node)throw error;}node[parts.at(-1)]=response.value;return copy;
}
