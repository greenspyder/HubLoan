import {createHash,randomUUID} from 'node:crypto';
import {prepareMusic} from './live-music-providers.mjs';
import {AppError} from './domain.mjs';
export const musicCategories=['roses','common','special','top6','victory','ambient'];
// Deliberately narrow import contract: no decoder subprocess or remote URL on the server.
export function inspectMusic(b){
 const bad=()=>{throw new AppError('Use WAV PCM16 mono 24/48 kHz, 1–60 segundos.');};
 if(!Buffer.isBuffer(b)||b.length<44||b.length>5760044||b.toString('ascii',0,4)!=='RIFF'||b.readUInt32LE(4)!==b.length-8||b.toString('ascii',8,12)!=='WAVE')bad();
 let rate,data,p=12;while(p+8<=b.length){const n=b.readUInt32LE(p+4),tag=b.toString('ascii',p,p+4);p+=8;if(p+n>b.length)bad();if(tag==='fmt '){if(rate||n!==16||b.readUInt16LE(p)!==1||b.readUInt16LE(p+2)!==1||b.readUInt16LE(p+14)!==16)bad();rate=b.readUInt32LE(p+4);if(![24000,48000].includes(rate)||b.readUInt32LE(p+8)!==rate*2||b.readUInt16LE(p+12)!==2)bad();}if(tag==='data'){if(data)bad();data=b.subarray(p,p+n);}p+=n+(n%2);}
 if(p!==b.length||!rate||!data||data.length%2)bad();const seconds=data.length/2/rate;if(seconds<1||seconds>60)bad();return {rate,data,seconds,bytes:b.length,hash:createHash('sha256').update(b).digest('hex')};
}
export function musicTrack(i,b){
 const a=inspectMusic(b),clean=(k,max)=>{if(typeof i[k]!=='string'||!i[k].trim()||i[k].length>max||/[\x00-\x1f]/.test(i[k]))throw new AppError(`Informe ${k}.`);return i[k].trim();};
 if(!musicCategories.includes(i.category)||!['INSTRUMENTAL_TEST','ORIGINAL_INSTRUMENTAL','AI_SINGING','HUMAN_SINGING'].includes(i.kind)||i.commercialLiveRights!==true)throw new AppError('Declare categoria, tipo e direitos comerciais/live.');
 if((i.category==='roses'&&(a.seconds<4||a.seconds>8))||(i.category!=='ambient'&&a.seconds>20)||(i.category==='ambient'&&a.seconds<4))throw new AppError('Rosas: 4–8 s. Jingles: até 20 s. Ambiente: 4–60 s.');
 if(i.costMinor!==null&&(!Number.isSafeInteger(i.costMinor)||i.costMinor<0||i.costMinor>1000000))throw new AppError('Custo em centavos ou desconhecido.');
 const vocalWindows=validateVocalWindows(i.vocalWindows||[],a.seconds,i.kind);
 return {vocalWindows,id:randomUUID(),title:clean('title',70),source:clean('source',300),license:clean('license',500),creator:clean('creator',100),category:i.category,kind:i.kind,costMinor:i.costMinor,commercialLiveRights:true,hash:a.hash,bytes:a.bytes,seconds:a.seconds,approved:false};
}
export function repertoireAction(e,action,i){
 if(!['STOPPED','STOPPED_FINAL'].includes(e.status)||i.version!==e.configVersion)throw new AppError('Encerre a sessão e atualize a versão.',409);const list=e.musicCatalog||=[];
 if(action==='music-prepare'){e.musicPreparation=prepareMusic(i);e.configVersion++;return;}
 if(action==='music-import'){const t=i.track;if(list.filter(x=>x.category===t.category).length>=3||list.reduce((n,x)=>n+x.bytes,0)+t.bytes>18000000)throw new AppError('Máximo três faixas por categoria e 18 MB por experiência.');if(list.some(x=>x.hash===t.hash))throw new AppError('Arquivo já importado.');list.push(t);}else{const t=list.find(x=>x.id===i.trackId);if(!t)throw new AppError('Faixa não encontrada.',404);if(action==='music-approve'){if(i.hash!==t.hash||i.listened!==true||i.rightsReviewed!==true)throw new AppError('Pré-escute e revise direitos do arquivo exato.');t.approved=true;}else if(action==='music-remove')e.musicCatalog=list.filter(x=>x!==t);else throw new AppError('Ação inválida.');}e.configVersion++;
}
export function queueMusic(e,category,name,now){
 const tracks=(e.musicCatalog||[]).filter(t=>t.approved&&t.category===category),p=e.performance;if(!p||!tracks.length)return false;
 const r=p.repertoire||={categories:{},grouped:0,selected:0,history:[]},state=r.categories[category]||={count:0,lastAt:null},cooldown=(e.performanceConfig?.jingleCooldownSeconds||20)*1000;
 if((state.lastAt!==null&&now-state.lastAt<cooldown)||(category!=='special'&&r.lastAt!=null&&now-r.lastAt<8000)||p.jobs.filter(j=>j.expiresAt>now).length>=6){r.grouped++;return true;}
 const pattern=tracks.length===3?[0,1,0,1,0,2]:tracks.map((_,i)=>i),t=tracks[pattern[state.count%pattern.length]];state.count++;state.lastAt=now;r.lastAt=now;r.selected++;r.history.push({at:now,trackId:t.id,category});r.history=r.history.slice(-40);
 p.jobs=p.jobs.filter(j=>j.expiresAt>now);p.jobs.push({id:randomUUID(),sessionId:e.sessionId,createdAt:now,expiresAt:now+45000,priority:category==='special'?4:2,source:category==='victory'?'INTERNAL_GAME':'SIMULATED_OPERATOR',segments:[{role:'music',trackId:t.id,hash:t.hash,kind:t.kind,text:`${name} · ${t.title}${t.kind==='INSTRUMENTAL_TEST'?' · TESTE SEM CANTO':''}`} ]});return true;
}

// Human-reviewed intervals in seconds. Not phonetic lip sync or source separation.
export function validateVocalWindows(windows,seconds,kind){
 if(!Array.isArray(windows)||windows.length>20||(!['AI_SINGING','HUMAN_SINGING'].includes(kind)&&windows.length))throw new AppError('Trechos vocais exigem uma faixa cantada.');
 let end=0;return windows.map(w=>{if(!Array.isArray(w)||w.length!==2||!w.every(Number.isFinite)||w[0]<end||w[0]<0||w[1]<=w[0]||w[1]>seconds)throw new AppError('Trechos vocais ordenados, sem sobreposição e dentro da faixa.');end=w[1];return [w[0],w[1]];});
}
