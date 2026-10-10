import { projectCostScope } from './ai-costs.mjs';
import { itchReadiness } from './itch-readiness.mjs';
// Projection only: no second project ledger and no LLM calls to refresh the screen.
export function firstSaleSummary(w, project) {
  const { ids: _ids, ...costs } = projectCostScope(w, project.id);
  const experiments=(w.experiments || []).filter(e=>e.projectId===project.id);
  const missions=(w.missions || []).filter(m=>m.projectId===project.id || experiments.some(e=>e.missionIds.includes(m.id)));
  const latest=project.decisions?.at(-1), readiness=itchReadiness(w);
  const experiment=experiments.find(e=>!e.closedAt) || experiments.at(-1);
  let next={code:'research',label:'Iniciar descoberta dentro do orçamento',href:'/agentes/producao#autonomy'};
  if(project.error) next={code:'blocked',label:project.error,href:'/agentes/producao#autonomy'};
  else if(missions.some(m=>['failed','cancelled'].includes(m.status))) next={code:'resume',label:'Retomar entrega interrompida preservando checkpoints',href:'/agentes/armazem'};
  else if(missions.some(m=>m.status==='review')) next={code:'review',label:'Revisar qualidade antes de qualquer nova produção',href:'/agentes/armazem'};
  else if(missions.some(m=>['queued','running'].includes(m.status)) || ['active','planning'].includes(project.status)) next={code:'working',label:project.phase,href:'/agentes/producao#autonomy'};
  else if(readiness.paymentReadiness!=='owner-reported-ready') next={code:'payments',label:readiness.nextAction,href:'/agentes/conexoes#commerce'};
  else if(experiment) next={code:'offer',label:'Continuar oferta e registrar resultados; não produzir mais estoque',href:experiment.salesChannel ? `/agentes/oferta?experiment=${experiment.id}` : '/agentes/vendas#experiments'};
  else if(latest) next={code:latest.selected?'experiment':'evidence',label:latest.selected?'Revisar hipótese e preparar um teste pequeno':'Revisar evidências; nenhuma hipótese selecionada',href:'/agentes/producao#autonomy'};
  if(next.code==='offer') {
    const uploaded=missions.find(m=>m.publication?.status==='uploaded');
    const page=uploaded && w.commerce?.games?.find(g=>g.id===uploaded.publication.target?.id);
    if(uploaded && !page?.published) next={...next,code:'visibility',label:'Upload não torna a página pública: confira visibilidade, preço e compra no itch.io'};
    else if(page?.published) {
      if(page.views===0) next={...next,code:'distribution',label:'Página sem visitas registradas: preparar divulgação permitida; diagnóstico ainda é hipótese'};
      else if(page.views>0 && page.purchases===0) next={...next,code:'conversion',label:'Há visitas históricas sem compras: investigar público, oferta e preço antes de produzir mais'};
      else next={...next,code:'measure',label:'Conferir período, compras independentes, taxas e custos antes de declarar lucro'};
    }
  }
  return { costs, budgetMinor:project.budgetMinor ?? null, remainingMinor:project.budgetMinor==null?null:Math.max(0,project.budgetMinor-costs.exposureMinor-costs.declaredMinor), next,
    experimentIds:experiments.map(e=>e.id), missionIds:missions.map(m=>m.id),
    netProfitMinor:null, note:'Custos confirmados e exposição não conciliada são distintos. Totais históricos do itch.io não comprovam receita deste projeto nem comprador independente. Lucro e recorrência: a apurar.' };
}
