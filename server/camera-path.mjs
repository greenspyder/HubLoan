// Offline only: choose a continuous chain through viewpoints checked on actual
// rendered geometry. No new cuts, altered physics, or relaxed visibility rules.
const distance2=(a,b)=>a.reduce((n,x,i)=>n+(x-b[i])**2,0);
const turn=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((n,x,i)=>n+x*b[i],0))));
export function planCameraPath(frames,{maxStep=2.8,maxTurn=.25}={}){
 if(!Array.isArray(frames)||!frames.length||frames.length>1800)throw Error('Prévia de câmera inválida');
 let costs;const parents=[];
 for(let i=0;i<frames.length;i++){
  const {views,cut}=frames[i];if(!Array.isArray(views)||!views.length)throw Error(`Nenhum plano seguro no quadro ${i+1}`);
  if(views.length>200||views.some(v=>v.position?.length!==3||v.quaternion?.length!==4||![...v.position,...v.quaternion,v.facing,v.blocked,v.height].every(Number.isFinite)))throw Error('Candidata de câmera inválida');
  const next=new Float64Array(views.length).fill(Infinity),links=new Int32Array(views.length).fill(-1);
  for(let j=0;j<views.length;j++){
   const v=views[j],composition=v.blocked*10+(1-v.facing)**2*(v.frontWeight??2)+Math.abs(v.height-(v.targetHeight??.45))*3;
   if(!i){next[j]=composition;continue;}
   for(let k=0;k<frames[i-1].views.length;k++){
    if(!Number.isFinite(costs[k]))continue;
    const before=frames[i-1].views[k],step=distance2(v.position,before.position),rotation=turn(v.quaternion,before.quaternion);
    if(!cut&&(step>maxStep**2||rotation>maxTurn))continue;
    const value=costs[k]+composition+(cut?0:step*2+rotation**2*6+(v.height-before.height)**2*100);
    if(value<next[j]){next[j]=value;links[j]=k;}
   }
  }
  if(!next.some(Number.isFinite))throw Error(`Sem trajetória contínua no quadro ${i+1}; ${views.length} vistas seguras`);
  parents.push(links);costs=next;
 }
 let selected=costs.indexOf(Math.min(...costs));const path=new Array(frames.length);
 for(let i=frames.length-1;i>=0;i--){path[i]=frames[i].views[selected];selected=parents[i][selected];}
 let observedMaxStep=0,observedMaxTurn=0;
 for(let i=1;i<path.length;i++)if(!frames[i].cut){observedMaxStep=Math.max(observedMaxStep,Math.sqrt(distance2(path[i].position,path[i-1].position)));observedMaxTurn=Math.max(observedMaxTurn,turn(path[i].quaternion,path[i-1].quaternion));}
 return {path,metrics:{method:'offline-global-path',frames:frames.length,candidates:frames.reduce((n,f)=>n+f.views.length,0),maxStep,maxTurn,observedMaxStep,observedMaxTurn,addedCuts:0}};
}
