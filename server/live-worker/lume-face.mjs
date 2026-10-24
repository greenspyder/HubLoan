// Original parametric character asset. Shared by arena and presenter; no game state.
// Self-contained because the existing isolated WebGL worker serializes this factory.
export function createLumeFace(T, color, design='jade') {
 const styles={jade:{width:.72,height:.65,muzzle:.59,depth:.79,eye:.245,spread:.38},pearl:{width:.84,height:.61,muzzle:.73,depth:.63,eye:.27,spread:.49},ember:{width:.65,height:.79,muzzle:.47,depth:.88,eye:.27,spread:.36}};
 const s=styles[design]||styles.jade,g=new T.Group();
 const ball=new T.SphereGeometry(1,24,16),materials=new Map();
 function part(c,parent,x,y,z,sx,sy,sz){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.36,metalness:.02}));const m=new T.Mesh(ball,materials.get(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 const skull=part(color,g,0,.08,-.12,s.width,s.height,s.depth);
 // Deform a private skull mesh into a swept neck and broader brow, not stacked spheres.
 const skullGeometry=ball.clone(),pos=skullGeometry.attributes.position;
 for(let i=0;i<pos.count;i++){const z=pos.getZ(i),y=pos.getY(i);pos.setX(i,pos.getX(i)*(1+.10*z-.12*Math.max(0,-z)));pos.setY(i,y*(1-.12*Math.max(0,z)));}
 skullGeometry.computeVertexNormals();skull.geometry=skullGeometry;
 // Broad snout, cheek volumes and recessed eye surrounds form a continuous silhouette.
 const muzzle=part(color,g,0,-.08,.44,s.muzzle,.32,.58);
 part('#cef0bd',g,0,-.25,.42,s.muzzle*.91,.17,.51);
 const jaw=new T.Group();jaw.position.set(0,-.24,.08);g.add(jaw);
 const mouth=part('#382b3c',g,0,-.27,.65,s.muzzle*.75,.08,.30);
 part('#c6e9ad',jaw,0,-.12,.43,s.muzzle*.91,.14,.48);
 const tongue=part('#e584a2',jaw,0,.015,.67,.18,.035,.17);
 const eyes=[],pupils=[],lids=[],brows=[];
 for(const sign of [-1,1]){
  part(color,g,sign*s.spread,.29,.22,s.eye*1.32,s.eye*1.25,.30);
  const socket=new T.Group();socket.position.set(sign*s.spread,.29,.40);socket.rotation.z=sign*-.12;g.add(socket);
  const eye=part('#fff5dc',socket,0,0,0,s.eye,s.eye*1.02,.16);eyes.push(eye);
  const iris=part('#52a9a0',socket,0,-.01,.17,s.eye*.59,s.eye*.69,.055);
  const pupil=part('#172d3b',iris,0,0,.87,.5,.74,.5);pupils.push(iris);
  part('#ffffff',iris,-.23,.28,1.30,.18,.18,.10);
  const lid=part(color,socket,0,.18,.035,s.eye*1.05,.065,.18);lids.push(lid);
  const brow=part('#317a64',socket,0,.28,.015,s.eye*.95,.065,.11);brows.push(brow);
  part(color,g,sign*s.muzzle*.72,-.12,.42,.24,.23,.32);
  
  part('#416a56',g,sign*.21,.035,.955,.022,.012,.012);
 }
 // A swept crown scale gives each silhouette a recognizable profile without hair/eyelashes.
 const crest=part('#a7dfb1',g,0,s.height*.86,-.32,design==='pearl'?.36:.18,.24,design==='ember'?.57:.35);crest.rotation.x=-.45;
 let last=null,open=0,expression='neutral';const pose=[0,0,0];
 const states={suspicious:[-.14,.19,.035],determined:[-.16,-.23,.02],proud:[.10,-.16,.08],confused:[-.05,.24,.07],frustrated:[-.18,-.20,.04],neutral:[0,0,0],happy:[.14,-.10,.12],joy:[.14,-.10,.12],surprise:[.28,.20,.30],irritated:[-.18,-.28,.04],confident:[-.08,-.10,.04],teasing:[-.12,.16,.09],sad:[-.09,.25,.04],celebrating:[.22,-.12,.22],fear:[.20,.28,.22],focused:[-.12,-.16,0],laughing:[.10,-.18,.32]};
 return {g,skull,eyes,pupils,mouth,tongue,jaw,design,animate(at,level,joy,sad,emotion='neutral',gaze=0){
  const dt=last===null?.1:Math.max(0,Math.min(.2,(at-last)/1000));last=at;const ease=1-Math.exp(-dt*14);
  expression=sad?'sad':joy&&emotion==='neutral'?'happy':states[emotion]?emotion:'neutral';pose.forEach((v,i)=>pose[i]+=(states[expression][i]-v)*(1-Math.exp(-dt*6)));const [lift,browAngle,rest]=pose;
  open+=((Math.max(0,Math.min(1,level))*.55+rest)-open)*ease;
  jaw.rotation.x=open*.8;jaw.position.y=-.24-open*.025;mouth.scale.y=.08+open*.24;
  const phase=((at+237)%4300)/4300,blink=phase>.955?Math.sin((phase-.955)/.045*Math.PI):0;
  lids.forEach((l,i)=>{l.position.y=.18-blink*.24+lift*.15;l.scale.y=.065+blink*.20;eyes[i].scale.y=s.eye*1.12*(1-blink*.80);brows[i].rotation.z=(i?1:-1)*browAngle+(expression==='teasing'||expression==='confused'?(i?.12:-.08):0);brows[i].position.y=.28+lift*.35;pupils[i].position.x=Math.max(-.055,Math.min(.055,gaze));pupils[i].scale.y=s.eye*.69*(1-blink*.80);});
  tongue.scale.z=.17+(expression==='teasing'||expression==='focused'?Math.max(0,Math.sin(at/700))*.08:0);tongue.position.z=.67+open*.12;
  muzzle.position.y=-.08+Math.sin(at/900)*.009+open*.025;
 },inspect(){return {design,expression,jawOpen:open,lipSync:'audio-envelope',geometryCount:1};}};
}
