// Executable vocabulary, not free-text interpretation or artistic scoring.
export const sceneCapabilities={
 comedy:{seconds:18,actions:['performance','gameplay'],shots:['Front','Action','Follow'],scenes:4},
 battle:{seconds:25,actions:['event','replay'],shots:['Front','Action','Follow','Tactical'],scenes:4},
 mystery:{seconds:18,actions:['approach','signal','reveal'],shots:['wide','medium','close'],scenes:3}
};
export function validateScenePlan(plan,format,lines,eventIds=[]){
 const c=sceneCapabilities[format];if(!c||plan?.version!==1||!Array.isArray(plan.scenes)||plan.scenes.length!==c.scenes)throw Error('Plano visual incompatível com o adaptador.');
 const scenes=plan.scenes.map((s,i)=>{
  if(!c.actions.includes(s.action)||!c.shots.includes(s.camera)||s.transition!=='cut'||!['hook','development','payoff'].includes(s.beat)||!Number.isInteger(s.narration)||s.narration<0||s.narration>=lines.length)throw Error('Ação, câmera ou narração não suportada.');
  if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.end-s.start<1||Math.abs(s.start-(i?plan.scenes[i-1].end:0))>.01)throw Error('Timeline deve ser contínua.');
  if(format==='battle'&&!eventIds.includes(s.eventId))throw Error('Acontecimento não existe na simulação.');
  return {start:s.start,end:s.end,action:s.action,camera:s.camera,transition:s.transition,beat:s.beat,narration:s.narration,...(format==='battle'?{eventId:s.eventId}:{}),sound:'narration',caption:'from-narration'};
 });
 if(Math.abs(scenes.at(-1).end-c.seconds)>.01||scenes[0].beat!=='hook'||scenes.at(-1).beat!=='payoff'||!scenes.some(s=>s.beat==='development'))throw Error('Faltam começo, desenvolvimento ou conclusão.');
 if(lines.some((_,i)=>!scenes.some(s=>s.narration===i))||scenes.some((s,i)=>i>0&&s.narration<scenes[i-1].narration))throw Error('Narração deve cobrir as falas em ordem temporal.');
 if(new Set(scenes.map(s=>s.action)).size<2)throw Error('Plano sem progressão visual.');
 if(format==='mystery'&&(scenes.map(s=>s.action).join(',')!=='approach,signal,reveal'||scenes.some((s,i)=>s.start!==i*6||s.end!==(i+1)*6||s.narration!==i)))throw Error('Microconto suporta aproximação, sinal e revelação em três cenas de seis segundos.');
 if(format==='comedy'&&!scenes.some(s=>s.action==='gameplay'))throw Error('Comédia exige ação da arena.');
 return {version:1,format,seconds:c.seconds,scenes};
}
export function scriptSimilarity(a,b){
 const tokens=s=>new Set(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[]),x=tokens(a),y=tokens(b);
 return [...x].filter(t=>y.has(t)).length/Math.max(1,new Set([...x,...y]).size);
}
