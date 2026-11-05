import { spawn } from 'node:child_process';
export const voiceProfiles={host:{voice:'pt-br',pitch:35,speed:165},bright:{voice:'pt-br',pitch:78,speed:185},deep:{voice:'pt-br',pitch:15,speed:150}};
export function decodeWav(bytes,maxSeconds=8){
 if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF')throw Error('WAV inválido');let rate,channels,bits,offset=12,data;
 while(offset+8<=bytes.length){const kind=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),start=offset+8;if(kind==='fmt '){if(size<16||start+16>bytes.length||bytes.readUInt16LE(start)!==1)throw Error('PCM inválido');channels=bytes.readUInt16LE(start+2);rate=bytes.readUInt32LE(start+4);bits=bytes.readUInt16LE(start+14);}if(kind==='data'){data=bytes.subarray(start,Math.min(bytes.length,start+size));break;}offset=start+size+(size%2);}
 if(!data||channels!==1||bits!==16||rate<8000||rate>48000)throw Error('Formato inválido');const count=Math.min(48000*maxSeconds,Math.floor(data.length/2*48000/rate)),out=new Float32Array(count);
 for(let i=0;i<count;i++){const p=i*rate/48000,a=Math.floor(p),b=Math.min(a+1,data.length/2-1);out[i]=(data.readInt16LE(a*2)*(1-(p-a))+data.readInt16LE(b*2)*(p-a))/32768;}return out;
}
export function localSpeech(text,voice='host',{signal,timeout=3000,musical=false}={}){
 if(typeof text!=='string'||text.length>200||!voiceProfiles[voice])return Promise.reject(Error('Fala inválida'));
 const v=voiceProfiles[voice];return new Promise((resolve,reject)=>{
  const child=spawn(process.env.HUBLOAN_TTS_BINARY||'espeak-ng',['--stdout','--stdin','-v',v.voice,'-p',String(v.pitch),'-s',String(musical?190:v.speed)],{shell:false,stdio:['pipe','pipe','ignore']});let bytes=0,chunks=[],done=false;
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(result);};
  const abort=()=>{child.kill('SIGKILL');finish(Error('TTS cancelado'));};const timer=setTimeout(abort,timeout);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  child.stdout.on('data',b=>{bytes+=b.length;if(bytes>2000000)abort();else chunks.push(b);});child.stdin.on('error',()=>{});child.on('error',()=>finish(Error('TTS local indisponível')));child.on('close',code=>{try{if(code!==0)throw Error();finish(null,decodeWav(Buffer.concat(chunks)));}catch{finish(Error('TTS inválido'));}});child.stdin.end(text,'utf8');
 });
}
export function createSpeechCache({synthesize=localSpeech}={}){
 const cache=new Map(),control=new AbortController();let size=0;
 return {peek(segment){return cache.get(JSON.stringify(segment));},async get(segment){const key=JSON.stringify(segment);if(cache.has(key))return {pcm:cache.get(key),cached:true};const pcm=await synthesize(segment.text,segment.voice,{signal:control.signal,musical:segment.role==='chant',delivery:segment.delivery||'warm'});if(!(pcm instanceof Float32Array)||pcm.length>384000)throw Error('Áudio excedeu limite');while(size+pcm.byteLength>16000000&&cache.size){const first=cache.keys().next().value;size-=cache.get(first).byteLength;cache.delete(first);}cache.set(key,pcm);size+=pcm.byteLength;return {pcm,cached:false};},close(){control.abort();cache.clear();size=0;},get bytes(){return size;}};
}
