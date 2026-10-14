import { useEffect, useRef, useState } from 'react';
import type { LiveExperience } from '../services/liveFactory';
import { drawLiveScene } from '../services/liveScene';
export function LiveStage({e,fresh}:{e:LiveExperience;fresh:boolean}) {
 const canvas=useRef<HTMLCanvasElement>(null),audio=useRef<AudioContext|null>(null),destination=useRef<MediaStreamAudioDestinationNode|null>(null),nodes=useRef<OscillatorNode[]>([]),recorder=useRef<MediaRecorder|null>(null),timeout=useRef<ReturnType<typeof setTimeout>|null>(null),latest=useRef({e,fresh}),seen=useRef(e.action?.id);
 const [enabled,setEnabled]=useState(false),[recording,setRecording]=useState(false),[message,setMessage]=useState(''),[clip,setClip]=useState('');
 useEffect(()=>{latest.current={e,fresh};},[e,fresh]);
 useEffect(()=>{
  let frame=0,last=0;const ctx=canvas.current?.getContext('2d');const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stopSounds(){nodes.current.forEach(n=>{try{n.stop();}catch{/* Already ended. */}});nodes.current=[];}
  function draw(now:number){
   if(now-last>=1000/30&&ctx){last=now;const {e,fresh}=latest.current;drawLiveScene(ctx,e,Date.now(),fresh,reduced);
    if(!fresh||!e.connected||e.status!=='TESTING'||!e.heartbeat||Date.now()-e.heartbeat>10000||document.hidden)stopSounds();
   }frame=requestAnimationFrame(draw);
  }
  const hidden=()=>{if(document.hidden){stopSounds();if(recorder.current?.state==='recording')recorder.current.stop();}};
  document.addEventListener('visibilitychange',hidden);frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hidden);stopSounds();if(timeout.current)clearTimeout(timeout.current);if(recorder.current?.state==='recording'){recorder.current.onstop=null;recorder.current.stream.getTracks().forEach(t=>t.stop());recorder.current.stop();}void audio.current?.close();};
 },[]);
 useEffect(()=>{
  if(!e.action||seen.current===e.action.id)return;
  seen.current=e.action.id;const a=e.action,ctx=audio.current;
  if(!ctx||ctx.state!=='running'||!enabled||!fresh||!e.connected||e.status!=='TESTING'||e.config.audio.muted||a.sound==='none'||Date.now()>=a.expiresAt||document.hidden)return;
  const frequencies=a.sound==='sparkle'?[523,659,784]:a.sound==='drum'?[130,90]:[440,660];
  frequencies.forEach((hz,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+i*.12;oscillator.type=a.sound==='drum'?'triangle':'sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(Math.min(.2,a.volume*.2),at+.02);gain.gain.exponentialRampToValueAtTime(.001,at+.22);oscillator.connect(gain);gain.connect(ctx.destination);if(destination.current)gain.connect(destination.current);nodes.current.push(oscillator);oscillator.onended=()=>{nodes.current=nodes.current.filter(n=>n!==oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+.25);});
 },[e,enabled,fresh]);
 useEffect(()=>()=>{if(clip)URL.revokeObjectURL(clip);},[clip]);
 async function enableAudio(){try{if(!audio.current||audio.current.state==='closed'){audio.current=new AudioContext();destination.current=audio.current.createMediaStreamDestination();}await audio.current.resume();seen.current=e.action?.id;setEnabled(true);setMessage('Áudio local liberado. Envie um novo evento para ouvir.');}catch{setMessage('Este navegador não liberou áudio. O personagem continua sem som.');}}
 function record(){
  if(!canvas.current||typeof MediaRecorder==='undefined'||!canvas.current.captureStream){setMessage('Gravação local indisponível neste navegador. Use captura de janela no OBS.');return;}
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime){setMessage('WebM não suportado neste navegador.');return;}
  let stream:MediaStream|null=null;
  try{
   stream=canvas.current.captureStream(30);if(enabled&&destination.current)destination.current.stream.getAudioTracks().forEach(t=>stream!.addTrack(t.clone()));
   const r=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1200000}),chunks:Blob[]=[];let bytes=0,failed=false;recorder.current=r;
   r.ondataavailable=event=>{bytes+=event.data.size;if(bytes>8*1024*1024){failed=true;if(r.state==='recording')r.stop();setMessage('Gravação interrompida: limite de 8 MB.');}else if(event.data.size)chunks.push(event.data);};
   r.onerror=()=>{failed=true;setMessage('Falha na gravação local. Use captura OBS.');};
   r.onstop=()=>{stream!.getTracks().forEach(t=>t.stop());if(timeout.current)clearTimeout(timeout.current);setRecording(false);if(!failed){setClip(URL.createObjectURL(new Blob(chunks,{type:mime})));setMessage('Clipe local pronto. Ele não foi publicado nem transmitido.');}};
   r.start(500);setRecording(true);setMessage(enabled?'Gravando por até 15 segundos. Envie eventos.':'Gravando sem áudio por até 15 segundos. Envie eventos.');timeout.current=setTimeout(()=>{if(r.state==='recording')r.stop();},15000);
  }catch{stream?.getTracks().forEach(t=>t.stop());setRecording(false);setMessage('Não foi possível iniciar a gravação neste navegador.');}
 }
 return <div className="live-stage-wrap"><canvas ref={canvas} width={360} height={640} className="live-stage" aria-label={`Cena vertical de ${e.config.name}: ${e.character.speech}`} role="img"/>
 <div className="live-controls"><button onClick={()=>{if(enabled){void audio.current?.suspend();setEnabled(false);setMessage('Áudio local silenciado.');}else void enableAudio();}}>{enabled?'Silenciar neste navegador':'Habilitar áudio neste navegador'}</button><button disabled={recording||!fresh||!e.connected||e.status!=='TESTING'} onClick={record}>Gravar clipe local · 15 s</button>{recording&&<button onClick={()=>recorder.current?.stop()}>Finalizar clipe</button>}{clip&&<a className="aw-button" href={clip} download="lume-teste.webm">Baixar clipe WebM</a>}</div><p role="status">{message}</p><p className="aw-caption">Cena 360 × 640 · 9:16 · até 30 fps. Som sintetizado localmente, sem TTS. A gravação inclui apenas esta cena e os efeitos habilitados. Áudio depende de interação neste navegador.</p></div>;
}
