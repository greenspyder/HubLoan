// Only server-side transports. ChatGPT connectors never supply runtime credentials.
export class MediaProviderError extends Error {constructor(code,status=502){super(code);this.code=code;this.status=status;}}
export const providerRegistry=Object.freeze([
 {id:'local',capabilities:['composition','annotations','captions','camera-2d'],authentication:'none',cost:'infrastructure-unknown'},
 {id:'elevenlabs',capabilities:['speech','alignment'],authentication:'xi-api-key',cost:'account-quota; monetary estimate unknown',liveValidated:false},
 {id:'higgsfield',capabilities:['image'],authentication:'Key',cost:'authenticated-estimate',catalog:'documented-adapter-subset; not full provider catalog',liveValidated:false}
]);
export const soulModel={id:'higgsfield-ai/soul/v2/standard',operation:'image',source:'https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference',verifiedAt:'2026-11-12',parameters:{batch_size:1,resolution:'720p',aspect_ratio:'9:16',enhance_prompt:false},accessVerified:false};
const origins={elevenlabs:'https://api.elevenlabs.io',higgsfield:'https://api.higgsfield.ai'};
export function createMediaProviders(fetcher=fetch){
 async function call(provider,key,path,{method='GET',body,signal,idempotencyKey}={}){
  if(!key)throw new MediaProviderError('PROVIDER_NOT_CONNECTED',409);
  if(!path.startsWith('/')||path.includes('..'))throw new MediaProviderError('INVALID_PROVIDER_PATH',400);
  let r;try{r=await fetcher(origins[provider]+path,{method,redirect:'error',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(90000)]),headers:{'Content-Type':'application/json',...(provider==='elevenlabs'?{'xi-api-key':key}:{Authorization:'Key '+key}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},...(body?{body:JSON.stringify(body)}:{})});}catch(e){if(e.name==='TimeoutError'||signal?.aborted)throw new MediaProviderError('PROVIDER_TIMEOUT',504);throw new MediaProviderError(method==='GET'?'PROVIDER_UNAVAILABLE':'PROVIDER_RESULT_UNCERTAIN');}
  if(!r.ok){let code='';try{const b=await r.json();code=String(b.detail?.status||b.detail?.code||'');}catch{/* Never reflect a raw provider body or credential. */}
   throw new MediaProviderError(r.status===401?'PROVIDER_AUTH_FAILED':r.status===403?'PROVIDER_PERMISSION_DENIED':r.status===402||/quota|credit|balance/i.test(code)?'PROVIDER_QUOTA_EXCEEDED':r.status===429?'PROVIDER_RATE_LIMIT':r.status>=500?'PROVIDER_RESULT_UNCERTAIN':'PROVIDER_REQUEST_REJECTED',r.status);
  }
  const chunks=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>16*1024*1024)throw new MediaProviderError('PROVIDER_RESPONSE_TOO_LARGE');chunks.push(chunk);}
  try{return {data:JSON.parse(Buffer.concat(chunks).toString()),requestId:r.headers.get('request-id')||r.headers.get('x-request-id')||null};}catch{throw new MediaProviderError('PROVIDER_INVALID_RESPONSE');}
 }
 return {
  async inspectEleven(key,signal){const [voices,models,subscription]=await Promise.all(['/v1/voices','/v1/models','/v1/user/subscription'].map(p=>call('elevenlabs',key,p,{signal})));return {voices:(voices.data.voices||[]).map(v=>({id:v.voice_id,name:v.name,labels:v.labels||{}})),models:models.data.filter(m=>m.can_do_text_to_speech).map(m=>({id:m.model_id,name:m.name,style:m.can_use_style===true,speakerBoost:m.can_use_speaker_boost===true,languages:m.languages||[],characterMultiplier:m.model_rates?.character_cost_multiplier??null})),quota:{tier:subscription.data.tier,used:subscription.data.character_count,limit:subscription.data.character_limit,reset:subscription.data.next_character_count_reset_unix},monetaryEstimate:null};},
  async speech(key,input,signal){const {data,requestId}=await call('elevenlabs',key,'/v1/text-to-speech/'+encodeURIComponent(input.voiceId)+'/with-timestamps?output_format=mp3_44100_128',{method:'POST',body:{text:input.text,model_id:input.model,language_code:'pt',voice_settings:input.settings},signal});
   const alignment=data.normalized_alignment||data.alignment;if(!data.audio_base64||!alignment||!Array.isArray(alignment.characters)||!alignment.characters.length||alignment.characters.length!==alignment.character_start_times_seconds?.length||alignment.characters.length!==alignment.character_end_times_seconds?.length)throw new MediaProviderError('INVALID_SPEECH_ALIGNMENT');
   if(alignment.character_end_times_seconds.some((n,i)=>!Number.isFinite(n)||!Number.isFinite(alignment.character_start_times_seconds[i])||n<alignment.character_start_times_seconds[i]||alignment.character_start_times_seconds[i]<0||(i&&n<alignment.character_end_times_seconds[i-1])))throw new MediaProviderError('INVALID_SPEECH_ALIGNMENT');
   return {base64:data.audio_base64,mime:'audio/mpeg',alignment,requestId,actualCost:null,provider:'elevenlabs',model:input.model,voiceId:input.voiceId,fallback:false};},
  async estimateImage(key,input,signal){if(input.model!==soulModel.id)throw new MediaProviderError('MODEL_ADAPTER_UNAVAILABLE',400);const {data}=await call('higgsfield',key,'/estimate/'+input.model,{method:'POST',body:{...soulModel.parameters,prompt:input.prompt},signal});const usd=(typeof data.usd==='number'||(typeof data.usd==='string'&&data.usd.trim()!==''))?Number(data.usd):NaN;return {usdMicros:Number.isFinite(usd)&&usd>=0?Math.ceil(usd*1e6):null,balance:null};},
  async submitImage(key,input,idempotencyKey,signal){if(input.model!==soulModel.id)throw new MediaProviderError('MODEL_ADAPTER_UNAVAILABLE',400);const {data}=await call('higgsfield',key,'/'+input.model,{method:'POST',body:{...soulModel.parameters,prompt:input.prompt},idempotencyKey,signal});if(!/^[a-zA-Z0-9-]{1,100}$/.test(data.request_id||''))throw new MediaProviderError('PROVIDER_RESULT_UNCERTAIN');return {requestId:data.request_id,status:data.status};},
  async statusImage(key,id,signal){if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new MediaProviderError('INVALID_JOB_ID');return (await call('higgsfield',key,'/requests/'+id+'/status',{signal})).data;},
  async cancelImage(key,id){if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new MediaProviderError('INVALID_JOB_ID');return (await call('higgsfield',key,'/requests/'+id+'/cancel',{method:'POST'})).data;}
 };
}
