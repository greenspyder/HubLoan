// Game plugin: deterministic simulation only; no rendering, network or model calls.
import { AppError } from './domain.mjs';
export function gameConfig(input) {
 if (!input || input.template !== 'seed-snake' || !Number.isInteger(input.roundSeconds) || input.roundSeconds<15 || input.roundSeconds>180 || !Array.isArray(input.names) || input.names.length!==2 || input.names.some(n=>typeof n!=='string'||!n.trim()||n.length>40)) throw new AppError('Use Seed Snake, dois nomes e rodadas de 15 a 180 segundos.');
 return {template:'seed-snake',roundSeconds:input.roundSeconds,names:input.names.map(n=>n.trim())};
}
const same=(a,b)=>a.x===b.x&&a.y===b.y;
function round(g,now){g.round++;g.phase='PLAYING';g.roundAt=now;g.winner=null;g.players=g.names.map((name,i)=>({id:String(i),name,color:['#78d6ba','#ffc575'][i],alive:true,score:0,direction:i?2:0,body:[{x:i?13:2,y:i?19:4},{x:i?14:1,y:i?19:4},{x:i?15:0,y:i?19:4}]}));g.food=[{x:7,y:5},{x:9,y:18},{x:5,y:12}];}
export function createGame(config,now){const g={...config,round:0,step:0,lastAt:now,ranking:[0,0],history:[],frames:[],soundAt:0};round(g,now);return g;}
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
function step(g,at){
 if(g.phase==='FINISHED'){if(at-g.endedAt>=3000)round(g,at);return;}
 const occupied=g.players.filter(p=>p.alive).flatMap(p=>p.body);
 const moves=g.players.map(p=>{
  if(!p.alive)return null;
  const target=g.food[(g.step+Number(p.id))%g.food.length]||p.body[0];
  const options=dirs.map(([dx,dy],d)=>({x:p.body[0].x+dx,y:p.body[0].y+dy,d})).filter(n=>n.d!==(p.direction+2)%4);
  const safe=options.filter(n=>n.x>=0&&n.x<16&&n.y>=0&&n.y<24&&!occupied.some(b=>same(b,n)));
  return (p.command!=null?safe.find(n=>n.d===p.command):null)||safe.sort((a,b)=>(Math.abs(a.x-target.x)+Math.abs(a.y-target.y))-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y))||((a.d+g.step)%4)-((b.d+g.step)%4))[0]||null;
 });
 for(const [i,p] of g.players.entries()){
  if(!p.alive)continue;const n=moves[i];delete p.command;
  if(!n||moves.some((other,j)=>i!==j&&other&&same(other,n))){p.alive=false;g.soundAt=at;continue;}
  p.direction=n.d;p.body.unshift({x:n.x,y:n.y});const food=g.food.findIndex(f=>same(f,n));
  if(food>=0){p.score++;g.soundAt=at;g.food.splice(food,1);for(let k=0;k<384;k++){const f={x:(g.step*7+k)%16,y:Math.floor(((g.step*7+k)%384)/16)};if(!g.players.some(s=>s.body.some(b=>same(b,f)))&&!g.food.some(b=>same(b,f))){g.food.push(f);break;}}}else p.body.pop();
 }
 if(g.players.filter(p=>p.alive).length<2||at-g.roundAt>=g.roundSeconds*1000){
  const sorted=[...g.players].sort((a,b)=>Number(b.alive)-Number(a.alive)||b.score-a.score);g.winner=sorted[0].alive===sorted[1].alive&&sorted[0].score===sorted[1].score?'Empate':sorted[0].name;
  g.players.forEach((p,i)=>g.ranking[i]+=p.score+(p.name===g.winner?5:0));g.phase='FINISHED';g.endedAt=at;g.soundAt=at;g.history.push({round:g.round,winner:g.winner,scores:g.players.map(p=>p.score),at});g.history=g.history.slice(-30);
 }
}
export function advanceGame(g,now){
 // Bounded catch-up in the EXISTING runtime. Keep short playback history for network jitter.
 let n=0;while(g.lastAt+200<=now&&n++<25){g.lastAt+=200;g.step++;step(g,g.lastAt);g.frames.push({at:g.lastAt,phase:g.phase,round:g.round,winner:g.winner,players:structuredClone(g.players),food:structuredClone(g.food),soundAt:g.soundAt});}g.frames=g.frames.slice(-30);
}
export function gameEvent(g,event){if(event.type==='challenge'){g.players[0].command=(g.players[0].direction+1)%4;}if(event.type==='celebrate'){g.players[0].score++;} }
export const gameTemplates={'seed-snake':{configure:gameConfig,create:createGame,advance:advanceGame,event:gameEvent}};
