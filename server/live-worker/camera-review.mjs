// Evidence only: same renderer and deterministic snapshots as the operational worker.
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {createGame,advanceGame} from '../live-game.mjs';
import {create3DRenderer} from './render3d.mjs';
const out=process.argv[2]||'docs/evidence/phase46';await mkdir(out,{recursive:true});
const g=createGame({template:'seed-snake',names:['Lume','Faísca'],roundSeconds:22},1000);advanceGame(g,5000);
const e={game:g,status:'TESTING',performance:{top:[]}},results=[];
for(const shot of ['Tactical','Follow','Front','Action']){const r=await create3DRenderer();try{let rgb;for(let i=0;i<12;i++)rgb=await r.render(e,4600+i*10,null,{shot,player:0,emotion:'confident',mode:'Follow'});await sharp(rgb,{raw:{width:360,height:640,channels:3}}).png().toFile(join(out,shot+'.png'));results.push(await r.inspect());if(shot==='Front')await writeFile(join(out,'face.png'),await r.portrait('happy',.5,1200));}finally{await r.close();}}
await writeFile(join(out,'camera-study.json'),JSON.stringify(results,null,2));
