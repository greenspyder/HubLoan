import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advanceGame} from '../live-game.mjs';
test('survival records individual eliminations independently of round duration and survives persistence',()=>{
 const g=createGame({template:'seed-snake',names:['A','B','C','D','E','F'],roundSeconds:75},1000);
 for(let at=1200;at<=151000;at+=200)advanceGame(g,at);
 assert.ok(g.history.length);
 for(const r of g.history){assert.equal(r.survival.length,6);for(const p of r.survival){assert.ok(p.survivalMs>0&&p.survivalMs<=r.durationMs);if(p.alive)assert.equal(p.survivalMs,r.durationMs);}}
 assert.ok(g.history.some(r=>r.survival.some(p=>p.survivalMs<r.durationMs)));
 assert.deepEqual(JSON.parse(JSON.stringify(g)).history,g.history);
});
