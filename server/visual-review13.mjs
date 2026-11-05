import {create3DRenderer} from './live-worker/render3d.mjs';
import {createGame} from './live-game.mjs';
import {planCameraPath} from './camera-path.mjs';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2];await mkdir(out,{recursive:true});
const factories=process.argv[3]?{sceneFactory:(await import(process.argv[3]+'/scene3d.mjs')).bootScene3D,faceFactory:(await import(process.argv[3]+'/lume-face.mjs')).createLumeFace,cameraFactory:(await import(process.argv[3]+'/camera-rig.mjs')).createCameraRig}:{};
const r=await create3DRenderer(factories),rows=[];
try{
 const game=createGame({template:'seed-snake',names:['Lume','Faísca','Jade'],roundSeconds:20},1000),base=structuredClone(game.frames.at(-1)||game);
 const cases=['front','side','rear','elevated','close','tight-turn','crossing','three-nearby','fast','showcase'];
 for(const [i,name] of cases.entries()){
  const f=structuredClone(base);f.at=1000;f.players=f.players.slice(0,name==='three-nearby'?3:name==='crossing'?2:1);
  for(const [j,p] of f.players.entries()){p.alive=true;p.eatenAt=-10000;p.direction=j?2:1;p.body=[{x:8+j*1.5,y:12},{x:8+j*1.5,y:11},{x:7+j*1.5,y:10},{x:6+j*1.5,y:10},{x:5+j*1.5,y:11},{x:5+j*1.5,y:12}];}
  if(name==='fast'){const next=structuredClone(f);next.at=1100;next.players.forEach(p=>{p.body.forEach(b=>b.y+=1);p.direction=1.5;});game.frames=[f,next];}else game.frames=[f];const e={game,status:'TESTING',offline:true,performance:{top:[]}},d={editorial:true,format:'champion',shot:'Front',player:0,cutId:name,showcase:name==='showcase',showcaseStage:1};
  if(name==='showcase'){
   await r.render(e,name==='fast'?1050:2000,null,{...d,collectCameraViews:true});const frame=r.planningFrames.at(-1);if(frame.views.length)d.cameraPlan=planCameraPath([frame]).path[0];
  }else{
   const pos={front:[1,4,10],side:[10,4,1],rear:[1,4,-10],elevated:[7,14,9],close:[2,3,6]}[name]||[7,7,10];
   // Compute a look-at quaternion without another browser renderer.
   const {PerspectiveCamera}=await import('three');const c=new PerspectiveCamera(48,360/640,.1,300);c.position.fromArray(pos);c.lookAt(0,1,0);d.cameraPlan={position:pos,quaternion:c.quaternion.toArray()};
  }
  const rgb=await r.render(e,name==='fast'?1050:2000,null,d);await sharp(rgb,{raw:{width:360,height:640,channels:3}}).png().toFile(`${out}/${name}.png`);rows.push({name,...await r.inspect()});
 }
 await writeFile(`${out}/matrix.json`,JSON.stringify(rows,null,2));
}finally{await r.close();}
