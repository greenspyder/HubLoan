import {randomUUID,createHash} from 'node:crypto';
import {AppError,encryptKey,decryptKey} from './domain.mjs';
import {createMediaProviders,providerRegistry,soulModel} from './media-providers/index.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const state=w=>w.multimodal||={revision:0,connections:{},ledger:[],dailyLimitMicros:0};
export function publicMultimodal(w){const s=w.multimodal;return {revision:s?.revision||0,dailyLimitMicros:s?.dailyLimitMicros||0,providers:providerRegistry.map(p=>{const c=s?.connections[p.id];return {...p,configured:!!c?.secret,status:c?.status||(p.id==='local'?'AVAILABLE':'DISCONNECTED'),error:c?.error||null,checkedAt:c?.checkedAt||null,voices:c?.voices||[],models:c?.models||(p.id==='higgsfield'?[soulModel]:[]),quota:c?.quota||null,balance:null};}),ledger:(s?.ledger||[]).map(({result,...e})=>({...e,hasResult:!!result})),narration:s?.narration||null,globalVoiceUnchanged:true};}
export function configureMultimodal(w,input,token){const s=state(w);if(input.revision!==s.revision)throw new AppError('Configuração mudou. Atualize.',409);
 if(input.action==='limit'){if(!Number.isSafeInteger(input.dailyLimitMicros)||input.dailyLimitMicros<0||input.dailyLimitMicros>100e6)throw new AppError('Limite diário inválido.');s.dailyLimitMicros=input.dailyLimitMicros;}
 else if(input.action==='connect'){if(!['elevenlabs','higgsfield'].includes(input.provider)||typeof input.key!=='string'||input.key.length<12||input.key.length>512||/[\r\n]/.test(input.key))throw new AppError('Credencial inválida.');s.connections[input.provider]={secret:encryptKey(input.key,token),status:'SAVED_NOT_VERIFIED'};}
 else if(input.action==='disconnect'){if(!['elevenlabs','higgsfield'].includes(input.provider))throw new AppError('Provedor inválido.');delete s.connections[input.provider];}
 else if(input.action==='narration'){const c=s.connections.elevenlabs,voice=c?.voices?.find(v=>v.id===input.voiceId),model=c?.models?.find(m=>m.id===input.model);if(!voice||!model||!model.languages.some(l=>l.language_id==='pt'))throw new AppError('Consulte uma voz e um modelo com português disponíveis.');s.narration={version:(s.narration?.version||0)+1,provider:'elevenlabs',voiceId:voice.id,model:model.id,settings:{stability:.6,similarity_boost:.75,...(model.style?{style:.15}:{})},approval:'TEST_PROFILE_ONLY',liveValidated:false};}
 else throw new AppError('Ação de provedor inválida.');s.revision++;return publicMultimodal(w);}
