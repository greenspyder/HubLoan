import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../store.mjs';
import {createApp} from '../app.mjs';
test('voice routes authenticate, persist drafts, reject premature approval and isolate workspaces',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'voice-api-')),store=await createStore({file:join(dir,'state.sqlite')}),app=createApp({store,provider:{}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();await rm(dir,{recursive:true,force:true});});
 const url=`http://127.0.0.1:${app.server.address().port}/api/agents`;
 const call=async(input,token='a'.repeat(64))=>{const r=await fetch(url+'/voice-studio',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:r.status,data:await r.json()};};
 assert.equal((await call({action:'save',revision:0,profile:{}},'invalid')).status,401);
 const saved=await call({action:'save',revision:0,profile:{candidateId:'dora-calm'}});assert.equal(saved.status,200);assert.equal(saved.data.voiceStudio.active.candidateId,'dora-current');assert.equal(saved.data.voiceStudio.draft.candidateId,'dora-calm');
 assert.equal((await call({action:'approve',revision:1,listened:true})).status,400);
 const other=await call({action:'save',revision:0,profile:{candidateId:'dora-flow'}},'b'.repeat(64));assert.equal(other.status,200);assert.equal(other.data.voiceStudio.draft.candidateId,'dora-flow');
 const read=await fetch(url+'/workspace',{headers:{Authorization:`Bearer ${'a'.repeat(64)}`}});assert.equal(read.status,200);const w=await read.json();assert.equal(w.voiceStudio.draft.candidateId,'dora-calm');
});
