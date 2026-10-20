// Browser-side presentation only. Receives interpolated snapshots, never advances the game.
// Procedural original meshes; no external assets, fetch, clocks or autonomous render loop.
export function bootScene3D(T,width=360,height=640) {
 const rgb=new Uint8Array(width*height*3);
 const renderer=new T.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setSize(width,height);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor('#163940');
 const scene=new T.Scene();scene.background=new T.Color('#163940');scene.fog=new T.Fog('#163940',110,180);
 const camera=new T.PerspectiveCamera(42,width/height,.1,300);camera.position.set(0,29,30);
 scene.add(new T.HemisphereLight('#e5ffff','#37564d',2.3));const sun=new T.DirectionalLight('#ffe6b6',3.1);sun.position.set(-12,24,10);scene.add(sun);
 const fill=new T.DirectionalLight('#86cfff',1.2);fill.position.set(12,8,-8);scene.add(fill);
 const materials=new Map();function mat(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.65,metalness:.03}));return materials.get(color);}
 const sphere=new T.SphereGeometry(1,12,8),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,24),cone=new T.ConeGeometry(1,1,5);
 function mesh(g,color,parent=scene,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(g,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 mesh(box,'#234854',scene,0,-1,0,19,1.5,27);mesh(box,'#4d8b73',scene,0,-.2,0,17.6,.3,25.6);
 mesh(box,'#6fba88',scene,0,0,0,16.6,.15,24.6);
 for(let z=0;z<24;z+=2)mesh(box,'#76c18e',scene,0,.08,z-11,16.2,.02,1);
 for(const x of [-8.5,8.5])mesh(box,'#c1db9a',scene,x,.15,0,.35,.4,25.5);
 for(const z of [-12.5,12.5])mesh(box,'#c1db9a',scene,0,.15,z,17.4,.4,.35);
 const plants=[];
 for(let i=0;i<20;i++){const x=(i%2?1:-1)*(10+(i%3)*.25),z=-13+Math.floor(i/2)*2.8;const g=new T.Group();g.position.set(x,-.4,z);scene.add(g);mesh(cylinder,'#466964',g,0,.3,0,.6,.8,.6);for(let k=0;k<3;k++){const leaf=mesh(sphere,k%2?'#7fceb0':'#46a58a',g,Math.sin(k*2)*.4,1+k*.3,Math.cos(k*2)*.3,.38,1.1,.23);leaf.rotation.z=(k-1)*.45;}plants.push(g);}
 // Batch static garden meshes by geometry/material to bound software-renderer draw calls.
 scene.updateMatrixWorld(true);const batches=new Map();scene.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});
 for(const objects of batches.values()){const inst=new T.InstancedMesh(objects[0].geometry,objects[0].material,objects.length);objects.forEach((o,i)=>{inst.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});scene.add(inst);}
 const rocks=[[-.5,-1.5],[.5,-1.5],[-.5,2.5]].map(([x,z])=>{const r=mesh(new T.DodecahedronGeometry(.65,0),'#708d8d',scene,x,.3,z);r.scale.y=.75;return r;});
 function face(color){const g=new T.Group();const skull=mesh(sphere,color,g,0,0,0,.69,.64,.87);mesh(sphere,'#d5f4b6',g,0,-.19,.49,.57,.35,.54);
  const eyes=[],pupils=[],brows=[];for(const x of [-.38,.38]){const eye=mesh(sphere,'#fffce9',g,x,.39,.49,.29,.34,.25);eyes.push(eye);pupils.push(mesh(sphere,'#15363f',g,x,.4,.7,.14,.19,.08));mesh(sphere,'#ffffff',g,x-.035,.47,.765,.045,.05,.02);brows.push(mesh(sphere,'#294f46',g,x,.75,.4,.31,.055,.08));mesh(sphere,'#e89098',g,x*1.45,-.08,.52,.13,.08,.07);}
  const mouth=mesh(sphere,'#402e40',g,0,-.22,.925,.31,.025,.035);const tongue=mesh(sphere,'#ff8d9d',g,0,-.27,.952,.17,.025,.03);
  for(const x of [-.18,.18])mesh(sphere,'#42705b',g,x,.09,.85,.045,.04,.03);
  const crest=mesh(cone,'#d5f4b6',g,0,.68,-.3,.22,.35,.25);crest.rotation.x=-.3;
  return {g,skull,eyes,pupils,mouth,tongue,animate(at,level,joy,sad,emotion='neutral',gaze=0){brows.forEach((b,i)=>b.rotation.z=(i?1:-1)*(sad?.3:emotion==='fear'?-.3:0));pupils.forEach((p,i)=>p.position.x=(i?.38:-.38)+Math.max(-.08,Math.min(.08,gaze)));const blink=Math.sin(at/1300)>.993?.15:1;for(const eye of eyes)eye.scale.y=.34*blink*(joy?1.12:1);for(const pupil of pupils)pupil.scale.y=(sad?.09:.19)*blink;mouth.scale.y=.025+level*.17+(joy?.045:0);tongue.scale.y=.02+level*.05;skull.scale.y=.64+(joy?Math.sin(at/90)*.025:0);}};
 }
 const snakes=[0,1].map(i=>{const color=i?'#f5af55':'#71dca0',head=face(color);scene.add(head.g);const body=new T.Mesh(new T.BufferGeometry(),mat(color));scene.add(body);const scales=[];for(let k=0;k<96;k++)scales.push(mesh(sphere,i?'#ffe0a1':'#b5f3b7',scene,0,0,0,.15,.035,.2));const shadow=mesh(new T.CircleGeometry(1,20),'#527d67',scene,0,.12,0,.75,.65,1);shadow.rotation.x=-Math.PI/2;return {head,body,scales,shadow};});
 const apples=Array.from({length:3},()=>{const g=new T.Group();scene.add(g);mesh(sphere,'#ff5360',g,-.16,.31,0,.36,.4,.36);mesh(sphere,'#ed3b4c',g,.16,.31,0,.36,.4,.36);mesh(cylinder,'#775541',g,0,.8,0,.04,.25,.04);const leaf=mesh(sphere,'#b9ea65',g,.18,.84,0,.27,.07,.11);leaf.rotation.z=.3;mesh(sphere,'#ffbfad',g,-.26,.49,.26,.08,.14,.025);return g;});
 const particles=Array.from({length:24},(_,i)=>{const p=mesh(new T.OctahedronGeometry(.12),'#fff2aa');p.visible=false;return p;});
 // A close-up of the same host design, on the foreground stage, not another simulation.
 const portrait=face('#71dca0');scene.add(camera);portrait.g.position.set(-1.2,-2.1,-8);portrait.g.scale.setScalar(.5);camera.add(portrait.g);
 const audience=Array.from({length:6},(_,i)=>{const g=new T.Group();camera.add(g);mesh(sphere,i?'#6ba4b7':'#f6ce65',g,0,.4,0,.4,.5,.28);const head=mesh(sphere,'#d8eadc',g,0,1.02,0,.37,.37,.3);for(const x of [-.13,.13])mesh(sphere,'#203d4e',g,x,1.08,.28,.04,.05,.035);const photo=new T.Mesh(new T.PlaneGeometry(.65,.65),new T.MeshBasicMaterial({transparent:true}));photo.position.set(0,1.02,.32);photo.visible=false;g.add(photo);const crown=mesh(cone,'#ffe28a',g,0,1.55,0,.3,.3,.3);crown.visible=i===0;return {g,head,photo,crown,key:null};});
 const output=document.createElement('canvas');output.width=width;output.height=height;document.body.append(output);const ctx=output.getContext('2d',{willReadFrequently:true});
 let musicEnergy=0;let previousAt=null,lastRound=null;let cameraMode='Overview',currentDirection=null;const aim=new T.Vector3(0,0,0);let lastPresentation=null;
 const resources={nativeBase64:typeof rgb.toBase64==='function',renderer:'Three.js / WebGL2',gpu:renderer.getContext().getParameter(renderer.getContext().RENDERER)};
 function label(text,x,y,size=14,color='#effde7',align='left'){ctx.fillStyle=color;ctx.font=`600 ${size}px sans-serif`;ctx.textAlign=align;ctx.fillText(String(text).slice(0,90),x,y);}
 function card(x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();}
 function wrap(text,x,y,maxWidth){let line='',row=0;ctx.font='600 13px sans-serif';for(const word of String(text).split(' ')){if(ctx.measureText(line+word).width>maxWidth&&line){label(line,x,y+row*18,13);line='';row++;if(row>=3)break;}line+=word+' ';}if(row<3)label(line,x,y+row*18,13);}
 async function updatePhotos(top){for(let i=0;i<6;i++){const a=audience[i],v=top[i]?.avatar,key=typeof v==='string'&&v.length<80000&&/^[A-Za-z0-9+/=]+$/.test(v)?v:null;if(key===a.key)continue;a.key=key;a.photo.material.map?.dispose();a.photo.material.map=null;a.photo.visible=false;if(key){const img=new Image();img.src='data:image/png;base64,'+key;try{await img.decode();if(img.width>128||img.height>128)continue;const texture=new T.Texture(img);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;a.photo.material.map=texture;a.photo.material.needsUpdate=true;a.photo.visible=true;}catch{/* generic face remains */}}}}
 async function draw({frame:f,at,presentation,p,visibility=0,paused=false,direction={mode:'Overview',player:0}}){
 const began=performance.now();
  if(!f?.players?.length)throw Error('3D exige Seed Snake');const t=at/1000;await updatePhotos(p?.top||[]);
  const delta=previousAt===null?1:Math.min(.25,Math.max(0,(at-previousAt)/1000));previousAt=at;const host=f.players[direction.player||0]||f.players[0],target=host.target||host.body[0];
  cameraMode=direction.mode;currentDirection=direction;
  const h=host.body[0],overview=direction.mode==='Overview';
  const bodies=f.players.flatMap(p=>p.body).concat(target),xs=bodies.map(p=>p.x),zs=bodies.map(p=>p.y);const goal=new T.Vector3((Math.min(...xs)+Math.max(...xs))/2-7.5,0,(Math.min(...zs)+Math.max(...zs))/2-11.5);
  // Fit protagonist and objective to a bounded vertical safe region; no world geometry is moved.
  const spread=Math.hypot(h.x-target.x,h.y-target.y);
  const distance=overview?39:Math.max(direction.mode==='Close-up'?18:21,Math.min(32,spread*1.8+15));
  const desired=new T.Vector3(goal.x,distance*.78,goal.z+distance*.9);
  const ease=1-Math.exp(-delta*1.5);
  if(lastRound===null){aim.copy(goal);camera.position.copy(desired);}else{aim.lerp(goal,ease);camera.position.lerp(desired,ease);}
  lastRound=f.round;camera.lookAt(aim.x,0,aim.z);
  // Safety framing overrides slow tracking when a round or target changes abruptly.
  const anchors=bodies.map(p=>new T.Vector3(p.x-7.5,1.25,p.y-11.5));
  for(let fit=0;fit<24;fit++){camera.updateMatrixWorld();const safe=anchors.every(v=>{const q=v.clone().project(camera);return q.z>-1&&q.z<1&&Math.abs(q.x)<.76&&q.y>-.25&&q.y<.65;});if(safe)break;camera.position.sub(aim).multiplyScalar(1.06).add(aim);camera.lookAt(aim);}
  const music=presentation?.role==='music',vocal=music&&presentation.vocalActive===true;musicEnergy+=((music?presentation.level||0:0)-musicEnergy)*(1-Math.exp(-delta*7));sun.intensity=3.1+.18*musicEnergy;fill.intensity=1.2+.12*musicEnergy;


  const celebrating=f.phase==='FINISHED';
  for(let i=0;i<2;i++){const s=snakes[i],v=f.players[i];if(!v)continue;const eat=at-v.eatenAt,joy=eat>=0&&eat<600||celebrating&&v.name===f.winner,level=i===0&&(!music||vocal)&&presentation?.role!=='comment'?presentation?.level||0:0;
   const points=v.body.map((b,j)=>new T.Vector3(b.x-7.5,.52+Math.sin(t*4+j*.6)*.035,b.y-11.5));
   const curve=new T.CatmullRomCurve3(points,false,'centripetal');const geometry=new T.TubeGeometry(curve,Math.max(12,Math.min(192,points.length*5)),.32,8,false);s.body.geometry.dispose();s.body.geometry=geometry;
   s.head.g.position.copy(points[0]);s.head.g.position.y+=joy?Math.abs(Math.sin(t*12))*.2:0;s.head.g.rotation.y=Math.PI/2-(v.visualDirection??v.direction)*Math.PI/2;s.head.g.rotation.z=v.alive?Math.sin(t*4)*.035:.3;
   s.head.g.scale.setScalar(1.18);s.head.animate(at,level,joy,!v.alive,direction.player===i?direction.emotion:'neutral',v.target?(v.target.x-v.body[0].x)*.03:0);s.shadow.position.set(points[0].x,.13,points[0].z);
   s.scales.forEach((m,k)=>{m.visible=k<v.body.length;if(m.visible){const pt=points[k];m.position.set(pt.x,pt.y+.31,pt.z);}});
   for(let k=0;k<12;k++){const part=particles[i*12+k],age=at-(v.alive?v.eatenAt:v.hitAt);part.visible=age>=0&&age<700;if(part.visible){const u=age/700,a=k*Math.PI/6;part.position.set(points[0].x+Math.cos(a)*u*1.7,.5+Math.sin(u*Math.PI)*1.6,points[0].z+Math.sin(a)*u*1.7);part.scale.setScalar(1-u);}}
  }
  f.obstacles?.forEach((r,i)=>{if(rocks[i])rocks[i].position.set(r.x-7.5,.3,r.y-11.5);});
  apples.forEach((a,i)=>{a.visible=!!f.food[i];if(a.visible){a.position.set(f.food[i].x-7.5,.1+Math.sin(t*2+i)*.06,f.food[i].y-11.5);a.rotation.y=Math.sin(t+i)*.12;a.scale.setScalar(f.food[i].golden?1.25:1);a.children[0].material=mat(f.food[i].golden?'#ffda58':'#ff5360');a.children[1].material=mat(f.food[i].golden?'#e8a92e':'#ed3b4c');}});
  plants.forEach((g,i)=>g.rotation.z=Math.sin(t*.7+i)*.025);
  const voice=presentation?.role&&presentation.role!=='comment'?presentation:null,chant=voice?.role==='chant'||music;portrait.g.visible=!!voice||!!direction.cue;portrait.animate(at,music&&!vocal?0:voice?.level||0,chant||direction.emotion==='joy',direction.emotion==='sad',direction.emotion,(h.x-7.5)*.015);portrait.g.rotation.y=(h.x-7.5)*.035;portrait.g.rotation.z=chant?Math.sin((voice.elapsedMs||0)/210)*(music?.08*musicEnergy:.07):Math.sin(t*2)*.025;portrait.g.position.y=-2.1+(music?Math.sin((voice.elapsedMs||0)/210)*.08*musicEnergy:voice?Math.sin(t*5)*.05:0);
  audience.forEach((a,i)=>{const person=p?.top?.[i];a.g.visible=!!person&&visibility>0;if(!a.g.visible)return;const side=i%2?1:-1;a.g.position.set(-1.45+i*.58,1.7+Math.sin(t*4+i)*.035,-9);a.g.scale.setScalar(visibility*(i===0?.46:.35));a.g.rotation.y=side*-.12;a.crown.visible=i===0;});
  const staged=performance.now();renderer.render(scene,camera);const rendered=performance.now();ctx.drawImage(renderer.domElement,0,0);const captured=performance.now();ctx.save();ctx.scale(width/360,height/640);
  card(16,16,310,47,'#123740e0');label(`SEED SNAKE • R${f.round}`,28,35,12,'#b8e7b6');
  label(`${f.players[0].name.slice(0,12)} ${f.players[0].score}  ×  ${f.players[1].score} ${f.players[1].name.slice(0,12)}`,28,54,14);
  if(celebrating){card(70,115,220,68,'#fff0cbea');label(f.winner==='Empate'?'Empate!':`${f.winner} venceu!`,180,144,20,'#224443','center');label('Próxima colheita em instantes',180,167,12,'#456459','center');}
  if(presentation?.text){card(99,475,228,82,'#123740ed');label(voice?'LUME • '+(music?(vocal?'FAIXA VOCAL':'INSTRUMENTAL'):chant?'NO RITMO':'FALANDO'):'COMENTÁRIO • SIMULADO',111,492,10,'#c8edb2');wrap(presentation.text,111,512,203);}
  if(p?.top?.length){const expanded=visibility>0;card(16,expanded?565:590,310,expanded?48:25,'#123740e0');label(expanded?'TOP 6 • QUANTIDADE SIMULADA':`LÍDER DEMO • ${p.top[0].name.slice(0,20)}`,28,expanded?580:607,11,'#ffdc81');if(expanded)(p.top||[]).forEach((person,i)=>label(`${i+1} ${person.name.slice(0,5)}`,28+i*49,601,10,i?'#dcf0ed':'#ffdc81'));}
  label(paused?'PAUSADO':'PERSONAGENS VIRTUAIS • INTERAÇÕES SIMULADAS',180,631,9,'#102d35','center');ctx.restore();
  lastPresentation={anchors:anchors.map(v=>v.clone().project(camera).toArray()),cameraMode,cue:currentDirection?.cue?.kind||null,focus:aim.toArray(),mouth:music&&!vocal?0:voice?.level||0,round:f.round,camera:camera.position.toArray(),bodyLengths:f.players.map(v=>v.body.length),avatarCount:(p?.top||[]).filter((_,i)=>audience[i].g.visible).length};
  const overlaid=performance.now(),data=ctx.getImageData(0,0,width,height).data,readback=performance.now();for(let i=0,j=0;i<data.length;i+=4){rgb[j++]=data[i];rgb[j++]=data[i+1];rgb[j++]=data[i+2];}
  const converted=performance.now();let pixels;if(typeof rgb.toBase64==='function'){pixels=rgb.toBase64();}else{let binary='';for(let i=0;i<rgb.length;i+=32768)binary+=String.fromCharCode(...rgb.subarray(i,i+32768));pixels=btoa(binary);}return {pixels,timings:{sceneMs:staged-began,threeSubmitMs:rendered-staged,captureMs:captured-rendered,overlayMs:overlaid-captured,readbackMs:readback-overlaid,pixelConversionMs:converted-readback,serializationMs:performance.now()-converted}};
 }
 return {draw,resources,inspect:()=>({...lastPresentation,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures})};
}
