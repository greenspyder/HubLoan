import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';
import { readFile } from 'node:fs/promises';
import { createStore } from '../store.mjs';
import { createApp } from '../app.mjs';
import { createCommerce, createItchProvider, itchTarget, summarizeGame } from '../commerce.mjs';
import { workspaceId, addMission, decryptKey } from '../domain.mjs';
const token='a'.repeat(64), other='b'.repeat(64), master='f'.repeat(64), id=workspaceId(token), key='itch-secret-for-test-only';
const game={id:7,title:'Coleção original de móveis',url:'https://example.itch.io/furniture',classification:'assets',published:true,views_count:50,purchases_count:2,downloads_count:6,earnings:[{currency:'USD',amount:1250}]};
const config={autoPublish:false,background:true,maxUploads:3,targets:{sprites:7,model3d:7},license:'Uso comercial e modificações permitidos; revenda dos arquivos isolados proibida.'};
async function fixture(t){const store=await createStore({file:':memory:'});let pushes=0,fail=false;const provider={games:async()=>[summarizeGame(game)],push:async(secret,target,mission)=>{pushes++;assert.equal(secret,key);assert.equal(target,'example/furniture');const files=unzipSync(Buffer.from(mission.artifact.base64,'base64'));assert.match(strFromU8(files['SELLER-LICENSE.txt']),/Uso comercial/);if(fail)throw new Error('Secret '+key);return{channel:`pack-${mission.id}`,version:'test'};}};
 const app=createApp({store,provider:{},commerceProvider:provider,masterKey:master});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await app.close();await store.close();});
 const base=`http://127.0.0.1:${app.server.address().port}/api/agents`;
 async function call(path,method='GET',body,access=token){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json()};}
 async function mission(){const r=await store.mutate(id,w=>{const m=addMission(w,{title:'Pack',brief:'Fixture de publicação',agentId:'creator',kind:'sprites'});m.status='review';m.attempt=1;m.artifact={mime:'application/zip',base64:Buffer.from(zipSync({'README.md':strToU8('Pack original de teste')})).toString('base64')};return m.id;});return r.result;}
 return{store,app,provider,call,mission,pushes:()=>pushes,setFail:()=>{fail=true;}};}
test('catalog aggregates real page values without buyer data, currency conversion or invented profit',()=>{
 const g=summarizeGame({...game,buyer_email:'private@example.test',net:999});assert.equal(g.earnings[0].grossMinor,1250);assert.equal(g.scope,'page_lifetime');assert.equal(g.net,undefined);assert.equal(g.buyer_email,undefined);assert.equal(summarizeGame({id:1,title:'no metrics'}).views,null);
 assert.equal(itchTarget(game.url),'example/furniture');for(const url of ['http://example.itch.io/a','https://evil.com/a','https://user:pass@example.itch.io/a','https://example.itch.io/a?key=x','https://example.itch.io/a/b'])assert.throws(()=>itchTarget(url));
});
test('store key/grant stay encrypted, destinations must belong to account, download upload is tenant isolated and duplicate-safe',async t=>{
 const f=await fixture(t);const connected=await f.call('/commerce/connect','POST',{apiKey:key});assert.equal(connected.status,200);assert.equal(connected.data.commerce.configured,true);assert.ok(!JSON.stringify(connected.data).includes(key));
 assert.equal((await f.call('/commerce/configure','POST',{...config,targets:{sprites:88}})).status,400);
 const configured=await f.call('/commerce/configure','POST',config);assert.equal(configured.status,200);assert.equal(configured.data.commerce.grant,undefined);assert.equal(configured.data.commerce.secret,undefined);
 const stored=(await f.store.read(id)).workspace.commerce;assert.equal(decryptKey(stored.secret,token),key);assert.equal(decryptKey(stored.grant,master),token);
 const mission=await f.mission();assert.equal((await f.call(`/commerce/missions/${mission}/publish`,'POST',{},other)).status,404);
 const uploaded=await f.call(`/commerce/missions/${mission}/publish`,'POST',{});assert.equal(uploaded.status,200);assert.equal(uploaded.data.missions[0].publication.status,'uploaded');
 assert.equal((await f.call(`/commerce/missions/${mission}/publish`,'POST',{})).status,409);assert.equal(f.pushes(),1);assert.equal(uploaded.data.commerce.uploads,1);
});
test('failed or interrupted upload pauses automatic publishing, reserves attempts, hides provider errors and never retries itself',async t=>{
 const f=await fixture(t);await f.call('/commerce/connect','POST',{apiKey:key});await f.call('/commerce/configure','POST',{...config,autoPublish:true});const m=await f.mission();f.setFail();await f.app.commerce.tick();await f.app.commerce.tick();
 const w=(await f.store.read(id)).workspace;assert.equal(f.pushes(),1);assert.equal(w.missions[0].publication.status,'uncertain');assert.equal(w.commerce.autoPublish,false);assert.equal(w.commerce.uploads,1);assert.ok(!w.commerce.error.includes(key));
 await f.store.mutate(id,w=>{w.missions[0].publication.status='uploading';w.missions[0].publication.at=new Date().toISOString();});assert.equal((await f.call(`/commerce/missions/${m}/recover`,'POST',{})).status,400);
 await f.store.mutate(id,w=>{w.missions[0].publication.at=new Date(Date.now()-300000).toISOString();});assert.equal((await f.call(`/commerce/missions/${m}/recover`,'POST',{})).status,200);
});
test('background metrics resume after worker restart without browser token; disconnect and expiration stop requests',async t=>{
 const f=await fixture(t);await f.call('/commerce/connect','POST',{apiKey:key});await f.call('/commerce/configure','POST',config);let queries=0;
 const worker=createCommerce(f.store,{masterKey:master,intervalMs:100000,provider:{games:async secret=>{assert.equal(secret,key);queries++;return[summarizeGame(game)];}}});t.after(()=>worker.close());
 await worker.tick();await worker.tick();assert.equal(queries,1);
 await f.call('/commerce','DELETE');await worker.tick();assert.equal(queries,1);
});
test('butler launch uses fixed binary, argument array, private temporary files, minimal environment and redacted output',async()=>{
 let launchArgs;const provider=createItchProvider({binary:'/trusted/butler',launch:(binary,args,options)=>{launchArgs={binary,args,options};const child=new EventEmitter();child.kill=()=>{};setImmediate(async()=>{assert.ok((await readFile(args[1])).length);child.emit('close',0);});return child;}});
 const mission={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',attempt:1,artifact:{base64:Buffer.from('fixture ZIP').toString('base64')}};
 const r=await provider.push(key,'example/furniture',mission);assert.equal(r.channel,`pack-${mission.id}`);assert.equal(launchArgs.options.env.ITCHIO_API_KEY,key);assert.ok(!launchArgs.args.includes(key));assert.equal(launchArgs.options.stdio,'ignore');assert.equal(launchArgs.options.shell,undefined);await assert.rejects(()=>readFile(launchArgs.args[1]));
});
