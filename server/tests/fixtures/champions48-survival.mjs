import {createGame,advanceGame,gameConfig} from '../../live-game.mjs';
const reports=[];
for(const count of [2,4,6]){const g=createGame(gameConfig({template:'seed-snake',names:Array.from({length:count},(_,i)=>`Bot ${i}`),roundSeconds:75,champions:true}),1000),first={};for(let at=1200;at<=901000;at+=200){advanceGame(g,at);if(g.players.some(p=>!p.alive)&&!first[g.round])first[g.round]=at-g.roundAt;}
const durations=g.history.map(r=>r.durationMs),sorted=[...durations].sort((a,b)=>a-b);reports.push({participants:count,simulatedMs:900000,roundLimitMs:75000,completedRounds:durations.length,rounds:g.history,firstEliminationMsByRound:first,minMs:sorted[0],meanMs:durations.reduce((a,b)=>a+b,0)/durations.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)});}
console.log(JSON.stringify({method:'Deterministic simulation; one 15-minute trajectory per participant count, not random trials or wall-clock audiovisual performance.',reports},null,2));
