import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advanceGame} from '../live-game.mjs';
import {sceneFrame,sceneSvg,avatarVisibility} from '../../frontend/src/shared/live-visual.mjs';
import {render} from '../live-worker/render.mjs';
import {createMixer} from '../live-worker/mixer.mjs';
import {videoProfiles,runWorker} from '../live-worker/worker.mjs';
const config={template:'seed-snake',names:['Lume','Faísca'],roundSeconds:30};
const setup=()=>({status:'TESTING',config:{name:'Lume',scene:'garden',audio:{muted:false,volume:1}},game:createGame(config,100000),performanceConfig:{enabled:true,music:true,musicGain:.2,voiceGain:.8,effectsGain:.4,style:'groove'},sessionId:'one',performance:{top:[],jobs:[]}});
test('reachable apple pursuit consumes food and grows, obstacles and collisions remain deterministic',()=>{
 const e=setup(),g=e.game;g.players[1].body=[{x:13,y:22},{x:14,y:22},{x:15,y:22}];g.food=[{x:5,y:4}];
 advanceGame(g,100200);assert.deepEqual(g.players[0].target,{x:5,y:4});assert.equal(g.players[0].body[0].x,3);
 advanceGame(g,100600);assert.equal(g.players[0].score,1);assert.equal(g.players[0].body.length,4);assert.equal(g.players[0].eatenAt,100600);assert.ok(!g.food.some(f=>f.x===5&&f.y===4));
 const clone=structuredClone(g);advanceGame(g,102000);advanceGame(clone,102000);assert.deepEqual(g,clone);
 const trapped=setup().game;trapped.obstacles=[{x:3,y:4},{x:2,y:3},{x:2,y:5}];advanceGame(trapped,100200);assert.equal(trapped.players[0].alive,false);assert.equal(trapped.phase,'FINISHED');assert.equal(trapped.players[0].hitAt,100200);advanceGame(trapped,103200);assert.equal(trapped.round,2);
});
test('one minute autonomous rhythm: movement, apples, growth, bounded snapshots and round transitions',()=>{
 const g=setup().game;let foods=0,moves=0,stale=0,maxStale=0,prior='';
 for(let t=100200;t<=160000;t+=200){advanceGame(g,t);foods+=g.players.filter(p=>p.eatenAt===t).length;const key=JSON.stringify(g.players.map(p=>p.body));if(key===prior)stale++;else{moves++;stale=0;}maxStale=Math.max(maxStale,stale);prior=key;assert.ok(g.players.every(p=>p.body.length===3+p.score));}
 assert.ok(foods>=15,foods);assert.ok(moves>150,moves);assert.ok(maxStale<=15,maxStale);assert.ok(g.history.length>=2);assert.ok(g.frames.length<=30);
});
test('interpolation is fractional, bounded, read-only and never crosses a round boundary',()=>{
 const e=setup();advanceGame(e.game,101000);const before=JSON.stringify(e.game),a=sceneFrame(e,100200),mid=sceneFrame(e,100300),b=sceneFrame(e,100400);
 assert.equal(mid.players[0].body[0].x,(a.players[0].body[0].x+b.players[0].body[0].x)/2);assert.notDeepEqual(mid.players[0].body,a.players[0].body);assert.equal(JSON.stringify(e.game),before);
 e.game.frames[1].round++;assert.deepEqual(sceneFrame(e,100300),e.game.frames[0]);assert.deepEqual(sceneFrame(e,1),e.game.frames[0]);
});
test('actual PCM playback drives visual envelope, silence and fallback never fake a talking mouth',async()=>{
 const e=setup(),now=Date.now();e.performance.jobs=[{id:'a',sessionId:'one',createdAt:now,expiresAt:now+45000,priority:0,segments:[{role:'host',voice:'host',text:'Olá'}]}];
 const m=createMixer({synthesize:async()=>Float32Array.from({length:3200},(_,i)=>i<1600?.2:0)});m.observe(e,now);await new Promise(r=>setTimeout(r,5));m.mix(e,now,1600);assert.ok(m.presentation().level>.8);assert.equal(m.presentation().elapsedMs,0);m.mix(e,now,1600);assert.equal(m.presentation().level,0);assert.ok(m.presentation().elapsedMs>30);m.mix(e,now,1600);assert.equal(m.presentation(),null);m.close();
});
test('shared compositor animates faces, safe avatars, entry/exit, and keeps community out of board',async()=>{
 const e=setup();advanceGame(e.game,102000);e.performance.top=[{id:'demo-a',name:'<Ana>',quantity:3,avatar:'https://evil.invalid'}];e.performance.avatarUntil=113000;
 assert.equal(avatarVisibility(e.performance,100000),0);assert.ok(avatarVisibility(e.performance,102000)>0);assert.equal(avatarVisibility(e.performance,114000),0);
 const silent=sceneSvg(e,102000,{role:'host',text:'Oi!',level:0}),speaking=sceneSvg(e,102000,{role:'host',text:'Oi!',level:.9});assert.notEqual(silent,speaking);assert.match(speaking,/&lt;Ana&gt;/);assert.ok(!speaking.includes('evil.invalid'));assert.match(speaking,/y="560"/);assert.match(speaking,/y="480"/);
 const pixels=await render(e,102000);assert.equal(pixels.length,360*640*3);assert.deepEqual(Object.keys(videoProfiles),['light','smooth','hd']);await assert.rejects(runWorker({}, {profile:'unbounded'}),/Perfil/);
});
