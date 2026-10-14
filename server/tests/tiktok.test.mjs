import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { createTikTok, createTikTokProvider } from '../tiktok.mjs';
import { workspaceId } from '../domain.mjs';
const masterKey='c'.repeat(64),token='a'.repeat(64),other='b'.repeat(64),id=workspaceId(token);
const config={clientKey:'client',clientSecret:'app-secret',redirectUri:'https://example.com/agentes/conexoes',enabled:true};
const grant={access_token:'private-access',refresh_token:'private-refresh',scope:'user.info.basic',expires_in:86400,open_id:'account-1',token_type:'Bearer'};
const mock=()=>({token:async()=>({...grant}),profile:async()=>({data:{user:{open_id:'account-1',display_name:'Lume creator'}}}),revoke:async()=>({})});
const noPaid=new Proxy({}, {get:()=>()=>{throw Error('Paid calls forbidden');}});
async function fixture(t,options={}){const store=await createStore({file:':memory:'});t.after(()=>store.close());return {store,tiktok:createTikTok(store,{masterKey,config,provider:mock(),...options})};}
test('flow B HTTP: visible diagnostic, absent app blocked, valid account OAuth never connects LIVE/publication',async t=>{
 const store=await createStore({file:':memory:'}),app=createApp({store,provider:noPaid,masterKey,tiktokConfig:config,tiktokProvider:mock()});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();});
 const base=`http://127.0.0.1:${app.server.address().port}/api/agents`;
 async function req(path,method='GET',body,access=token){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 let r=await req('/tiktok');assert.equal(r.data.account.status,'NOT_CONFIGURED');assert.equal(r.data.broadcast.connected,false);assert.equal(r.data.events.connected,false);
 assert.equal((await req('/tiktok','GET',undefined,'invalid')).status,401);
 const oauth=(await req('/tiktok/authorize','POST')).data;assert.equal(new URL(oauth.url).origin,'https://www.tiktok.com');assert.equal(new URL(oauth.url).searchParams.get('scope'),'user.info.basic');
 assert.equal((await req('/tiktok')).data.account.status,'AWAITING_AUTHORIZATION');
 assert.equal((await req('/tiktok/callback','POST',{state:oauth.state,code:'valid'},other)).status,403);
 r=await req('/tiktok/callback','POST',{state:oauth.state,code:'valid'});assert.equal(r.status,200);assert.equal(r.data.account.status,'CONNECTED');
 for(const key of ['broadcast','events','publication'])assert.equal(r.data[key].connected,false);
 assert.equal((await req('/tiktok/callback','POST',{state:oauth.state,code:'valid'})).status,403);
 assert.equal((await req('/tiktok','GET',undefined,other)).data.account.connected,false);
 const publicJson=JSON.stringify([r.data,(await req('/workspace')).data]);for(const secret of ['private-access','private-refresh','app-secret',oauth.state])assert.ok(!publicJson.includes(secret));
 const raw=JSON.stringify((await store.read(id)).workspace);assert.ok(!raw.includes('private-access'));assert.ok(!raw.includes('private-refresh'));
 r=await req('/tiktok','DELETE');assert.equal(r.data.account.connected,false);
});
test('missing config, invalid redirect, missing crypto never expose a fake connection',async t=>{
 for(const options of [{config:{}},{masterKey:null},{config:{...config,redirectUri:'http://example.com/agentes/conexoes'}},{config:{...config,enabled:false}}]){
  const {tiktok}=await fixture(t,options);assert.ok(tiktok.state({}).requirements.length);assert.equal(tiktok.state({}).account.status,'CONFIGURATION_REQUIRED');assert.equal(tiktok.state({}).canAuthorize,false);await assert.rejects(tiktok.authorize(id));
 }
});
test('expired state, denied consent, missing scope and provider errors fail closed without leaking secrets',async t=>{
 let n=1000;const {store,tiktok}=await fixture(t,{now:()=>n});let oauth=await tiktok.authorize(id);n+=600001;await assert.rejects(tiktok.callback(id,{state:oauth.state,code:'test'}));
 oauth=await tiktok.authorize(id);await assert.rejects(tiktok.callback(id,{state:oauth.state,error:'access_denied'}),/recusada/);assert.equal(tiktok.state((await store.read(id)).workspace).account.connected,false);
 for(const provider of [{...mock(),token:async()=>({...grant,scope:'video.publish'})},{...mock(),profile:async()=>{throw Error('private-access');}}]){
  const {store,tiktok}=await fixture(t,{provider});const o=await tiktok.authorize(id);await assert.rejects(tiktok.callback(id,{state:o.state,code:'test'}));const s=tiktok.state((await store.read(id)).workspace);assert.equal(s.account.status,'ERROR');assert.ok(!JSON.stringify(s).includes('private-access'));
 }
});
test('callback is single-use under concurrency and disconnect prevents a late callback resurrecting access',async t=>{
 let finish,called;const signal=new Promise(r=>called=r),wait=new Promise(r=>finish=r);
 const {store,tiktok}=await fixture(t,{provider:{...mock(),token:async()=>{called();await wait;return grant;}}});const o=await tiktok.authorize(id);
 const completing=tiktok.callback(id,{state:o.state,code:'test'});await signal;
 await assert.rejects(tiktok.callback(id,{state:o.state,code:'test'}));await tiktok.disconnect(id);finish();await assert.rejects(completing,/alterada/);
 assert.equal(tiktok.state((await store.read(id)).workspace).account.connected,false);
});
test('token expiry and unconfirmed revoke are represented honestly',async t=>{
 let n=1000;const {store,tiktok}=await fixture(t,{now:()=>n,provider:{...mock(),revoke:async()=>{throw Error('remote unavailable');}}});const o=await tiktok.authorize(id);await tiktok.callback(id,{state:o.state,code:'test'});n+=86400001;assert.equal(tiktok.state((await store.read(id)).workspace).account.status,'AUTHORIZATION_REQUIRED');const s=await tiktok.disconnect(id);assert.equal(s.account.connected,false);assert.match(s.revokeNotice,/não confirmada/);
});
test('provider uses only documented fixed TikTok endpoints and sanitizes upstream failures',async()=>{
 const calls=[];const p=createTikTokProvider(async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({})};});await p.token(config,'one-code');await p.profile('access');await p.revoke(config,'access');
 assert.deepEqual(calls.map(c=>c.url),['https://open.tiktokapis.com/v2/oauth/token/','https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name','https://open.tiktokapis.com/v2/oauth/revoke/']);
 assert.equal(calls[0].options.body.get('redirect_uri'),config.redirectUri);assert.equal(calls[0].options.redirect,'error');
 const fail=createTikTokProvider(async()=>({ok:true,json:async()=>({error:'invalid_client',error_description:'secret'})}));await assert.rejects(fail.token(config,'test'),e=>!e.message.includes('secret'));
});
