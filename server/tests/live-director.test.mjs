import test from 'node:test';
import assert from 'node:assert/strict';
import {createDirector} from '../live-director.mjs';
import {createGame,advanceGame,gameConfig} from '../live-game.mjs';
const config={template:'seed-snake',names:['Lume','Faísca'],roundSeconds:22};
test('director uses actual state, bounds cuts, priorities, recovery and resets sessions without changing physics',()=>{
 const d=createDirector(),g=createGame(config,1000),e={sessionId:'a'};
 assert.equal(d.update(e,g,1000).mode,'Overview');assert.equal(d.update(e,g,4100).mode,'Follow');
 const before=JSON.stringify(g);g.phase='FINISHED';g.winner='Lume';assert.equal(d.update(e,g,5000).mode,'Celebration');
 assert.equal(d.update(e,g,5100,{level:1,role:'host'}).cue.kind,'result');
 g.phase='PLAYING';assert.equal(d.update(e,g,8100).mode,'Recovery');assert.equal(d.update(e,g,10000).mode,'Follow');
 assert.equal(d.update({...e,sessionId:'b'},g,10100).mode,'Overview');g.phase='PLAYING';g.winner=null;assert.equal(JSON.stringify(g),before);
});
test('special apples are optional, deterministic, shared and increase score and growth; invalid config rejected',()=>{
 assert.throws(()=>gameConfig({...config,specialEvery:2}));const a=createGame(gameConfig({...config,specialEvery:3}),1000),b=structuredClone(a);let golden=false,bonus=false;
 for(let at=1200;at<120000;at+=200){const old=a.players.map(p=>p.score);advanceGame(a,at);advanceGame(b,at);golden ||= a.food.some(f=>f.golden);bonus ||= a.players.some((p,i)=>p.score-old[i]===2);for(const p of a.players)assert.ok(p.body.length<=3+p.score);}
 assert.deepEqual(a,b);assert.ok(golden);assert.ok(bonus);
});
test('two minutes of autonomous direction has multiple modes, bounded cue counts and no long freeze',()=>{
 const g=createGame(config,1000),d=createDirector(),modes=new Set();let moved=0,old='';
 for(let at=1000;at<121000;at+=200){advanceGame(g,at);const value=d.update({sessionId:'a'},g,at);modes.add(value.mode);const pos=JSON.stringify(g.players[0].body[0]);if(pos!==old)moved++;old=pos;}
 for(const mode of ['Follow','Action','Celebration','Recovery'])assert.ok(modes.has(mode),mode);assert.ok(moved>200);assert.ok(Object.values(d.counts).reduce((a,b)=>a+b,0)<35);
});
test('director supports non-game experiences and detects only an actual turn beside a rock',()=>{
 const d=createDirector(),e={sessionId:'safe'},g=createGame(config,1000);assert.equal(d.update(e,null,1000).cue,null);
 d.update(e,g,1000);g.players[0].body[0]={x:6,y:10};g.players[0].direction=1;
 const out=d.update(e,g,5000);assert.equal(out.cue.kind,'near-miss');assert.equal(out.emotion,'fear');
 g.phase='FINISHED';g.winner='Lume';assert.equal(d.update(e,g,9000,{role:'host',level:1}).cue.kind,'result');
});
test('risk cue reaches existing PCM mixer at media time, with limiter and silence on pause',async()=>{
 const {createMixer}=await import('../live-worker/mixer.mjs');const {performanceDefaults}=await import('../live-performance.mjs');
 const e={status:'TESTING',config:{audio:{muted:false,volume:1}},performanceConfig:{...performanceDefaults(),enabled:true}},a=createMixer(),b=createMixer();
 try{const plain=a.mix(e,10000),accent=b.mix(e,10000,3200,{cue:{kind:'near-miss'},age:0});assert.notDeepEqual(plain,accent);assert.ok(b.metrics.peak<=.92);e.status='PAUSED';assert.ok(b.mix(e,10100).every(x=>x===0));}finally{a.close();b.close();}
});
