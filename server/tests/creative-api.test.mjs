import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../store.mjs';
import {createApp} from '../app.mjs';
test('creative route authenticates, isolates snapshots, prevents stale mutations and unsupported production',async t=>{
 const store=await createStore({file:':memory:'}),app=createApp({store,provider:{}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await app.close();await store.close();});
 const base=`http://127.0.0.1:${app.server.address().port}/api/agents`;
 const post=async(input,token='a'.repeat(64))=>{const r=await fetch(base+'/creative-director',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:r.status,data:await r.json()};};
 assert.equal((await post({action:'propose',revision:0,theme:'Teste'},'bad')).status,401);
 const r=await post({action:'propose',revision:0,theme:'Curiosidade'});assert.equal(r.status,200);assert.equal(r.data.creativeDirector.proposals.length,5);
 assert.equal((await post({action:'pause',revision:0})).status,409);
 const other=await post({action:'produce',revision:0,proposalId:r.data.creativeDirector.proposals[0].id,voiceMode:'technical'},'b'.repeat(64));assert.equal(other.status,404);
 assert.equal((await post({action:'produce',revision:1,proposalId:r.data.creativeDirector.proposals[4].id,voiceMode:'technical'})).status,409);
 assert.equal(r.data.creativeDirector.autonomy.publishingEnabled,false);
});
