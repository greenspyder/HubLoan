import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { agentApi } from '../services/agentApi';
import type { TikTokState } from '../services/liveFactory';
const labels:Record<string,string>={CONFIGURATION_REQUIRED:'Configuração necessária',NOT_CONFIGURED:'Não configurado',CONNECTED:'Conectado',AWAITING_AUTHORIZATION:'Aguardando autorização',AUTHORIZATION_REQUIRED:'Autorização necessária',ERROR:'Erro',NOT_SUPPORTED:'Não suportado atualmente'};
const stateKey='hubloan.tiktok.oauth.state';
export function TikTokConnection() {
 const [data,setData]=useState<TikTokState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const initial=useRef(new URLSearchParams(window.location.search)),pending=useRef<Promise<TikTokState>|null>(null);
 useEffect(()=>{
  let alive=true;
  if(!pending.current){
   const q=initial.current,state=q.get('state');
   if(state&&(q.has('code')||q.has('error'))){
    window.history.replaceState(null,'',window.location.pathname+'#tiktok');
    const expected=sessionStorage.getItem(stateKey);sessionStorage.removeItem(stateKey);
    pending.current=state===expected?agentApi.finishTikTok({state,code:q.get('code')||undefined,error:q.get('error')||undefined}):Promise.reject(new Error('Retorno OAuth não pertence a esta autorização. Conecte novamente neste navegador.'));
   }else pending.current=agentApi.tiktokState();
  }
  pending.current.then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(String(e));});
  return()=>{alive=false;};
 },[]);
 async function run(op:()=>Promise<void>){setBusy(true);setError('');try{await op();}catch(e){setError(String(e));}finally{setBusy(false);}}
 return <section className="aw-panel" id="tiktok"><p className="aw-eyebrow">CONEXÕES</p><h2>TikTok</h2><p>Uma conta autorizada não conecta uma live nem comprova receita.</p>
 {error&&<p role="alert">{error}</p>}
 {!data?<p>Consultando capacidades no servidor…</p>:<>
 <div className="aw-connection-grid">
 <article><h3>TikTok — Conta e publicação</h3><strong>{labels[data.account.status]}</strong><p>{data.account.connected?`Conta: ${data.account.name}. Autorizada apenas para informações básicas.`:'Login Kit oficial: acesso a informações básicas da conta.'}</p><p>Permissões autorizadas: {data.account.scopes.join(', ')||'Nenhuma'}</p>{data.account.verifiedAt&&<p>Última confirmação: {new Date(data.account.verifiedAt).toLocaleString()}. {data.account.expiresAt&&`Validade: ${new Date(data.account.expiresAt).toLocaleString()}.`}</p>}{data.account.error&&<p role="alert">{data.account.error}</p>}<p><strong>Publicação: {labels[data.publication.status]}</strong></p><p>{data.publication.detail}</p><Link to="/agentes/afiliados">Abrir TikTok Afiliados · publicação assistida</Link></article>
 <article><h3>TikTok LIVE — Transmissão</h3><strong>{labels[data.broadcast.status]}</strong><p>{data.broadcast.detail}</p><Link to="/agentes/live">Preparar cena na Live Factory</Link></article>
 <article><h3>TikTok LIVE — Eventos</h3><strong>{labels[data.events.status]}</strong><p>{data.events.detail}</p></article>
 </div>
 {data.requirements.length>0&&<div><h3>O que falta configurar</h3><ol>{data.requirements.map(r=><li key={r}>{r}</li>)}</ol><p>Solicite somente <code>user.info.basic</code> nesta fase. A aprovação do app é feita pelo TikTok, fora do HubLoan.</p></div>}
 {data.canAuthorize&&<button className="aw-button" disabled={busy} onClick={()=>void run(async()=>{const result=await agentApi.authorizeTikTok();sessionStorage.setItem(stateKey,result.state);window.location.assign(result.url);})}>{data.account.connected?'Autorizar conta novamente':'Conectar TikTok'}</button>}
 {data.canDisconnect&&<button className="aw-button aw-secondary" disabled={busy} onClick={()=>void run(async()=>setData(await agentApi.disconnectTikTok()))}>Desconectar TikTok</button>}
 {data.revokeNotice&&<p role="alert">{data.revokeNotice}</p>}
 <details><summary>Referências oficiais e configuração do aplicativo</summary><p>Retorno cadastrado: {data.redirectUri||'Ainda não definido'}. Use o mesmo navegador e espaço para concluir a autorização. Nenhum token é devolvido ao navegador.</p><p><a href="https://developers.tiktok.com/docs/en/login-kit-web" target="_blank" rel="noreferrer">Login Kit Web</a> · <a href="https://developers.tiktok.com/docs/en/content-sharing-guidelines" target="_blank" rel="noreferrer">Requisitos de publicação</a></p><p>Não cole senhas, cookies ou chaves de transmissão aqui. LIVE e eventos precisam de acesso específico; Login Kit não o concede.</p></details>
 </>}
 <button className="aw-button aw-secondary" disabled={busy} onClick={()=>void run(async()=>setData(await agentApi.tiktokState()))}>Atualizar diagnóstico TikTok</button>
 </section>;
}
