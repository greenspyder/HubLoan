import { Link } from 'react-router-dom';
import type { Workspace } from '../services/agentApi';
const money=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function EconomicOverview({workspace:w}:{workspace:Workspace}) {
 const experiments=w.experiments||[];
 const external=experiments.filter(e=>e.marketplace);
 const revenue=external.reduce((n,e)=>n+(e.marketplaceMetrics?.grossMinor||0),0);
 const costs=experiments.reduce((n,e)=>n+e.metrics.costMinor,0);
 const complete=experiments.length>0&&experiments.every(e=>e.metrics.costComplete&&(!e.marketplace||e.marketplaceMetrics));
 const result=complete?experiments.reduce((n,e)=>n+(e.marketplace?e.marketplaceMetrics!.resultMinor!:e.metrics.resultMinor!),0):null;
 const best=(w.factories||[]).filter(f=>f.resultMinor!==null&&f.resultMinor>0).sort((a,b)=>b.resultMinor!-a.resultMinor!)[0];
 const metrics=[['Receita Stripe confirmada',money(w.shop?.metrics.grossMinor||0),'Loja inteira; não somar novamente aos experimentos'],['Receita externa declarada',money(revenue),'Fiverr/Etsy/itch.io; sem verificação pela API'],['Custos registrados',money(costs),'Somente experimentos; não inclui reservas de IA'],['Resultado dos experimentos',result===null?'A apurar':money(result),'Escopo dos testes; não é lucro total da aplicação'],['Vendas registradas',String((w.shop?.metrics.purchases||0)+external.reduce((n,e)=>n+(e.marketplaceMetrics?.sales||0),0)),'Stripe + relatos externos separados nos testes'],['Experimentos ativos',String(experiments.filter(e=>!e.ended).length),'Uma hipótese pequena antes de expandir']];
 return <section className="aw-panel"><h2>Primeira venda, depois escala</h2><p>Demanda → oferta pequena → distribuição → venda → resultado → próximo teste.</p><div className="aw-metrics">{metrics.map(([label,value,detail])=><article className="aw-metric" key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div><p>Melhor resultado positivo registrado: <strong>{best?best.name:'A apurar'}</strong>. Compare também período, canal e confiança dos dados.</p><Link className="aw-button" to="/agentes/vendas#experiments">Preparar primeira oferta / registrar resultado</Link></section>;
}
