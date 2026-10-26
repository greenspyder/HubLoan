import test from 'node:test';
import assert from 'node:assert/strict';
import {recordGameplay,detectHighlights,createEditorial,editorialFrame,captionBlocks} from '../viral-director.mjs';
const config={format:'battle',seconds:25,characters:['Lume','Faísca','Jade','Ember']};
test('highlights reflect reproducible observed transitions',()=>{
 const a=recordGameplay(config),b=recordGameplay(config);assert.deepEqual(a,b);
 const events=detectHighlights(a.frames);assert.ok(events.some(e=>e.type==='elimination'));
 for(const e of events.filter(e=>e.type==='elimination')){const i=a.frames.findIndex(f=>f.at===e.at);assert.equal(a.frames[i-1].players[e.player].alive,true);assert.equal(a.frames[i].players[e.player].alive,false);}
 assert.ok(events.every(e=>e.scoreExplanation));assert.throws(()=>recordGameplay(config,999));
});
test('timeline cuts and slow replay retain source evidence and do not mutate game',()=>{
 const r=recordGameplay(config),t=createEditorial(config,r);assert.equal(t.scenes.length,4);assert.ok(t.scenes.some(s=>s.replay&&s.speed<1));
 const before=JSON.stringify(r);for(let time=0;time<25;time+=1/15){const f=editorialFrame(r,t,time,100000+time*1000);assert.ok(f.game.frames.length);assert.ok(f.sourceAt<=r.frames.at(-1).at);assert.ok(f.game.frames[0].at<=100000+time*1000+1);}
 assert.equal(JSON.stringify(r),before);assert.equal(createEditorial(config,{frames:[r.frames[0],r.frames[0]]}).fallback,true);
});
test('caption blocks are bounded, ordered and non-overlapping',()=>{const b=captionBlocks([{text:'Uma duas três quatro cinco seis sete oito nove dez onze',start:1,end:5}]);assert.equal(b.length,3);assert.equal(b[0].start,1);assert.equal(b.at(-1).end,5);assert.ok(b.every(c=>c.text.split(' ').length<=5));assert.equal(b[0].end,b[1].start);});
