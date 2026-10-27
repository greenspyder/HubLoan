// Structured editorial input, not generated claims about audience or game outcomes.
export const shortFormats={comedy:{name:'Lume Comedy',min:10,max:25},battle:{name:'Snake Battles',min:15,max:40},champion:{name:'Choose Your Champion',min:10,max:30}};
export function shortConfig(input){
 if(!input||!shortFormats[input.format])throw Error('Escolha um formato de vídeo curto.');
 const f=shortFormats[input.format];if(!Number.isInteger(input.seconds)||input.seconds<f.min||input.seconds>f.max)throw Error(`Duração: ${f.min}–${f.max} segundos.`);
 const field=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f<>]/.test(v))throw Error('Texto editorial inválido.');return v.trim();};
 if(!Array.isArray(input.characters)||input.characters.length<2||input.characters.length>6)throw Error('Escolha dois a seis personagens.');
 const characters=input.characters.map(v=>field(v,40));if(new Set(characters).size!==characters.length)throw Error('Personagens repetidos.');
 if(!Array.isArray(input.lines)||input.lines.length<2||input.lines.length>6)throw Error('Use duas a seis falas.');
 const lines=input.lines.map(v=>field(v,120));if(lines.length*3>input.seconds)throw Error('Reserve ao menos três segundos por fala.');
 const music=input.music==null?null:{experienceId:field(input.music.experienceId,40),trackId:field(input.music.trackId,40)};
 const voiceMode=input.voiceMode??'neural';if(!['neural','technical'].includes(voiceMode))throw Error('Modo de voz inválido');
 const headScale=input.headScale??1.08,effectsGain=input.effectsGain??.35;if(!Number.isFinite(headScale)||headScale<.95||headScale>1.15||!Number.isFinite(effectsGain)||effectsGain<0||effectsGain>1)throw Error('Parâmetros audiovisuais inválidos');
 return {version:2,voiceMode,headScale,effectsGain,format:input.format,seconds:input.seconds,characters,lines,hypothesis:field(input.hypothesis,500),audience:field(input.audience,200),music};
}
export function shortStoryboard(config){return config.lines.map((text,i)=>({index:i,text,plannedAtSeconds:i*config.seconds/config.lines.length,shot:config.format==='champion'?'Front':i===0?'Tactical':'Follow',character:config.characters[i%config.characters.length]}));}
