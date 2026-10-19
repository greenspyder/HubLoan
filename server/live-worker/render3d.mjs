import {createDirector} from '../live-director.mjs';
import {rssOf} from './process-usage.mjs';
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { bootScene3D } from './scene3d.mjs';
import { sceneFrame,avatarVisibility } from '../../frontend/src/shared/live-visual.mjs';
const require=createRequire(import.meta.url);
export async function create3DRenderer({width=360,height=640,executablePath=process.env.HUBLOAN_CHROMIUM,software=process.env.HUBLOAN_SOFTWARE_GL==='1',unsandboxed=process.env.HUBLOAN_UNSANDBOXED_RENDERER==='1'}={}) {
 if(![[216,384],[360,640],[720,1280]].some(([w,h])=>w===width&&h===height))throw Error('Resolução 3D não suportada.');
 if(!executablePath)throw Error('Configure HUBLOAN_CHROMIUM com Chrome/Chromium local.');
 const browser=await puppeteer.launch({executablePath,headless:'shell',pipe:true,timeout:15000,args:['--disable-dev-shm-usage',...(software?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]),...(unsandboxed?['--no-sandbox']:[])]});
 const director=createDirector();let closed=false,busy=false;const metrics={engine:'three-webgl2',width,height,frames:0,maxFrameMs:0,softwareRequested:software,sandboxDisabled:unsandboxed,gpu:null,geometryCount:0,textureCount:0};
 async function close(){if(closed)return;closed=true;const kill=setTimeout(()=>browser.process()?.kill('SIGKILL'),2000);try{await browser.close();}finally{clearTimeout(kill);}}
 try{
  const page=await browser.newPage();page.setDefaultTimeout(5000);await page.setViewport({width,height,deviceScaleFactor:1});
  // No network or navigation. Only bundled code + normalized photo data enters this page.
  await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('data:image/png;base64,')?r.continue():r.abort());
  await page.setContent('<html><body style="margin:0"></body></html>');
  await page.addScriptTag({content:'var exports={};\n'+await readFile(require.resolve('three'),'utf8')+'\nwindow.THREE=exports;'});
  await page.evaluate((source,w,h)=>{window.stage=(0,eval)('('+source+')')(window.THREE,w,h);},bootScene3D.toString(),width,height);
  metrics.gpu=await page.evaluate(()=>window.stage.resources.gpu);
  return {metrics,close,async render(e,at,presentation,direction){
   if(closed||busy)throw Error('Renderer fechado ou ocupado');busy=true;const started=Date.now();let timer;
   try{const frame=sceneFrame(e,at);const payload={frame,at,presentation,direction:direction||director.update(e,frame,at,presentation),p:e.performance,visibility:avatarVisibility(e.performance,at),paused:e.status==='PAUSED'};
    const result=await Promise.race([page.evaluate(input=>window.stage.draw(input),payload),new Promise((_,reject)=>{timer=setTimeout(()=>{void close();reject(Error('Render 3D excedeu 5 segundos'));},5000);})]);
    const rgb=Buffer.from(result,'base64');if(rgb.length!==width*height*3)throw Error('Frame incompleto');metrics.frames++;metrics.maxFrameMs=Math.max(metrics.maxFrameMs,Date.now()-started);return rgb;
   }finally{clearTimeout(timer);busy=false;}
  },async inspect(){const data=await page.evaluate(()=>window.stage.inspect());metrics.geometryCount=data.geometries;metrics.textureCount=data.textures;try{const session=await browser.target().createCDPSession();const {processInfo}=await session.send('SystemInfo.getProcessInfo');await session.detach();metrics.browserCpuMs=processInfo.reduce((n,p)=>n+p.cpuTime*1000,0)||null;const rss=await Promise.all(processInfo.map(p=>rssOf(p.id)));metrics.browserRssBytes=rss.some(v=>v===null)?null:rss.reduce((a,b)=>a+b,0);}catch{metrics.browserCpuMs=null;metrics.browserRssBytes=null;}return data;}};
 }catch(error){await close();throw error;}
}
