// Game plugin: deterministic simulation only; no rendering, network or model calls.
import { AppError } from './domain.mjs';
export function gameConfig(input) {
 if (!input || input.template !== 'seed-snake' || !Number.isInteger(input.roundSeconds) || input.roundSeconds<15 || input.roundSeconds>180 || !Array.isArray(input.names) || input.names.length<2||input.names.length>6 || input.names.some(n=>typeof n!=='string'||!n.trim()||n.length>40)) throw new AppError('Use Seed Snake, dois a seis nomes e rodadas de 15 a 180 segundos.');
 if(input.specialEvery!==undefined&&![0,3,5].includes(input.specialEvery))throw new AppError('Maçã dourada: desativada, a cada 3 ou 5 alimentos.');
 if(input.champions!==undefined&&typeof input.champions!=='boolean')throw new AppError('Modo campeões inválido.');
 return {champions:input.champions===true,specialEvery:input.specialEvery||0,template:'seed-snake',roundSeconds:input.roundSeconds,names:input.names.map(n=>n.trim())};
}
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const palette=['#62b9ed','#e58fbc','#de7658','#ab91de','#74b987','#ebc65a'];
export const championArchetypes=['snake','dragon','cat','crocodile','fox','snake'];
// Session-scoped identities. Only current ranking metadata changes during a round.
export function syncChampions(g,top,now){
 if(!g.champions)return;
 g.identities||={};g.rosterRevision||=0;
 const selected=top.slice(0,g.names.length).map((person,rank)=>{
  let identity=g.identities[person.id];
  if(!identity){const variant=Object.keys(g.identities).length%6;identity=g.identities[person.id]={id:'champion:'+person.id,participantId:person.id,color:palette[variant],archetype:championArchetypes[variant],variant,firstSeenAt:now};}
  return {...identity,name:person.name,rank:rank+1,giftQuantity:person.quantity,source:'SIMULATED_OPERATOR'};
 });
 for(let i=selected.length;i<g.names.length;i++)selected.push({id:String(i),name:g.names[i],color:palette[i],archetype:championArchetypes[i],source:'INTERNAL_GAME'});
 g.pendingRoster=selected;
 for(const player of g.players){const current=selected.find(p=>p.id===player.id);player.rank=current?.rank??null;if(current){player.name=current.name;player.giftQuantity=current.giftQuantity;}}
}
function round(g,now){
 g.totalScores||={};g.round++;g.phase='PLAYING';g.roundAt=now;g.winner=null;g.winnerId=null;
 g.obstacles=[{x:7,y:10},{x:8,y:10},{x:7,y:14}];
 const roster=g.pendingRoster||g.names.map((name,i)=>({id:String(i),name,color:palette[i],archetype:championArchetypes[i],source:'INTERNAL_GAME'}));
 g.players=roster.map((identity,i)=>{const x=i%2?13:2,y=g.names.length===2?(i?19:4):[3,3,11,11,20,20][i];return {...identity,alive:true,score:0,direction:i%2?2:0,eatenAt:0,hitAt:0,target:null,body:[{x,y},{x:x+(i%2?1:-1),y},{x:x+(i%2?2:-2),y}]};});
 g.ranking=g.players.map(p=>g.totalScores[p.id]||0);
 g.food=[{x:6+(g.round%3),y:5},{x:9,y:18},{x:4,y:12}];
 if(g.players.length>2)g.food.push({x:11,y:7},{x:4,y:17},{x:10,y:21});
}
export function createGame(config,now){const g={...config,round:0,step:0,lastAt:now,ranking:[],totalScores:{},identities:{},history:[],frames:[],soundAt:0};round(g,now);return g;}
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
function step(g,at){
 if(g.phase==='FINISHED'){if(at-g.endedAt>=3000)round(g,at);return;}
 const occupied=g.players.filter(p=>p.alive).flatMap(p=>p.body).concat(g.obstacles||[]);
 const moves=Array(g.players.length).fill(null),reserved=new Set();
 const order=g.players.map((_,i)=>(i+g.step)%g.players.length);
 for(const playerIndex of order){const p=g.players[playerIndex];
  if(!p.alive)continue;
  const blocked=new Set([...occupied.map(b=>b.x+16*b.y),...reserved]);
  // Breadth-first search keeps an actual reachable apple as target, not a rotating index.
  const head=p.body[0],queue=[{...head,d:-1}],visited=new Set([head.x+16*head.y]);let found=null;
  for(let i=0;i<queue.length;i++){
   const node=queue[i];if(i&&g.food.some(f=>same(f,node))){found=node;break;}
   for(let turn=0;turn<4;turn++){const d=(p.direction+turn)%4,[dx,dy]=dirs[d],x=node.x+dx,y=node.y+dy,key=x+16*y;
    if((i===0&&d===(p.direction+2)%4)||x<0||x>=16||y<0||y>=24||blocked.has(key)||visited.has(key))continue;
    visited.add(key);queue.push({x,y,d:i?node.d:d});
   }
  }
  p.target=found?{x:found.x,y:found.y}:null;
  const options=dirs.map(([dx,dy],d)=>({x:head.x+dx,y:head.y+dy,d})).filter(n=>n.d!==(p.direction+2)%4&&n.x>=0&&n.x<16&&n.y>=0&&n.y<24&&!blocked.has(n.x+16*n.y));
  // If all food is sealed off, seek the largest reachable area instead of oscillating.
  const componentAreas=new Map();
  function area(n){const key=n.x+16*n.y;if(componentAreas.has(key))return componentAreas.get(key);const seen=new Set([n.x+16*n.y]),q=[n];for(let i=0;i<q.length;i++)for(const [dx,dy] of dirs){const x=q[i].x+dx,y=q[i].y+dy,k=x+16*y;if(x>=0&&x<16&&y>=0&&y<24&&!blocked.has(k)&&!seen.has(k)){seen.add(k);q.push({x,y});}}for(const key of seen)componentAreas.set(key,q.length);return q.length;}
  const scored=options.map(n=>({...n,area:area(n)}));
  const viable=scored.filter(n=>n.area>=Math.min(p.body.length+3,24));
  const candidates=viable.length?viable:scored;
  // Prefer open escape routes and avoid predicted congestion beside rival heads.
  for(const option of candidates){option.exits=dirs.filter(([dx,dy])=>{const x=option.x+dx,y=option.y+dy;return x>=0&&x<16&&y>=0&&y<24&&!blocked.has(x+16*y);}).length;option.risk=g.players.filter(other=>other!==p&&other.alive&&Math.abs(other.body[0].x-option.x)+Math.abs(other.body[0].y-option.y)<=2).length;}
  const open=candidates.filter(n=>n.exits>=2),space=open.length?open:candidates,minRisk=Math.min(...space.map(n=>n.risk));
  const pool=space.filter(n=>n.risk===minRisk);
  const n=(p.command!=null?pool.find(n=>n.d===p.command):null)||pool.find(n=>n.d===found?.d)||pool.sort((a,b)=>b.area-a.area||a.d-b.d)[0]||null;
  moves[playerIndex]=n;if(n)reserved.add(n.x+16*n.y);
 }
 for(const [i,p] of g.players.entries()){
  if(!p.alive)continue;const n=moves[i];delete p.command;
  if(!n||moves.some((other,j)=>i!==j&&other&&same(other,n))){p.alive=false;p.hitAt=at;g.soundAt=at;continue;}
  p.direction=n.d;p.body.unshift({x:n.x,y:n.y});const food=g.food.findIndex(f=>same(f,n));
  if(food>=0){const bonus=g.food[food].golden?2:1;p.score+=bonus;if(bonus===2)p.growthPending=1;p.eatenAt=at;p.eatenPosition={x:n.x,y:n.y};g.soundAt=at;if(p.body.length>Math.max(15,Math.floor(90/g.players.length)))p.body.pop();g.food.splice(food,1);for(let k=0;k<384;k++){const f={x:(g.step*7+k)%16,y:Math.floor(((g.step*7+k)%384)/16)};if(!g.players.some(s=>s.body.some(b=>same(b,f)))&&!g.food.some(b=>same(b,f))&&!(g.obstacles||[]).some(b=>same(b,f))){g.foodSerial=(g.foodSerial||0)+1;if(g.specialEvery&&g.foodSerial%g.specialEvery===0)f.golden=true;g.food.push(f);break;}}}else if(p.growthPending)p.growthPending--;else p.body.pop();
  const maxLength=Math.max(15,Math.floor(90/g.players.length));while(p.body.length>maxLength)p.body.pop();
 }
 if(g.players.filter(p=>p.alive).length<2||at-g.roundAt>=g.roundSeconds*1000){
  const sorted=[...g.players].sort((a,b)=>Number(b.alive)-Number(a.alive)||b.score-a.score);g.winner=sorted[0].alive===sorted[1].alive&&sorted[0].score===sorted[1].score?'Empate':sorted[0].name;
  g.winnerId=g.winner==='Empate'?null:sorted[0].id;g.totalScores||={};g.players.forEach((p,i)=>{g.totalScores[p.id]=(g.totalScores[p.id]||0)+p.score+(p.id===g.winnerId?5:0);g.ranking[i]=g.totalScores[p.id];});g.phase='FINISHED';g.endedAt=at;g.soundAt=at;g.history.push({round:g.round,durationMs:at-g.roundAt,winner:g.winner,winnerId:g.winnerId,participantId:g.winnerId?(sorted[0].participantId||null):null,aliveCount:g.players.filter(p=>p.alive).length,scores:g.players.map(p=>p.score),survival:g.players.map(p=>({id:p.id,participantId:p.participantId||null,alive:p.alive,survivalMs:(p.alive?at:p.hitAt)-g.roundAt})),at});g.history=g.history.slice(-30);
 }
}
export function advanceGame(g,now){
 // Bounded catch-up in the EXISTING runtime. Keep short playback history for network jitter.
 let n=0;while(g.lastAt+200<=now&&n++<25){g.lastAt+=200;g.step++;step(g,g.lastAt);g.frames.push({at:g.lastAt,phase:g.phase,round:g.round,winner:g.winner,winnerId:g.winnerId,endedAt:g.endedAt,roundAt:g.roundAt,obstacles:g.obstacles||[],players:structuredClone(g.players),food:structuredClone(g.food),soundAt:g.soundAt});}g.frames=g.frames.slice(-30);
}
export function gameEvent(g,event){if(event.type==='challenge'){g.players[0].command=(g.players[0].direction+1)%4;}if(event.type==='celebrate'){g.players[0].score++;} }
export const gameTemplates={'seed-snake':{configure:gameConfig,create:createGame,advance:advanceGame,event:gameEvent}};
