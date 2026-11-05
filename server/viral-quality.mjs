// Technical eligibility is not an artistic endorsement. Fail closed on old reports.
export function audiovisualEligibility(report){
 const reasons=[];
 if(report?.technicalStatus!=='TECHNICALLY_VALID')reasons.push('Renderização técnica não validada.');
 if(!(report?.voice?.neural>0)||report.voice.fallback!==0||report.voice.failures!==0)reasons.push('Voz neural não comprovada ou fallback utilizado.');
 if(!report?.music?.length)reasons.push('Nenhuma trilha autorizada foi utilizada.');
 const framing=report?.renderer?.framingQuality;
 if(!framing||framing.checked!==report?.renderer?.frames||!framing.checked)reasons.push('Enquadramento não verificado em todos os quadros.');
 else if(Object.values(framing.issues||{}).some(n=>n>0))reasons.push('Alertas geométricos pendentes; corrija antes de aprovar.');
 return {eligible:reasons.length===0,reasons,humanReviewRequired:true};
}
