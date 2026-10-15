// Browser-side presentation only. Receives interpolated snapshots, never advances the game.
// Procedural original meshes; no external assets, fetch, clocks or autonomous render loop.
export function bootScene3D(T,width=360,height=640) {
 const renderer=new T.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setSize(width,height);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor('#163940');
 const scene=new T.Scene();scene.background=new T.Color('#163940');scene.fog=new T.Fog('#163940',48,80);
 const camera=new T.PerspectiveCamera(42,width/height,.1,100);camera.position.set(0,29,30);
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
  const eyes=[],pupils=[];for(const x of [-.38,.38]){const eye=mesh(sphere,'#fffce9',g,x,.39,.49,.29,.34,.25);eyes.push(eye);pupils.push(mesh(sphere,'#15363f',g,x,.4,.7,.14,.19,.08));mesh(sphere,'#ffffff',g,x-.035,.47,.765,.045,.05,.02);mesh(sphere,'#294f46',g,x,.75,.4,.31,.055,.08);mesh(sphere,'#e89098',g,x*1.45,-.08,.52,.13,.08,.07);}
  const mouth=mesh(sphere,'#402e40',g,0,-.22,.925,.31,.025,.035);const tongue=mesh(sphere,'#ff8d9d',g,0,-.27,.952,.17,.025,.03);
  for(const x of [-.18,.18])mesh(sphere,'#42705b',g,x,.09,.85,.045,.04,.03);
  const crest=mesh(cone,'#d5f4b6',g,0,.68,-.3,.22,.35,.25);crest.rotation.x=-.3;
  return {g,skull,eyes,pupils,mouth,tongue,animate(at,level,joy,sad){const blink=Math.sin(at/1300)>.993?.15:1;for(const eye of eyes)eye.scale.y=.34*blink*(joy?1.12:1);for(const pupil of pupils)pupil.scale.y=(sad?.09:.19)*blink;mouth.scale.y=.025+level*.17+(joy?.045:0);tongue.scale.y=.02+level*.05;skull.scale.y=.64+(joy?Math.sin(at/90)*.025:0);}};
 }
 const snakes=[0,1].map(i=>{const color=i?'#f5af55':'#71dca0',head=face(color);scene.add(head.g);const body=new T.Mesh(new T.BufferGeometry(),mat(color));scene.add(body);const scales=[];for(let k=0;k<96;k++)scales.push(mesh(sphere,i?'#ffe0a1':'#b5f3b7',scene,0,0,0,.15,.035,.2));const shadow=mesh(new T.CircleGeometry(1,20),'#527d67',scene,0,.12,0,.75,.65,1);shadow.rotation.x=-Math.PI/2;return {head,body,scales,shadow};});
 const apples=Array.from({length:3},()=>{const g=new T.Group();scene.add(g);mesh(sphere,'#ff5360',g,-.16,.31,0,.36,.4,.36);mesh(sphere,'#ed3b4c',g,.16,.31,0,.36,.4,.36);mesh(cylinder,'#775541',g,0,.8,0,.04,.25,.04);const leaf=mesh(sphere,'#b9ea65',g,.18,.84,0,.27,.07,.11);leaf.rotation.z=.3;mesh(sphere,'#ffbfad',g,-.26,.49,.26,.08,.14,.025);return g;});
 const particles=Array.from({length:24},(_,i)=>{const p=mesh(new T.OctahedronGeometry(.12),'#fff2aa');p.visible=false;return p;});
 // A close-up of the same host design, on the foreground stage, not another simulation.
 const portrait=face('#71dca0');portrait.g.position.set(-4.9,2.1,14.5);portrait.g.scale.setScalar(2.2);scene.add(portrait.g);mesh(cylinder,'#245869',scene,-4.9,-.05,14.5,2,.4,2);
 const audience=Array.from({length:6},(_,i)=>{const g=new T.Group();scene.add(g);mesh(sphere,i?'#6ba4b7':'#f6ce65',g,0,.4,0,.4,.5,.28);const head=mesh(sphere,'#d8eadc',g,0,1.02,0,.37,.37,.3);for(const x of [-.13,.13])mesh(sphere,'#203d4e',g,x,1.08,.28,.04,.05,.035);const photo=new T.Mesh(new T.PlaneGeometry(.65,.65),new T.MeshBasicMaterial({transparent:true}));photo.position.set(0,1.02,.32);photo.visible=false;g.add(photo);const crown=mesh(cone,'#ffe28a',g,0,1.55,0,.3,.3,.3);crown.visible=i===0;return {g,head,photo,crown,key:null};});
 const output=document.createElement('canvas');output.width=width;output.height=height;document.body.append(output);const ctx=output.getContext('2d',{willReadFrequently:true});
 let previousAt=null,lastRound=null;const aim=new T.Vector3(0,0,0);let lastPresentation=null;
 const resources={renderer:'Three.js / WebGL2',gpu:renderer.getContext().getParameter(renderer.getContext().RENDERER)};
 function label(text,x,y,size=14,color='#effde7',align='left'){ctx.fillStyle=color;ctx.font=`600 ${size}px sans-serif`;ctx.textAlign=align;ctx.fillText(String(text).slice(0,90),x,y);}
 function card(x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();}
 function wrap(text,x,y,maxWidth){let line='',row=0;ctx.font='600 13px sans-serif';for(const word of String(text).split(' ')){if(ctx.measureText(line+word).width>maxWidth&&line){label(line,x,y+row*18,13);line='';row++;if(row>=3)break;}line+=word+' ';}if(row<3)label(line,x,y+row*18,13);}
 async function updatePhotos(top){for(let i=0;i<6;i++){const a=audience[i],v=top[i]?.avatar,key=typeof v==='string'&&v.length<80000&&/^[A-Za-z0-9+/=]+$/.test(v)?v:null;if(key===a.key)continue;a.key=key;a.photo.material.map?.dispose();a.photo.material.map=null;a.photo.visible=false;if(key){const img=new Image();img.src='data:image/png;base64,'+key;try{await img.decode();if(img.width>128||img.height>128)continue;const texture=new T.Texture(img);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;a.photo.material.map=texture;a.photo.material.needsUpdate=true;a.photo.visible=true;}catch{/* generic face remains */}}}}
 async function draw({frame:f,at,presentation,p,visibility=0,paused=false}){
  if(!f?.players?.length)throw Error('3D exige Seed Snake');const t=at/1000;await updatePhotos(p?.top||[]);
  const delta=previousAt===null?1:Math.min(.1,Math.max(0,(at-previousAt)/1000));previousAt=at;const host=f.players[0],target=host.target||host.body[0];
  // Broad framing always includes the arena. Gentle movement follows player + objective.
  const goal=new T.Vector3((host.body[0].x+target.x-15)*.09,0,(host.body[0].y+target.y-23)*.07);
  if(lastRound!==f.round){aim.copy(goal);lastRound=f.round;}else aim.lerp(goal,1-Math.exp(-delta*1.8));
  const celebrating=f.phase==='FINISHED';camera.position.set(aim.x+Math.sin(t*.18)*.8,34+(celebrating?-1:0),38+aim.z*.3);camera.lookAt(aim.x,0,aim.z+4.5);
  for(let i=0;i<2;i++){const s=snakes[i],v=f.players[i];if(!v)continue;const eat=at-v.eatenAt,joy=eat>=0&&eat<600||celebrating&&v.name===f.winner,level=i===0&&presentation?.role!=='comment'?presentation?.level||0:0;
   const points=v.body.map((b,j)=>new T.Vector3(b.x-7.5,.52+Math.sin(t*4+j*.6)*.035,b.y-11.5));
   const curve=new T.CatmullRomCurve3(points,false,'centripetal');const geometry=new T.TubeGeometry(curve,Math.max(12,Math.min(192,points.length*5)),.32,8,false);s.body.geometry.dispose();s.body.geometry=geometry;
   s.head.g.position.copy(points[0]);s.head.g.position.y+=joy?Math.abs(Math.sin(t*12))*.2:0;s.head.g.rotation.y=Math.PI/2-(v.visualDirection??v.direction)*Math.PI/2;s.head.g.rotation.z=v.alive?Math.sin(t*4)*.035:.3;
   s.head.animate(at,level,joy,!v.alive);s.shadow.position.set(points[0].x,.13,points[0].z);
   s.scales.forEach((m,k)=>{m.visible=k<v.body.length;if(m.visible){const pt=points[k];m.position.set(pt.x,pt.y+.31,pt.z);}});
   for(let k=0;k<12;k++){const part=particles[i*12+k],age=at-(v.alive?v.eatenAt:v.hitAt);part.visible=age>=0&&age<700;if(part.visible){const u=age/700,a=k*Math.PI/6;part.position.set(points[0].x+Math.cos(a)*u*1.7,.5+Math.sin(u*Math.PI)*1.6,points[0].z+Math.sin(a)*u*1.7);part.scale.setScalar(1-u);}}
  }
  f.obstacles?.forEach((r,i)=>{if(rocks[i])rocks[i].position.set(r.x-7.5,.3,r.y-11.5);});
  apples.forEach((a,i)=>{a.visible=!!f.food[i];if(a.visible){a.position.set(f.food[i].x-7.5,.1+Math.sin(t*2+i)*.06,f.food[i].y-11.5);a.rotation.y=Math.sin(t+i)*.12;}});
  plants.forEach((g,i)=>g.rotation.z=Math.sin(t*.7+i)*.025);
  const voice=presentation?.role!=='comment'?presentation:null,chant=voice?.role==='chant';portrait.animate(at,voice?.level||0,chant||celebrating,false);portrait.g.rotation.y=.15+Math.sin(t*.7)*.12;portrait.g.rotation.z=chant?Math.sin((voice.elapsedMs||0)/140)*.09:Math.sin(t*2)*.025;portrait.g.position.y=2.1+(voice?Math.sin(t*5)*.1:Math.sin(t*1.5)*.06);
  audience.forEach((a,i)=>{const person=p?.top?.[i];a.g.visible=!!person&&visibility>0;if(!a.g.visible)return;const side=i%2?1:-1;a.g.position.set(side*9.9,.8+Math.sin(t*4+i)*.12,-7+Math.floor(i/2)*6);a.g.scale.setScalar(visibility*(i===0?1.25:1));a.g.rotation.y=side*-.35;a.crown.visible=i===0;});
  renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);ctx.save();ctx.scale(width/360,height/640);
  card(16,16,328,63,'#123740ed');label('SEED SNAKE',30,38,13,'#b8e7b6');label('O jardim ganhou vida',30,62,19);label(`R${f.round}`,326,42,13,'#f7da8b','right');
  label(`${f.players[0].name.slice(0,14)}  ${f.players[0].score}`,24,100,14,'#a2efbe');label(`${f.players[1].score}  ${f.players[1].name.slice(0,14)}`,336,100,14,'#ffd28a','right');
  if(celebrating){card(70,220,220,68,'#fff0cbea');label(f.winner==='Empate'?'Empate!':`${f.winner} venceu!`,180,249,20,'#224443','center');label('Próxima colheita em instantes',180,272,12,'#456459','center');}
  card(121,479,222,81,'#123740ed');label(voice?'LUME • '+(chant?'NO RITMO':'FALANDO'):presentation?'COMENTÁRIO • SIMULADO':'LUME • APRESENTADOR',134,496,10,'#c8edb2');wrap(presentation?.text||'Maçãs à vista. A próxima curva é minha!',134,515,195);
  card(16,568,328,47,'#123740ed');label(p?.top?.length?'TOP 6 • QUANTIDADE SIMULADA':'COMUNIDADE • SEM EVENTOS',28,584,10,'#c8edb2');
  (p?.top||[]).forEach((person,i)=>label(`${i+1} ${person.name.slice(0,5)}`,28+i*51,604,10,i?'#dcf0ed':'#ffdc81'));
  label(paused?'PAUSADO':'PERSONAGENS VIRTUAIS • INTERAÇÕES SIMULADAS',180,631,9,'#a2c8c1','center');ctx.restore();
  lastPresentation={mouth:voice?.level||0,round:f.round,camera:camera.position.toArray(),bodyLengths:f.players.map(v=>v.body.length),avatarCount:(p?.top||[]).filter((_,i)=>audience[i].g.visible).length};
  const data=ctx.getImageData(0,0,width,height).data,rgb=new Uint8Array(width*height*3);for(let i=0,j=0;i<data.length;i+=4){rgb[j++]=data[i];rgb[j++]=data[i+1];rgb[j++]=data[i+2];}
  let binary='';for(let i=0;i<rgb.length;i+=32768)binary+=String.fromCharCode(...rgb.subarray(i,i+32768));return btoa(binary);
 }
 return {draw,resources,inspect:()=>({...lastPresentation,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures})};
}
