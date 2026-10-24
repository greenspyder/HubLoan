// Presentation state only: no game mutation, network, random values or independent clock.
export function createDirector(){
 let session=null,lastRound=null,started=null,lastCut=-Infinity,until=0,recoverUntil=0,mode='Overview',cue=null,previous=[],lastRank=0;
 const cooldown=new Map(),counts={};let shot='Tactical',shotAt=0,protagonist=0,lastSession=null,shotRound=null;const shots={};
 return {counts,shots,update(e,f,at,voice){
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
  if(voice?.role==='music'&&voice.level>.02)add('music',90,0,Math.max(200,Math.min(20000,(voice.durationMs||6000)-(voice.elapsedMs||0))),'joy');
  if(voice?.level>.08&&['host','chant'].includes(voice.role))add('speech',50,0,3000,voice.role==='chant'?'joy':'surprise');
  candidates.sort((a,b)=>b.priority-a.priority);
  const next=candidates.find(c=>at-(cooldown.get(c.kind)??-Infinity)>(c.kind==='result'?6000:c.kind==='speech'?14000:9000));
  if(next&&at-lastCut>=3500&&(!cue||at>=until||next.priority>cue.priority)){
   cue=next;if(next.kind==='community')lastRank=rank;lastCut=at;until=at+next.duration;cooldown.set(next.kind,at);mode=next.kind==='result'||next.kind==='community'||next.kind==='music'?'Celebration':next.kind==='speech'?'Close-up':'Action';counts[next.kind]=(counts[next.kind]||0)+1;
  }else if(at>=until){if(cue){cue=null;mode='Recovery';recoverUntil=at+1800;}else if(at>=recoverUntil)mode=at-started<3000?'Overview':'Follow';}
  previous=players.map(p=>({score:p.score,alive:p.alive,direction:p.direction}));lastRound=f.round;
  const fresh=lastSession!==key||shotAt===0||shotRound!==f.round;lastSession=key;shotRound=f.round;
  if(fresh){shot='Tactical';shotAt=at;protagonist=0;}
  const alive=players.map((p,i)=>({p,i})).filter(v=>v.p.alive);
  const leader=alive.sort((a,b)=>b.p.score-a.p.score||a.i-b.i)[0]?.i??0;
  const desiredPlayer=cue?.player??leader,interest=cue?.priority??(players[leader]?.target?20:10);
  let desiredShot=mode==='Overview'||cue?.kind==='contest'?'Tactical':mode==='Celebration'||mode==='Close-up'?'Front':mode==='Action'?'Action':'Follow';
  const head=players[desiredPlayer]?.body?.[0],nearby=head&&(f.obstacles||[]).some(o=>Math.hypot(o.x-head.x,o.y-head.y)<3.5);
  if(desiredShot==='Follow'&&nearby)desiredShot='Action';
  if(cue?.kind==='harvest')desiredShot='Front';
  const lost=!players[protagonist]?.alive&&f.phase!=='FINISHED';
  if(lost){protagonist=leader;shot='Tactical';shotAt=at;}
  else if(!fresh&&at-shotAt>=5000&&(shot!==desiredShot||protagonist!==desiredPlayer)){shot=desiredShot;protagonist=desiredPlayer;shotAt=at;shots[shot]=(shots[shot]||0)+1;}
  return {mode,cue,shot,interest,player:protagonist,emotion:cue?.emotion??'neutral',at,age:cue?at-cue.at:0};
 }};
}
