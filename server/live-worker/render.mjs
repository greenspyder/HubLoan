import sharp from 'sharp';
sharp.concurrency(1);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function sceneFrame(e,at){const g=e.game;if(!g)return null;return [...g.frames].reverse().find(f=>f.at<=at)||g.frames[0]||g;}
export async function render(e,at){
 const f=sceneFrame(e,at),bg={garden:'#123b39',cosmos:'#171d48',sunset:'#512a3e'}[e.config.scene]||'#123b39';
 let scene='';
 if(f){
  scene+=`<text x="24" y="95" fill="#fff" font-size="18">SEED SNAKE · RODADA ${f.round}</text><rect x="20" y="128" width="320" height="480" rx="12" fill="#091c28"/>`;
  for(const food of f.food)scene+=`<circle cx="${30+food.x*20}" cy="${138+food.y*20}" r="5" fill="#f8e494"/>`;
  for(const p of f.players){for(const [i,b] of p.body.entries())scene+=`<rect x="${21+b.x*20}" y="${129+b.y*20}" width="18" height="18" rx="${i?5:8}" fill="${p.color}" opacity="${p.alive?1:.3}"/>${i?'':`<circle cx="${27+b.x*20}" cy="${134+b.y*20}" r="2" fill="#102635"/><circle cx="${34+b.x*20}" cy="${134+b.y*20}" r="2" fill="#102635"/>`}`;scene+=`<text x="${20+Number(p.id)*170}" y="118" fill="${p.color}" font-size="14">${esc(p.name.slice(0,16))}: ${p.score}</text>`;}
  if(f.phase==='FINISHED')scene+=`<rect x="25" y="300" width="310" height="70" rx="14" fill="#183c50"/><text x="180" y="329" text-anchor="middle" fill="white" font-size="20">${esc(f.winner)}</text><text x="180" y="354" text-anchor="middle" fill="#bdf3d7" font-size="14">Nova rodada em instantes</text>`;
 }else{const y=320+Math.sin(at/300)*8;scene=`<ellipse cx="180" cy="${y}" rx="65" ry="85" fill="#78d6ba"/><circle cx="158" cy="${y-10}" r="6"/><circle cx="202" cy="${y-10}" r="6"/><path d="M160 ${y+25} Q180 ${y+45} 200 ${y+25}" fill="none" stroke="#163e42" stroke-width="5"/><text x="180" y="470" text-anchor="middle" fill="#fff" font-size="15">${esc(e.character.speech?.slice(0,42))}</text>`;}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640"><rect width="360" height="640" fill="${bg}"/><g font-family="DejaVu Sans"><text x="22" y="32" fill="#baf7da" font-size="12">HUBLOAN · PERSONAGENS VIRTUAIS</text><text x="22" y="64" fill="white" font-size="23">${esc(e.name.slice(0,24))}</text>${scene}<text x="180" y="628" text-anchor="middle" fill="#a9ccc7" font-size="10">EVENTOS DE TESTE · AUDIÊNCIA NÃO VERIFICADA</text></g></svg>`;
 return sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
}
export function pcm(e,at,samples=3200){
 const b=Buffer.alloc(samples*2),f=sceneFrame(e,at),action=e.action;
 const soundAt=f?.soundAt||(action?.sound!=='none'?action?.startedAt:0)||0;
 if(e.status!=='TESTING'||e.config.audio.muted)return b;
 for(let i=0;i<samples;i++){const elapsed=(at-soundAt)/1000+i/48000;if(elapsed>=0&&elapsed<.18)b.writeInt16LE(Math.round(Math.sin(elapsed*2*Math.PI*660)*Math.exp(-elapsed*18)*12000*e.config.audio.volume),i*2);}
 return b;
}
