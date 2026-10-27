// Browser-side presentation only. Receives interpolated snapshots, never advances the game.
// Procedural original meshes; no external assets, fetch, clocks or autonomous render loop.
export function bootScene3D(T,width=360,height=640,createFace,design='jade',createRig,encodePixels) {
 const rgb=new Uint8Array(width*height*3);
 const renderer=new T.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setSize(width,height);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor('#163940');
 const scene=new T.Scene();scene.background=new T.Color('#163940');scene.fog=new T.Fog('#163940',38,95);
 const camera=new T.PerspectiveCamera(48,width/height,.1,300);camera.position.set(0,29,30);const rig=createRig(T,camera);
 scene.add(new T.HemisphereLight('#e5ffff','#37564d',2.3));const sun=new T.DirectionalLight('#ffe6b6',3.1);sun.position.set(-12,24,10);scene.add(sun);
 const fill=new T.DirectionalLight('#86cfff',1.2);fill.position.set(12,8,-8);scene.add(fill);
 const materials=new Map();function mat(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.52,metalness:.03}));return materials.get(color);}
 const sphere=new T.SphereGeometry(1,12,8),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,24),cone=new T.ConeGeometry(1,1,5);
 function mesh(g,color,parent=scene,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(g,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 mesh(box,'#234854',scene,0,-1,0,19,1.5,27);mesh(box,'#4d8b73',scene,0,-.2,0,17.6,.3,25.6);
 mesh(box,'#609a80',scene,0,0,0,16.6,.15,24.6);
 for(let z=0;z<24;z+=2)mesh(box,'#639f83',scene,0,.085,z-11,16.2,.008,1);
 for(const x of [-8.5,8.5])mesh(box,'#c1db9a',scene,x,.15,0,.35,.4,25.5);
 for(const z of [-12.5,12.5])mesh(box,'#c1db9a',scene,0,.15,z,17.4,.4,.35);
 const plants=[];
 for(let i=0;i<20;i++){const x=(i%2?1:-1)*(10+(i%3)*.25),z=-13+Math.floor(i/2)*2.8;const g=new T.Group();g.position.set(x,-.4,z);scene.add(g);mesh(cylinder,'#466964',g,0,.3,0,.6,.8,.6);for(let k=0;k<3;k++){const leaf=mesh(sphere,k%2?'#7fceb0':'#46a58a',g,Math.sin(k*2)*.4,1+k*.3,Math.cos(k*2)*.3,.38,1.1,.23);leaf.rotation.z=(k-1)*.45;}plants.push(g);}
 // Batch static garden meshes by geometry/material to bound software-renderer draw calls.
 scene.updateMatrixWorld(true);const batches=new Map();scene.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});
 for(const objects of batches.values()){const inst=new T.InstancedMesh(objects[0].geometry,objects[0].material,objects.length);objects.forEach((o,i)=>{inst.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});scene.add(inst);}
 const rocks=[[-.5,-1.5],[.5,-1.5],[-.5,2.5]].map(([x,z])=>{const r=mesh(new T.DodecahedronGeometry(.65,0),'#708d8d',scene,x,.3,z);r.scale.y=.75;return r;});
 function face(color,identity=design){return createFace(T,color,identity);}
 const scaleCanvas=document.createElement('canvas');scaleCanvas.width=128;scaleCanvas.height=128;
 const scaleCtx=scaleCanvas.getContext('2d');scaleCtx.fillStyle='#aaa';scaleCtx.fillRect(0,0,128,128);scaleCtx.strokeStyle='#888';scaleCtx.lineWidth=2;
 for(let y=-16;y<144;y+=16)for(let x=-16;x<144;x+=16){const u=x+(y%32?8:0);scaleCtx.beginPath();scaleCtx.ellipse(u,y,8,9,0,0,Math.PI*2);scaleCtx.stroke();}
 const scaleTexture=new T.CanvasTexture(scaleCanvas);scaleTexture.wrapS=scaleTexture.wrapT=T.RepeatWrapping;scaleTexture.repeat.set(6,2);
 const snakes=Array.from({length:6},(_,i)=>{const color=i?'#da9551':'#67caaa',head=face(color,i?'ember':design);scene.add(head.g);const skin=mat(color).clone();skin.bumpMap=scaleTexture;skin.bumpScale=.012;skin.roughness=.52;const body=new T.Mesh(new T.BufferGeometry(),skin);scene.add(body);const scales=new T.InstancedMesh(sphere,mat(i?'#ffe0a1':'#b5f3b7'),96);scales.instanceMatrix.setUsage(T.DynamicDrawUsage);scales.frustumCulled=false;scene.add(scales);const shadow=mesh(new T.CircleGeometry(1,20),'#527d67',scene,0,.12,0,.75,.65,1);shadow.rotation.x=-Math.PI/2;return {head,body,scales,shadow};});
 const scaleTransform=new T.Object3D();scaleTransform.scale.set(.10,.012,.16);
 const apples=Array.from({length:6},()=>{const g=new T.Group();scene.add(g);mesh(sphere,'#ff5360',g,-.16,.31,0,.36,.4,.36);mesh(sphere,'#ed3b4c',g,.16,.31,0,.36,.4,.36);mesh(cylinder,'#775541',g,0,.8,0,.04,.25,.04);const leaf=mesh(sphere,'#b9ea65',g,.18,.84,0,.27,.07,.11);leaf.rotation.z=.3;mesh(sphere,'#ffbfad',g,-.26,.49,.26,.08,.14,.025);return g;});
 const particleGeometry=new T.OctahedronGeometry(.12);
 const particles=Array.from({length:72},(_,i)=>{const p=mesh(particleGeometry,'#fff2aa');p.visible=false;return p;});
 // A close-up of the same host design, on the foreground stage, not another simulation.
 const portrait=face('#67caaa');scene.add(camera);portrait.g.position.set(-.85,-1.78,-8);portrait.g.scale.setScalar(.66);camera.add(portrait.g);
 const hostNeck=mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,-.25,-.30),new T.Vector3(0,-.85,-.38),new T.Vector3(.35,-1.4,-.30),new T.Vector3(-.45,-1.65,.10),new T.Vector3(-.65,-1.45,.25)]),40,.27,10,false),'#67caaa',portrait.g);hostNeck.visible=false;
 const audience=Array.from({length:6},(_,i)=>{const g=new T.Group();camera.add(g);mesh(sphere,i?'#6ba4b7':'#f6ce65',g,0,.4,0,.4,.5,.28);const head=mesh(sphere,'#d8eadc',g,0,1.02,0,.37,.37,.3);for(const x of [-.13,.13])mesh(sphere,'#203d4e',g,x,1.08,.28,.04,.05,.035);const photo=new T.Mesh(new T.PlaneGeometry(.65,.65),new T.MeshBasicMaterial({transparent:true}));photo.position.set(0,1.02,.32);photo.visible=false;g.add(photo);const crown=mesh(cone,'#ffe28a',g,0,1.55,0,.3,.3,.3);crown.visible=i===0;return {g,head,photo,crown,key:null};});
 const output=document.createElement('canvas');output.width=width;output.height=height;document.body.append(output);const ctx=output.getContext('2d',{willReadFrequently:true});
 let musicEnergy=0;let previousAt=null;let cameraMode='Overview',currentDirection=null;let lastPresentation=null;
 const resources={nativeBase64:typeof rgb.toBase64==='function',renderer:'Three.js / WebGL2',gpu:renderer.getContext().getParameter(renderer.getContext().RENDERER)};
 function label(text,x,y,size=14,color='#effde7',align='left'){ctx.fillStyle=color;ctx.font=`600 ${size}px sans-serif`;ctx.textAlign=align;ctx.fillText(String(text).slice(0,90),x,y);}
 function card(x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();}
 function wrap(text,x,y,maxWidth){let line='',row=0;ctx.font='600 13px sans-serif';for(const word of String(text).split(' ')){if(ctx.measureText(line+word).width>maxWidth&&line){label(line,x,y+row*18,13);line='';row++;if(row>=3)break;}line+=word+' ';}if(row<3)label(line,x,y+row*18,13);}
 async function updatePhotos(top){for(let i=0;i<6;i++){const a=audience[i],v=top[i]?.avatar,key=typeof v==='string'&&v.length<80000&&/^[A-Za-z0-9+/=]+$/.test(v)?v:null;if(key===a.key)continue;a.key=key;a.photo.material.map?.dispose();a.photo.material.map=null;a.photo.visible=false;if(key){const img=new Image();img.src='data:image/png;base64,'+key;try{await img.decode();if(img.width>128||img.height>128)continue;const texture=new T.Texture(img);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;a.photo.material.map=texture;a.photo.material.needsUpdate=true;a.photo.visible=true;}catch{/* generic face remains */}}}}
 async function draw({frame:f,at,offline=false,presentation,p,visibility=0,paused=false,ambient=null,direction={mode:'Overview',player:0}}){
 const began=performance.now();
  if(!f?.players?.length)throw Error('3D exige Seed Snake');const t=at/1000;await updatePhotos(p?.top||[]);
  const delta=previousAt===null?1:Math.min(.25,Math.max(0,(at-previousAt)/1000));previousAt=at;const host=f.players[direction.player||0]||f.players[0];
  cameraMode=direction.mode;currentDirection=direction;
  const h=host.body[0],framing=rig.update(f,direction,at);
  const music=presentation?.role==='music',vocal=music&&presentation.vocalActive===true;musicEnergy+=((music?presentation.level||0:0)-musicEnergy)*(1-Math.exp(-delta*7));sun.intensity=2.3+.18*musicEnergy;fill.intensity=1.2+.12*musicEnergy;


  const celebrating=f.phase==='FINISHED';
  for(let i=0;i<6;i++){const s=snakes[i],v=f.players[i];for(const object of [s.head.g,s.body,s.scales,s.shadow])object.visible=!!v;if(!v)continue;
   const identity=(v.participantId||direction.editorial)?v.archetype:(i?'ember':design);
   const identityKey=identity+':'+v.color;
   if(s.identity!==identityKey){const geometries=new Set(),materials=new Set();s.head.g.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});s.head.g.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());s.head=face(v.color,identity);scene.add(s.head.g);s.identity=identityKey;}
   s.body.material.color.set(v.color);
