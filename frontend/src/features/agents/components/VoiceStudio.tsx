import {useEffect,useState} from 'react';
import {agentApi,type VoiceStudioState,type Workspace} from '../services/agentApi';
export function VoiceStudio({state,onUpdate}:{state:VoiceStudioState;onUpdate:(w:Workspace)=>void}){
 const [candidate,setCandidate]=useState(state.draft?.candidateId||state.active.candidateId),[intensity,setIntensity]=useState(state.draft?.exaggeration??.35),[index,setIndex]=useState(0),[audio,setAudio]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [sampleRevision,setSampleRevision]=useState<number|null>(null),[heardRevision,setHeardRevision]=useState<number|null>(null),[listenedRevision,setListenedRevision]=useState<number|null>(null);
 useEffect(()=>()=>{if(audio)URL.revokeObjectURL(audio);},[audio]);
 const chosen=state.candidates.find(c=>c.id===candidate),heard=heardRevision===state.revision,listened=listenedRevision===state.revision;
 function reset(){setAudio('');setSampleRevision(null);setHeardRevision(null);setListenedRevision(null);}
 async function action(input:object){setBusy(true);setError('');try{const w=await agentApi.voiceStudio({...input,revision:state.revision});reset();onUpdate(w);}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function sample(current:boolean){setBusy(true);setError('');reset();try{setAudio(URL.createObjectURL(await agentApi.voiceSample(current,index)));setSampleRevision(current?null:state.revision);}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <details className="aw-panel"><summary>Voice Studio · identidade global da Lume</summary>
 <p>Ativa: {state.active.style} · {state.active.engine} · {state.active.voice} · versão {state.active.version}.</p>
 <p>Compartilhada por Viral Content Factory, Live Creator e Seed Snake. Novas produções recebem uma cópia do perfil; vídeos existentes permanecem inalterados.</p>
 <label>Modelo e voz<select disabled={busy} value={candidate} onChange={e=>setCandidate(e.target.value)}>{state.candidates.map(c=><option key={c.id} value={c.id}>{c.name}{c.referenceOnly?' (referência)':''}</option>)}</select></label>
 <p role="status">{chosen?.installed?'Arquivos locais presentes; gere uma amostra para verificar o funcionamento.':'Modelo indisponível neste servidor: arquivos locais ausentes.'}</p>
 <p>Licença: {chosen?.license}. Heart e Emma são referências sintéticas distintas, sem imitação de pessoas reais. Não são variações de pf_dora.</p>
 {chosen?.engine==='chatterbox'&&<label>Intensidade neural: {intensity.toFixed(2)}<input disabled={busy} type="range" min="0.2" max="0.6" step="0.05" value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/></label>}
 <p>O controle de intensidade não garante uma emoção específica.</p>
 <button disabled={busy||!chosen?.installed||chosen.referenceOnly} onClick={()=>void action({action:'save',profile:{candidateId:candidate,exaggeration:intensity}})}>Salvar perfil de teste</button>
 <label>Frase<select disabled={busy} value={index} onChange={e=>setIndex(Number(e.target.value))}>{state.phrases.map((p,i)=><option key={p} value={i}>{p}</option>)}</select></label>
 <button disabled={busy} onClick={()=>void sample(true)}>Ouvir voz atual</button><button disabled={busy||!state.draft} onClick={()=>void sample(false)}>Ouvir candidata salva</button>
 {busy&&<p role="status">Sintetizando localmente. Em CPU pode levar alguns minutos.</p>}
 {audio&&<audio src={audio} controls onEnded={()=>{if(sampleRevision!==null)setHeardRevision(sampleRevision);}}/>}{error&&<p role="alert">{error} Não usamos fallback nas amostras.</p>}
 <label><input type="checkbox" disabled={!heard||busy} checked={listened} onChange={e=>setListenedRevision(e.target.checked?state.revision:null)}/>Ouvi a candidata salva e aprovo sua identidade vocal</label>
 <button disabled={busy||!state.draft||!heard||!listened} onClick={()=>void action({action:'approve',listened:true})}>Aprovar como voz global</button>
 <p>Live neural não validada. Até validação de latência, novas lives usam fallback técnico identificado. A aprovação da identidade não comprova desempenho ao vivo.</p>
 </details>;
}
