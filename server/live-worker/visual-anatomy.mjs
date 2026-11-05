// Serialized pure presentation check. Samples rendered spine surfaces; not an artistic score.
export function inspectVisualAnatomy(T,camera,actors,index,context={}){
 const actor=actors[index];if(!actor?.spineCurve)return null;
 camera.updateMatrixWorld(true);
 const curve=actor.spineCurve,length=curve.getLength(),ray=new T.Raycaster();
 const blockers=actors.flatMap(a=>[a.body,a.head.g]).filter(a=>a.visible);
 const visible=p=>{
  const q=p.clone().project(camera),inside=q.z>-1&&q.z<1&&Math.abs(q.x)<.9&&q.y>-.48&&q.y<.65;
  if(!inside)return {inside:false,visible:false,q};
  const delta=p.clone().sub(camera.position),distance=delta.length();ray.set(camera.position,delta.normalize());ray.near=0;ray.far=Math.max(0,distance-.46);
  return {inside:true,visible:ray.intersectObjects(blockers,true).length===0,q};
 };
 const neck=Array.from({length:6},(_,i)=>visible(curve.getPointAt(Math.min(.35,(.45+i*.22)/length))));
 const body=Array.from({length:12},(_,i)=>visible(curve.getPointAt(.13+i*.078)));
 const ratio=(points,key)=>points.filter(p=>p[key]).length/points.length;
 const neckVisible=ratio(neck,'visible'),bodyVisible=ratio(body,'visible'),bodyInFrame=ratio(body,'inside');
 const q=body.filter(p=>p.inside).map(p=>p.q),extent=q.length?Math.hypot(Math.max(...q.map(p=>p.x))-Math.min(...q.map(p=>p.x)),Math.max(...q.map(p=>p.y))-Math.min(...q.map(p=>p.y))):0;
 const issues=[];if(neckVisible<1/3)issues.push('NECK_NOT_VISIBLE');
 if(bodyVisible<(context.showcase&&context.showcaseStage!==2?.65:.4))issues.push('BODY_HIDDEN');
 if(bodyInFrame<(context.showcase&&context.showcaseStage!==2?.85:.55))issues.push('BODY_CROPPED');
 if(extent<.24)issues.push('SILHOUETTE_COMPRESSED');
 return {method:'spine-surface-rays-and-safe-frame-samples',neckSamples:6,bodySamples:12,neckVisibleFraction:neckVisible,bodyVisibleFraction:bodyVisible,bodyInFrameFraction:bodyInFrame,projectedBodyExtent:extent,issues,artisticApproval:false};
}