const eat=at-v.eatenAt,giftAge=at-(v.giftAt||0),giftActive=giftAge>=0&&giftAge<1800,joy=giftActive||eat>=0&&eat<600||celebrating&&(f.winnerId?v.id===f.winnerId:v.name===f.winner),level=!v.participantId&&i===0&&(!music||vocal)&&presentation?.role!=='comment'?presentation?.level||0:0;
   const logical=v.body.map((b,j)=>new T.Vector3(b.x-7.5,.52+Math.sin(t*4+j*.6)*.025,b.y-11.5));
   // Two bounded corner-cutting passes round the grid path without moving the logical head.
   let points=logical;
   for(let pass=0;pass<2;pass++){const rounded=[points[0]];for(let j=0;j<points.length-1;j++){rounded.push(points[j].clone().lerp(points[j+1],.25),points[j].clone().lerp(points[j+1],.75));}rounded.push(points.at(-1));points=rounded;}

   const curve=new T.CatmullRomCurve3(points,false,'centripetal');const segments=Math.max(12,Math.min(160,v.body.length*7));const geometry=new T.TubeGeometry(curve,segments,.43,8,false);
   const positions=geometry.attributes.position,center=new T.Vector3(),vertex=new T.Vector3();
   for(let ring=0;ring<=segments;ring++){const u=ring/segments,scale=u>.7?Math.max(.015,(1-u)/.3):1;curve.getPointAt(u,center);for(let j=0;j<=8;j++){const index=ring*9+j;vertex.fromBufferAttribute(positions,index).sub(center).multiplyScalar(scale).add(center);positions.setXYZ(index,vertex.x,vertex.y,vertex.z);}}
   geometry.computeVertexNormals();const previous=s.body.geometry;
   // Reuse GPU attributes while topology is unchanged; growth still reallocates explicitly.
   if(previous.attributes.position?.count===geometry.attributes.position.count){for(const key of ['position','normal']){previous.attributes[key].array.set(geometry.attributes[key].array);previous.attributes[key].needsUpdate=true;}previous.boundingSphere=null;geometry.dispose();}
   else{previous.dispose();s.body.geometry=geometry;}
   s.head.g.position.copy(points[0]);s.head.g.position.y+=joy?Math.abs(Math.sin(t*12))*.2:0;s.head.g.rotation.y=Math.PI/2-(v.visualDirection??v.direction)*Math.PI/2;s.head.g.rotation.z=v.alive?Math.sin(t*4)*.035+(i===0&&music?Math.sin(t*6)*.06*musicEnergy:0):.3;
   s.head.g.scale.setScalar(direction.editorial?Math.max(.95,Math.min(1.15,direction.headScale||1.08)):1.08);s.head.animate(at,level,joy,!v.alive,direction.player===i?direction.emotion:(joy?'happy':'focused'),v.target?((v.target.x-v.body[0].x)*Math.sin((v.visualDirection??v.direction)*Math.PI/2)-(v.target.y-v.body[0].y)*Math.cos((v.visualDirection??v.direction)*Math.PI/2))*.015:0);s.shadow.position.set(points[0].x,.13,points[0].z);
   s.scales.count=Math.min(96,v.body.length*2-2);for(let k=0;k<s.scales.count;k++){const u=k/Math.max(1,s.scales.count),taper=u>.7?Math.max(.015,(1-u)/.3):1,pt=curve.getPointAt(u);scaleTransform.scale.set(.10*taper,.012,.16*taper);scaleTransform.position.set(pt.x,pt.y+.43*taper,pt.z);scaleTransform.updateMatrix();s.scales.setMatrixAt(k,scaleTransform.matrix);}s.scales.instanceMatrix.needsUpdate=true;
   for(let k=0;k<12;k++){const part=particles[i*12+k],age=at-Math.max(v.alive?v.eatenAt:v.hitAt,v.giftAt||0);part.visible=age>=0&&age<(v.giftAt>v.eatenAt?1800:700);if(part.visible){const u=age/(v.giftAt>v.eatenAt?1800:700),a=k*Math.PI/6;part.position.set(points[0].x+Math.cos(a)*u*1.7,.5+Math.sin(u*Math.PI)*1.6,points[0].z+Math.sin(a)*u*1.7);part.scale.setScalar((1-u)*(giftActive&&v.giftKind==='special'?1.7:1));part.material=mat(giftActive?(v.giftKind==='rose'?'#ff92bc':v.giftKind==='special'?'#ffe275':'#c5e9ff'):'#fff2aa');}}
  }
  f.obstacles?.forEach((r,i)=>{if(rocks[i])rocks[i].position.set(r.x-7.5,.3,r.y-11.5);});
  apples.forEach((a,i)=>{a.visible=!!f.food[i];if(a.visible){a.position.set(f.food[i].x-7.5,.1+Math.sin(t*2+i)*.06,f.food[i].y-11.5);a.rotation.y=Math.sin(t+i)*.12;a.scale.setScalar(f.food[i].golden?1.25:1);a.children[0].material=mat(f.food[i].golden?'#ffda58':'#ff5360');a.children[1].material=mat(f.food[i].golden?'#e8a92e':'#ed3b4c');}});
  plants.forEach((g,i)=>g.rotation.z=Math.sin(t*.7+i)*.025);
  const voice=presentation?.role&&presentation.role!=='comment'?presentation:null,chant=voice?.role==='chant'||music;portrait.g.visible=!!direction.presenter||!!voice||direction.cue?.kind==='community';portrait.animate(at,music&&!vocal?0:voice?.level||0,chant||direction.emotion==='joy',direction.emotion==='sad',direction.emotion,(h.x-7.5)*.015);portrait.g.rotation.y=(h.x-7.5)*.035;portrait.g.rotation.z=chant?Math.sin((voice.elapsedMs||0)/210)*(music?.08*musicEnergy:.07):Math.sin(t*2)*.025;portrait.g.position.y=-1.78+(music?Math.sin((voice.elapsedMs||0)/210)*.08*musicEnergy:voice?Math.sin(t*5)*.05:0);
  hostNeck.visible=!!direction.presenter;
  if(direction.presenter){portrait.g.position.set(0,-.2+Math.sin(t*2)*.025,-5.5);portrait.g.scale.setScalar(.98);portrait.g.rotation.y=Math.sin(t*1.4)*.06;portrait.g.rotation.z=Math.sin(t*2.1)*.025;}else{portrait.g.position.x=-.85;portrait.g.position.z=-8;portrait.g.scale.setScalar(.66);}
  audience.forEach((a,i)=>{const person=p?.top?.[i];a.g.visible=!!person&&visibility>0;if(!a.g.visible)return;const side=i%2?1:-1;a.g.position.set(-1.45+i*.58,1.4+Math.sin(t*4+i)*.035,-9);a.g.scale.setScalar(visibility*(i===0?.36:.29));a.g.rotation.y=side*-.12;a.crown.visible=i===0;});
  const staged=performance.now();renderer.render(scene,camera);const rendered=performance.now();ctx.drawImage(renderer.domElement,0,0);const captured=performance.now();ctx.save();ctx.scale(width/360,height/640);
  if(!direction.editorial){card(16,16,310,47,'#123740e0');label(`${offline?'LUME • VÍDEO EDITORIAL':'LUME AO VIVO'} • RODADA ${f.round}`,28,35,12,'#b8e7b6');
  label(f.players.length>2?`${f.players.filter(p=>p.alive).length}/${f.players.length} na arena · pontos do jogo`:`${f.players[0].name.slice(0,12)} ${f.players[0].score}  ×  ${f.players[1].score} ${f.players[1].name.slice(0,12)}`,28,54,14);
  }else{card(22,42,284,46,'#123740c0');label((direction.title||'Lume').slice(0,28),164,70,16,'#fff3cb','center');}
  const labelBoxes=[];for(const [i,actor] of f.players.entries()){if(!actor.participantId)continue;const pos=snakes[i].head.g.position.clone().add(new T.Vector3(0,2.1,0)).project(camera),x=(pos.x+1)*180,y=(1-pos.y)*320;if(pos.z>-1&&pos.z<1&&x>50&&x<310&&y>110&&y<440&&!labelBoxes.some(b=>Math.abs(x-b.x)<100&&Math.abs(y-b.y)<28)){labelBoxes.push({x,y});card(x-49,y-15,98,26,'#123740e0');label(`${actor.rank?'#'+actor.rank+' ':''}${actor.name.slice(0,10)}`,x,y+2,12,'#fff3cb','center');}}
  if(host.participantId){card(16,444,310,24,'#123740e0');label(`${host.rank?'#'+host.rank+' · ':''}${host.name.slice(0,24)} · ${host.score} pontos no jogo`,28,461,13,'#fff3cb');}
  if(ambient&&direction.editorial){label(`${ambient.title.slice(0,28)} · ${ambient.creator.slice(0,15)}`,180,585,10,'#dcf0ed','center');label(ambient.license.split(' — ')[0],180,600,10,'#dcf0ed','center');}
  if(ambient&&!direction.editorial){label(`Música: ${ambient.title.slice(0,38)}`,28,80,11,'#c8edb2');label(`${ambient.creator.slice(0,32)} · ${ambient.license.split(' — ')[0].slice(0,20)}`,28,95,11,'#c8edb2');}
  if(celebrating){card(70,115,220,68,'#fff0cbea');label(f.winner==='Empate'?'Empate!':`${f.winner} venceu!`,180,144,20,'#224443','center');label('Próxima colheita em instantes',180,167,12,'#456459','center');}
  if(!offline&&presentation?.text){card(130,472,212,86,'#123740ed');label(voice?'LUME • '+(music?(vocal?'FAIXA VOCAL':'INSTRUMENTAL'):chant?'NO RITMO':'FALANDO'):'COMENTÁRIO • SIMULADO',140,488,10,'#c8edb2');wrap(presentation.text,140,510,191);}
  if(p?.top?.length){const expanded=visibility>0;card(16,expanded?560:590,310,expanded?61:25,'#123740e0');label(expanded?'TOP 6 • QUANTIDADE SIMULADA':`LÍDER DEMO • ${p.top[0].name.slice(0,20)}`,28,expanded?575:607,12,'#ffdc81');if(expanded)(p.top||[]).forEach((person,i)=>label(`${i+1} ${person.name.slice(0,8)}`,28+(i%3)*98,594+Math.floor(i/3)*18,13,i?'#dcf0ed':'#ffdc81'));}
  label(paused?'PAUSADO':'PERSONAGENS VIRTUAIS • INTERAÇÕES SIMULADAS',180,631,9,'#b8d8d7','center');ctx.restore();
  lastPresentation={...framing,cameraMode,cue:currentDirection?.cue?.kind||null,mouth:music&&!vocal?0:voice?.level||0,presenterVisible:portrait.g.visible,face:portrait.inspect(),headScale:snakes[0].head.g.scale.x,round:f.round,camera:camera.position.toArray(),bodyLengths:f.players.map(v=>v.body.length),avatarCount:(p?.top||[]).filter((_,i)=>audience[i].g.visible).length};
  const overlaid=performance.now(),data=ctx.getImageData(0,0,width,height).data,readback=performance.now();for(let i=0,j=0;i<data.length;i+=4){rgb[j++]=data[i];rgb[j++]=data[i+1];rgb[j++]=data[i+2];}
  const converted=performance.now();const pixels=encodePixels(rgb);return {pixels,visual:{shot:framing.shot,occlusionCorrected:framing.occlusionCorrected,pacing:direction.pacing,player:framing.player,fallback:framing.fallback,head:framing.head,camera:framing.camera,round:f.round,phase:f.phase,emotion:direction.emotion,avatarCount:lastPresentation.avatarCount,presenterVisible:portrait.g.visible},timings:{sceneMs:staged-began,threeSubmitMs:rendered-staged,captureMs:captured-rendered,overlayMs:overlaid-captured,readbackMs:readback-overlaid,pixelConversionMs:converted-readback,serializationMs:performance.now()-converted}};
 }
 return {draw,resources,portrait(designEmotion='neutral',level=0,at=1000){
 const visibility=scene.children.map(o=>[o,o.visible]);for(const o of scene.children)if(!o.isLight&&o!==camera)o.visible=false;
 const oldVisible=portrait.g.visible;portrait.g.visible=true;
 const oldPosition=portrait.g.position.clone(),oldScale=portrait.g.scale.clone(),oldRotation=portrait.g.rotation.clone();
 audience.forEach(a=>a.g.visible=false);portrait.g.position.set(0,0,-4.5);portrait.g.scale.setScalar(.85);portrait.g.rotation.set(.02,-.22,0);portrait.animate(at,level,false,false,designEmotion);
 renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);const png=output.toDataURL('image/png');
 visibility.forEach(([o,v])=>o.visible=v);portrait.g.position.copy(oldPosition);portrait.g.scale.copy(oldScale);portrait.g.rotation.copy(oldRotation);portrait.g.visible=oldVisible;return png;
 },inspect:()=>({...lastPresentation,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures})};
}
