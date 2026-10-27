import {useEffect,useState} from 'react';
import {agentApi,type VoiceStudioState,type Workspace} from '../services/agentApi';
export function VoiceStudio({state,onUpdate}:{state:VoiceStudioState;onUpdate:(w:Workspace)=>void}){
 const [candidate,setCandidate]=useState(state.draft?.candidateId||state.active.candidateId),[speed,setSpeed]=useState(state.draft?.speed||state.active.speed),[index,setIndex]=useState(0),[audio,setAudio]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[listenedRevision,setListenedRevision]=useState<number|null>(null);
 useEffect(()=>()=>{if(audio)URL.revokeObjectURL(audio);},[audio]);
 const listened=listenedRevision===state.revision;
 async function action(input:object){setBusy(true);setError('');try{onUpdate(await agentApi.voiceStudio({...input,revision:state.revision}));}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function sample(current:boolean){setBusy(true);setError('');try{setAudio(URL.createObjectURL(await agentApi.voiceSample(current,index)));}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <details className="aw-panel"><summary>Voice Studio · identidade global da Lume</summary>
 <p>Ativa: {state.active.style} · {state.active.voice} · versão {state.active.version}. Compartilhada por novas produções e novas autorizações de live neste espaço. Vídeos existentes preservam seu perfil.</p>
 <p>Três direções da mesma voz Kokoro pf_dora. Ritmo e pontuação não são controle emocional neural. Disponibilidade verificada ao gerar uma amostra; não usa fallback nesta comparação.</p>
 <label>Candidata<select value={candidate} onChange={e=>{setCandidate(e.target.value);setSpeed(state.candidates.find(c=>c.id===e.target.value)?.speed||.96);}}>{state.candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Ritmo: {speed.toFixed(2)}<input type="range" min="0.85" max="1.10" step="0.01" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label>
 <button disabled={busy} onClick={()=>void action({action:'save',profile:{candidateId:candidate,speed}})}>Salvar perfil de teste</button>
 <label>Frase<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{state.phrases.map((p,i)=><option key={p} value={i}>{p}</option>)}</select></label>
 <button disabled={busy} onClick={()=>void sample(true)}>Ouvir voz atual</button><button disabled={busy||!state.draft} onClick={()=>void sample(false)}>Ouvir candidata salva</button>
 {audio&&<audio src={audio} controls/>}{error&&<p role="alert">{error}</p>}
 <label><input type="checkbox" checked={listened} onChange={e=>setListenedRevision(e.target.checked?state.revision:null)}/>Ouvi a candidata salva e aprovo sua identidade vocal</label>
 <button disabled={busy||!state.draft||!listened} onClick={()=>void action({action:'approve',listened:true})}>Aprovar como voz global</button>
 <p>Licença do modelo: Apache-2.0. Avaliação artística humana obrigatória. Uma amostra gerada não comprova latência de live.</p>
 </details>;
}
