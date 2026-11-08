import {validateScenePlan} from './creative-plan.mjs';
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
   if(p.alive)for(const q of f.players.filter(q=>q.id!==p.id&&q.alive)){
    const previous=before.players.find(v=>v.id===q.id);if(!previous)continue;
    const distance=Math.hypot(p.body[0].x-q.body[0].x,p.body[0].y-q.body[0].y),prior=Math.hypot(old.body[0].x-previous.body[0].x,old.body[0].y-previous.body[0].y);
    if(distance<3&&distance<prior-.25)emit('approach',f,index,`${p.name} aproxima-se de ${q.name}: ${prior.toFixed(2)} → ${distance.toFixed(2)} células`,4);
    if(prior<3&&distance>prior+.5)emit('escape',f,index,`${p.name} afasta-se de ${q.name}: ${prior.toFixed(2)} → ${distance.toFixed(2)} células`,4);
    if(distance<4&&p.direction===q.direction&&distance<prior)emit('chase',f,index,`${p.name} e ${q.name} na mesma direção, distância ${distance.toFixed(2)} células`,4);
   }
   if(p.score>old.score)emit('growth',f,index,`${p.name}: ${old.score} → ${p.score} pontos`,3);
   if(p.alive&&f.players.some(q=>q.id!==p.id&&q.alive&&Math.abs(q.body[0].x-p.body[0].x)+Math.abs(q.body[0].y-p.body[0].y)<=2))emit('proximity',f,index,`${p.name} a até duas células de uma rival`,5);
  });
  const leader=f.players.reduce((a,b)=>b.score>a.score?b:a),oldLeader=before.players.reduce((a,b)=>b.score>a.score?b:a);if(leader.id!==oldLeader.id&&leader.score>oldLeader.score)emit('lead-change',f,f.players.indexOf(leader),`${leader.name} assume liderança com ${leader.score} pontos`,6);
  if(f.phase==='FINISHED'&&before.phase!=='FINISHED')emit('result',f,Math.max(0,f.players.findIndex(p=>p.id===f.winnerId)),`Resultado: ${f.winner}`,8);
 }
 const counts=Object.fromEntries(events.map(e=>[e.type,events.filter(v=>v.type===e.type).length]));
 return events.map(e=>({...e,score:e.weight+1/counts[e.type],scoreExplanation:`peso ${e.weight} + raridade 1/${counts[e.type]}; não mede retenção`})).sort((a,b)=>b.score-a.score||a.at-b.at||a.player-b.player);
}
export function createEditorial(config,recording){
 const highlights=detectHighlights(recording.frames),first=recording.frames[0].at,last=recording.frames.at(-1).at,focus=highlights[0]||null;
 const start=Math.max(first,Math.min((focus?.at||first)-config.seconds*550,last-config.seconds*1000));
 const bounds=[0,.18,.55,.78,1].map(v=>Math.round(v*config.seconds*15)/15);
 let scenes=['Gancho','Desenvolvimento','Momento principal','Conclusão'].map((phase,i)=>({id:`scene-${i}`,phase,start:bounds[i],end:bounds[i+1],shot:config.format==='champion'?['Front','Front','Front','Action'][i]:['Front','Follow','Action','Front'][i],player:config.format==='champion'?i%config.characters.length:config.format==='comedy'?0:(focus?.player||0),emotion:['confused','determined','surprise','teasing'][i],sourceStart:start+bounds[i]*1000,speed:1,transition:'cut',replay:false}));
 if(config.format==='battle'&&focus){scenes[0].sourceStart=Math.max(first,focus.at-1200);scenes[0].preview=true;scenes[2].sourceStart=Math.max(first,focus.at-800);scenes[2].speed=.65;scenes[2].replay=true;scenes[3].sourceStart=Math.min(last-(scenes[3].end-scenes[3].start)*1000,focus.at+400);}
 if(config.format==='battle')scenes=scenes.map(scene=>({...scene,speed:scene.replay?.35:.5,slowMotion:true}));
 if(config.format==='comedy')scenes=scenes.map((scene,i)=>({...scene,hold:i===0||i===2,speed:i===0||i===2?0:1,shot:i===0||i===2?'Front':'Action'}));
 if(config.format==='champion'){
  const stages=['Introdução','Silhueta','Rosto','Personalidade','Identidade'];
  scenes=config.characters.flatMap((name,player)=>stages.map((phase,k)=>({id:`champion-${player}-${k}`,phase,start:(player+k/5)*config.seconds/config.characters.length,end:(player+(k+1)/5)*config.seconds/config.characters.length,shot:k===2?'Front':'Action',player,emotion:['suspicious','proud','confident','teasing','proud'][k],sourceStart:first,speed:0,transition:k===0?'cut':'hold',replay:false,showcase:true,stage:k,name})));
 }
 if(config.visualPlan){
  const plan=validateScenePlan(config.visualPlan,config.format,config.lines,highlights.map(e=>e.id));
  scenes=plan.scenes.map((s,i)=>{const event=highlights.find(e=>e.id===s.eventId);return {id:'astra-'+i,phase:s.beat,start:s.start,end:s.end,shot:s.camera,player:event?.player||0,emotion:['confused','determined','surprise','teasing'][i],sourceStart:event?Math.max(first,event.at-800):start+s.start*1000,speed:s.action==='performance'?0:s.action==='replay'?.35:1,transition:s.transition,hold:s.action==='performance',replay:s.action==='replay',slowMotion:s.action==='replay'};});
 }
 return {format:config.format,version:4,source:'DETERMINISTIC_GAME',scenes,highlights:highlights.slice(0,80),selectedHighlight:focus,fallback:!focus,review:{status:'HUMAN_REVIEW_REQUIRED',rubric:['Gancho','Contexto e desfecho','Ritmo e silêncio','Expressividade','Voz e música','Originalidade'],viralPotential:'NOT_MEASURED'}};
}
export function editorialFrame(recording,timeline,seconds,mediaAt){
 const scene=timeline.scenes.find(s=>seconds>=s.start&&seconds<s.end)||timeline.scenes.at(-1);
 const sourceAt=Math.max(recording.frames[0].at,Math.min(recording.frames.at(-1).at,scene.sourceStart+(seconds-scene.start)*1000*scene.speed));
 const i=Math.min(recording.frames.length-1,Math.max(0,Math.floor((sourceAt-recording.frames[0].at)/200))),pair=recording.frames.slice(i,i+2);
 const frameEvent=timeline.format==='battle'?timeline.highlights.filter(e=>Math.abs(e.at-sourceAt)<800).sort((a,b)=>Math.abs(a.at-sourceAt)-Math.abs(b.at-sourceAt))[0]:null;
 const rebase=f=>{const out=structuredClone(f),shift=mediaAt-sourceAt;for(const k of ['at','endedAt','roundAt','soundAt'])if(out[k])out[k]+=shift;for(const p of out.players)for(const k of ['eatenAt','hitAt'])if(p[k])p[k]+=shift;return out;};
 return {game:{...rebase(pair[0]),frames:pair.map(rebase)},direction:{mode:scene.shot,shot:scene.shot,player:scene.player,emotion:scene.emotion,cutId:scene.showcase?`champion-${scene.player}-${scene.stage<2?0:scene.stage===2?1:2}`:scene.id,editorial:true,format:timeline.format,presenter:false,worldPresenter:timeline.format==='comedy',performanceHold:scene.hold===true,slowMotion:scene.slowMotion===true,showcase:scene.showcase===true,showcaseStage:scene.stage,stageProgress:(seconds-scene.start)/(scene.end-scene.start),narrative:scene.phase,sourceEvent:frameEvent?.type||timeline.selectedHighlight?.type||null,eventEvidence:frameEvent||null,title:scene.slowMotion?(scene.replay?'REPLAY · CÂMERA LENTA':'CÂMERA LENTA'):scene.hold?'Lume · pausa cômica':scene.replay?'REPLAY':scene.preview?'DAQUI A POUCO':pair[0].players[scene.player]?.name||'Lume'},sourceAt,scene};
}
export function captionBlocks(captions){return captions.flatMap(c=>{const words=c.text.split(/\s+/),blocks=[];for(let i=0;i<words.length;i+=5){const end=Math.min(i+5,words.length);blocks.push({text:words.slice(i,end).join(' '),start:c.start+(c.end-c.start)*i/words.length,end:c.start+(c.end-c.start)*end/words.length});}return blocks;});}
