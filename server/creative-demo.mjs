import {createStore} from './store.mjs';
import {createRunner} from './runner.mjs';
import {creativeAction,creativeState} from './creative-director.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const directory=resolve(process.argv[2]||'../creative20-demo');await mkdir(directory,{recursive:true});
const store=await createStore({file:join(directory,'demo.sqlite')}),id='creative20-private-demo',runner=createRunner(store,{}, {intervalMs:86400000});
try{
 if(!(await store.read(id)).workspace.creativeDirector)await store.mutate(id,w=>creativeAction(w,{revision:0,action:'propose',theme:'Curiosidade, escolhas e pequenas surpresas'}));
 for(const format of ['mystery','comedy','battle']){
  let w=(await store.read(id)).workspace;const p=w.creativeDirector.proposals.find(p=>p.format===format);
  if(!w.creativeDirector.experiments.some(e=>e.proposalId===p.id))await store.mutate(id,w=>creativeAction(w,{revision:w.creativeDirector.revision,action:'produce',proposalId:p.id,voiceMode:'technical'}));
  runner.unlock(id,'0'.repeat(64));await runner.tick();w=(await store.read(id)).workspace;
  const e=w.creativeDirector.experiments.find(e=>e.proposalId===p.id),m=w.missions.find(m=>m.id===e.missionId);
  console.log(format,m.status,m.error);
  if(m.artifact){await writeFile(join(directory,format+'.mp4'),Buffer.from(m.artifact.base64,'base64'));await writeFile(join(directory,format+'.png'),Buffer.from(m.artifact.preview,'base64'));await writeFile(join(directory,format+'.json'),JSON.stringify(m.videoReport,null,2));}
  await writeFile(join(directory,'experiment.json'),JSON.stringify(creativeState(w),null,2));
 }
}finally{await runner.close();await store.close();}
