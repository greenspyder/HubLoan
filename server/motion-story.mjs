import {validateScenePlan} from './creative-plan.mjs';
// Deliberate original motion-graphics fiction; shares local voice and media export.
import sharp from 'sharp';
import {mkdtemp,writeFile,readFile,rm,open} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {mediaCommand} from './video-production.mjs';
import {localSpeech} from './live-worker/speech.mjs';
import {createNeuralSpeech} from './live-worker/neural-speech.mjs';
import {voiceProfile} from './lume-voice.mjs';
export function storyConfig(input){
 if(input?.version!==1||input.seconds!==18||!['neural','technical'].includes(input.voiceMode)||!Array.isArray(input.lines)||input.lines.length!==3||input.lines.some(s=>typeof s!=='string'||!s.trim()||s.length>120||/[<>\x00-\x1f]/.test(s)))throw Error('Microconto: três falas de até 120 caracteres e duração de 18 segundos.');
 if(input.visualPlan)validateScenePlan(input.visualPlan,'mystery',input.lines);
 return {...input,voiceProfile:voiceProfile(input.voiceProfile)};
}
const stamp=t=>new Date(Math.round(t*1000)).toISOString().slice(11,23).replace('.',',');
export function storyFrame(t,plan=null){
 const scene=plan?.scenes.find(s=>t>=s.start&&t<s.end),progress=scene?Math.max(0,Math.min(1,(t-scene.start)/(scene.end-scene.start))):null;
 const approach=scene?(scene.action==='approach'?progress:1):Math.min(1,t/6),reveal=scene?(scene.action==='reveal'?progress:0):Math.max(0,Math.min(1,(t-12)/5));
 const view=scene?.camera==='close'?'80 180 240 426':scene?.camera==='medium'?'30 80 300 533':'0 0 360 640';
 const x=65+approach*80,y=406-Math.sin(t*2)*3,door=230,light=1+.06*Math.sin(t*3);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="${view}"><defs><radialGradient id="bg"><stop stop-color="#183f49"/><stop offset="1" stop-color="#080f20"/></radialGradient><linearGradient id="floor" x2="0" y2="1"><stop stop-color="#24424d"/><stop offset="1" stop-color="#080f20"/></linearGradient></defs><rect width="360" height="640" fill="url(#bg)"/><path d="M0 430L360 410V640H0Z" fill="url(#floor)"/><path d="M0 490L230 410M360 540L230 410M0 580L230 410" stroke="#527983" opacity=".2"/><ellipse cx="${x}" cy="440" rx="28" ry="6" fill="#000" opacity=".4"/><rect x="${door-35}" y="230" width="86" height="200" rx="44" fill="#345d66"/><rect x="${door-29}" y="236" width="74" height="190" rx="37" fill="#080e21"/><path d="M${door+42} 270V417" stroke="#eabf70" stroke-width="${2+reveal*15}" opacity="${.4+reveal*.6}"/><circle cx="${door+29}" cy="350" r="4" fill="#eabf70"/><path d="M${x-17} 430Q${x-13} 365 ${x} 371Q${x+21} 377 ${x+19} 430Z" fill="#83c7c6"/><circle cx="${x}" cy="${y-49}" r="17" fill="#adddda"/><path d="M${x+10} 388L${x+30} 375" stroke="#adddda" stroke-width="8" stroke-linecap="round"/><circle cx="${x+34+reveal*40}" cy="${373-reveal*40}" r="${(5+reveal*10)*light}" fill="#ffe2a1"/><circle cx="${x+34+reveal*40}" cy="${373-reveal*40}" r="${(14+reveal*30)*light}" fill="#ffe2a1" opacity=".08"/>${t>6&&t<12?`<circle cx="${door}" cy="330" r="${10+(t%2)*12}" fill="none" stroke="#eabf70" opacity="${1-(t%2)/2}"/>`:''}<path d="M${door+35} 360Q190 300 ${x+34+reveal*40} ${373-reveal*40}" fill="none" stroke="#ffdc8d" stroke-width="2" opacity="${reveal*.6}"/><text x="24" y="70" fill="#b3cfce" font-size="11" font-family="DejaVu Sans" letter-spacing="3">LUME • MICROCONTOS</text><text x="24" y="102" fill="#fff1d4" font-size="20" font-family="DejaVu Sans">A porta que esperava</text></svg>`;
}
export async function renderMotionStory({config,signal,checkpoint=async(_k,_l,_i,run)=>run()}){
 config=storyConfig(config);return checkpoint('motion-story','Animar microconto',[1,config],async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hubloan-story-')),start=Date.now();let neural,frames;
 try{
  let synth=localSpeech,engine='espeak-fallback';
  if(process.env[`HUBLOAN_${config.voiceProfile.engine.toUpperCase()}_MODEL`]){neural=await createNeuralSpeech({engine:config.voiceProfile.engine,profile:config.voiceProfile,timeout:180000,initializationTimeout:60000});synth=neural.synthesize;engine=config.voiceProfile.engine;}
  else if(config.voiceMode==='neural')throw Error('Modelo neural global indisponível. Nenhum fallback artístico autorizado.');
  const audio=Buffer.alloc(18*48000*2),captions=[];
  for(let i=0;i<3;i++){
   const pcm=await synth(config.lines[i],'host',{signal,delivery:i===1?'suspense':'mysterious'});
   if(!pcm?.length||pcm.length>5.7*48000)throw Error('Narração não cabe na cena; encurte a fala.');
   captions.push({text:config.lines[i],start:i*6,end:i*6+pcm.length/48000});
   for(let j=0;j<pcm.length;j++)audio.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm[j]))*25000),(i*6*48000+j)*2);
  }
  if(neural?.metrics.fallback){engine+='-fallback';if(config.voiceMode==='neural')throw Error('Síntese neural falhou; vídeo não concluído.');}
  await writeFile(join(dir,'audio.pcm'),audio);frames=await open(join(dir,'frames.rgb'),'w');let preview;const hashes=new Set();
  for(let i=0;i<270;i++){if(signal?.aborted)throw Error('Produção cancelada.');const png=await sharp(Buffer.from(storyFrame(i/15,config.visualPlan))).png().toBuffer();if(i===0)preview=png.toString('base64');const rgb=await sharp(png).removeAlpha().raw().toBuffer();hashes.add(createHash('sha256').update(rgb).digest('hex'));await frames.write(rgb);}
  await frames.close();frames=null;
  const srt=captions.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n');await writeFile(join(dir,'captions.srt'),srt);
  const path=join(dir,'story.mp4');
  await mediaCommand('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','360x640','-framerate','15','-i',join(dir,'frames.rgb'),'-f','s16le','-ar','48000','-ac','1','-i',join(dir,'audio.pcm'),'-vf',`subtitles=${join(dir,'captions.srt')}:force_style='FontName=DejaVu Sans,FontSize=12,MarginV=30,Outline=2'`,'-t','18','-c:v','libx264','-threads','1','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',path],{signal});
  const probe=JSON.parse(await mediaCommand('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],{signal}));
  if(!probe.streams.some(s=>s.codec_name==='h264'&&s.width===360&&s.height===640)||!probe.streams.some(s=>s.codec_name==='aac')||Math.abs(Number(probe.format.duration)-18)>.2||hashes.size<200)throw Error('Integridade audiovisual inválida.');
  await mediaCommand('ffmpeg',['-v','error','-i',path,'-f','null','-'],{signal});const bytes=await readFile(path);
  return {base64:bytes.toString('base64'),preview,srt,report:{version:1,format:'mystery',width:360,height:640,seconds:18,distinctFrames:hashes.size,wallMs:Date.now()-start,sha256:createHash('sha256').update(bytes).digest('hex'),voiceEngine:engine,voiceProfile:config.voiceProfile,voice:neural?.metrics||{fallback:3,neural:0},technicalStatus:'TECHNICALLY_VALID',qualityStatus:'REQUIRES_HUMAN_REVIEW',captions,resources:[{asset:'procedural-vector-scenes',rights:'Original HubLoan geometry, generated from source'},{asset:'speech',rights:neural?config.voiceProfile.license:'Local eSpeak synthesis; no third-party voice recording'}],artisticEligibility:{eligible:!engine.includes('fallback'),reasons:engine.includes('fallback')?['Voz técnica de fallback; escuta e substituição neural necessárias.']:[]},providerCalls:0,infrastructureCost:'UNKNOWN'}};
 }finally{await frames?.close();await neural?.close();await rm(dir,{recursive:true,force:true});}
 });
}
