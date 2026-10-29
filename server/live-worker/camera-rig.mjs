// Presentation only, serialized into the existing isolated renderer.
export function createCameraRig(T,camera){
 const aim=new T.Vector3(),heading=new T.Vector3(1,0,0),desired=new T.Vector3(),goal=new T.Vector3();
 let lastRefined=null,refinedAt=null;let occlusionSide=1;let initialized=false,lastRound=null,lastPlayer=null,previousAt=null,lastCut=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 return {update(f,d,at){
  const dt=previousAt===null?0:clamp((at-previousAt)/1000,0,.25);previousAt=at;
  const index=f.players[d.player]?.body?.length?d.player:f.players.findIndex(p=>p.alive&&p.body.length);
  const p=f.players[index]||f.players[0],h=p.body[0],target=p.target||h;
  let mode=d.shot||'Tactical',fallback=null;
  if(index!==d.player){mode='Tactical';fallback='TARGET_LOST';}
  const reset=d.cutId!==lastCut||!initialized||lastRound!==f.round||lastPlayer!==p.id;
  const yaw=(p.visualDirection??p.direction??0)*Math.PI/2,forward=new T.Vector3(Math.cos(yaw),0,Math.sin(yaw));
  if(reset)heading.copy(forward);else{heading.lerp(forward,1-Math.exp(-dt*5));if(heading.lengthSq()<.01)heading.copy(forward);heading.normalize();}
  const head=new T.Vector3(h.x-7.5,.7,h.y-11.5),objective=new T.Vector3(target.x-7.5,.5,target.y-11.5);
  const localGoal=objective.clone().sub(head).clampLength(0,3.2).add(head),side=new T.Vector3(-heading.z,0,heading.x);
  if(mode==='Tactical'){goal.set(0,-2.4,0);desired.set(0,25,24);}
  else if(mode==='Front'){goal.copy(head).addScaledVector(heading,-.3);goal.y=1;desired.copy(head).addScaledVector(heading,7.5).addScaledVector(side,1.4);desired.y=3.6;}
  else if(mode==='Action'){goal.copy(head).lerp(localGoal,.3);goal.y=.6;desired.copy(head).addScaledVector(side,9).addScaledVector(heading,2);desired.y=7.5;}
  else{goal.copy(head).lerp(localGoal,.25).addScaledVector(heading,1.4);goal.y=.4;desired.copy(head).addScaledVector(heading,-9).addScaledVector(side,1.5);desired.y=8;}
  // Conservative line-of-sight probes against bodies, independent of game physics.
  // The attached neck is excluded; it must not be mistaken for an obstruction.
  const blockers=f.players.flatMap((snake,i)=>snake.body.slice(i===index?3:0).map(b=>new T.Vector3(b.x-7.5,.65,b.y-11.5)));
  const faceTarget=head.clone();faceTarget.y=.85;
  const blocked=position=>{const ray=position.clone().sub(faceTarget),length=ray.lengthSq();return blockers.some(b=>{const u=b.clone().sub(faceTarget).dot(ray)/Math.max(.001,length);return u>.05&&u<.96&&b.distanceTo(faceTarget.clone().addScaledVector(ray,u))<.9;});};
  let occlusionCorrected=false;
  if(mode!=='Tactical'&&blocked(desired)){
   const original=desired.clone();
   for(const offset of [occlusionSide*3,-occlusionSide*3,occlusionSide*5]){
    desired.copy(original).addScaledVector(side,offset);desired.y+=2;
    if(!blocked(desired)){occlusionSide=Math.sign(offset);occlusionCorrected=true;break;}
   }
   if(blocked(desired)){desired.copy(head).addScaledVector(side,7);desired.y=11;occlusionCorrected=true;}
  }
  desired.y=Math.max(3.2,desired.y);
  for(const rock of f.obstacles||[]){const r=new T.Vector3(rock.x-7.5,.4,rock.y-11.5);if(r.distanceTo(desired)<2)desired.y=Math.max(desired.y,4.5);}
  const ease=1-Math.exp(-dt*4);
  if(reset){camera.position.copy(desired);aim.copy(goal);}else{camera.position.lerp(desired,ease);aim.lerp(goal,ease);}
  if(mode!=='Tactical')aim.lerp(head,1-Math.exp(-dt*8));
  if(mode!=='Tactical'&&blocked(camera.position)){camera.position.y=Math.max(camera.position.y,desired.y+1);occlusionCorrected=true;}
  // Front shots must not orbit behind a turning face. Correct only the heading component;
  // existing easing remains responsible for ordinary movement.
  if(mode==='Front'){
   const relative=camera.position.clone().sub(head),ahead=relative.dot(forward);
   if(ahead<2.5){camera.position.addScaledVector(forward,Math.min(2,2.5-ahead));occlusionCorrected=true;}
  }
  camera.lookAt(aim);camera.updateMatrixWorld();
  const anchors=mode==='Tactical'?f.players.flatMap(p=>p.body).concat(f.food||[]).map(v=>new T.Vector3(v.x-7.5,1.3,v.y-11.5)):[head.clone().add(new T.Vector3(0,1.3,0)),head.clone().add(new T.Vector3(0,-.6,0))];
  // A conservative face envelope includes width and snout, not only the head centre.
  const faceBounds=[];for(const x of [-1.1,1.1])for(const y of [-.55,1.65])for(const z of [-1.1,1.1])faceBounds.push(head.clone().add(new T.Vector3(x,y,z)));
  if(mode!=='Tactical')anchors.push(...faceBounds);
  if(mode==='Follow')anchors.push(localGoal);
  const corners=[[-8.7,-12.7],[8.7,-12.7],[-8.7,12.7],[8.7,12.7]].map(([x,z])=>new T.Vector3(x,0,z));
  const safe=mode==='Tactical'?anchors.concat(corners):anchors;let fit=0;
  for(;fit<24;fit++){camera.updateMatrixWorld();if(safe.every(v=>{const q=v.clone().project(camera);return q.z>-1&&q.z<1&&Math.abs(q.x)<(mode==='Tactical'?.90:.8)&&q.y>(mode==='Tactical'?-.55:-.42)&&q.y<.64;}))break;camera.position.sub(aim).multiplyScalar(1.08).add(aim);camera.lookAt(aim);}
  if(fit===24){mode='Tactical';fallback='UNSAFE_FRAMING';camera.position.set(0,42,40);aim.set(0,0,0);camera.lookAt(aim);}
  // Recheck after heading correction and zoom fitting, which can change the sight line.
  if(mode!=='Tactical')for(let repair=0;repair<4&&blocked(camera.position);repair++){camera.position.y+=1;camera.lookAt(aim);occlusionCorrected=true;}
  camera.updateMatrixWorld();initialized=true;lastCut=d.cutId;lastRound=f.round;lastPlayer=p.id;
  const projected=faceBounds.map(v=>v.clone().project(camera));
  const bounds={left:Math.min(...projected.map(v=>v.x)),right:Math.max(...projected.map(v=>v.x)),bottom:Math.min(...projected.map(v=>v.y)),top:Math.max(...projected.map(v=>v.y))};
  const issues=[];if(projected.some(v=>v.z<=-1||v.z>=1)||bounds.left<-.98||bounds.right>.98||bounds.top>.95||bounds.bottom<-.95)issues.push('FACE_CROPPED');
  if(mode!=='Tactical'&&bounds.top-bounds.bottom<.14)issues.push('SUBJECT_SMALL');
  if(mode!=='Tactical'&&blocked(camera.position))issues.push('POSSIBLE_BODY_OCCLUSION');
  if(bounds.bottom<-.42&&mode!=='Tactical')issues.push('CAPTION_SAFE_AREA');
  return {quality:{method:'conservative-projected-envelope-and-body-probes',bounds,issues,fitSteps:fit,corrected:fit>0||occlusionCorrected},shot:mode,occlusionCorrected,fallback,player:index,focus:aim.toArray(),camera:camera.position.toArray(),anchors:anchors.map(v=>v.clone().project(camera).toArray()),arenaCorners:corners.map(v=>v.clone().project(camera).toArray()),head:head.clone().project(camera).toArray(),cut:reset};
 },refine(f,d,actors,framing,at,scenery=[]){
  const subject=actors[framing.player];if(!subject)return framing;
  const head=subject.head.g,center=head.getWorldPosition(new T.Vector3()),corners=[];
  head.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new T.Vector3(x,y,z).applyMatrix4(o.matrixWorld));});
  const blockers=actors.flatMap((a,i)=>[a.body,...(i===framing.player?[]:[a.head.g])]).concat(scenery).filter(a=>a.visible);
  // Actual eye / muzzle heights in createLumeFace, not points above the skull.
  const targets=[];for(const x of [-.32,0,.32])for(const y of [-.22,.1,.38])targets.push(head.localToWorld(new T.Vector3(x,y,.7)));
  const eventHeads=d.format==='battle'?actors.filter((a,i)=>i!==framing.player&&a.head.g.visible&&a.head.g.position.distanceTo(center)<3.5).map(a=>a.head.g.getWorldPosition(new T.Vector3())):[];
  const forward=new T.Vector3(0,0,1).transformDirection(head.matrixWorld),ray=new T.Raycaster();
  const inspect=()=>{
   camera.updateMatrixWorld();const q=corners.map(v=>v.clone().project(camera));
   const bounds={left:Math.min(...q.map(v=>v.x)),right:Math.max(...q.map(v=>v.x)),bottom:Math.min(...q.map(v=>v.y)),top:Math.max(...q.map(v=>v.y))};
   let blocked=0;for(const v of targets){const delta=v.clone().sub(camera.position);ray.set(camera.position,delta.clone().normalize());ray.near=0;ray.far=delta.length()-.06;if(ray.intersectObjects(blockers,true).length)blocked++;}
   const issues=[];
   if(q.some(v=>v.z<=-1||v.z>=1)||bounds.left<-.95||bounds.right>.95||bounds.top>.68||bounds.bottom<-.9)issues.push('MESH_FACE_CROPPED');
   if(bounds.bottom<-.48)issues.push('CAPTION_SAFE_AREA');
   if(bounds.top-bounds.bottom<.19)issues.push('SUBJECT_SMALL');
   if(blocked>2)issues.push('MESH_FACE_OCCLUSION');
   const facing=camera.position.clone().sub(center).normalize().dot(forward);
   if(facing<.25)issues.push('FACE_NOT_FRONTAL');
   if(eventHeads.some(v=>{const p=v.clone().project(camera);return p.z<=-1||p.z>=1||Math.abs(p.x)>.92||p.y<-.5||p.y>.68;}))issues.push('NEARBY_CONFRONTATION_OUT_OF_FRAME');
   return {bounds,issues,blocked,facing};
  };
  const initial=camera.position.clone(),initialQuaternion=camera.quaternion.clone(),focus=center.clone().add(new T.Vector3(0,.55,0));
  // Offline preflight exposes real, inspected viewpoints. A later pass chooses
  // a continuous path across the whole scene; live rendering never uses this.
  if(d.format==='battle'&&(d.collectCameraViews||d.cameraPlan)){
   const views=[];
   if(d.collectCameraViews){
    for(const radius of [8,11])for(const angle of [-1.2,-.8,-.4,0,.4,.8,1.2])for(const height of [2.5,4,6,9,12]){
     camera.position.copy(center).add(forward.clone().applyAxisAngle(new T.Vector3(0,1,0),angle).multiplyScalar(radius));camera.position.y=center.y+height;camera.lookAt(focus);
     let r=inspect();for(let fit=0;fit<12&&r.issues.some(x=>['MESH_FACE_CROPPED','CAPTION_SAFE_AREA','NEARBY_CONFRONTATION_OUT_OF_FRAME'].includes(x));fit++){camera.position.sub(focus).multiplyScalar(1.08).add(focus);camera.lookAt(focus);r=inspect();}
     if(!r.issues.length)views.push({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),facing:r.facing,blocked:r.blocked,height:r.bounds.top-r.bounds.bottom,frontWeight:d.shot==='Front'?20:8,targetHeight:d.shot==='Front'?.55:.4});
    }
    if(views.length){camera.position.fromArray(views[0].position);camera.quaternion.fromArray(views[0].quaternion);}
   }else{
    if(d.cameraPlan.position?.length!==3||d.cameraPlan.quaternion?.length!==4||![...d.cameraPlan.position,...d.cameraPlan.quaternion].every(Number.isFinite))throw Error('Plano de câmera inválido');
    camera.position.fromArray(d.cameraPlan.position);camera.quaternion.fromArray(d.cameraPlan.quaternion);
   }
   const result=inspect(),jump=lastRefined?lastRefined.distanceTo(camera.position):0;
   if(!framing.cut&&refinedAt!==null&&at-refinedAt<250&&jump>3)result.issues.push('ABRUPT_CAMERA_MOVE');
   lastRefined=camera.position.clone();refinedAt=at;
   return {...framing,camera:camera.position.toArray(),focus:focus.toArray(),head:center.clone().project(camera).toArray(),...(d.collectCameraViews?{candidateViews:views}:{}),quality:{method:'rendered-mesh-bounds-and-nine-face-rays',bounds:result.bounds,issues:result.issues,blockedFaceRays:result.blocked,sampledFaceRays:9,nearbyEventHeads:eventHeads.length,corrected:true,cameraJump:jump,planned:!d.collectCameraViews}};
  }
  const score=r=>r.issues.length*(d.format==='battle'?10000:100)+r.blocked*(d.format==='battle'?100:12)+(1-r.facing)*(d.format==='battle'?150:10)+(lastRefined&&!framing.cut?r.position.distanceTo(lastRefined)*4:0);
  let best={position:initial.clone(),quaternion:initialQuaternion,...inspect()};
  if(lastRefined&&!framing.cut){camera.position.copy(lastRefined);camera.lookAt(focus);const held={position:camera.position.clone(),quaternion:camera.quaternion.clone(),...inspect()};if(score(held)<score(best))best=held;}
  if(best.issues.length||d.shot==='Front'||d.format==='battle'){
   for(const angle of [0,.4,-.4,.85,-.85,1.3,-1.3])for(const height of [2.2,4,7,11,15]){
    camera.position.copy(center).add(forward.clone().applyAxisAngle(new T.Vector3(0,1,0),angle).multiplyScalar(8));camera.position.y=center.y+height;camera.lookAt(focus);
    let r=inspect();for(let fit=0;fit<12&&r.issues.some(x=>['MESH_FACE_CROPPED','CAPTION_SAFE_AREA','NEARBY_CONFRONTATION_OUT_OF_FRAME'].includes(x));fit++){camera.position.sub(focus).multiplyScalar(1.1).add(focus);camera.lookAt(focus);r=inspect();}
    const candidate={position:camera.position.clone(),quaternion:camera.quaternion.clone(),...r};if(score(candidate)<score(best))best=candidate;
   }
  }
  // Prefer a nearby valid viewpoint over teleporting to a distant optimum.
  if(d.format==='battle'&&lastRefined&&!framing.cut&&best.position.distanceTo(lastRefined)>2){
   let local=null;
   const horizontal=[-2,-1,0,1,2],vertical=[-2,-1,0,1,2];
   for(const x of horizontal)for(const y of vertical)for(const z of horizontal){
    if(Math.hypot(x,y,z)>2.9)continue;
    camera.position.copy(lastRefined).add(new T.Vector3(x,y,z));camera.lookAt(focus);
    const candidate={position:camera.position.clone(),quaternion:camera.quaternion.clone(),...inspect()};
    if(!candidate.issues.length&&(!local||score(candidate)<score(local)))local=candidate;
   }
   if(local&&local.issues.length<=best.issues.length)best=local;
  }
  camera.position.copy(best.position);camera.quaternion.copy(best.quaternion);
  // Interpolate on an orbit, not a chord through the subject and its body.
  // An unsafe interpolation is rejected, rather than destroying a valid repair.
  let rejectedUnsafeInterpolation=false;
  if(d.format!=='battle'&&lastRefined&&!framing.cut&&camera.position.distanceTo(lastRefined)>2){camera.position.sub(lastRefined).clampLength(0,2).add(lastRefined);camera.lookAt(focus);best={...best,...inspect()};}
  if(d.format==='battle'&&lastRefined&&!framing.cut&&camera.position.distanceTo(lastRefined)>2){
   const safePosition=camera.position.clone(),safeQuaternion=camera.quaternion.clone();
   const from=lastRefined.clone().sub(focus),to=camera.position.clone().sub(focus);
   const a=Math.atan2(from.x,from.z),b=Math.atan2(to.x,to.z),turn=Math.atan2(Math.sin(b-a),Math.cos(b-a));
   const radius=Math.hypot(from.x,from.z),targetRadius=Math.hypot(to.x,to.z);
   const theta=a+clamp(turn,-.18,.18),r=radius+clamp(targetRadius-radius,-1,1);
   camera.position.set(focus.x+Math.sin(theta)*r,focus.y+from.y+clamp(to.y-from.y,-1,1),focus.z+Math.cos(theta)*r);camera.lookAt(focus);
   const intermediate=inspect();
   if(intermediate.issues.length>best.issues.length){camera.position.copy(safePosition);camera.quaternion.copy(safeQuaternion);rejectedUnsafeInterpolation=true;}
   else best={...best,...intermediate};
  }
  for(let fit=0;fit<8&&best.issues.some(x=>['MESH_FACE_CROPPED','CAPTION_SAFE_AREA','NEARBY_CONFRONTATION_OUT_OF_FRAME'].includes(x));fit++){camera.position.sub(focus).multiplyScalar(1.06).add(focus);camera.lookAt(focus);best={...best,...inspect()};}
  camera.updateMatrixWorld();
  const corrected=initial.distanceTo(camera.position)>.01,jump=lastRefined?lastRefined.distanceTo(camera.position):0;
  lastRefined=camera.position.clone();if(!framing.cut&&refinedAt!==null&&at-refinedAt<250&&jump>3)best.issues.push('ABRUPT_CAMERA_MOVE');refinedAt=at;
  return {...framing,camera:camera.position.toArray(),head:center.clone().project(camera).toArray(),quality:{method:'rendered-mesh-bounds-and-nine-face-rays',bounds:best.bounds,issues:best.issues,blockedFaceRays:best.blocked,sampledFaceRays:9,nearbyEventHeads:eventHeads.length,rejectedUnsafeInterpolation,corrected:corrected||framing.quality.corrected,previousProbeIssues:framing.quality.issues,cameraJump:jump}};
 }};
}
