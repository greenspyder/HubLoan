import { sceneSvg } from '../../../shared/live-visual.mjs';
import type { LiveExperience } from './liveFactory';
// Presentation only: all expressions, phrases and actions come from the server.
export function drawLiveScene(ctx:CanvasRenderingContext2D,e:LiveExperience,now:number,fresh:boolean,reducedMotion:boolean) {
 if(e.game){drawSnake(ctx,e,now,fresh);return;}
 const running=fresh&&e.connected&&e.status==='TESTING'&&e.heartbeat!=null&&now-e.heartbeat<=10000;
 const action=running&&e.action&&now<e.action.expiresAt?e.action:null;
 const animation=action?.animation||'idle',elapsed=action?(now-action.startedAt)/1000:0;
 const phase=running&&!reducedMotion?elapsed:0;
 const scene=e.config.scene,colors=scene==='sunset'?['#522d53','#f8ba87']:scene==='cosmos'?['#16142f','#9382de']:['#102838','#76c8ae'];
 const gradient=ctx.createLinearGradient(0,0,0,640);gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,'#101d2d');ctx.fillStyle=gradient;ctx.fillRect(0,0,360,640);
 ctx.fillStyle=colors[1];ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(282,115,34,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 for(let i=0;i<20;i++){ctx.fillStyle='#e4dba3';ctx.beginPath();ctx.arc(18+(i*73)%325,65+(i*41)%260,i%3+1,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#20474c';ctx.beginPath();ctx.ellipse(180,580,280,160,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(180,360);
 if(animation==='bounce')ctx.translate(0,-Math.abs(Math.sin(phase*6))*25);
 if(animation==='sway')ctx.rotate(Math.sin(phase*3)*.13);
 if(animation==='spin')ctx.scale(Math.cos(phase*4)*.35+.65,1);
 const expression=action?.expression|| (running?e.character.expression:'calm');
 const happy=['happy','joy'].includes(expression);
 ctx.fillStyle='#0e2930';ctx.beginPath();ctx.ellipse(0,105,68,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#78d6ba';ctx.strokeStyle='#c4ffde';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,15,61,81,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#c3df8e';for(const direction of [-1,1]){ctx.beginPath();ctx.ellipse(direction*20,-76,12,36,direction*.6,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#78d6ba';ctx.lineWidth=13;ctx.lineCap='round';
 for(const direction of [-1,1]){ctx.beginPath();ctx.moveTo(direction*53,22);ctx.lineTo(direction*83,(animation==='wave'? -22+Math.sin(phase*9)*15:happy?-15:50));ctx.stroke();}
 ctx.strokeStyle='#183c40';ctx.lineWidth=6;
 for(const x of [-25,25]){ctx.beginPath();if(happy)ctx.arc(x,5,9,Math.PI,0);else if(expression==='curious'){ctx.arc(x,3,x<0?6:10,0,Math.PI*2);}else{ctx.moveTo(x,-1);ctx.lineTo(x,expression==='focused'?8:13);}ctx.stroke();}
 ctx.beginPath();ctx.moveTo(-17,38);ctx.quadraticCurveTo(0,happy?65:47,17,38);ctx.stroke();
 if(expression==='joy'){ctx.fillStyle='#ffe49c';for(const x of [-100,100]){ctx.beginPath();ctx.arc(x,-40,6+Math.abs(Math.sin(phase*4))*3,0,Math.PI*2);ctx.fill();}}
 ctx.restore();ctx.textAlign='center';ctx.fillStyle='#eafff4';ctx.font='bold 27px sans-serif';ctx.fillText(e.config.name,180,55,320);
 const speech=action?.speech||e.character.speech;ctx.font='18px sans-serif';
 const lines:string[]=[];let line='';for(const word of speech.split(/\s+/)){if(ctx.measureText(line+' '+word).width>300){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);
 lines.slice(0,4).forEach((l,i)=>ctx.fillText(l,180,510+i*24,320));
 ctx.font='12px sans-serif';ctx.fillStyle='#b8d4ce';ctx.fillText('PERSONAGEM VIRTUAL · EVENTOS SIMULADOS',180,610);
 ctx.fillText(running?'RUNTIME EM TESTE · NÃO É TRANSMISSÃO':'CENA PAUSADA / SEM RUNTIME ATIVO',180,628);
}

const pendingImages=new WeakMap<CanvasRenderingContext2D,boolean>();
function drawSnake(ctx:CanvasRenderingContext2D,e:LiveExperience,now:number,fresh:boolean){
 if(pendingImages.get(ctx))return;
 pendingImages.set(ctx,true);const image=new Image();
 image.onload=()=>{ctx.drawImage(image,0,0,360,640);pendingImages.set(ctx,false);};
 image.onerror=()=>pendingImages.set(ctx,false);
 // Same visual compositor; actual worker playback state is intentionally not guessed.
 image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(sceneSvg(fresh?e:{...e,status:'PAUSED'},now-2500));
}
