// Serialized pure presentation check. Samples rendered spine surfaces; not an artistic score.
export function inspectVisualAnatomy(T,camera,actors,index,context={}){
 const actor=actors[index];if(!actor?.spineCurve)return null;
 camera.updateMatrixWorld(true);
 const curve=actor.spineCurve,length=curve.getLength(),ray=new T.Raycaster();
 const blockers=actors.flatMap(a=>[a.body,a.head.g]).filter(a=>a.visible);
 // Bounded capsule samples for spine visibility; face occlusion still uses real mesh rays.
 // This estimate is deliberately separate from artistic approval.
 const signature=actors.map(a=>a.body.geometry.uuid+':'+a.head.g.visible+':'+a.head.g.matrixWorld.elements.join(',')).join('|');
 let cached=actor.visualProbeCache;
 if(!cached||cached.signature!==signature){
  const probes=actors.filter(a=>a.head.g.visible).flatMap(a=>{
   const points=[{p:a.head.g.getWorldPosition(new T.Vector3()),radius:.63}];
   if(a.spineCurve)for(let i=0;i<32;i++){const u=i/31,taper=u>.65?Math.pow((1-u)/.35,.8):1;points.push({p:a.spineCurve.getPointAt(u),radius:.43*taper});}
   return points;
  });
  cached={signature,probes};actor.visualProbeCache=cached;
 }
 const probes=cached.probes;
 const hasUnmodelled=actors.some(a=>a.body.visible&&!a.spineCurve);
 const visible=p=>{
  const q=p.clone().project(camera),inside=q.z>-1&&q.z<1&&Math.abs(q.x)<.9&&q.y>-.48&&q.y<.65;
  if(!inside)return {inside:false,visible:false,q};
  const delta=p.clone().sub(camera.position),distance=delta.length();ray.set(camera.position,delta.normalize());ray.near=0;ray.far=Math.max(0,distance-.46);
  const blocked=probes.some(b=>{const x=b.p.x-camera.position.x,y=b.p.y-camera.position.y,z=b.p.z-camera.position.z,along=x*delta.x+y*delta.y+z*delta.z;return along>0&&along<distance-.65&&x*x+y*y+z*z-along*along<b.radius*b.radius;});
  return {inside:true,visible:!blocked&&(!hasUnmodelled||ray.intersectObjects(blockers,true).length===0),q};
 };
 const neck=Array.from({length:6},(_,i)=>visible(curve.getPointAt(Math.min(.35,(.45+i*.22)/length))));
 const bust=context.format==='comedy';
 const body=Array.from({length:12},(_,i)=>visible(curve.getPointAt(bust?.05+i*.025:.13+i*.078)));
 const ratio=(points,key)=>points.filter(p=>p[key]).length/points.length;
 const neckVisible=ratio(neck,'visible'),bodyVisible=ratio(body,'visible'),bodyInFrame=ratio(body,'inside');
 const q=body.filter(p=>p.inside).map(p=>p.q),extent=q.length?Math.hypot(Math.max(...q.map(p=>p.x))-Math.min(...q.map(p=>p.x)),Math.max(...q.map(p=>p.y))-Math.min(...q.map(p=>p.y))):0;
 const issues=[];if(neckVisible<1/3)issues.push('NECK_NOT_VISIBLE');
 if(bodyVisible<(context.showcase&&context.showcaseStage!==2?.65:.4))issues.push('BODY_HIDDEN');
 if(bodyInFrame<(context.showcase&&context.showcaseStage!==2?.85:.55))issues.push('BODY_CROPPED');
 if(extent<.24)issues.push('SILHOUETTE_COMPRESSED');
 return {method:'projected-spine-capsule-estimates-and-safe-frame-samples',neckSamples:6,bodySamples:12,bodySampling:bust?'upper-body-for-deliberate-bust':'whole-spine',neckVisibleFraction:neckVisible,bodyVisibleFraction:bodyVisible,bodyInFrameFraction:bodyInFrame,projectedBodyExtent:extent,issues,artisticApproval:false};
}
