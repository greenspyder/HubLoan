import {createDirector} from '../live-director.mjs';
import {sceneFrame} from '../../frontend/src/shared/live-visual.mjs';
// Explicitly launched local encoder. Never launches from a web request.
import { spawn } from 'node:child_process';
import { readFile, stat, open, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMixer } from './mixer.mjs';
import { render } from './render.mjs';
export const videoProfiles={light:{fps:15,width:360,height:640},smooth:{fps:30,width:360,height:640},hd:{fps:30,width:720,height:1280}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export function validateConfig(c,transmit){
 const api=new URL(c.backend);
 if(api.username||api.password||api.search||api.hash||!(api.protocol==='https:'||(api.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(api.hostname))))throw new Error('Backend exige HTTPS (HTTP somente loopback).');
 if(!/^\/api\/agents\/live-worker\/[a-f0-9]{64}\/[a-f0-9-]{36}$/.test(c.workerPath)||! /^[a-f0-9]{64}$/.test(c.token))throw new Error('Autorização inválida.');
 if(transmit){const u=new URL(c.destination);if(!['rtmp:','rtmps:'].includes(u.protocol)||!u.hostname||u.username||u.password||u.hash||c.authorizedDestination!==true)throw new Error('Informe destino RTMP/RTMPS autorizado no arquivo local.');}
}
async function encodeWorker(c,{transmit=false,output='live-preview.mp4',seconds=1800,signal,onEncoder=()=>{},onAudio=()=>{},profile='light',renderFrame=render,synthesize}={}){
 const director=createDirector(); const video=videoProfiles[profile];if(!video)throw new Error('Perfil: light, smooth ou hd (3D experimental).');const fps=video.fps;
 validateConfig(c,transmit);if(!transmit){if(typeof output!=='string'||output.includes('://')||!output.endsWith('.mp4'))throw new Error('Prévia exige arquivo MP4 local.');output=resolve(output);}if(!Number.isInteger(seconds)||seconds<1||seconds>1800)throw new Error('Duração: 1 a 1800 segundos.');
 const mixer=createMixer({synthesize});const instance=randomUUID();let state,offset=0,frames=0,bytes=0,status='STARTING',closed=false,encoder,failed=false,lastProgress=Date.now(),lastContact=Date.now(),frame=0;
 async function heartbeat(){const before=Date.now();const r=await fetch(new URL(c.workerPath,c.backend),{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:JSON.stringify({instance,status,frames,bytes,audio:mixer.metrics}),signal:AbortSignal.timeout(3000)});if(!r.ok)throw new Error('Worker sem autorização ou backend indisponível.');const data=await r.json();if(transmit&&data.mode!=='stream')throw new Error('Autorize transmissão no painel.');state=data.experience;offset=data.serverTime-(before+Date.now())/2;lastContact=Date.now();mixer.observe(state,Date.now()+offset);if(!['TESTING','PAUSED','INITIALIZING'].includes(state.status)||Date.now()+offset>=data.expiresAt)throw new Error('Sessão encerrada.');}
 try{await heartbeat();}catch(error){mixer.close();throw error;}
 const args=['-hide_banner','-loglevel','error','-y','-threads','1','-filter_threads','1','-f','rawvideo','-pixel_format','rgb24','-video_size',`${video.width}x${video.height}`,'-framerate',String(fps),'-probesize','32','-analyzeduration','0','-i','pipe:0','-f','s16le','-ar','48000','-ac','1','-probesize','32','-analyzeduration','0','-i','pipe:3','-map','0:v','-map','1:a','-c:v','libx264','-threads','1','-preset','ultrafast','-tune','zerolatency','-pix_fmt','yuv420p','-b:v',profile==='hd'?'2800k':'700k','-maxrate',profile==='hd'?'3500k':'900k','-bufsize',profile==='hd'?'5600k':'1400k','-g',String(fps*2),'-c:a','aac','-b:a','64k','-progress','pipe:4','-stats_period','1',...(transmit?['-rw_timeout','5000000',...(c.destination.startsWith('rtmps:')?['-tls_verify','1']:[]),'-f','flv',c.destination]:['-movflags','+faststart',output])];
 encoder=spawn('ffmpeg',args,{shell:false,stdio:['pipe','ignore','pipe','pipe','pipe']});onEncoder(encoder);
 let exitCode=null;const exited=new Promise(resolve=>{encoder.on('error',()=>{failed=true;resolve();});encoder.on('close',code=>{exitCode=code;if(!closed)failed=true;resolve();});});
 encoder.stderr.resume(); // Never print encoder errors: they may contain the stream key.
 for(const p of [encoder.stdin,encoder.stdio[3]])p.on('error',()=>{if(!closed)failed=true;});
 let progress='';encoder.stdio[4].on('data',chunk=>{progress+=chunk;let end;while((end=progress.indexOf('\n'))>=0){const line=progress.slice(0,end);progress=progress.slice(end+1);const [key,value]=line.split('=');if(key==='frame'&&Number(value)>frames){frames=Number(value);lastProgress=Date.now();status=transmit?'SENDING_MEDIA':'PREVIEW';}if(key==='total_size'&&Number.isSafeInteger(Number(value)))bytes=Number(value);}progress=progress.slice(-2048);});
 let polling=false;const timer=setInterval(async()=>{if(polling||closed)return;polling=true;try{await heartbeat();}catch{failed=true;}finally{polling=false;}},2000);
 const watchdog=setInterval(()=>{if(signal?.aborted||Date.now()-lastProgress>8000||Date.now()-lastContact>7000||failed){failed=true;encoder.kill('SIGTERM');}},250);
 const started=Date.now(),cpu=process.cpuUsage();let maxRenderMs=0,lateFrames=0,maxPipelineLagMs=0;
 const write=(pipe,data)=>new Promise((resolve,reject)=>{pipe.write(data,error=>error?reject(error):resolve());});
 try{
  while(!failed&&!signal?.aborted&&Date.now()-started<seconds*1000){
   maxPipelineLagMs=Math.max(maxPipelineLagMs,Date.now()-started-frame*1000/fps);if(maxPipelineLagMs>2000)throw new Error('Perfil excedeu capacidade de renderização. Use light.');
   if(!state.heartbeat||Date.now()+offset-state.heartbeat>10000)throw new Error('Heartbeat do runtime expirou.');
   const at=started+frame*1000/fps+offset-2500,renderStart=Date.now();
   const direction=director.update(state,sceneFrame(state,at),at,mixer.presentation());
   const audio=mixer.mix(state,at,48000/fps,direction);onAudio(audio);
   await Promise.all([renderFrame(state,at,mixer.presentation(),direction).then(b=>write(encoder.stdin,b)),write(encoder.stdio[3],audio)]);frame++;maxRenderMs=Math.max(maxRenderMs,Date.now()-renderStart);if(Date.now()-renderStart>1000/fps)lateFrames++;
   await wait(Math.max(0,started+frame*1000/fps-Date.now()));
  }
 }catch{failed=true;}
 finally{
  closed=true;mixer.close();clearInterval(timer);clearInterval(watchdog);encoder.stdin.end();encoder.stdio[3].end();
  const kill=setTimeout(()=>encoder.kill('SIGKILL'),3000);await exited;clearTimeout(kill);
  status=failed||exitCode!==0?'ERROR':'STOPPED';try{await heartbeat();}catch{/* revocation/backend outage; no secret logged */}
 }
 const usage=process.cpuUsage(cpu);const report={direction:director.counts,status,profile,fps,maxRenderMs,lateFrames,maxPipelineLagMs,frames,bytes,durationMs:Date.now()-started,renderedFrames:frame,rssBytes:process.memoryUsage().rss,rendererCpuMs:(usage.user+usage.system)/1000,encoderCpuMs:null,networkBytes:null,publicTransmission:'UNCONFIRMED',audio:mixer.metrics,aiCalls:0};
 if(status==='ERROR')throw Object.assign(new Error('Encoder interrompido. Revise destino, FFmpeg, backend e autorização. Não houve confirmação pública.'),{report});
 return report;
}
export async function runWorker(c,options={}){
 if(!videoProfiles[options.profile||'light'])throw Error('Perfil inválido');
 validateConfig(c,options.transmit);const kind=options.renderer||'svg',voice=options.voice||'local';
 if(!['svg','three'].includes(kind)||!['neural','local'].includes(voice))throw Error('Renderer/voz inválidos');
 if(options.profile==='hd'&&kind!=='three')throw Error('HD requer renderer 3D');
 let stage,speech;
 try{
  if(kind==='three'){const video=videoProfiles[options.profile||'light'];if(!video)throw Error('Perfil inválido');const {create3DRenderer}=await import('./render3d.mjs');stage=await create3DRenderer(video);}
  if(voice==='neural'){const {createNeuralSpeech}=await import('./neural-speech.mjs');speech=await createNeuralSpeech();}
  const report=await encodeWorker(c,{...options,renderFrame:options.renderFrame||stage?.render||render,synthesize:options.synthesize||speech?.synthesize});
  if(stage)await stage.inspect();if(speech)await speech.inspect();return {...report,renderer:stage?{...stage.metrics}:{engine:'svg-sharp'},speech:speech?{...speech.metrics}:{engine:'espeak-ng'}};
 }catch(error){if(error.report){error.report.renderer=stage?{...stage.metrics}:{engine:'svg-sharp'};error.report.speech=speech?{...speech.metrics}:{engine:'espeak-ng'};}throw error;}finally{speech?.close();await stage?.close();}
}
async function main(){
 const args=process.argv.slice(2),file=args[args.indexOf('--config')+1];if(!args.includes('--config'))throw new Error('Use --config arquivo.json [--transmit] [--output previa.mp4] [--seconds 60].');
 const info=await stat(file);if(process.platform!=='win32'&&(info.mode&0o077))throw new Error('Proteja a configuração com chmod 600.');
 const lock=file+'.lock';let handle;try{handle=await open(lock,'wx',0o600);}catch{throw new Error('Arquivo em uso. Verifique o worker anterior antes de remover .lock.');}
 const controller=new AbortController();process.once('SIGINT',()=>controller.abort());process.once('SIGTERM',()=>controller.abort());
 try{const config=JSON.parse(await readFile(file,'utf8'));const report=await runWorker(config,{transmit:args.includes('--transmit'),output:args.includes('--output')?args[args.indexOf('--output')+1]:'live-preview.mp4',seconds:args.includes('--seconds')?Number(args[args.indexOf('--seconds')+1]):1800,signal:controller.signal,profile:args.includes('--profile')?args[args.indexOf('--profile')+1]:'light',renderer:args.includes('--renderer')?args[args.indexOf('--renderer')+1]:'svg',voice:args.includes('--voice')?args[args.indexOf('--voice')+1]:undefined});console.log(JSON.stringify(report));}finally{await handle.close();await unlink(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{if(error.report)console.error(JSON.stringify(error.report));console.error('Worker encerrado com erro. Verifique configuração protegida, autorização, backend e FFmpeg.');process.exitCode=1;});
