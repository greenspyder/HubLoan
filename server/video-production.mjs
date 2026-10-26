import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

let available;
export function videoRuntimeAvailable() {
  if (available === undefined) available = ['ffmpeg','ffprobe'].every(command => spawnSync(command,['-version'],{timeout:3000,stdio:'ignore'}).status === 0);
  return available;
}

// Uploads are decoded and re-encoded; never fetch URLs or accept filesystem paths.
export async function normalizeVideoImages(images) {
  if(!Array.isArray(images) || images.length<1 || images.length>6) throw new Error('Envie de 1 a 6 imagens autorizadas do produto.');
  if(images.some(x=>typeof x!=='string') || images.reduce((n,x)=>n+x.length,0)>3500000) throw new Error('Imagens excedem 2,5 MB no total.');
  return Promise.all(images.map(async data=>{
    if(!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('Imagem inválida.');
    const bytes=Buffer.from(data,'base64');
    const meta=await sharp(bytes,{limitInputPixels:16000000}).metadata();
    if(!['jpeg','png','webp'].includes(meta.format) || (meta.pages||1)!==1 || meta.width<200 || meta.height<200) throw new Error('Use PNG, JPEG ou WebP estático com pelo menos 200 pixels por lado.');
    return (await sharp(bytes,{limitInputPixels:16000000}).rotate().resize(720,1000,{fit:'contain',background:'#102539'}).jpeg({quality:85}).toBuffer()).toString('base64');
  }));
}

export function videoScenes(brief) {
  const scenes = String(brief).split('\n').map(s => s.trim()).filter(Boolean);
  if (scenes.length < 2 || scenes.length > 6 || scenes.some(s => s.length > 120 || /[\x00-\x08\x0b-\x1f]/.test(s))) throw new Error('Vídeo: use 2 a 6 linhas, com até 120 caracteres por cena. Cada cena dura 4 segundos.');
  return scenes;
}
export function mediaCommand(command, args, { signal, timeout = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Renderização cancelada.'));
    const child = spawn(command, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', settled = false;
    const stop = () => child.kill('SIGKILL');
    const timer = setTimeout(stop, timeout);
    signal?.addEventListener('abort', stop, { once: true });
    child.stderr.on('data', () => {}); // Drain stderr so a full pipe cannot deadlock FFmpeg.
    child.stdout.on('data', b => { output = (output + b).slice(-32768); });
    const finish = error => { if(settled)return; settled=true; clearTimeout(timer); signal?.removeEventListener('abort',stop); error ? reject(error) : resolve(output); };
    child.on('error', () => finish(new Error('FFmpeg/ffprobe indisponível no servidor.')));
    child.on('close', code => finish(code === 0 && !signal?.aborted ? null : new Error('Renderização interrompida ou inválida. Nenhuma API paga foi chamada.')));
  });
}
const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const timestamp = seconds => `00:00:${String(seconds).padStart(2,'0')},000`;
export async function renderVideo({ brief, images = [], signal, checkpoint = async (_kind,_label,_input,run) => run() }) {
  const imageHashes=images.map(x=>createHash('sha256').update(x).digest('hex'));
  const scenes = videoScenes(brief), directory = await mkdtemp(join(tmpdir(),'hubloan-video-'));
  try {
    const srt = scenes.map((s,i) => `${i+1}\n${timestamp(i*4)} --> ${timestamp((i+1)*4)}\n${s}\n`).join('\n');
    for (let i=0;i<scenes.length;i++) {
      const scene = await checkpoint('video-scene','Compor cena',images.length ? [2,i,scenes[i],imageHashes[i%images.length]] : [1,i,scenes[i]],async()=>{
        if(images.length) {
          const photo=await sharp(Buffer.from(images[i%images.length],'base64'),{limitInputPixels:16000000}).resize(720,1000,{fit:'contain',background:'#102539'}).png().toBuffer();
          return {base64:(await sharp({create:{width:720,height:1280,channels:3,background:'#102539'}}).composite([{input:photo,top:60,left:0}]).png().toBuffer()).toString('base64')};
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="720" height="1280" fill="#102539"/><circle cx="${180+i*55}" cy="430" r="160" fill="#27c9a8"/><rect x="160" y="300" width="400" height="520" rx="35" fill="#eff8fa"/><rect x="205" y="365" width="310" height="180" rx="18" fill="#164360"/><path d="M240 660l55 55 175-140" fill="none" stroke="#15967f" stroke-width="28"/><text x="360" y="200" text-anchor="middle" fill="white" font-size="36" font-family="DejaVu Sans">CENA ${i+1} / ${scenes.length}</text><text x="360" y="900" text-anchor="middle" fill="white" font-size="24" font-family="DejaVu Sans">${escape('HubLoan · composição original')}</text></svg>`;
        return { base64:(await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64') };
      });
      await writeFile(join(directory,`scene-${i}.png`),Buffer.from(scene.base64,'base64'));
    }
    await writeFile(join(directory,'frames.txt'),scenes.map((_,i)=>`file 'scene-${i}.png'\nduration 4`).join('\n')+`\nfile 'scene-${scenes.length-1}.png'\n`);
    await writeFile(join(directory,'captions.srt'),srt);
    const result = await checkpoint('video-render','Exportar MP4',images.length ? [2,scenes,imageHashes] : [1,scenes],async()=>{
      // Fixed filter; caption text is data in SRT, never an FFmpeg expression.
      await mediaCommand('ffmpeg',['-v','error','-y','-threads','1','-f','concat','-safe','1','-i',join(directory,'frames.txt'),'-vf',`subtitles=${join(directory,'captions.srt')}:force_style='FontName=DejaVu Sans,FontSize=12,MarginV=25,Outline=2',fps=24,format=yuv420p`,'-t',String(scenes.length*4),'-c:v','libx264','-threads','1','-preset','fast','-crf','24','-movflags','+faststart','-an',join(directory,'video.mp4')],{signal});
      const bytes=await readFile(join(directory,'video.mp4'));
      if(bytes.length>8*1024*1024)throw new Error('Vídeo excedeu o limite de 8 MB.');
      return {base64:bytes.toString('base64')};
    });
    await writeFile(join(directory,'validated.mp4'),Buffer.from(result.base64,'base64'));
    const probe=JSON.parse(await mediaCommand('ffprobe',['-v','error','-show_streams','-show_format','-of','json',join(directory,'validated.mp4')],{signal}));
    const stream=probe.streams.find(s=>s.codec_type==='video');
    if(stream?.width!==720||stream?.height!==1280||stream?.codec_name!=='h264'||Math.abs(Number(probe.format.duration)-scenes.length*4)>0.2)throw new Error('MP4 não passou na validação técnica.');
    await mediaCommand('ffmpeg',['-v','error','-threads','1','-i',join(directory,'validated.mp4'),'-f','null','-'],{signal});
    return {...result,preview:(await readFile(join(directory,'scene-0.png'))).toString('base64'),srt,report:{width:720,height:1280,seconds:scenes.length*4,audio:false,technicalStatus:'TECHNICALLY_VALID',qualityStatus:'REQUIRES_HUMAN_REVIEW',providerCalls:0,infrastructureCost:'UNKNOWN',visuals:images.length?'Imagens fornecidas pelo proprietário; direitos e fidelidade ao produto exigem revisão humana.':'Geometria original gerada pelo HubLoan; nenhum material de terceiros importado.',textRights:'Responsabilidade do autor do roteiro; revisar antes de distribuir.'}};
  } finally { await rm(directory,{recursive:true,force:true}); }
}
