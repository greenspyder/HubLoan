import { useEffect, useRef, useState } from 'react';
import { agentApi } from '../services/agentApi';
import type { LiveFactory, LiveExperience } from '../services/liveFactory';
import '../live-factory.css';
const labels:Record<string,string>={STOPPED:'Parado',INITIALIZING:'Inicializando',READY:'Pronto',TESTING:'Em teste',RUNNING:'Executando',DEGRADED:'Degradado',PAUSED:'Pausado',STOPPING:'Encerrando',STOPPED_FINAL:'Encerrado',ERROR:'Erro'};
export function LiveCharacter({e}:{e:LiveExperience}) {
 const happy=['happy','joy'].includes(e.character.expression),dy=e.character.pose*3;
 return <svg className="live-stage" viewBox="0 0 360 420" role="img" aria-label={`${e.name}: ${e.character.expression}`}>
 <rect width="360" height="420" rx="24" fill="#101b30"/><circle cx="280" cy="65" r="34" fill="#7ee8d7"/><path d="M0 345 Q95 285 180 338 T360 325 V420 H0Z" fill="#183e47"/>
 {[40,95,165,245,320].map((x,i)=><circle key={x} cx={x} cy={70+i%3*35} r="3" fill="#e3cf84"/>)}
 <g transform={`translate(0 ${dy})`}><ellipse cx="180" cy="315" rx="70" ry="12" fill="#091521"/>
 <path d="M142 167 Q180 135 218 167 L238 276 Q180 330 122 276Z" fill="#75ccba" stroke="#c0ffe4" strokeWidth="4"/>
 <path d="M180 150 Q137 100 150 96 Q194 105 180 150 M182 145 Q223 95 235 110 Q224 150 182 145" fill="#bad785"/>
 <path d={happy?'M143 211 Q153 194 165 211 M195 211 Q207 194 219 211':'M150 204 V217 M210 204 V217'} stroke="#16343b" strokeWidth="7" fill="none" strokeLinecap="round"/>
 <path d={happy?'M163 242 Q180 265 199 242':'M170 245 Q180 252 190 245'} fill="none" stroke="#16343b" strokeWidth="5"/>
 <path d={happy?'M126 245 L97 209 M234 245 L263 209':'M126 245 L102 265 M234 245 L258 265'} stroke="#75ccba" strokeWidth="14" strokeLinecap="round"/>
 {e.character.expression==='joy'&&<path d="M72 172 L82 145 L92 172 L120 180 L92 188 L82 215 L72 188 L45 180Z" fill="#ffda83"/>}</g>
 <text x="180" y="388" fill="#c8dedb" textAnchor="middle" fontSize="13">PERSONAGEM VIRTUAL · TESTE SEM TRANSMISSÃO</text></svg>;
}
export function LiveFactoryPanel() {
 const [data,setData]=useState<LiveFactory|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState('Lume, o guardião das sementes');
 const epoch=useRef(0),locked=useRef(false);
 useEffect(()=>{let alive=true;let timer:ReturnType<typeof setTimeout>;async function poll(){const n=epoch.current;try{if(!locked.current){const d=await agentApi.liveState();if(alive&&n===epoch.current){setData(d);setError('');}}}catch(e){if(alive)setError(String(e));}if(alive)timer=setTimeout(poll,2000);}void poll();return()=>{alive=false;clearTimeout(timer);};},[]);
 async function act(action:string,input:object){if(locked.current)return;locked.current=true;epoch.current++;setBusy(true);try{const w=await agentApi.live(action,input);setData(w.liveFactory||null);setError('');}catch(e){setError(String(e));}finally{locked.current=false;setBusy(false);}}
 return <section className="aw-panel live-panel"><p className="aw-eyebrow">LIVE FACTORY · PRIMEIRO EXPERIMENTO</p><h2>Um personagem com cérebro no servidor</h2><p>Regras determinísticas, sem chamadas de IA pagas. Custos de hospedagem, audiência e resultado financeiro: a apurar.</p>
 <p className="aw-notice">Modo de teste. TikTok não conectado; elegibilidade não verificada. Nada é transmitido. O runtime exige servidor Node ativo; fechar este painel não encerra a sessão.</p>
 {error&&<p role="alert">{error} · Prévia pode estar desatualizada.</p>}
 <form className="aw-form" onSubmit={e=>{e.preventDefault();void act('create',{name});}}><label>Nome da experiência<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required/></label><button className="aw-button" disabled={busy}>Criar projeto Live Factory</button></form>
 {data?.experiences.map(e=><article key={e.id} className="live-experience"><h3>{e.name}</h3><div className="live-layout"><div><LiveCharacter e={e}/><p aria-live="polite">{e.character.speech}</p><p>Expressão: {e.character.expression} · pose do servidor: {e.character.pose}</p></div><div>
 <dl><dt>Runtime</dt><dd>{labels[e.status]||e.status} · {e.connected&&!error?'Heartbeat presente':'Sem heartbeat ativo'}</dd><dt>Transmissão</dt><dd>Não conectada / não confirmada</dd><dt>Execução em teste</dt><dd>{Math.floor(e.activeMs/1000)} segundos · {e.ticks} ciclos reais</dd><dt>Eventos de teste processados</dt><dd>{e.processed} · {e.pending} na fila</dd><dt>Última latência</dt><dd>{e.latencyMs==null?'Ainda sem evento':`${e.latencyMs} ms`}</dd><dt>Último heartbeat</dt><dd>{e.heartbeat?new Date(e.heartbeat).toLocaleTimeString():'Não recebido'}</dd></dl>
 {e.error&&<p role="alert">{e.error}</p>}
 <div className="live-controls">{['STOPPED','STOPPED_FINAL'].includes(e.status)&&<button disabled={busy} onClick={()=>void act('start',{id:e.id})}>Iniciar teste · máximo 30 min</button>}
 {['TESTING','INITIALIZING'].includes(e.status)&&<button disabled={busy} onClick={()=>void act('pause',{id:e.id})}>Pausar</button>}
 {['PAUSED','DEGRADED'].includes(e.status)&&<button disabled={busy} onClick={()=>void act('resume',{id:e.id})}>Retomar</button>}
 {['greet','challenge','celebrate'].map((type,i)=><button key={type} disabled={busy||e.status!=='TESTING'||!e.connected||!!error} onClick={()=>void act('event',{id:e.id,sessionId:e.sessionId,eventId:crypto.randomUUID(),at:Date.now(),type})}>{['Testar saudação','Testar desafio','Testar comemoração'][i]}</button>)}
 {!['STOPPED','STOPPED_FINAL'].includes(e.status)&&<><button disabled={busy} onClick={()=>void act('stop',{id:e.id})}>Encerrar sessão</button><button className="live-emergency" disabled={busy} onClick={()=>void act('emergency',{id:e.id})}>Parada de emergência</button></>}</div>
 <p>Parada interrompe este runtime e descarta eventos pendentes. Não controla OBS ou uma transmissão externa.</p><details><summary>Executor e limitações</summary><p className="live-wrap">{e.executor||'Aguardando executor'}</p><p>Atualização a cada 2 segundos. Sem áudio/TTS nesta versão. Reinício ou falha prolongada exige retomada humana. Sem garantia de disponibilidade em hospedagem que suspende processos.</p></details></div></div>
 <h4>Cérebro operacional · últimos 200 registros</h4><ol className="live-logs">{[...e.logs].reverse().map(l=><li key={l.id}><time>{new Date(l.at).toLocaleTimeString()}</time> · {l.kind} · {l.type||l.action||l.status}<br/>{l.rule&&<strong>{l.rule} → {l.action}</strong>} {l.result}<small>{l.source} {l.eventId&&`· evento ${l.eventId}`} {l.status} {l.aiUsed===false&&'· sem IA'}</small></li>)}</ol></article>)}
 </section>;
}
