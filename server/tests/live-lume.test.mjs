import test from 'node:test';
import assert from 'node:assert/strict';
import {lumeLine,hostSegment} from '../live-lume-lines.mjs';
import {performanceConfig,performanceDefaults,resetPerformance,advancePerformance} from '../live-performance.mjs';
import {createSpeechCache} from '../live-worker/speech.mjs';
test('Lume: varied contextual repertoire, bounded memory and occasional double meaning',()=>{
 const p={};const heard=[];for(let i=0;i<40;i++)heard.push(lumeLine(p,'roses','cheeky',i*10000));
 assert.ok(new Set(heard).size>=6);assert.ok(p.lumeMemory.recent.length<=12);
 const cheeky=heard.map((text,i)=>/suspeito|exige cuidado|de limites/.test(text)?i:-1).filter(i=>i>=0);
 assert.ok(cheeky.length>0);for(let i=1;i<cheeky.length;i++)assert.ok(cheeky[i]-cheeky[i-1]>=6);
 const q={};for(let i=0;i<20;i++)assert.doesNotMatch(lumeLine(q,'roses','playful',i*60000),/suspeito|exige cuidado|de limites/);
 assert.equal(performanceConfig({...performanceDefaults(),humor:'cheeky'}).humor,'cheeky');
 assert.throws(()=>performanceConfig({...performanceDefaults(),humor:'anything'}));
});
test('Lume: cache keys preserve delivery, state isolated per session and queue remains bounded',async()=>{
 let calls=0,delivery;const cache=createSpeechCache({synthesize:async(text,voice,options)=>{calls++;delivery=options.delivery;return new Float32Array(480);}});
 await cache.get(hostSegment('Oi!','wry'));assert.equal(delivery,'wry');await cache.get(hostSegment('Oi!','wry'));assert.equal(calls,1);await cache.get(hostSegment('Oi!','excited'));assert.equal(calls,2);cache.close();
 const e={sessionId:'a',performanceConfig:{...performanceDefaults(),enabled:true,humor:'cheeky'}};resetPerformance(e);
 for(let i=0;i<30;i++)advancePerformance(e,{type:'gift',gift:'rosa',quantity:1,participantId:'demo-one',name:'Ana'},100000+i*10000);
 assert.ok(e.performance.jobs.length<=6);assert.ok(e.performance.lumeMemory);
 e.sessionId='b';resetPerformance(e);assert.equal(e.performance.lumeMemory,undefined);assert.equal(e.performance.top.length,0);
});
test('approved jingle receives one contextual reply; grouped roses do not add speech',()=>{
 const e={sessionId:'a',musicCatalog:[{id:'track',approved:true,category:'roses',hash:'hash',kind:'ORIGINAL_INSTRUMENTAL',title:'Teste'}],performanceConfig:{...performanceDefaults(),enabled:true,humor:'cheeky'}};resetPerformance(e);
 const gift={type:'gift',gift:'rosa',quantity:1,participantId:'demo-one',name:'Ana'};
 advancePerformance(e,gift,100000);assert.deepEqual(e.performance.jobs[0].segments.map(x=>x.role),['music','host']);
 advancePerformance(e,gift,101000);assert.equal(e.performance.jobs.length,1);assert.equal(e.performance.jobs[0].segments.length,2);assert.equal(e.performance.top[0].quantity,2);
});
