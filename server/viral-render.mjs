import {planCameraPath} from './camera-path.mjs';
import {audiovisualEligibility} from './viral-quality.mjs';
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
export async function renderShort({config,signal,offlineVoice=null,checkpoint=async(_k,_l,_i,run)=>run(),repertoire={assets:new Map(),failures:0}}){
 config=shortConfig(config);const dir=await mkdtemp(join(tmpdir(),'hubloan-short-')),started=Date.now(),width=360,height=640,fps=15;
 let renderer,mixer,neural,video,audio;
 try{
  const result=await checkpoint('short-render','Renderizar vídeo 3D offline',[5,config,[...repertoire.assets.values()].map(a=>a.track.hash),offlineVoice?.cacheKey||null],async()=>{
   const recording=recordGameplay(config),timeline=createEditorial(config,recording);let now=100000;const e={offline:true,sessionId:'offline',status:'TESTING',config:{audio:{muted:false,volume:.8}},performanceConfig:{...performanceDefaults(),effectsGain:config.effectsGain,enabled:true},performance:{jobs:[],top:[]},game:null};
   if(config.voiceMode==='neural'&&!offlineVoice&&!process.env[`HUBLOAN_${config.voiceProfile.engine.toUpperCase()}_MODEL`])throw Error('Configure o modelo do perfil global para renderização artística neural. Modo técnico permite fallback.');
   let synthesize=localSpeech,voiceEngine='espeak-fallback';
   if(offlineVoice){if(JSON.stringify(offlineVoice.metrics.profile)!==JSON.stringify(config.voiceProfile))throw Error('Snapshot vocal incompatível');neural=offlineVoice;synthesize=neural.synthesize;voiceEngine=config.voiceProfile.engine+'-archived-'+config.voiceProfile.voice;}
   else if(process.env[`HUBLOAN_${config.voiceProfile.engine.toUpperCase()}_MODEL`]){neural=await createNeuralSpeech({engine:config.voiceProfile.engine,timeout:180000,initializationTimeout:60000,profile:config.voiceProfile});synthesize=neural.synthesize;voiceEngine=config.voiceProfile.engine+'-'+config.voiceProfile.voice;}
   // Finish all voice preparation before rendering; no live queue stalls or stale comments.
   const prepared=new Map(),segments=config.lines.map((text,i)=>({role:'host',voice:'host',text,delivery:(config.format==='battle'?['suspense','mysterious','surprised','playful']:config.format==='comedy'?['calm','playful','mysterious','playful']:['warm','playful','mysterious','warm'])[i%4]}));
   for(const segment of segments){if(signal?.aborted)throw Error('Renderização cancelada');const pcm=await synthesize(segment.text,'host',{signal,delivery:segment.delivery});if(!pcm?.length)throw Error('Narração vazia');prepared.set(segment.text,pcm);}
   if(config.voiceMode==='neural'&&(!neural?.metrics.neural||neural.metrics.fallback||neural.metrics.failures))throw Error('Síntese neural indisponível; aprovação artística bloqueada.');
   if(neural?.metrics.fallback)voiceEngine=config.voiceProfile.engine+'-with-espeak-fallback';
   const totalSpeech=segments.reduce((n,s)=>n+prepared.get(s.text).length/48000,0);if(totalSpeech>config.seconds-1)throw Error('Falas longas demais para a duração. Encurte o roteiro.');
   mixer=createMixer({clock:()=>now,synthesize:async text=>prepared.get(text)});await mixer.prime(segments);mixer.setRepertoire(repertoire,config.music?.trackId);
   // No procedural bed presented as licensed soundtrack: music only with approved assets.
   e.musicCatalog=[...repertoire.assets.values()].map(a=>a.track);e.musicAmbientTrackId=config.music?.trackId;
   e.performanceConfig.music=repertoire.assets.size>0;
   renderer=await create3DRenderer({width,height});video=await open(join(dir,'frames.rgb'),'w');audio=await open(join(dir,'audio.pcm'),'w');
   const replay=[],preflight=config.format==='battle',captions=[],hashes=new Set(),timing=[],board=shortStoryboard(config);let cameraPlanning=null;let next=0,availableAt=0,cover,blackRun=0,maxBlackRun=0;
   for(let index=0;index<config.seconds*fps;index++){
    if(signal?.aborted)throw Error('Renderização cancelada');if(Date.now()-started>600000)throw Error('Limite offline de dez minutos excedido');
    const seconds=index/fps;now=100000+seconds*1000;const edit=editorialFrame(recording,timeline,seconds,now);e.game=edit.game;
    if(next<segments.length&&seconds>=Math.max(board[next].plannedAtSeconds,availableAt)){
     const segment=segments[next],duration=prepared.get(segment.text).length/48000;
     if(seconds+duration>config.seconds)throw Error('Fala final não cabe no vídeo. Ajuste roteiro ou duração.');
     e.performance.jobs=[{id:`line-${next}`,sessionId:e.sessionId,createdAt:now,expiresAt:now+6000,priority:3,source:'EDITORIAL_SCRIPT',segments:[segment]}];captions.push({text:segment.text,start:seconds,end:seconds+duration});availableAt=seconds+duration+.15;next++;
    }
    mixer.observe(e,now);const pcm=mixer.mix(e,now,48000/fps);const presentation=mixer.presentation();
    const direction={...edit.direction,headScale:config.headScale,...(preflight?{collectCameraViews:true}:{})};
    if(preflight)replay.push({game:e.game,now,presentation:structuredClone(presentation),direction});
    const before=performance.now(),rgb=await renderer.render(e,now,presentation,direction);timing.push(performance.now()-before);
    let light=0;for(let j=0;j<rgb.length;j+=96)light+=rgb[j];blackRun=light/(rgb.length/96)<3?blackRun+1:0;maxBlackRun=Math.max(maxBlackRun,blackRun);if(maxBlackRun>fps)throw Error('Quadros pretos por mais de um segundo');
    hashes.add(createHash('sha256').update(rgb).digest('hex'));await video.write(rgb);await audio.write(pcm);
    if(!cover)cover=(await sharp(rgb,{raw:{width,height,channels:3}}).png().toBuffer()).toString('base64');
   }
   if(preflight){
    const plan=planCameraPath(renderer.planningFrames);cameraPlanning=plan.metrics;
    await renderer.close();renderer=await create3DRenderer({width,height});
    await video.close();video=await open(join(dir,'frames.rgb'),'w');hashes.clear();timing.length=0;cover=null;blackRun=0;maxBlackRun=0;
    for(let index=0;index<replay.length;index++){
     if(signal?.aborted)throw Error('Renderização cancelada');if(Date.now()-started>600000)throw Error('Limite offline de dez minutos excedido');
     const frame=replay[index];e.game=frame.game;
     const direction={...frame.direction,collectCameraViews:false,cameraPlan:plan.path[index]};
     const before=performance.now(),rgb=await renderer.render(e,frame.now,frame.presentation,direction);timing.push(performance.now()-before);
     let light=0;for(let j=0;j<rgb.length;j+=96)light+=rgb[j];blackRun=light/(rgb.length/96)<3?blackRun+1:0;maxBlackRun=Math.max(maxBlackRun,blackRun);if(maxBlackRun>fps)throw Error('Quadros pretos por mais de um segundo');
     hashes.add(createHash('sha256').update(rgb).digest('hex'));await video.write(rgb);
     if(!cover)cover=(await sharp(rgb,{raw:{width,height,channels:3}}).png().toBuffer()).toString('base64');
    }
   }
   if(next!==segments.length)throw Error('Nem todas as falas foram reproduzidas');
   await video.close();video=null;await audio.close();audio=null;await renderer.inspect();
   const blocks=captionBlocks(captions);const srt=blocks.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n');await writeFile(join(dir,'captions.srt'),srt);
   await mediaCommand('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',`${width}x${height}`,'-framerate',String(fps),'-i',join(dir,'frames.rgb'),'-f','s16le','-ar','48000','-ac','1','-i',join(dir,'audio.pcm'),'-vf',`subtitles=${join(dir,'captions.srt')}:force_style='FontName=DejaVu Sans,FontSize=16,MarginV=40,MarginL=28,MarginR=40,Outline=2'`,'-c:v','libx264','-threads','2','-preset','ultrafast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-t',String(config.seconds),'-movflags','+faststart',join(dir,'short.mp4')],{signal,timeout:90000});
   const bytes=await readFile(join(dir,'short.mp4'));if(bytes.length>8*1024*1024)throw Error('Vídeo excede 8 MB');
   const probe=JSON.parse(await mediaCommand('ffprobe',['-v','error','-show_streams','-show_format','-of','json',join(dir,'short.mp4')],{signal}));
   if(!probe.streams.some(s=>s.codec_name==='h264'&&s.width===width&&s.height===height)||!probe.streams.some(s=>s.codec_name==='aac')||Math.abs(Number(probe.format.duration)-config.seconds)>.2)throw Error('MP4 inválido');
   await mediaCommand('ffmpeg',['-v','error','-i',join(dir,'short.mp4'),'-f','null','-'],{signal});
   timing.sort((a,b)=>a-b);
   return {base64:bytes.toString('base64'),preview:cover,srt,report:{width,height,seconds:config.seconds,fps,maxBlackRun,distinctFrames:hashes.size,distinctMediaFps:hashes.size/config.seconds,captionTiming:"word-count estimate inside PCM interval; not forced alignment",audio:true,format:config.format,voiceEngine,voice:neural?{...neural.metrics}:null,music:[...repertoire.assets.values()].map(a=>({id:a.track.id,hash:a.track.hash,title:a.track.title,creator:a.track.creator,license:a.track.license,source:a.track.source})),renderer:renderer.metrics,cameraPlanning,renderMs:{mean:timing.reduce((a,b)=>a+b,0)/timing.length,p95:timing[Math.ceil(timing.length*.95)-1],max:timing.at(-1)},wallMs:Date.now()-started,timeline,script:config.lines,captions:blocks,simulationHistory:recording.history,mixer:mixer.metrics,technicalStatus:'TECHNICALLY_VALID',qualityStatus:'REQUIRES_HUMAN_REVIEW',providerCalls:0,infrastructureCost:'UNKNOWN',offline:true}};
  });result.report.artisticEligibility=audiovisualEligibility(result.report);return result;
 }finally{await video?.close();await audio?.close();mixer?.close();neural?.close();await renderer?.close();await rm(dir,{recursive:true,force:true});}
}
