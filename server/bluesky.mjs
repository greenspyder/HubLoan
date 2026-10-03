import { AppError } from './domain.mjs';
// Limit this integration to Bluesky-operated PDS hosts, never arbitrary DID endpoints.
function hostedPds(value) {
 const u = new URL(value);
 if(u.protocol !== 'https:' || u.port || u.username || u.password || u.pathname !== '/' || u.search || u.hash || !(u.hostname === 'bsky.social' || /^[a-z0-9-]+\.host\.bsky\.network$/.test(u.hostname))) throw new AppError('Esta integração aceita somente contas hospedadas pelo Bluesky.');
 return u.origin;
}
export function blueskyText(campaign) { return Array.from(campaign.title).slice(0,60).join('')+'\nProduto digital com IA. Confira preço, prévia e licença:\n'+campaign.link; }
export function createBluesky(json) {
 async function login(identifier,password) {
  const s=await json('https://bsky.social/xrpc/com.atproto.server.createSession',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});
  if(!/^did:plc:[a-z0-9]+$/.test(s.did || '') || !s.handle || typeof s.accessJwt !== 'string' || s.active === false) throw new AppError('Bluesky não confirmou uma conta ativa.');
  const pds=hostedPds(s.didDoc?.service?.find(x=>x.id.endsWith('#atproto_pds'))?.serviceEndpoint || 'https://bsky.social');
  return {did:s.did,handle:s.handle,jwt:s.accessJwt,pds};
 }
 return {
  async connect(secret,identifier) {const s=await login(identifier,secret);return {target:s.did,name:`@${s.handle}`,identifier:s.did};},
  async publish(secret,connection,campaign) {
   const s=await login(connection.identifier,secret);if(s.did !== connection.target) throw new AppError('Conta Bluesky diferente da autorizada.');
   const text=blueskyText(campaign),prefix=text.slice(0,-campaign.link.length);
   if(Array.from(text).length>300) throw new AppError('Oferta excede o limite do Bluesky.');
   const result=await json(`${s.pds}/xrpc/com.atproto.repo.createRecord`,{method:'POST',headers:{Authorization:`Bearer ${s.jwt}`,'Content-Type':'application/json'},body:JSON.stringify({repo:s.did,collection:'app.bsky.feed.post',rkey:campaign.id,record:{$type:'app.bsky.feed.post',text,createdAt:campaign.createdAt,langs:['pt'],facets:[{index:{byteStart:Buffer.byteLength(prefix),byteEnd:Buffer.byteLength(text)},features:[{$type:'app.bsky.richtext.facet#link',uri:campaign.link}]}]}})});
   const expected=`at://${s.did}/app.bsky.feed.post/${campaign.id}`;
   if(result.uri !== expected || !result.cid) throw new AppError('Bluesky não confirmou a publicação.',502);
   return {remoteId:result.uri,url:`https://bsky.app/profile/${s.did}/post/${campaign.id}`};
  }
 };
}
