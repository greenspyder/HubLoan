// Offline adapter for the existing renderer, game, director, speech and PCM mixer.
// No RTMP session, public destination, generative API or second audiovisual engine.
import {mkdtemp,open,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {recordGameplay,createEditorial,editorialFrame,captionBlocks} from './viral-director.mjs';
import {create3DRenderer} from './live-worker/render3d.mjs';
import {createMixer} from './live-worker/mixer.mjs';
import {createNeuralSpeech} from './live-worker/neural-speech.mjs';
import {localSpeech} from './live-worker/speech.mjs';
import {performanceDefaults} from './live-performance.mjs';
import {mediaCommand} from './video-production.mjs';
import {shortConfig,shortStoryboard} from './viral-content.mjs';
const stamp=t=>new Date(Math.round(t*1000)).toISOString().slice(11,23).replace('.',',');
export async function renderShort({config,signal,checkpoint=async(_k,_l,_i,run)=>run(),repertoire={assets:new Map(),failures:0}}){
 config=shortConfig(config);const dir=await mkdtemp(join(tmpdir(),'hubloan-short-')),started=Date.now(),width=360,height=640,fps=15;
 let renderer,mixer,neural,video,audio;
 try{
  const result=await checkpoint('short-render','Renderizar vídeo 3D offline',[2,config,[...repertoire.assets.values()].map(a=>a.track.hash)],async()=>{
   const recording=recordGameplay(config),timeline=createEditorial(config,recording);let now=100000;const e={offline:true,sessionId:'offline',status:'TESTING',config:{audio:{muted:false,volume:.8}},performanceConfig:{...performanceDefaults(),enabled:true},performance:{jobs:[],top:[]},game:null};
   let synthesize=localSpeech,voiceEngine='espeak-fallback';
   if(process.env.HUBLOAN_KOKORO_MODEL){neural=await createNeuralSpeech({engine:'kokoro'});synthesize=neural.synthesize;voiceEngine='kokoro-with-local-fallback';}
   // Finish all voice preparation before rendering; no live queue stalls or stale comments.
   const prepared=new Map(),segments=config.lines.map(text=>({role:'host',voice:'host',text,delivery:'warm'}));
   for(const segment of segments){if(signal?.aborted)throw Error('Renderização cancelada');const pcm=await synthesize(segment.text,'host',{signal});if(!pcm?.length)throw Error('Narração vazia');prepared.set(segment.text,pcm);}
   const totalSpeech=segments.reduce((n,s)=>n+prepared.get(s.text).length/48000,0);if(totalSpeech>config.seconds-1)throw Error('Falas longas demais para a duração. Encurte o roteiro.');
   mixer=createMixer({clock:()=>now,synthesize:async text=>prepared.get(text)});await mixer.prime(segments);mixer.setRepertoire(repertoire,config.music?.trackId);
   // No procedural bed presented as licensed soundtrack: music only with approved assets.
   e.performanceConfig.music=repertoire.assets.size>0;
   renderer=await create3DRenderer({width,height});video=await open(join(dir,'frames.rgb'),'w');audio=await open(join(dir,'audio.pcm'),'w');
   const captions=[],hashes=new Set(),timing=[],board=shortStoryboard(config);let next=0,availableAt=0,cover;
   for(let index=0;index<config.seconds*fps;index++){
    if(signal?.aborted)throw Error('Renderização cancelada');if(Date.now()-started>600000)throw Error('Limite offline de dez minutos excedido');
    const seconds=index/fps;now=100000+seconds*1000;const edit=editorialFrame(recording,timeline,seconds,now);e.game=edit.game;
    if(next<segments.length&&seconds>=Math.max(board[next].plannedAtSeconds,availableAt)){
     const segment=segments[next],duration=prepared.get(segment.text).length/48000;
     if(seconds+duration>config.seconds)throw Error('Fala final não cabe no vídeo. Ajuste roteiro ou duração.');
     e.performance.jobs=[{id:`line-${next}`,sessionId:e.sessionId,createdAt:now,expiresAt:now+6000,priority:3,source:'EDITORIAL_SCRIPT',segments:[segment]}];captions.push({text:segment.text,start:seconds,end:seconds+duration});availableAt=seconds+duration+.15;next++;
    }
    mixer.observe(e,now);const pcm=mixer.mix(e,now,48000/fps);const presentation=mixer.presentation();
    const direction=edit.direction;
    const before=performance.now(),rgb=await renderer.render(e,now,presentation,direction);timing.push(performance.now()-before);
    hashes.add(createHash('sha256').update(rgb).digest('hex'));await video.write(rgb);await audio.write(pcm);
    if(!cover)cover=(await sharp(rgb,{raw:{width,height,channels:3}}).png().toBuffer()).toString('base64');
   }
   if(next!==segments.length)throw Error('Nem todas as falas foram reproduzidas');
   await video.close();video=null;await audio.close();audio=null;await renderer.inspect();
   const blocks=captionBlocks(captions);const srt=blocks.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n');await writeFile(join(dir,'captions.srt'),srt);
   await mediaCommand('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',`${width}x${height}`,'-framerate',String(fps),'-i',join(dir,'frames.rgb'),'-f','s16le','-ar','48000','-ac','1','-i',join(dir,'audio.pcm'),'-vf',`subtitles=${join(dir,'captions.srt')}:force_style='FontName=DejaVu Sans,FontSize=16,MarginV=70,MarginL=28,MarginR=40,Outline=2'`,'-c:v','libx264','-threads','2','-preset','ultrafast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-t',String(config.seconds),'-movflags','+faststart',join(dir,'short.mp4')],{signal,timeout:90000});
   const bytes=await readFile(join(dir,'short.mp4'));if(bytes.length>8*1024*1024)throw Error('Vídeo excede 8 MB');
   const probe=JSON.parse(await mediaCommand('ffprobe',['-v','error','-show_streams','-show_format','-of','json',join(dir,'short.mp4')],{signal}));
   if(!probe.streams.some(s=>s.codec_name==='h264'&&s.width===width&&s.height===height)||!probe.streams.some(s=>s.codec_name==='aac')||Math.abs(Number(probe.format.duration)-config.seconds)>.2)throw Error('MP4 inválido');
   await mediaCommand('ffmpeg',['-v','error','-i',join(dir,'short.mp4'),'-f','null','-'],{signal});
   timing.sort((a,b)=>a-b);
   return {base64:bytes.toString('base64'),preview:cover,srt,report:{width,height,seconds:config.seconds,fps,distinctFrames:hashes.size,distinctMediaFps:hashes.size/config.seconds,captionTiming:"word-count estimate inside PCM interval; not forced alignment",audio:true,format:config.format,voiceEngine,voice:neural?.metrics||null,music:[...repertoire.assets.values()].map(a=>({id:a.track.id,hash:a.track.hash})),renderer:renderer.metrics,renderMs:{mean:timing.reduce((a,b)=>a+b,0)/timing.length,p95:timing[Math.ceil(timing.length*.95)-1],max:timing.at(-1)},wallMs:Date.now()-started,timeline,script:config.lines,captions:blocks,simulationHistory:recording.history,mixer:mixer.metrics,technicalStatus:'TECHNICALLY_VALID',qualityStatus:'REQUIRES_HUMAN_REVIEW',providerCalls:0,infrastructureCost:'UNKNOWN',offline:true}};
  });return result;
 }finally{await video?.close();await audio?.close();mixer?.close();neural?.close();await renderer?.close();await rm(dir,{recursive:true,force:true});}
}
