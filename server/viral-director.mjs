// Offline editorial planning over real deterministic game snapshots. No LLM or IO.
import {createGame,advanceGame} from './live-game.mjs';
export function recordGameplay(config,seconds=90){
 if(!Number.isInteger(seconds)||seconds<1||seconds>120)throw Error('Limite de simulação: 1–120 segundos');
 const game=createGame({template:'seed-snake',names:config.characters,roundSeconds:30,specialEvery:3},100000),frames=[];
 for(let ms=200;ms<=seconds*1000;ms+=200){advanceGame(game,100000+ms);frames.push(structuredClone(game.frames.at(-1)));}
 return {frames,history:game.history};
}
export function detectHighlights(frames){
 const events=[],last=new Map();
 const emit=(type,f,player,reason,weight)=>{const key=type+player;if(f.at-(last.get(key)||0)<3000)return;last.set(key,f.at);events.push({id:`${type}:${f.at}:${player}`,type,at:f.at,round:f.round,player,reason,weight});};
 for(let i=1;i<frames.length;i++){const f=frames[i],before=frames[i-1];if(f.round!==before.round)continue;
  f.players.forEach((p,index)=>{const old=before.players.find(q=>q.id===p.id);if(!old)return;
   if(old.alive&&!p.alive)emit('elimination',f,index,`${p.name} foi eliminada`,9);
   if(p.score>old.score)emit('growth',f,index,`${p.name}: ${old.score} → ${p.score} pontos`,3);
   if(p.alive&&f.players.some(q=>q.id!==p.id&&q.alive&&Math.abs(q.body[0].x-p.body[0].x)+Math.abs(q.body[0].y-p.body[0].y)<=2))emit('proximity',f,index,`${p.name} a até duas células de uma rival`,5);
  });
  if(f.phase==='FINISHED'&&before.phase!=='FINISHED')emit('result',f,Math.max(0,f.players.findIndex(p=>p.id===f.winnerId)),`Resultado: ${f.winner}`,8);
 }
 const counts=Object.fromEntries(events.map(e=>[e.type,events.filter(v=>v.type===e.type).length]));
 return events.map(e=>({...e,score:e.weight+1/counts[e.type],scoreExplanation:`peso ${e.weight} + raridade 1/${counts[e.type]}; não mede retenção`})).sort((a,b)=>b.score-a.score||a.at-b.at||a.player-b.player);
}
export function createEditorial(config,recording){
 const highlights=detectHighlights(recording.frames),first=recording.frames[0].at,last=recording.frames.at(-1).at,focus=highlights[0]||null;
 const start=Math.max(first,Math.min((focus?.at||first)-config.seconds*550,last-config.seconds*1000));
 const bounds=[0,.18,.55,.78,1].map(v=>Math.round(v*config.seconds*15)/15);
 const scenes=['Gancho','Desenvolvimento','Momento principal','Conclusão'].map((phase,i)=>({id:`scene-${i}`,phase,start:bounds[i],end:bounds[i+1],shot:config.format==='champion'?['Front','Action','Front','Follow'][i]:['Front','Follow','Action','Front'][i],player:config.format==='champion'?i%config.characters.length:config.format==='comedy'?0:(focus?.player||0),emotion:['confused','determined','surprise','teasing'][i],sourceStart:start+bounds[i]*1000,speed:1,transition:'cut',replay:false}));
 if(config.format==='battle'&&focus){scenes[0].sourceStart=Math.max(first,focus.at-1200);scenes[0].preview=true;scenes[2].sourceStart=Math.max(first,focus.at-800);scenes[2].speed=.65;scenes[2].replay=true;scenes[3].sourceStart=Math.min(last-(scenes[3].end-scenes[3].start)*1000,focus.at+400);}
 return {version:2,source:'DETERMINISTIC_GAME',scenes,highlights:highlights.slice(0,20),selectedHighlight:focus,fallback:!focus,review:{status:'HUMAN_REVIEW_REQUIRED',rubric:['Gancho','Contexto e desfecho','Ritmo e silêncio','Expressividade','Voz e música','Originalidade'],viralPotential:'NOT_MEASURED'}};
}
export function editorialFrame(recording,timeline,seconds,mediaAt){
 const scene=timeline.scenes.find(s=>seconds>=s.start&&seconds<s.end)||timeline.scenes.at(-1);
 const sourceAt=Math.max(recording.frames[0].at,Math.min(recording.frames.at(-1).at,scene.sourceStart+(seconds-scene.start)*1000*scene.speed));
 const i=Math.min(recording.frames.length-1,Math.max(0,Math.floor((sourceAt-recording.frames[0].at)/200))),pair=recording.frames.slice(i,i+2);
 const rebase=f=>{const out=structuredClone(f),shift=mediaAt-sourceAt;for(const k of ['at','endedAt','roundAt','soundAt'])if(out[k])out[k]+=shift;for(const p of out.players)for(const k of ['eatenAt','hitAt'])if(p[k])p[k]+=shift;return out;};
 return {game:{...rebase(pair[0]),frames:pair.map(rebase)},direction:{mode:scene.shot,shot:scene.shot,player:scene.player,emotion:scene.emotion,cutId:scene.id,editorial:true,title:scene.replay?'REPLAY':scene.preview?'DAQUI A POUCO':pair[0].players[scene.player]?.name||'Lume'},sourceAt,scene};
}
export function captionBlocks(captions){return captions.flatMap(c=>{const words=c.text.split(/\s+/),blocks=[];for(let i=0;i<words.length;i+=5){const end=Math.min(i+5,words.length);blocks.push({text:words.slice(i,end).join(' '),start:c.start+(c.end-c.start)*i/words.length,end:c.start+(c.end-c.start)*end/words.length});}return blocks;});}
