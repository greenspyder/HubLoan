import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advanceGame,gameConfig,syncChampions} from '../live-game.mjs';
const config=n=>gameConfig({template:'seed-snake',names:Array.from({length:n},(_,i)=>'Bot '+i),roundSeconds:75,champions:true});
const top=()=>Array.from({length:6},(_,i)=>({id:'demo-person'+i,name:'Pessoa '+i,quantity:6-i}));
test('Top6 binds stable identities only at round boundary; rank changes never reset live physics',()=>{
 const g=createGame(config(6),1000),people=top();syncChampions(g,people,1200);assert.ok(g.players.every(p=>!p.participantId));
 for(let t=1200;g.round===1;t+=200)advanceGame(g,t);
 assert.equal(new Set(g.players.map(p=>p.participantId)).size,6);assert.equal(new Set(g.players.map(p=>p.color)).size,6);
 const identities=g.players.map(p=>({id:p.id,color:p.color,archetype:p.archetype})),bodies=JSON.stringify(g.players.map(p=>p.body)),round=g.round;
 syncChampions(g,[...people].reverse(),g.lastAt);assert.equal(g.round,round);assert.equal(JSON.stringify(g.players.map(p=>p.body)),bodies);assert.deepEqual(g.players.map(p=>({id:p.id,color:p.color,archetype:p.archetype})),identities);assert.equal(g.players[0].rank,6);
 const restored=JSON.parse(JSON.stringify(g));syncChampions(restored,people,g.lastAt+1);assert.equal(restored.players[0].id,g.players[0].id);
 syncChampions(g,people.slice(1),g.lastAt);assert.equal(g.players[0].rank,null);assert.equal(g.players.length,6);
 for(let t=g.lastAt+200;g.round===round;t+=200)advanceGame(g,t);assert.ok(!g.players.some(p=>p.participantId===people[0].id));
 syncChampions(g,people,g.lastAt);const saved=g.identities[people[0].id];assert.equal(saved.id,identities[0].id);assert.equal(saved.color,identities[0].color);
});
test('two/four/six deterministic competitors have safe spawns and sustained complete rounds',()=>{
 for(const count of [2,4,6]){const g=createGame(config(count),1000);const cells=g.players.flatMap(p=>p.body.map(b=>b.x+16*b.y));assert.equal(new Set(cells).size,cells.length);assert.ok(g.players.every(p=>p.body.every(b=>!g.obstacles.some(o=>o.x===b.x&&o.y===b.y))));
  for(let at=1200;at<181000;at+=200){advanceGame(g,at);const alive=g.players.filter(p=>p.alive);const occupied=alive.flatMap(p=>p.body.map(b=>b.x+16*b.y));assert.equal(new Set(occupied).size,occupied.length);assert.ok(g.players.every(p=>p.body.every(b=>b.x>=0&&b.x<16&&b.y>=0&&b.y<24)));}
  assert.ok(g.history.length>=2);assert.ok(g.history.reduce((a,r)=>a+r.durationMs,0)/g.history.length>25000);if(count===6)assert.ok(g.history.every(r=>r.durationMs>=20000));
 }
});
test('gifts/rank metadata cannot change scores or commands; identity is isolated by game/session',()=>{
 const a=createGame(config(6),1000),b=createGame(config(6),1000),state=JSON.stringify(a.players.map(({rank,...p})=>p));syncChampions(a,top(),1000);assert.equal(JSON.stringify(a.players.map(({rank,...p})=>p)),state);assert.deepEqual(b.identities,{});assert.deepEqual(a.ranking,[0,0,0,0,0,0]);
 assert.throws(()=>gameConfig({...config(6),names:Array(7).fill('bot')}));assert.throws(()=>gameConfig({...config(6),champions:'true'}));
});

test('runtime associates deduplicated gifts with actors and rejects foreign sessions',async()=>{
 const {initialWorkspace}=await import('../domain.mjs'),{liveAction,advanceLive}=await import('../live-factory.mjs'),{performanceDefaults}=await import('../live-performance.mjs');
 const w=initialWorkspace();liveAction(w,'create',{},100000);const e=w.liveFactory.experiences[0];liveAction(w,'performance-configure',{id:e.id,version:1,config:{...performanceDefaults(),enabled:true}},100000);liveAction(w,'game-configure',{id:e.id,version:2,config:{...config(6),roundSeconds:15}},100000);liveAction(w,'start',{id:e.id},100000);advanceLive(w,'test',100000);
 const event=(i,at)=>({id:e.id,sessionId:e.sessionId,eventId:'champion-'+at,at,source:'SIMULATED_OPERATOR',participantId:'demo-person'+i,name:'Pessoa '+i,type:'gift',quantity:1,gift:'rosa'});
 for(let i=0;i<6;i++){const at=101000+i*1000;liveAction(w,'performance-event',event(i,at),at);advanceLive(w,'test',at);}
 for(let at=106200;at<=119000;at+=200)advanceLive(w,'test',at);
 assert.equal(e.game.players.filter(p=>p.participantId).length,6);
 const identity=e.game.players.find(p=>p.participantId==='demo-person0').id;
 const ev=event(0,120000);liveAction(w,'performance-event',ev,120000);advanceLive(w,'test',120000);const actor=e.game.players.find(p=>p.id===identity);assert.equal(actor.giftKind,'rose');assert.equal(actor.giftAt,120000);
 liveAction(w,'performance-event',ev,120000);advanceLive(w,'test',120000);assert.equal(e.performance.top.find(p=>p.id==='demo-person0').quantity,2);
 assert.throws(()=>liveAction(initialWorkspace(),'performance-event',ev,120000));assert.throws(()=>liveAction(w,'performance-event',{...ev,eventId:'bad-session',sessionId:'foreign'},120000));
 liveAction(w,'stop',{id:e.id},121000);liveAction(w,'start',{id:e.id},122000);assert.deepEqual(e.game.identities,{});
});
