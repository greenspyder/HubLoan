// Read-only transport projection. Canonical records and old API clients remain unchanged.
export function studioWorkspaceView(data,{campaignIds=[],productionId}={}) {
 const selected=new Set(campaignIds);
 return {...data,creativeCampaigns:data.creativeCampaigns.map(c=>{
  if(selected.has(c.id))return {...c,detailLoaded:true};
  const {plans,decisions,quality,resourceEstimate,...summary}=c;
  const milestones=new Map();for(const e of c.events||[])if(!milestones.has(e.state))milestones.set(e.state,{at:e.at,state:e.state,detail:''});
  return {...summary,detailLoaded:false,events:[...milestones.values()],decisions:[]};
 }),missions:data.missions.map(m=>{
  if(m.id===productionId)return {...m,detailLoaded:true};
  const {output,videoReport,logs,...summary}=m;
  return {...summary,detailLoaded:false,output:'',logs:[],...(m.visualCommentary?{visualCommentary:{...m.visualCommentary,plan:{format:m.visualCommentary.plan?.format,seconds:m.visualCommentary.plan?.seconds,scenes:[]}}}:{})};
 })};
}
