// Technical eligibility is not an artistic endorsement. Fail closed on old reports.
export function audiovisualEligibility(report){
 const reasons=[];
 if(report?.technicalStatus!=='TECHNICALLY_VALID')reasons.push('Renderização técnica não validada.');
 if(!(report?.voice?.neural>0)||report.voice.fallback!==0||report.voice.failures!==0)reasons.push('Voz neural não comprovada ou fallback utilizado.');
 if(!report?.music?.length)reasons.push('Nenhuma trilha autorizada foi utilizada.');
 return {eligible:reasons.length===0,reasons,humanReviewRequired:true};
}
