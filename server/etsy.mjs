import { randomBytes, createHash } from 'node:crypto';
import { AppError, encryptKey, decryptKey, text } from './domain.mjs';
import { sampleFingerprint } from './validation.mjs';
import { originalityCurrent, originalityFingerprint } from './market-references.mjs';
const scopes=['shops_r','listings_r','listings_w','transactions_r'];
const positive=(n)=>Number.isSafeInteger(n)&&n>0;
export function publicEtsy(w) {const c=w.etsy||{};return {implemented:true,configured:Boolean(c.config),connected:Boolean(c.secret),shopId:c.shopId,shopName:c.shopName,currency:c.currency,error:c.error||'',redirectUri:c.redirectUri,mode:c.secret?'integrated-human-approved':'configuration-required',level:c.secret?2:0,note:'API oficial: rascunho, imagens, arquivo digital e publicação após revisão. Sincronização sob demanda; taxas e conciliação ainda exigem revisão. Sem autonomia de publicação.'};}
export function createEtsyProvider(fetcher=fetch){
 async function req(path,config,access,method='GET',body){
  let r;try{r=await fetcher(`https://api.etsy.com/v3/${path}`,{method,headers:{'x-api-key':`${config.clientId}:${config.sharedSecret}`,...(access?{Authorization:`Bearer ${access}`} : {}),...(body instanceof URLSearchParams?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body,redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new AppError('Etsy não confirmou a operação. Confira o estado antes de repetir.',502);}
  if(!r.ok)throw new AppError(r.status===429?'Limite Etsy atingido. Aguarde o Retry-After e confira o estado; não houve repetição automática.':`Etsy recusou a operação (HTTP ${r.status}). Confira permissões/configuração.`,r.status===429?429:502);
  return r.json();
 }
 return {token:(c,b)=>req('public/oauth/token',c,null,'POST',new URLSearchParams(b)),get:(c,a,p)=>req(`application/${p}`,c,a),post:(c,a,p,b)=>req(`application/${p}`,c,a,'POST',b),patch:(c,a,p,b)=>req(`application/${p}`,c,a,'PATCH',new URLSearchParams(b))};
}
export function createEtsy(store,{masterKey,provider=createEtsyProvider(),callbackOrigin='https://hubloan.onrender.com'}={}){
 const locks=new Set();
 const seal=value=>{if(!masterKey)throw new AppError('Configure chave estável de criptografia no servidor para OAuth Etsy.');return encryptKey(JSON.stringify(value),masterKey);};
 const open=value=>JSON.parse(decryptKey(value,masterKey));
 async function locked(id,op){if(locks.has(id))throw new AppError('Operação Etsy em andamento.',409);locks.add(id);try{return await op();}finally{locks.delete(id);}}
 async function configure(id,input){
  const config={clientId:text(input.clientId,'Keystring Etsy',200),sharedSecret:text(input.sharedSecret,'Shared secret Etsy',200)};
  if(Object.values(config).some(s=>/\s/.test(s)))throw new AppError('Credenciais Etsy inválidas.');
  if(!positive(input.shopId))throw new AppError('Informe o ID numérico da sua loja.');
  const redirectUri=`${callbackOrigin.replace(/\/$/,'')}/api/agents/etsy/callback`;if(!redirectUri.startsWith('https://'))throw new AppError('OAuth exige callback HTTPS configurado no servidor.');
  const encrypted=seal(config);
  return store.mutate(id,w=>{if(w.experiments?.some(e=>e.marketplace?.etsy&&['creating','uploading','activating','uncertain'].includes(e.marketplace.etsy.status)))throw new AppError('Concilie a publicação pendente antes de trocar a loja.',409);w.etsy={config:encrypted,shopId:input.shopId,redirectUri,error:''};});
 }
 async function authorize(id){
  const {workspace:w}=await store.read(id);if(!w.etsy?.config)throw new AppError('Configure sua aplicação Etsy.');
  const c=open(w.etsy.config),verifier=randomBytes(32).toString('base64url'),state=`${id}.${randomBytes(32).toString('hex')}`;
  await store.mutate(id,w=>{w.etsy.oauth={state,verifier:seal(verifier),expiresAt:Date.now()+600000};});
  return {url:`https://www.etsy.com/oauth/connect?${new URLSearchParams({response_type:'code',client_id:c.clientId,redirect_uri:w.etsy.redirectUri,scope:scopes.join(' '),state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'})}`};
 }
 async function callback(state,code){
  if(!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(state||''))throw new AppError('Estado OAuth inválido.',403);
  const id=state.split('.')[0];return locked(id,async()=>{
   const {workspace:w,result:o}=await store.mutate(id,w=>{const o=w.etsy?.oauth;if(!o||o.state!==state||o.expiresAt<Date.now())throw new AppError('Autorização vencida ou já utilizada.',403);delete w.etsy.oauth;return o;});
   const c=open(w.etsy.config),grant=await provider.token(c,{grant_type:'authorization_code',client_id:c.clientId,redirect_uri:w.etsy.redirectUri,code:text(code,'Código Etsy',2000),code_verifier:open(o.verifier)});
   validateGrant(grant);const shop=await provider.get(c,grant.access_token,`users/${grant.access_token.split('.')[0]}/shops`);
   if(shop.shop_id!==w.etsy.shopId)throw new AppError('Autorize o proprietário da loja configurada.',403);
   return store.mutate(id,current=>{if(JSON.stringify(current.etsy?.config)!==JSON.stringify(w.etsy.config))throw new AppError('Configuração mudou; autorize novamente.',409);current.etsy.secret=seal({...grant,expiresAt:Date.now()+grant.expires_in*1000});current.etsy.shopName=shop.shop_name;current.etsy.currency=shop.currency_code;current.etsy.error='';});
  });
 }
 function validateGrant(g){if(typeof g.access_token!=='string'||typeof g.refresh_token!=='string'||!positive(g.expires_in)||!/^\d+\./.test(g.access_token))throw new AppError('Tokens Etsy inválidos.',502);if(typeof g.scope==='string'&&scopes.some(s=>!g.scope.split(' ').includes(s)))throw new AppError('Permissões insuficientes: autorize todos os escopos necessários.');}
 async function credentials(id){
  const {workspace:w}=await store.read(id);if(!w.etsy?.secret)throw new AppError('Autorize Etsy primeiro.');const c=open(w.etsy.config);let g=open(w.etsy.secret);
  if(g.expiresAt<Date.now()+60000){g=await provider.token(c,{grant_type:'refresh_token',client_id:c.clientId,refresh_token:g.refresh_token});validateGrant(g);g={...g,expiresAt:Date.now()+g.expires_in*1000};await store.mutate(id,w=>{w.etsy.secret=seal(g);});}
  return {c,a:g.access_token,w};
 }
 function check(w,e,input){
  if(!e||e.marketplace?.channel!=='etsy'||e.closedAt||Date.parse(e.endsAt)<=Date.now())throw new AppError('Escolha uma oferta Etsy em teste ativo.',409);
  if(!e.validation?.evidence||Date.now()-Date.parse(e.validation.evidence.observedAt)>30*86400000)throw new AppError('Atualize a evidência de demanda antes de publicar.',409);
  const m=w.missions.find(m=>m.id===e.validation?.sampleId);
  if(!m?.artifact||!['review','approved'].includes(m.status)||!e.validation?.quality?.approved||e.validation.quality.fingerprint!==sampleFingerprint(m)||!originalityCurrent(w,e))throw new AppError('Revise a amostra atual e sua originalidade antes de publicar.',409);
  if(input.authorize!==true||input.eligible!==true)throw new AppError('Confirme direitos, elegibilidade Etsy e autorização desta publicação.');
  if(!positive(input.taxonomyId)||!positive(input.priceMinor))throw new AppError('Informe categoria Etsy e preço na moeda da loja.');
  const tags=e.marketplace.tags.split(',').map(t=>t.trim()).filter(Boolean);if(!tags.length||tags.length>13||tags.some(t=>t.length>20))throw new AppError('Etsy aceita até 13 tags de até 20 caracteres. Separe por vírgulas.');
  if(!m.artifact.preview && m.artifact.mime!=='image/png')throw new AppError('Esta entrega precisa de imagem de apresentação antes de publicar.');
  if(Buffer.from(m.artifact.base64,'base64').length>20*1024*1024)throw new AppError('Arquivo digital excede 20 MB; reduza o pack.');
  return {m,tags,fingerprint:originalityFingerprint(e,m)};
 }
 async function publish(id,eid,input){return locked(id,async()=>{
  const {c,a,w}=await credentials(id),e=w.experiments?.find(e=>e.id===eid),{m,tags,fingerprint}=check(w,e,input);
  if(e.marketplace.observation||e.marketplace.publication)throw new AppError('Oferta já publicada/observada. Confira o listing existente.',409);
  if(e.marketplace.etsy)throw new AppError('Envio Etsy já iniciado. Concilie o listing existente antes de qualquer repetição.',409);
  const shopId=w.etsy.shopId,base=`shops/${shopId}/listings`;
  // Persist intent before the first external side effect. Never repeat a POST after uncertainty.
  await store.mutate(id,w=>{const e=w.experiments.find(e=>e.id===eid);const current=check(w,e,input);if(current.fingerprint!==fingerprint||w.etsy?.shopId!==shopId)throw new AppError('Oferta ou loja mudou antes do envio.',409);if(e.marketplace.etsy)throw new AppError('Envio já iniciado.',409);e.marketplace.etsy={status:'creating',shopId,fingerprint,priceMinor:input.priceMinor,taxonomyId:input.taxonomyId,currency:w.etsy.currency};});
  try{
   const draft=await provider.post(c,a,base,new URLSearchParams({quantity:'1',title:e.marketplace.title,description:e.marketplace.description+'\n\nCreated with AI assistance and human review.\n'+e.marketplace.license,price:String(input.priceMinor/100),who_made:'i_did',when_made:'2020_2026',taxonomy_id:String(input.taxonomyId),type:'download',is_supply:'false',should_auto_renew:'false',tags:tags.join(',')}));
   if(!positive(draft.listing_id))throw new AppError('Listing não confirmado.',502);
   const listingId=draft.listing_id;
   await store.mutate(id,w=>{w.experiments.find(e=>e.id===eid).marketplace.etsy={...w.experiments.find(e=>e.id===eid).marketplace.etsy,listingId,status:'uploading'};});
   const image=new FormData();image.append('image',new Blob([Buffer.from(m.artifact.preview||m.artifact.base64,'base64')],{type:'image/png'}),'preview.png');
   await provider.post(c,a,`${base}/${listingId}/images`,image);
   const file=new FormData();file.append('file',new Blob([Buffer.from(m.artifact.base64,'base64')],{type:m.artifact.mime}),m.artifact.filename||'pack.zip');file.append('name',m.artifact.filename||'pack.zip');
   await provider.post(c,a,`${base}/${listingId}/files`,file);
   await store.mutate(id,w=>{const e=w.experiments.find(e=>e.id===eid);const current=check(w,e,input);if(current.fingerprint!==fingerprint)throw new AppError('Oferta mudou durante o envio; rascunho exige revisão.',409);e.marketplace.etsy.status='activating';});
   const active=await provider.patch(c,a,`${base}/${listingId}`,{state:'active',type:'download'});
   if(active.state!=='active'||active.listing_id!==listingId)throw new AppError('Ativação não confirmada.',502);
   return await recordActive(id,eid,listingId,active);
  }catch(error){await store.mutate(id,w=>{const e=w.experiments.find(e=>e.id===eid);e.marketplace.etsy.status='uncertain';e.marketplace.etsy.error=error instanceof AppError?error.message:'Envio interrompido. Confira Etsy antes de repetir.';if(w.etsy)w.etsy.error=e.marketplace.etsy.error;});throw error;}
 });}
 async function recordActive(id,eid,listingId,active){return store.mutate(id,w=>{const e=w.experiments.find(e=>e.id===eid);if(e.marketplace.etsy.listingId!==listingId)throw new AppError('Listing mudou.',409);const url=`https://www.etsy.com/listing/${listingId}`;if(w.experiments.some(x=>x.id!==eid&&(x.marketplace?.publication?.listing===url||x.marketplace?.observation?.listing===url)))throw new AppError('Listing já atribuído a outro teste.',409);e.marketplace.etsy.status='active';delete e.marketplace.etsy.error;e.marketplace.publication={listing:`https://www.etsy.com/listing/${listingId}`,origin:'etsy-api',at:new Date().toISOString()};e.marketplace.status='published-api';if(w.etsy)w.etsy.error='';e.review=null;});}
 async function reconcile(id,eid,input){return locked(id,async()=>{
  const {c,a,w}=await credentials(id),e=w.experiments?.find(e=>e.id===eid),p=e?.marketplace?.etsy;if(!p)throw new AppError('Envio não encontrado.');if(p.shopId!==w.etsy.shopId)throw new AppError('Reconecte a loja original deste listing.',409);
  const listingId=p.listingId||Number(input.listingId);if(!positive(listingId))throw new AppError('Informe o listing criado após conferir sua loja. Não repita a criação.');
  const listing=await provider.get(c,a,`listings/${listingId}`);
  if(listing.shop_id!==p.shopId||listing.title!==e.marketplace.title)throw new AppError('Listing não corresponde à loja/oferta.');
  if(p.fingerprint!==originalityFingerprint(e,w.missions.find(m=>m.id===e.validation?.sampleId)))throw new AppError('Oferta mudou; confira o rascunho na Etsy e abra um novo teste.',409);
  await store.mutate(id,w=>{w.experiments.find(e=>e.id===eid).marketplace.etsy.listingId=listingId;});
  if(listing.state==='active')return recordActive(id,eid,listingId,listing);
  return store.mutate(id,w=>{const p=w.experiments.find(e=>e.id===eid).marketplace.etsy;p.status='draft-review';p.error='Rascunho localizado. Confira imagens/arquivo e finalize na Etsy; este fluxo não repete uploads incertos.';});
 });}
 async function sync(id,eid){return locked(id,async()=>{
  const {c,a,w}=await credentials(id),e=w.experiments?.find(e=>e.id===eid),p=e?.marketplace?.etsy;if(p?.shopId!==w.etsy.shopId)throw new AppError('Reconecte a loja original deste listing.',409);if(!p?.listingId||!e.marketplace.publication)throw new AppError('Publique e confirme o listing primeiro.');
  const receipts=[];let complete=false;
  for(let offset=0;offset<1000;offset+=100){const data=await provider.get(c,a,`shops/${w.etsy.shopId}/receipts?${new URLSearchParams({min_created:String(Math.floor(Date.parse(e.createdAt)/1000)),max_created:String(Math.floor(Math.min(Date.now(),Date.parse(e.closedAt||e.endsAt))/1000)),limit:'100',offset:String(offset)})}`);if(!Array.isArray(data.results)||!Number.isSafeInteger(data.count))throw new AppError('Pedidos Etsy incompletos.',502);receipts.push(...data.results);if(offset+data.results.length>=data.count){complete=true;break;}}
  const unique=[...new Map(receipts.map(r=>[r.receipt_id,r])).values()], relevant=unique.filter(r=>r.is_paid&&r.transactions?.some(t=>t.listing_id===p.listingId));
  const amount=m=>m?.currency_code==='BRL'&&positive(m.divisor)&&Number.isSafeInteger(m.amount)&&m.amount>=0&&Number.isSafeInteger(m.amount*100/m.divisor)?m.amount*100/m.divisor:null;
  let grossMinor=0,sales=0,unresolved=0;
  for(const r of relevant){const price=amount(r.total_price),discount=amount(r.discount_amt);if(r.transactions.some(t=>t.listing_id!==p.listingId)||r.refunds?.length||price===null||discount!==0||r.status==='canceled'){unresolved++;continue;}grossMinor+=price;sales+=r.transactions.reduce((n,t)=>n+(positive(t.quantity)?t.quantity:0),0);}
  if(!Number.isSafeInteger(grossMinor)||!Number.isSafeInteger(sales))throw new AppError('Totais Etsy inválidos.',502);
  return store.mutate(id,w=>{const current=w.experiments.find(x=>x.id===eid);current.marketplace.apiSync={at:new Date().toISOString(),complete,matchedReceipts:relevant.length,unresolved,currency:w.etsy.currency,note:'Pedidos pagos da API no período, por listing. Sem dados de visitas. Pedidos mistos, descontos, reembolsos e moeda estrangeira exigem conciliação; taxas não são presumidas.'};current.review=null;
   if(complete&&!unresolved&&w.etsy.currency==='BRL')current.marketplace.observation={listing:current.marketplace.publication.listing,reference:'Etsy Open API: pedidos pagos do listing',period:`${e.createdAt} a ${e.closedAt||e.endsAt}`,origin:'etsy-api',currency:'BRL',at:new Date().toISOString(),grossMinor,refundedMinor:0,sales,visits:null,leads:null,humanMinutes:null,repeatSales:null};else delete current.marketplace.observation;
  });
 });}
 return {configure,authorize,callback,publish,reconcile,sync,disconnect:id=>locked(id,()=>store.mutate(id,w=>{if(w.experiments?.some(e=>['creating','uploading','activating'].includes(e.marketplace?.etsy?.status)))throw new AppError('Aguarde ou concilie o envio antes de remover a conexão.',409);delete w.etsy;}))};
}