export async function refreshMediaProvider(store,id,token,provider,adapters=createMediaProviders()){
 if(provider!=='elevenlabs')throw new AppError('Higgsfield: saldo de API e catálogo completo não têm consulta implementada; uma estimativa autenticada verifica acesso ao adaptador selecionado.',409);
 const w=(await store.read(id)).workspace,connection=w.multimodal?.connections[provider];if(!connection?.secret)throw new AppError('PROVIDER_NOT_CONNECTED',409);const saved=JSON.stringify(connection.secret);
 let data,error;try{data=await adapters.inspectEleven(decryptKey(connection.secret,token));}catch(e){error=e.code||'PROVIDER_UNAVAILABLE';}
 await store.mutate(id,w=>{const s=state(w),c=s.connections[provider];if(JSON.stringify(c?.secret)!==saved)throw new AppError('Conexão mudou durante consulta.',409);Object.assign(c,data||{},{status:error?'ERROR':'CONNECTED',error:error||null,checkedAt:new Date().toISOString()});s.revision++;});
}
// A monetary ceiling is accounting exposure, not a provider-side price guarantee.
export function reserveMedia(w,{campaignId,operation,input,maxMicros,allowUnknownCost,allowUnknownBalance},now=Date.now()){
 const s=state(w);for(const e of s.ledger)if(e.status==='SENDING'&&now-Date.parse(e.createdAt)>300000){e.status='UNCERTAIN';e.error='WORKER_INTERRUPTED_NO_AUTOMATIC_RESUBMIT';}
 const c=w.creativeCampaigns?.find(c=>c.id===campaignId);if(!c||c.state!=='Rendering'||!c.mediaAuthorization)throw new AppError('MEDIA_BUDGET_NOT_AUTHORIZED',409);
 const key=hash([campaignId,operation,input]),existing=s.ledger.find(e=>e.key===key);if(existing)return existing;
 if(!Number.isSafeInteger(maxMicros)||maxMicros<=0||!allowUnknownCost||!allowUnknownBalance)throw new AppError('Autorize o limite e os custos/saldos não confirmados.',409);
 const auth=c.mediaAuthorization,day=new Date(now).toISOString().slice(0,10),entries=s.ledger;
 if(entries.some(e=>e.status==='SENDING'))throw new AppError('Uma operação de mídia por workspace.',409);
 if(entries.filter(e=>e.day===day).reduce((n,e)=>n+e.reservedMicros,0)+maxMicros>s.dailyLimitMicros||entries.filter(e=>e.campaignId===campaignId).reduce((n,e)=>n+e.reservedMicros,0)+maxMicros>auth.maxMicros)throw new AppError('MEDIA_BUDGET_EXCEEDED',409);
 if(entries.filter(e=>e.campaignId===campaignId).length>=6)throw new AppError('Limite de seis operações externas por campanha.',409);
 const entry={id:randomUUID(),key,campaignId,operation,inputHash:hash(input),reservedMicros:maxMicros,estimatedMicros:null,actualMicros:null,day,status:'RESERVED',createdAt:new Date(now).toISOString()};entries.push(entry);return entry;
}
export async function executeMediaOperation({store,id,token,campaignId,operation,input,maxMicros,signal,adapters=createMediaProviders()}){
 const w=(await store.read(id)).workspace,provider=operation==='speech'?'elevenlabs':'higgsfield',connection=w.multimodal?.connections[provider];if(!connection?.secret)throw new AppError('PROVIDER_NOT_CONNECTED: '+provider,409);
 const cached=w.multimodal.ledger.find(e=>e.key===hash([campaignId,operation,input])&&e.status==='COMPLETE');if(cached)return cached.result;
 const key=decryptKey(connection.secret,token);
 // Preflight reads/estimates before reserving or submitting any generation.
 let estimate=null;if(operation==='speech'){const account=await adapters.inspectEleven(key,signal),model=account.models.find(m=>m.id===input.model);if(!account.voices.some(v=>v.id===input.voiceId)||!model?.languages.some(l=>l.language_id==='pt'))throw new AppError('Modelo/voz não disponível para português.');const factor=model.characterMultiplier;if(!Number.isFinite(factor)||factor<=0||!Number.isFinite(account.quota.limit)||!Number.isFinite(account.quota.used)||input.text.length*factor>account.quota.limit-account.quota.used)throw new AppError('Cota de fala insuficiente ou não verificável.');if(input.settings.style!==undefined&&!model.style)throw new AppError('Style não suportado pelo modelo.');}
 else{estimate=(await adapters.estimateImage(key,input,signal)).usdMicros;if(estimate===null||estimate>maxMicros)throw new AppError('Estimativa visual indisponível ou maior que o limite autorizado.');}
 const {result:entry}=await store.mutate(id,w=>reserveMedia(w,{campaignId,operation,input,maxMicros,allowUnknownCost:true,allowUnknownBalance:true}));
 if(entry.status==='COMPLETE')return entry.result;
 if(['UNCERTAIN','FAILED','CANCELLED'].includes(entry.status)||(entry.status==='SENDING'&&!entry.requestId))throw new AppError('MEDIA_RESULT_UNCERTAIN: confira o provedor; envio não será repetido.',409);
 const change=fn=>store.mutate(id,w=>{const e=state(w).ledger.find(e=>e.id===entry.id);if(!e)throw new AppError('Operação desapareceu.');fn(e,w);});
 let claimed=!!entry.requestId;
 try{
  if(!entry.requestId){await change((e,w)=>{if(e.status!=='RESERVED')throw new AppError('Operação já iniciada.',409);const c=w.creativeCampaigns.find(c=>c.id===campaignId);if(c.state!=='Rendering')throw new AppError('Campanha cancelada.',409);e.status='SENDING';e.estimatedMicros=estimate;});claimed=true;}
  signal?.throwIfAborted();let result;
  if(operation==='speech')result=await adapters.speech(key,input,signal);
  else{let requestId=entry.requestId;if(!requestId){const submitted=await adapters.submitImage(key,input,entry.id,signal);requestId=submitted.requestId;await change(e=>{e.requestId=requestId;e.status='POLLING';});}
   const deadline=Date.now()+240000;let job;
   try{while(Date.now()<deadline){signal?.throwIfAborted();job=await adapters.statusImage(key,requestId,signal);if(['completed','failed','nsfw','canceled'].includes(job.status))break;await new Promise((resolve,reject)=>{const onAbort=()=>{clearTimeout(timer);reject(Error('Cancelled'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',onAbort);resolve();},1500);signal?.addEventListener('abort',onAbort,{once:true});});}}
   catch(e){if(signal?.aborted){try{await adapters.cancelImage(key,requestId);}catch{/* Cancellation is not guaranteed after processing starts. */}}throw e;}
   if(['failed','nsfw','canceled'].includes(job?.status)){await change(e=>{e.status=job.status==='canceled'?'CANCELLED':'FAILED';e.error='PROVIDER_JOB_'+job.status.toUpperCase();});throw new AppError('Job visual encerrado sem asset. Nenhum reenvio automático.',409);}
   if(job?.status!=='completed')throw new AppError('Imagem não concluída; job preservado para consulta.',409);
   const url=new URL(job.images?.[0]?.url);if(url.protocol!=='https:'||url.username||url.password||!(['images.higgs.ai','cdn.higgsfield.ai'].includes(url.hostname)||url.hostname.endsWith('.cloudfront.net')))throw new AppError('MEDIA_DOWNLOAD_HOST_NOT_VERIFIED',409);
   const response=await fetch(url,{redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(30000)].filter(Boolean))});if(!response.ok)throw new AppError('Asset indisponível.');const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>12e6)throw new AppError('Asset excede limite.');chunks.push(chunk);}const bytes=Buffer.concat(chunks);
   result={base64:bytes.toString('base64'),mime:'image/png',provenance:{provider:'higgsfield',requestId,model:input.model,source:url.origin+url.pathname,sha256:createHash('sha256').update(bytes).digest('hex'),rights:'Generated via authenticated API; human rights review required'}};
  }
  await change(e=>{e.status='COMPLETE';e.result=result;e.completedAt=new Date().toISOString();});return result;
 }catch(e){if(claimed)await change(x=>{if(['FAILED','CANCELLED'].includes(x.status))return;x.status=x.requestId?'POLLING':'UNCERTAIN';x.error=e.code||'MEDIA_OPERATION_NOT_COMPLETED';});throw e;}
}
