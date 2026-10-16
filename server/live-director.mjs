// Presentation state only: no game mutation, network, random values or independent clock.
export function createDirector(){
 let session=null,lastRound=null,started=null,lastCut=-Infinity,until=0,recoverUntil=0,mode='Overview',cue=null,previous=[],lastRank=0;
 const cooldown=new Map(),counts={};
 return {counts,update(e,f,at,voice){
  if(!f?.players?.length)return {mode:'Overview',cue:null,player:0,emotion:'neutral',at,age:0};
  const key=e.sessionId??'preview';if(session!==key){session=key;lastRound=null;started=at;lastCut=-Infinity;until=at+3000;recoverUntil=0;mode='Overview';cue=null;previous=[];lastRank=0;cooldown.clear();}
  const candidates=[],players=f?.players||[];
  const add=(kind,priority,player,duration,emotion)=>candidates.push({kind,priority,player,duration,emotion,at});
  if(lastRound===f.round){
   players.forEach((p,i)=>{const old=previous[i];if(!old)return;
    if(p.score>old.score)add('harvest',40,i,2200,'joy');
    if(old.alive&&!p.alive)add('collision',85,i,2600,'sad');
    const h=p.body[0],near=(f.obstacles||[]).some(o=>Math.abs(h.x-o.x)+Math.abs(h.y-o.y)===1);
    if(p.alive&&near&&p.direction!==old.direction)add('near-miss',70,i,2300,'fear');
   });
   const [a,b]=players;if(a?.target&&b?.target&&a.target.x===b.target.x&&a.target.y===b.target.y&&Math.abs(a.body[0].x-b.body[0].x)+Math.abs(a.body[0].y-b.body[0].y)<7)add('contest',60,0,2600,'surprise');
  }
  if(f.phase==='FINISHED')add('result',100,Math.max(0,players.findIndex(p=>p.name===f.winner)),3000,f.winner==='Empate'?'surprise':'joy');
  const rank=e.performance?.rankingChangedAt||0;if(rank!==lastRank&&rank<=at&&at-rank<4000){add('community',80,0,3200,'joy');}
  if(voice?.level>.08&&voice.role!=='comment')add('speech',50,0,3000,voice.role==='chant'?'joy':'surprise');
  candidates.sort((a,b)=>b.priority-a.priority);
  const next=candidates.find(c=>at-(cooldown.get(c.kind)??-Infinity)>(c.kind==='result'?6000:c.kind==='speech'?14000:9000));
  if(next&&at-lastCut>=3500&&(!cue||at>=until||next.priority>cue.priority)){
   cue=next;if(next.kind==='community')lastRank=rank;lastCut=at;until=at+next.duration;cooldown.set(next.kind,at);mode=next.kind==='result'||next.kind==='community'?'Celebration':next.kind==='speech'?'Close-up':'Action';counts[next.kind]=(counts[next.kind]||0)+1;
  }else if(at>=until){if(cue){cue=null;mode='Recovery';recoverUntil=at+1800;}else if(at>=recoverUntil)mode=at-started<3000?'Overview':'Follow';}
  previous=players.map(p=>({score:p.score,alive:p.alive,direction:p.direction}));lastRound=f.round;
  return {mode,cue,player:cue?.player??0,emotion:cue?.emotion??'neutral',at,age:cue?at-cue.at:0};
 }};
}
