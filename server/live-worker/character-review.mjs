// Uses the production renderer and character factory, not a promotional animation.
import {create3DRenderer} from './render3d.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(process.argv[2]||'docs/evidence/phase45');await mkdir(out,{recursive:true});
for(const design of ['jade','pearl','ember']){const r=await create3DRenderer({design});try{await writeFile(`${out}/proposal-${design}.png`,await r.portrait('confident'));if(design==='jade')for(const emotion of ['happy','surprise','irritated','confident','teasing','sad','celebrating','fear','focused','laughing'])await writeFile(`${out}/expression-${emotion}.png`,await r.portrait(emotion,.3,2000));}finally{await r.close();}}
