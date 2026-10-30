// Reproducible private WebGL pose sheet; does not advance or mutate production gameplay.
import {create3DRenderer} from './live-worker/render3d.mjs';
import {createGame} from './live-game.mjs';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];if(!out)throw Error('Output directory required');await mkdir(out,{recursive:true});
const r=await create3DRenderer(),records=[];
try{
 const game=createGame({template:'seed-snake',names:['Lume','Faísca'],roundSeconds:20},1000);
 const base=structuredClone(game.frames.at(-1)||game);
 for(const [i,archetype] of ['snake','dragon','cat','crocodile','fox'].entries())for(const [j,direction] of [0,.5,1].entries()){
  const f=structuredClone(base);f.players=f.players.slice(0,1);const p=f.players[0];p.archetype=archetype;p.direction=direction;p.eatenAt=-10000;p.alive=j!==2;p.body=[{x:8,y:12},{x:7,y:12},{x:7,y:11},{x:6,y:11},{x:5,y:11},{x:5,y:10}];
  game.frames=[{...f,at:1000}];const e={game,status:'TESTING',offline:true,performance:{top:[]}};
  const rgb=await r.render(e,2000,null,{editorial:true,format:'champion',shot:'Front',player:0,cutId:`${i}-${j}`});
  const file=`${archetype}-${j}.png`;await sharp(rgb,{raw:{width:360,height:640,channels:3}}).png().toFile(`${out}/${file}`);records.push({file,archetype,direction,alive:p.alive,...await r.inspect()});
 }
 await writeFile(`${out}/poses.json`,JSON.stringify(records,null,2));
}finally{await r.close();}
