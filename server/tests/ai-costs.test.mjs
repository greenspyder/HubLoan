import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costProvider, configureCosts, publicCosts } from '../ai-costs.mjs';
test('blocks before send, retains uncertain reservations and caches successful text', async () => {
 const w = {}; const store = { mutate: async (_id,fn) => ({ result: fn(w) }) }; let calls=0;
 const p=costProvider(store,{text:async()=>{calls++;return {output:'ok',tokens:5};},image:async()=>{calls++;throw Error('timeout');}},'w','task','agent');
 await assert.rejects(p.text('key','expensive','rules','input',10),/orçamento/);
 assert.equal(calls,0);
 configureCosts(w,{enabled:true,dailyMinor:30,monthlyMinor:30,callMinor:10,ceilings:{text:10,image:10,vision:10,research:10}});
 await p.text('key','expensive','rules','input',10); await p.text('key','expensive','rules','input',10);
 assert.equal(calls,1); assert.equal(publicCosts(w).dayMinor,10);
 await assert.rejects(p.image('key','image','prompt')); assert.equal(publicCosts(w).dayMinor,20);
 await p.text('key','expensive','rules','different',10);
 await assert.rejects(p.text('key','expensive','rules','blocked',10),/insuficiente/);
 assert.equal(calls,3);
});
