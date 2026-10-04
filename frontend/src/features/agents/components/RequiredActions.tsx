import { Link } from 'react-router-dom';
import type { Workspace } from '../services/agentApi';
import { offerContext, offerUrl, marketplaceNames } from '../services/salesChannels';
export function RequiredActions({workspace:w}:{workspace:Workspace}){
 const active=(w.experiments||[]).filter(e=>!e.ended&&offerContext(e));
 const items=active.flatMap(e=>{
  const c=offerContext(e)!,href=offerUrl(c.factoryId,c.channel,e.id),sample=w.missions.find(m=>m.id===e.validation?.sampleId);
  const rows:{key:string;title:string;detail:string;href:string}[]=[];
  if(c.channel==='etsy'&&!w.etsy?.connected)rows.push({key:e.id+'etsy',title:'Etsy · autorização necessária',detail:'Autorize uma vez para publicar pela API, ou continue no fluxo assistido.',href:'/agentes/conexoes#etsy'});
  if(e.marketplace?.etsy?.status==='uncertain')rows.push({key:e.id+'uncertain',title:'Etsy · envio sem confirmação',detail:'Confira o listing existente antes de repetir qualquer operação.',href});
  else if(sample?.status==='review'&&(!e.validationReadiness?.qualityCurrent||!e.originalityCurrent))rows.push({key:e.id+'review',title:'Revisão necessária',detail:`${e.name}: confira qualidade, referências e originalidade da versão atual.`,href});
  else if(e.marketplace&&!e.marketplace.publication)rows.push({key:e.id+'publish',title:`${marketplaceNames[c.channel as keyof typeof marketplaceNames]} · oferta aguardando publicação`,detail:c.channel==='fiverr'?'O Gig está preparado. Publique e registre sua URL.':'Revise a oferta e autorize sua publicação.',href});
  else if(e.marketplace?.publication&&!e.marketplaceMetrics)rows.push({key:e.id+'results',title:'Resultado ainda desconhecido',detail:`${e.name}: sincronize os dados disponíveis ou registre o que aconteceu.`,href});
  return rows;
 });
 return <section className="aw-panel sc-required" aria-label="Ações necessárias"><h2>Ações necessárias</h2>{items.length?items.slice(0,8).map(i=><article className="sc-summary" key={i.key}><h3>{i.title}</h3><p>{i.detail}</p><Link className="aw-button aw-secondary" to={i.href}>Continuar</Link></article>):<p>✓ Nenhuma ação necessária pendente. {(w.autonomy.projects.some(p=>['active','planning'].includes(p.status))||w.missions.some(m=>['queued','running'].includes(m.status)))?'Há um ciclo autorizado em andamento.':'Nenhum ciclo automático em execução; escolha um teste para começar.'}</p>}<small>Descoberta e produção usam limites existentes. Publicação Etsy exige revisão; Fiverr exige sua etapa externa. O sistema ainda opera em nível assistido, sem alegar autonomia completa.</small><details><summary>Níveis de automação</summary><p>0 · Manual: você executa as etapas. 1 · Preparado: o sistema gera materiais. 2 · Assistido: gera, integra e pede intervenções. 3 · Automático: produz, publica e acompanha via APIs dentro de regras. 4 · Autônomo controlado: Astra escolhe e executa testes dentro de orçamento.</p><p>Hoje, o fluxo completo é assistido. A Etsy oferece publicação por API autorizada por oferta e sincronização sob demanda; Fiverr exige publicação e atendimento externos. Nenhum canal é apresentado como nível 4.</p></details></section>;
}
