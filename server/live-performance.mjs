// Presentation decisions only. Never calls a model or changes game physics.
import { randomUUID } from 'node:crypto';
import { AppError } from './domain.mjs';
export const performanceDefaults=()=>({enabled:false,humor:'playful',hostVoice:'host',commentVoice:'bright',music:true,musicGain:.18,voiceGain:.8,effectsGain:.4,cooldownSeconds:8,style:'groove',aiMode:'off'});
export function performanceConfig(c){
 if(!c||typeof c.enabled!=='boolean'||typeof c.music!=='boolean'||!['playful','gentle'].includes(c.humor)||c.hostVoice!=='host'||!['bright','deep'].includes(c.commentVoice)||!['groove','calm'].includes(c.style)||c.aiMode!=='off'||![c.musicGain,c.voiceGain,c.effectsGain].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||!Number.isInteger(c.cooldownSeconds)||c.cooldownSeconds<5||c.cooldownSeconds>60)throw new AppError('Configuração de atuação inválida. IA paga não habilitada.');
 return Object.fromEntries(Object.keys(performanceDefaults()).map(k=>[k,c[k]]));
}
export function resetPerformance(e){e.performance={sessionId:e.sessionId,mode:'DEMONSTRATION',metric:'SIMULATED_GIFT_QUANTITY',bindings:[],participants:[],top:[],jobs:[],recent:[],accepted:0,dropped:0,grouped:0,lastSpokeAt:0,avatarUntil:0,rankingRevision:0,aiCalls:0,apiCostMinor:0};}
export function safeText(s,max=140){
 if(typeof s!=='string'||!s.trim()||s.length>max||/[<>\x00-\x1f]|https?:|www\.|@|\b(ignore|system|prompt|token|senha|execute|sudo|racista|nazista|suicid|mate|matar)\b/i.test(s))throw new AppError('Texto não aprovado para narração. Use uma mensagem curta, sem links ou instruções.');
 const clean=s.normalize('NFC').replace(/[^\p{L}\p{N} .,!?áéíóúãõç-]/gu,'').trim();
 if(!clean)throw new AppError('Texto vazio após filtragem.');
 return clean;
}
export function demoEvent(input){
 if(input.source!=='SIMULATED_OPERATOR'||!['comment','gift'].includes(input.type)||!/^demo-[a-zA-Z0-9_-]{1,40}$/.test(input.participantId||''))throw new AppError('Somente eventos de demonstração são suportados.');
 const v={type:input.type,participantId:input.participantId,name:safeText(input.name,32)};
 if(input.type==='comment')v.message=safeText(input.message);
 else {if(!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>100)throw new AppError('Quantidade de teste: 1 a 100.');v.quantity=input.quantity;v.gift=safeText(input.gift||'presente',32);}
 return v;
}
function job(p,e,segments,now,priority=0){
 if(p.jobs.filter(j=>j.expiresAt>now).length>=6){p.dropped++;return;}
 p.jobs=p.jobs.filter(j=>j.expiresAt>now);p.jobs.push({id:randomUUID(),sessionId:e.sessionId,createdAt:now,expiresAt:now+45000,priority,segments,source:'SIMULATED_OPERATOR'});p.lastSpokeAt=now;
 p.recent.push({at:now,text:segments.at(-1).text});p.recent=p.recent.slice(-12);
}
export function advancePerformance(e,event,now){
 const p=e.performance,c=e.performanceConfig||performanceDefaults();if(!p||!c.enabled)return;
 const key=event.message?.toLocaleLowerCase('pt-BR');
 if(key&&p.recent.some(x=>x.comment===key&&now-x.at<30000)){p.grouped++;return;}
 let person=p.participants.find(x=>x.id===event.participantId);
 if(!person){if(p.participants.length>=100){p.dropped++;return;}person={id:event.participantId,name:event.name,quantity:0,joined:p.accepted,avatar:null};p.participants.push(person);}person.name=event.name;p.accepted++;
 const oldLeader=p.top[0]?.id;
 if(event.type==='gift'){
  p.previousTop=p.top.map(x=>x.id);p.rankingChangedAt=now;person.quantity+=event.quantity;
  p.top=p.participants.filter(x=>x.quantity>0).sort((a,b)=>b.quantity-a.quantity||a.joined-b.joined||a.id.localeCompare(b.id)).slice(0,6).map(x=>({...x}));p.rankingRevision++;p.avatarUntil=now+12000;
 }
 if(now-p.lastSpokeAt<c.cooldownSeconds*1000){p.dropped++;return;}
 const round=e.game?.round||1,variant=p.accepted%3;
 if(event.type==='comment'){
  const replies=c.humor==='gentle'?[`Boa, ${person.name}! Na rodada ${round}, vamos tentar de novo.`,`Quem acompanha já faz parte do jardim, ${person.name}!`]:[/jog|cobra/i.test(event.message)?`Eu erro a curva, mas acerto o espetáculo, ${person.name}!`:`${person.name}, eu ouvi! Meu talento está fazendo aquecimento.`,`Na rodada ${round}, meu plano é parecer que tenho um plano!`,`${person.name}, voltou para ver meu talento rastejante?`];
  job(p,e,[{role:'comment',voice:c.commentVoice,text:event.message},{role:'host',voice:'host',text:replies[variant%replies.length]}],now);p.recent.push({at:now,comment:key});p.recent=p.recent.slice(-12);
 }else{
  const leader=p.top[0]?.id!==oldLeader;
  const line=event.quantity>=10?`${person.name} chegou, o jardim levantou! Minha cobra desafina, mas o carinho afinou!`:`Uma ${event.gift} para enfeitar, ${person.name} veio alegrar! Não sei fazer bouquet, mas já sei comemorar!`;
  job(p,e,[{role:'host',voice:'host',text:leader?`${person.name} lidera o ranking de demonstração!`:`Obrigado pelo carinho, ${person.name}!`},{role:'chant',voice:'host',text:line}],now,event.quantity>=10?2:1);
 }
}
export function publicPerformance(p){if(!p)return null;const {participants,...rest}=p;return {...rest,participantCount:participants.length};}
export const liveAudienceAdapter={status:'NOT_SUPPORTED',reason:'Sem acesso oficial validado a comentários, presentes e fotos TikTok LIVE.',ingest(){throw new AppError('Integração LIVE indisponível.',409);}};
