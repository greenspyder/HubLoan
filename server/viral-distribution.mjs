import {AppError,missionById,text} from './domain.mjs';
import {releaseVersion} from './shop-release.mjs';
export function audienceAction(w,e,action,input,now){
 if(e.kind!=='audience')throw new AppError('Experimento não é de audiência.');
 const m=missionById(w,input.missionId);if(!e.missionIds.includes(m.id)||!m.liveShort)throw new AppError('Vídeo não pertence ao experimento.');
 if(action==='audience-kit'){
  if(m.status!=='approved'||!m.artifact)throw new AppError('Revise e aprove o vídeo primeiro.',409);
  m.assistedPublication={version:releaseVersion(m),experimentId:e.id,title:m.title,description:text(input.description||m.liveShort.hypothesis,'Descrição',1000),hashtags:['#Lume','#SeedSnake','#Personagens3D'],status:'PREPARED_NOT_PUBLISHED',checklist:['Rever imagem, áudio e legendas','Confirmar licenças e regras do canal','Escolher privacidade e publicar manualmente','Registrar URL e métricas observadas'],preparedAt:new Date(now).toISOString()};return;
 }
 if(action==='audience-published'){
  if(m.status!=='approved'||!m.artifact||input.version!==releaseVersion(m))throw new AppError('Aprove a versão atual antes de registrar publicação.',409);
  let url;try{url=new URL(input.url);}catch{throw new AppError('URL inválida.');}if(url.protocol!=='https:'||!['www.tiktok.com','tiktok.com','www.youtube.com','youtube.com','www.instagram.com','instagram.com'].includes(url.hostname)||url.username||url.password)throw new AppError('Informe a URL pública do canal permitido.');
  if((w.experiments||[]).some(x=>x.audiencePublications?.some(p=>p.url===url.href)))throw new AppError('URL já atribuída a um experimento.',409);
  const publication={missionId:m.id,version:input.version,url:url.href,reportedAt:new Date(now).toISOString(),origin:'OPERATOR_REPORTED_NOT_API_VERIFIED'};
  e.audiencePublications||=[];if(e.audiencePublications.some(p=>p.missionId===m.id))throw new AppError('Publicação já registrada.',409);e.audiencePublications.push(publication);return;
 }
 if(action==='audience-observed'){
  const p=e.audiencePublications?.find(p=>p.missionId===m.id);if(!p)throw new AppError('Registre a publicação primeiro.');
  const at=Date.parse(input.observedAt);if(!Number.isFinite(at)||at>now||at<Date.parse(p.reportedAt))throw new AppError('Data de observação inválida.');
  const metrics={};for(const k of ['views','likes','comments','shares','followers']){const v=input[k];if(v==null){metrics[k]=null;continue;}if(!Number.isSafeInteger(v)||v<0||v>1e10)throw new AppError('Contagem inválida.');metrics[k]=v;}
  for(const k of ['retention','averageWatchSeconds']){const v=input[k];if(v==null){metrics[k]=null;continue;}if(!Number.isFinite(v)||v<0||v>(k==='retention'?1:3600))throw new AppError('Métrica inválida.');metrics[k]=v;}
  if(metrics.followers!=null&&!input.attributionEvidence)throw new AppError('Seguidores exigem evidência de atribuição.');
  e.audienceObservations||=[];if(e.audienceObservations.length>=200)throw new AppError('Limite de observações.');if(e.audienceObservations.some(o=>o.missionId===m.id&&o.observedAt===new Date(at).toISOString()))throw new AppError('Snapshot duplicado.',409);
  e.audienceObservations.push({missionId:m.id,version:p.version,observedAt:new Date(at).toISOString(),recordedAt:new Date(now).toISOString(),origin:'MANUAL_OBSERVATION',evidence:text(input.evidence,'Evidência',1000),attributionEvidence:input.attributionEvidence?text(input.attributionEvidence,'Atribuição',1000):null,metrics});return;
 }
 throw new AppError('Ação de audiência inválida.');
}
export function audienceLearning(e){
 const latest=new Map();for(const o of e.audienceObservations||[]){if(!latest.has(o.missionId)||latest.get(o.missionId).observedAt<o.observedAt)latest.set(o.missionId,o);}
 return {id:e.id,hypothesis:{kind:'HYPOTHESIS',text:e.hypothesis},observations:[...latest.values()],publications:e.audiencePublications||[],inference:{kind:'INFERENCE',text:latest.size?'Compare períodos, formato e custo; contagens manuais não comprovam causalidade nem viralidade.':'Sem resultados observados; não inferir desempenho.'},recommendation:latest.size?'REVIEW_OBSERVED_RESULTS':'COLLECT_EVIDENCE',costs:e.costs.filter(c=>!c.voidedAt),budgetMinor:e.budgetMinor};
}
