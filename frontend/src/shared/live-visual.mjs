// Pure presentation contract shared by browser and worker. No timers, IO or game decisions.
export const escapeXml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
export function sceneFrame(e,at){
 const g=e.game;if(!g)return null;const frames=g.frames||[];
 const a=[...frames].reverse().find(f=>f.at<=at)||frames[0]||g;
 const b=frames.find(f=>f.at>a.at);if(!b||a.round!==b.round||a.phase!==b.phase)return a;
 const t=clamp((at-a.at)/(b.at-a.at));
 return {...a,players:a.players.map(p=>{const q=b.players.find(q=>q.id===p.id);if(!q||!p.alive||!q.alive)return p;
  const rotation=((q.direction-p.direction+6)%4)-2;
  return {...p,visualDirection:(p.direction||0)+rotation*t,body:p.body.map((v,i)=>{const n=q.body[i]||q.body.at(-1);return {x:lerp(v.x,n.x,t),y:lerp(v.y,n.y,t)};})};})};
}
const xy=p=>({x:67.5+p.x*15,y:117.5+p.y*15});
function smoothPath(points){if(!points.length)return '';let path=`M${points[0].x} ${points[0].y}`;for(let i=1;i<points.length-1;i++){const p=points[i],q=points[i+1];path+=` Q${p.x} ${p.y} ${(p.x+q.x)/2} ${(p.y+q.y)/2}`;}const end=points.at(-1);return path+` L${end.x} ${end.y}`;}
function face(at,{color='#83e3a9',angle=0,mouth=0,happy=false,sad=false,scale=1}={}){
 const blink=Math.sin(at/1550)>.994?.15:1;
 return `<g transform="rotate(${angle}) scale(${scale})"><ellipse rx="12" ry="10" fill="${color}" stroke="#c7ffe0" stroke-width="1.2"/><ellipse cx="3" cy="-5" rx="5" ry="${4.5*blink}" fill="#fff7e6"/><ellipse cx="3" cy="5" rx="5" ry="${4.5*blink}" fill="#fff7e6"/><circle cx="5" cy="-5" r="2" fill="#173947"/><circle cx="5" cy="5" r="2" fill="#173947"/>${sad?'<path d="M0 -8l6 3M0 8l6-3" stroke="#173947" stroke-width="2"/>':''}${mouth>.08?`<ellipse cx="10" cy="0" rx="${2+mouth*2}" ry="${1+mouth*4}" fill="#44243e"/><ellipse cx="11" cy="1" rx="1.5" ry="${mouth*2}" fill="#ff8d99"/>`:`<path d="M9 -3Q${happy?15:12} 0 9 3" fill="none" stroke="#244b42" stroke-width="1.5"/>`}</g>`;
}
function sparks(x,y,age,color){if(age<0||age>900)return '';const t=age/900;let s='';for(let i=0;i<7;i++){const a=i*Math.PI*2/7;s+=`<circle cx="${x+Math.cos(a)*(8+t*23)}" cy="${y+Math.sin(a)*(8+t*23)-t*8}" r="${(1-t)*2.6}" fill="${color}" opacity="${1-t}"/>`;}return s;}
export function avatarVisibility(p,at){if(!p?.top?.length)return 0;const recent=clamp((p.avatarUntil-at)/500)*clamp((at-(p.avatarUntil-12000))/500);const cycle=((at%30000)+30000)%30000;return Math.max(recent,cycle<6000?Math.min(clamp(cycle/500),clamp((6000-cycle)/500)):0);}
export function performanceOverlay(e,at,presentation){
 const p=e.performance,visibility=e.performanceConfig?.enabled?avatarVisibility(p,at):0;let s='';
 // Dedicated community rail: never covers the board or the speech card.
 s+='<rect x="20" y="560" width="320" height="58" rx="14" fill="#133c42"/>';
 if(visibility){for(const [i,person] of p.top.entries()){
  const old=p.previousTop?.indexOf(person.id)??-1,progress=clamp((at-(p.rankingChangedAt||0))/650),slot=old>=0?lerp(old,i,progress):i;const x=45+slot*54,y=581+(1-visibility)*30+Math.sin(at/340+i)*2;
  const photo=typeof person.avatar==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(person.avatar)&&person.avatar.length<60000;
  s+=`<g opacity="${visibility}" transform="translate(${x},${y})"><ellipse cy="13" rx="12" ry="9" fill="${i?'#80bcd2':'#ffd875'}"/><path d="M-8 12l-7 ${Math.sin(at/190+i)*5}M8 12l7 ${Math.cos(at/190+i)*5}" stroke="${i?'#80bcd2':'#ffd875'}" stroke-width="3" stroke-linecap="round"/><circle r="11" fill="#225865" stroke="${i?'#a1ded8':'#ffe8a2'}" stroke-width="2"/>${photo?`<clipPath id="avatar-${i}"><circle r="9"/></clipPath><image x="-9" y="-9" width="18" height="18" clip-path="url(#avatar-${i})" href="data:image/png;base64,${person.avatar}"/>`:'<circle cx="-3" cy="-1" r="1.6" fill="white"/><circle cx="3" cy="-1" r="1.6" fill="white"/><path d="M-3 4Q0 7 3 4" fill="none" stroke="white"/>'}${i?'':'<path d="M-9 -13l-2-7 8 3 3-6 4 6 8-3-2 7z" fill="#ffd875"/>'}<text x="0" y="30" text-anchor="middle" fill="#e5f5df" font-size="8">${i+1}. ${escapeXml(person.name.slice(0,7))}</text></g>`;
 }}else s+=`<text x="180" y="585" text-anchor="middle" fill="#a5cebb" font-size="11">${p?.top?.length?'O jardim também é da comunidade':'O jardim está crescendo'}</text><text x="180" y="603" text-anchor="middle" fill="#89b4ab" font-size="9">${p?.top?.length?'Top 6 · quantidades simuladas':'Sem espectadores ou presentes inventados'}</text>`;
 const label=presentation?(presentation.role==='comment'?'COMENTÁRIO · SIMULAÇÃO':presentation.role==='chant'?'LUME NO BEAT · VERSO FALADO':'LUME RESPONDE'):null;
 if(presentation){let line='',lines=[];for(const word of presentation.text.split(' ')){if((line+' '+word).length>43){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);s+=`<rect x="20" y="480" width="320" height="74" rx="14" fill="#fff0d3"/><text x="34" y="494" fill="#856042" font-size="8" font-weight="bold">${label}</text>`;lines.slice(0,4).forEach((l,i)=>s+=`<text x="34" y="508" dy="${i*13}" fill="#233d3c" font-size="10.5">${escapeXml(l)}</text>`);
 }else s+='<text x="180" y="507" text-anchor="middle" fill="#ffdfa0" font-size="16" font-weight="bold">Uma maçã. Mais uma curva.</text><text x="180" y="529" text-anchor="middle" fill="#b8d4bf" font-size="11">Quem vai colher mais nesta rodada?</text>';
 return s;
}
export function sceneSvg(e,at,presentation=null){
 const f=sceneFrame(e,at),colors={garden:['#102f35','#255749','#86c79a'],cosmos:['#20213c','#393853','#bca6d8'],sunset:['#442c3a','#735042','#e9b289']}[e.config.scene]||['#102f35','#255749','#86c79a'];
 const active=e.status==='TESTING',mouth=active&&presentation?.role!=='comment'?presentation?.level||0:0,chant=active&&presentation?.role==='chant';
 let s=`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><clipPath id="field"><rect x="60" y="110" width="240" height="360" rx="16"/></clipPath></defs><rect width="360" height="640" fill="url(#sky)"/>`;
 for(let i=0;i<12;i++){const x=i%2?328:30,y=132+Math.floor(i/2)*58;s+=`<g transform="translate(${x},${y}) rotate(${Math.sin(at/1500+i)*6})"><path d="M0 14V-8M0 0Q-23-18-9-22Q4-15 0 0M0 7Q22-8 12-14Q0-9 0 7" fill="${colors[2]}" opacity=".22"/></g>`;}
 s+=`<text x="22" y="22" fill="#b7d5c2" font-size="9" letter-spacing="2">SEED SNAKE / O JARDIM DO LUME</text><g transform="translate(55 ${55+(chant?Math.sin(presentation.elapsedMs/130)*3:Math.sin(at/600)*1.5)})"><path d="M-14 8Q-38 27-10 28Q15 30 2 12" fill="none" stroke="#68bb91" stroke-width="13" stroke-linecap="round"/>${face(at,{scale:2,angle:-15,mouth,happy:chant||f?.phase==='FINISHED',sad:f?.phase==='FINISHED'&&f.winner===f.players[1]?.name})}</g><text x="102" y="51" fill="#fff2d6" font-size="22" font-weight="bold">${escapeXml(e.config.name.slice(0,15))}</text><text x="102" y="69" fill="#adcdbb" font-size="10">${presentation?presentation.role==='comment'?'Ouvindo a comunidade…':chant?'Improviso ritmado · sem canto melódico':'Falando agora':f?.phase==='FINISHED'?'Uma pausa para comemorar!':'De olho na próxima maçã'}</text>`;
 if(chant)s+=`<text x="315" y="58" fill="#ffd480" font-size="28" transform="rotate(${Math.sin(at/150)*12} 315 58)">♪</text>`;
 if(f){
  s+=`<rect x="54" y="104" width="252" height="372" rx="22" fill="#09282c"/><rect x="60" y="110" width="240" height="360" rx="16" fill="#24453c"/><rect x="60" y="110" width="240" height="360" rx="16" fill="none"/>`;
  f.players.forEach((p,i)=>{const name=e.performance?.bindings?.find(b=>b.playerId===p.id)?.name||p.name;s+=`<text x="${i?338:22}" y="94" text-anchor="${i?'end':'start'}" fill="${p.color}" font-size="12" font-weight="bold">${escapeXml(name.slice(0,13))} · ${p.score}</text>`;});
  s+=`<text x="180" y="94" text-anchor="middle" fill="#b8d4bf" font-size="9">RODADA ${f.round}</text><g clip-path="url(#field)">`;
  for(const rock of f.obstacles||[]){const {x,y}=xy(rock);s+=`<ellipse cx="${x}" cy="${y+4}" rx="8" ry="5" fill="#152f2b"/><path d="M${x-7} ${y+3}l1-9 9-2 5 8-5 4z" fill="#6c8a7c"/><path d="M${x-4} ${y-5}l6-1" stroke="#a2b5a1" stroke-width="2"/>`;}
  for(const food of f.food){const {x,y}=xy(food),bob=Math.sin(at/380+food.x)*1.1;s+=`<g transform="translate(${x},${y+bob})"><ellipse cy="6" rx="7" ry="3" fill="#122d2c" opacity=".5"/><path d="M0 -3C-11-10-9 7-3 7Q0 5 3 7C10 6 10-9 0-3" fill="#f07468" stroke="#ffab81" stroke-width=".8"/><path d="M0 -3Q-1-8 2-10" fill="none" stroke="#eac280" stroke-width="1.5"/><path d="M1-7Q8-12 8-7Q5-4 1-7" fill="#b5da82"/><ellipse cx="-4" cy="-1" rx="1.3" ry="2" fill="#ffe7b4" opacity=".8"/></g>`;}
  for(const p of f.players){const points=p.body.map(xy),head=points[0],eat=at-(p.eatenAt||-10000),hit=at-(p.hitAt||-10000),path=smoothPath(points),win=f.phase==='FINISHED'&&f.winner===p.name;
   if(p.target&&p.alive){const target=xy(p.target);s+=`<circle cx="${target.x}" cy="${target.y}" r="${10+Math.sin(at/220)*1.3}" stroke="${p.color}" opacity=".45" stroke-width="1" fill="none" stroke-dasharray="2 3"/>`;}
   s+=`<g opacity="${p.alive?1:.5}"><path d="${path}" transform="translate(1 4)" fill="none" stroke="#102d28" stroke-width="16" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${p.color}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#dbf6bf" opacity=".28" stroke-width="5" stroke-linecap="round"/>`;
   points.slice(1).forEach((b,i)=>{s+=`<circle cx="${b.x}" cy="${b.y}" r="${i===points.length-2?2:2.5}" fill="#174c42" opacity=".23"/>`;});
   s+=`<g transform="translate(${head.x} ${head.y})">${face(at,{color:p.color,angle:(p.visualDirection??p.direction??0)*90,mouth:eat>=0&&eat<500?Math.sin(eat/500*Math.PI):p.id==='0'?mouth:0,happy:win,sad:!p.alive,scale:eat>=0&&eat<500?1+Math.sin(eat/500*Math.PI)*.14:1})}</g></g>`;
   if(eat>=0&&eat<900){const pos=xy(p.eatenPosition||p.body[0]);s+=sparks(pos.x,pos.y,eat,'#ffd880')+`<text x="${pos.x}" y="${pos.y-12-eat/55}" text-anchor="middle" fill="#ffe9a3" font-size="12" opacity="${1-eat/900}">+1</text>`;}
   s+=sparks(head.x,head.y,hit,'#ff9a89');
  }
  s+='</g>';
  if(f.phase==='FINISHED'){const elapsed=Math.max(0,at-(f.endedAt||at));s+=`<g opacity="${clamp(elapsed/180)}"><rect x="71" y="247" width="218" height="88" rx="20" fill="#fff0cf"/><text x="180" y="274" text-anchor="middle" fill="#49664d" font-size="11">COLHEITA ENCERRADA</text><text x="180" y="299" text-anchor="middle" fill="#203e38" font-size="20" font-weight="bold">${escapeXml((f.winner||'Empate').slice(0,17))}${f.winner==='Empate'?'':' venceu!'}</text><text x="180" y="320" text-anchor="middle" fill="#667652" font-size="10">Próxima rodada em ${Math.max(1,Math.ceil((3000-elapsed)/1000))}</text></g>`;for(let i=0;i<12;i++)s+=`<rect x="${78+(i*47)%210}" y="${160+(elapsed/9+i*23)%220}" width="3" height="5" fill="${i%2?'#ffd986':'#b4e5ae'}" opacity=".7"/>`;}
 }
 if(!f){const action=active&&e.action&&at<e.action.expiresAt?e.action:null,anim=action?.animation||'idle',phase=at/250,y=295+(anim==='bounce'?Math.abs(Math.sin(phase))*-20:Math.sin(at/500)*5),happy=['happy','joy'].includes(action?.expression||e.character?.expression);s+=`<g transform="translate(180 ${y}) rotate(${anim==='sway'?Math.sin(phase)*8:0})"><ellipse cy="103" rx="68" ry="10" fill="#0d282d"/><ellipse cy="15" rx="61" ry="81" fill="#78d6ba" stroke="#c4ffde" stroke-width="3"/><path d="M-53 22l-30 ${anim==='wave'?Math.sin(phase)*35:25}M53 22l30 -20" stroke="#78d6ba" stroke-width="13" stroke-linecap="round"/><circle cx="-22" cy="0" r="${happy?5:7}" fill="#183c40"/><circle cx="22" cy="0" r="${happy?5:7}" fill="#183c40"/><path d="M-17 35Q0 ${happy?65:48} 17 35" fill="none" stroke="#183c40" stroke-width="5"/></g><text x="180" y="441" text-anchor="middle" fill="#fff2d6" font-size="13">${escapeXml((action?.speech||e.character?.speech||'').slice(0,42))}</text>`;}
 s+=performanceOverlay(e,at,presentation);
 s+='<text x="180" y="633" text-anchor="middle" fill="#a0bdad" font-size="8">PERSONAGENS VIRTUAIS · INTERAÇÕES SIMULADAS</text>';
 if(!active)s+='<rect x="103" y="404" width="154" height="30" rx="15" fill="#163a42"/><text x="180" y="424" text-anchor="middle" fill="#fff2d4" font-size="12">CENA PAUSADA</text>';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640"><g font-family="DejaVu Sans, sans-serif">${s}</g></svg>`;
}
