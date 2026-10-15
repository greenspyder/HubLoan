import sharp from 'sharp';
import {sceneSvg,sceneFrame} from '../../frontend/src/shared/live-visual.mjs';
export {sceneFrame,performanceOverlay,sceneSvg} from '../../frontend/src/shared/live-visual.mjs';
sharp.concurrency(1);
export async function render(e,at,presentation=null){return sharp(Buffer.from(sceneSvg(e,at,presentation))).removeAlpha().raw().toBuffer();}
export function pcm(e,at,samples=3200){
 const b=Buffer.alloc(samples*2),f=sceneFrame(e,at),action=e.action;
 const soundAt=f?.soundAt||(action?.sound!=='none'?action?.startedAt:0)||0;
 if(e.status!=='TESTING'||e.config.audio.muted)return b;
 for(let i=0;i<samples;i++){const elapsed=(at-soundAt)/1000+i/48000;if(elapsed>=0&&elapsed<.18)b.writeInt16LE(Math.round(Math.sin(elapsed*2*Math.PI*660)*Math.exp(-elapsed*18)*12000*e.config.audio.volume),i*2);}
 return b;
}
