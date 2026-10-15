import { LiveAudioControls, LiveCommunity } from './LivePerformanceControls';
import { LiveGameEditor, LiveTransmission } from './LiveStudioControls';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { agentApi } from '../services/agentApi';
import type { LiveFactory } from '../services/liveFactory';
import { LiveCharacterEditor } from './LiveCharacterEditor';
import { LiveStage } from './LiveStage';
import '../live-factory.css';
const labels:Record<string,string>={STOPPED:'Parado',INITIALIZING:'Inicializando',READY:'Pronto',TESTING:'Em teste',RUNNING:'Executando',DEGRADED:'Degradado',PAUSED:'Pausado',STOPPING:'Encerrando',STOPPED_FINAL:'Encerrado',ERROR:'Erro'};
const areas=['Experiência','Personagem','Jogo','Áudio','Comunidade','Eventos','Transmissão','Operação'];
export function LiveFactoryPanel() {
 const [data,setData]=useState<LiveFactory|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState('Jardim de Lume'),[selected,setSelected]=useState(''),[area,setArea]=useState('Experiência');
 const epoch=useRef(0),locked=useRef(false);
 useEffect(()=>{let alive=true;let timer:ReturnType<typeof setTimeout>;async function poll(){const n=epoch.current;try{if(!locked.current){const d=await agentApi.liveState();if(alive&&n===epoch.current){setData(d);setError('');}}}catch(e){if(alive)setError(String(e));}if(alive)timer=setTimeout(poll,2000);}void poll();return()=>{alive=false;clearTimeout(timer);};},[]);
 async function act(action:string,input:object){if(locked.current)return;locked.current=true;epoch.current++;setBusy(true);try{const w=await agentApi.live(action,input);setData(w.liveFactory||null);setError('');setNotice(action==='configure'?'Personagem salvo no servidor.':'Ação confirmada pelo servidor.');}catch(e){setError(String(e));}finally{locked.current=false;setBusy(false);}}
 const e=data?.experiences.find(e=>e.id===selected)||data?.experiences[0],stopped=e&&['STOPPED','STOPPED_FINAL'].includes(e.status);
 const events=e&&<div className="live-controls">{['greet','challenge','celebrate'].map((type,i)=><button key={type} disabled={busy||e.status!=='TESTING'||!e.connected||!!error} onClick={()=>void act('event',{id:e.id,sessionId:e.sessionId,eventId:crypto.randomUUID(),at:Date.now(),type})}>{['Testar saudação','Testar desafio','Testar comemoração'][i]}</button>)}</div>;
 return <section className="aw-panel live-panel"><p className="aw-eyebrow">LIVE FACTORY · ESTÚDIO DE PERSONAGENS</p><h2>Criar → Personalizar → Testar → Conectar → Transmitir.</h2><p>Jogo no servidor e encoder local independente. Eventos do operador são testes; transmissão pública e eventos TikTok exigem validação externa.</p><Link to="/agentes/conexoes#tiktok">Ver conexão e requisitos TikTok</Link>
 {error&&<p role="alert">{error} · Cena e controles podem estar desatualizados.</p>}{notice&&<p role="status">{notice}</p>}
 <details open={!data?.experiences.length}><summary>Criar uma experiência</summary><form className="aw-form" onSubmit={ev=>{ev.preventDefault();void act('create',{name});}}><label>Nome da experiência<input value={name} onChange={ev=>setName(ev.target.value)} maxLength={80} required/></label><button className="aw-button" disabled={busy||!data||data.experiences.length>=5}>Criar projeto Live Factory</button></form></details>
 {e&&data&&<><label className="live-selector">Experiência selecionada<select value={e.id} onChange={ev=>setSelected(ev.target.value)}>{data.experiences.map(x=><option key={x.id} value={x.id}>{x.name} · {x.config.name}</option>)}</select></label>
 <div className="live-operation"><strong>{labels[e.status]||e.status}</strong><span>{e.connected&&!error?'Heartbeat presente':'Sem heartbeat ativo'}</span><div className="live-controls">
 {stopped&&<button disabled={busy||!!error} onClick={()=>void act('start',{id:e.id})}>Iniciar teste · até 30 min</button>}
 {['TESTING','INITIALIZING'].includes(e.status)&&<button disabled={busy} onClick={()=>void act('pause',{id:e.id})}>Pausar</button>}
 {['PAUSED','DEGRADED'].includes(e.status)&&<button disabled={busy} onClick={()=>void act('resume',{id:e.id})}>Retomar</button>}
 {!stopped&&<><button disabled={busy} onClick={()=>void act('stop',{id:e.id})}>Encerrar sessão</button><button className="live-emergency" disabled={busy} onClick={()=>void act('emergency',{id:e.id})}>Parada de emergência</button></>}</div></div>
 <nav className="live-tabs" aria-label="Áreas da Live Factory">{areas.map(a=><button key={a} aria-current={area===a?'page':undefined} onClick={()=>setArea(a)}>{a}</button>)}</nav>
 <div className="live-layout"><LiveStage key={e.id} e={e} fresh={!error}/><div>
 {area==='Experiência'&&<><h3>{e.config.name}</h3><p>{e.config.personality}</p><p aria-live="polite">{e.character.speech}</p><p>Estado: {e.character.behavior||'resting'} · expressão: {e.character.expression} · animação: {e.character.animation||'idle'}</p>{events}<p>Configure uma reação em Personagem, salve, inicie um teste e envie um evento. Reabra a página para conferir a configuração persistida.</p></>}
 {area==='Personagem'&&<LiveCharacterEditor key={`${e.id}:${e.configVersion}`} e={e} options={data.options} busy={busy} act={act}/>}
 {area==='Eventos'&&<><h3>Eventos simulados</h3>{events}<p>{e.processed} processados · {e.pending} na fila. Última latência: {e.latencyMs==null?'A apurar':`${e.latencyMs} ms`}.</p><p>Evento → regra versionada → estado → animação/som solicitados → histórico. O registro do servidor não confirma que um navegador reproduziu o áudio.</p></>}
 {area==='Áudio'&&<LiveAudioControls key={`${e.id}:${e.configVersion}`} e={e} busy={busy} act={act}/>}
 {area==='Comunidade'&&<LiveCommunity key={e.id} e={e} busy={busy} act={act}/>}
 {area==='Jogo'&&<LiveGameEditor key={`${e.id}:${e.configVersion}`} e={e} busy={busy} act={act}/>}
 {area==='Transmissão'&&<LiveTransmission key={e.id} e={e} busy={busy} act={act}/>}
 {area==='Operação'&&<><h3>Operação e custos</h3><dl><dt>Execução ativa</dt><dd>{Math.floor(e.activeMs/1000)} segundos · {e.ticks} ciclos do servidor</dd><dt>Último heartbeat</dt><dd>{e.heartbeat?new Date(e.heartbeat).toLocaleTimeString():'Não recebido'}</dd><dt>Chamadas de IA desta experiência</dt><dd>0 · custo de API confirmado: R$ 0</dd><dt>Infraestrutura, custos estimados, audiência e lucro</dt><dd>A apurar. Conexão ou teste não comprovam receita.</dd></dl><p>É necessário manter Node e banco ativos. Cada experiência ativa consulta/grava estado a cada 2 s. O worker local codifica a 15 fps sem navegador; fechar o painel não encerra esse worker. O servidor mantém o jogo, e a apresentação usa histórico com atraso de 2,5 s.</p><p>Emergência revoga o worker, interrompe o runtime e descarta a fila. O worker detecta revogação em até 5 s; perda de comunicação causa parada em até 10 s. OBS/LIVE Studio externos devem ser encerrados manualmente.</p><details><summary>Executor</summary><p className="live-wrap">{e.executor||'Aguardando'}</p></details></>}
 {e.error&&<p role="alert">{e.error}</p>}
 </div></div>
 {(area==='Eventos'||area==='Operação'||area==='Experiência')&&<details open={area==='Eventos'}><summary>Histórico operacional · últimos 200 registros</summary><ol className="live-logs">{[...e.logs].reverse().map(l=><li key={l.id}><time>{new Date(l.at).toLocaleTimeString()}</time> · {l.kind} · {l.type||l.action||l.status}<br/>{l.rule&&<strong>{l.rule} → {l.action}</strong>} {l.result}<small>{l.animation&&`Animação: ${l.animation} · som: ${l.sound}. `}{l.source} {l.eventId&&`· evento ${l.eventId}`} {l.status} {l.aiUsed===false&&'· sem IA'}</small></li>)}</ol></details>}
 </>}
 </section>;
}
