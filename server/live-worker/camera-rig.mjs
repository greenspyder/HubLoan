// Presentation only, serialized into the existing isolated renderer.
export function createCameraRig(T,camera){
 const aim=new T.Vector3(),heading=new T.Vector3(1,0,0),desired=new T.Vector3(),goal=new T.Vector3();
 let occlusionSide=1;let initialized=false,lastRound=null,lastPlayer=null,previousAt=null,lastCut=null;
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
  const faceTarget=head.clone().addScaledVector(heading,.7);faceTarget.y=1.1;
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
  camera.updateMatrixWorld();initialized=true;lastCut=d.cutId;lastRound=f.round;lastPlayer=p.id;
  const projected=faceBounds.map(v=>v.clone().project(camera));
  const bounds={left:Math.min(...projected.map(v=>v.x)),right:Math.max(...projected.map(v=>v.x)),bottom:Math.min(...projected.map(v=>v.y)),top:Math.max(...projected.map(v=>v.y))};
  const issues=[];if(projected.some(v=>v.z<=-1||v.z>=1)||bounds.left<-.98||bounds.right>.98||bounds.top>.95||bounds.bottom<-.95)issues.push('FACE_CROPPED');
  if(mode!=='Tactical'&&bounds.top-bounds.bottom<.14)issues.push('SUBJECT_SMALL');
  if(mode!=='Tactical'&&blocked(camera.position))issues.push('POSSIBLE_BODY_OCCLUSION');
  if(bounds.bottom<-.42&&mode!=='Tactical')issues.push('CAPTION_SAFE_AREA');
  return {quality:{method:'conservative-projected-envelope-and-body-probes',bounds,issues,fitSteps:fit,corrected:fit>0||occlusionCorrected},shot:mode,occlusionCorrected,fallback,player:index,focus:aim.toArray(),camera:camera.position.toArray(),anchors:anchors.map(v=>v.clone().project(camera).toArray()),arenaCorners:corners.map(v=>v.clone().project(camera).toArray()),head:head.clone().project(camera).toArray(),cut:reset};
 }};
}
