import { normalizeReferences, referenceComparison } from './market-references.mjs';
import { assessOpportunity } from './opportunities.mjs';
import { SPECIALIZATIONS } from './specializations.mjs';
import { AppError, text } from './domain.mjs';

export const marketGoal = 'Aumentar o patrimônio do proprietário buscando lucro real: descobrir oportunidades atuais de estratégias e produtos originais, comparar demanda, custos, viabilidade e distribuição e escolher automaticamente a próxima hipótese para testar comercialmente.';
export function marketSettings(input = {}) {
  if (input.allowImages !== undefined && typeof input.allowImages !== 'boolean') throw new AppError('Permissão de imagens inválida.');
  if (input.scope !== undefined && !['products', 'broad'].includes(input.scope)) throw new AppError('Escopo de descoberta inválido.');
  if (input.allowPreparation !== undefined && typeof input.allowPreparation !== 'boolean') throw new AppError('Permissão de preparação inválida.');
  const specialties = input.specializations;
  if (specialties !== undefined && (!Array.isArray(specialties) || !specialties.length || specialties.some(kind => !SPECIALIZATIONS[kind]))) throw new AppError('Escolha especializações válidas.');
  return { scope: input.scope || 'products', allowPreparation: input.allowPreparation === true, specializations: specialties ? [...new Set(specialties)] : undefined, allowImages: input.allowImages === true, market: text(input.market || 'Brasil, português brasileiro', 'Mercado e idioma', 200), channels: text(input.channels || 'Publicação manual em uma loja de produtos digitais', 'Canais disponíveis', 500), restrictions: text(input.restrictions || 'Sem anúncios pagos, sem compras, sem copiar produtos de terceiros.', 'Restrições', 1000) };
}
export function parseMarketDecision(output, sources, previous = [], allowed = ['text', 'image'], execution = null) {
  let parsed;
  try { parsed = JSON.parse(output.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { throw new AppError('Análise de mercado inválida. Ciclo pausado sem produzir.'); }
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length < 3 || parsed.candidates.length > 5) throw new AppError('A análise precisa comparar de três a cinco oportunidades.');
  const urls = new Set(sources.map(source => source.url));
  const references=normalizeReferences(parsed.references||[],sources);

  const candidates = parsed.candidates.map((candidate, index) => {
    const scores = {};
    for (const criterion of ['demand', 'competition', 'feasibility', 'distribution', 'evidence']) {
      const value = candidate.scores?.[criterion];
      if (!Number.isInteger(value) || value < 0 || value > 5) throw new AppError('Pontuação de mercado inválida.');
      scores[criterion] = value;
    }
    if (!Array.isArray(candidate.sourceUrls) || !candidate.sourceUrls.length || candidate.sourceUrls.some(url => !urls.has(url))) throw new AppError('A análise citou fontes que não foram retornadas pela pesquisa.');
    const referenceUrls=candidate.referenceUrls||[];if(!Array.isArray(referenceUrls)||referenceUrls.some(url=>!references.some(r=>r.url===url)))throw new AppError('Referências do candidato inválidas.');
    const marketReferences=references.filter(r=>referenceUrls.includes(r.url)),marketComparison=referenceComparison(marketReferences);
    const score = Math.round((scores.demand * 0.25 + scores.competition * 0.15 + scores.feasibility * 0.25 + scores.distribution * 0.15 + scores.evidence * 0.2) * 20);
    if (!allowed.includes(candidate.kind)) throw new AppError('Formato de oportunidade inválido.');
    return { marketReferences,marketComparison,id: `option-${index + 1}`, title: text(candidate.title, 'Oportunidade', 100), audience: text(candidate.audience, 'Público', 300), rationale: text(candidate.rationale, 'Justificativa', 1000), uncertainty: text(candidate.uncertainty, 'Incerteza', 800), test: text(candidate.test, 'Teste comercial', 800), kind: candidate.kind, ...(execution ? assessOpportunity(candidate, execution.capabilities, execution.allowPreparation) : {}), scores, score, sourceUrls: [...new Set(candidate.sourceUrls)] };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // Scores are model estimates. Gate production when evidence or feasibility is weak.
  const signature = candidate => `${candidate.title} ${candidate.audience}`.normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
  const produced = new Set(previous.map(signature));
  const eligible = candidates.filter(candidate => !candidate.execution || candidate.execution.status !== 'blocked');
  // Prefer fully executable strategies over preparation, regardless of claimed scores.
  const prioritized = [...eligible.filter(c => c.execution?.status !== 'preparation'), ...eligible.filter(c => c.execution?.status === 'preparation')];
  const best = prioritized.find(candidate => !produced.has(signature(candidate)) && candidate.scores.evidence >= 2 && candidate.scores.feasibility >= 3 && candidate.scores.distribution >= 2 && candidate.score >= 50 && (!references.length || candidate.marketComparison.sufficient || candidate.execution?.status==='preparation'));
  return { candidates, selected: best && best.scores.evidence >= 2 && best.scores.feasibility >= 3 && best.scores.distribution >= 2 && best.score >= 50 ? best : null };
}
export function recordExperiment(workspace, projectId, decisionId, input, now = Date.now()) {
  const project = workspace.autonomy.projects.find(project => project.id === projectId);
  const decision = project?.decisions?.find(decision => decision.id === decisionId);
  if (!decision?.selected) throw new AppError('Experimento não encontrado.', 404);
  if (workspace.missions.some(mission => mission.projectId === projectId && ['queued', 'running'].includes(mission.status)) || project.status === 'planning') throw new AppError('Aguarde a tarefa em andamento antes de registrar resultados.', 409);
  const values = {};
  for (const field of ['visits', 'sales', 'revenue', 'cost']) {
    const value = input[field];
    if (!Number.isFinite(value) || value < 0 || value > 100000000 || (['visits', 'sales'].includes(field) && !Number.isInteger(value))) throw new AppError('Resultados devem ser números não negativos válidos.');
    values[field] = value;
  }
  if (values.sales > values.visits || (!values.sales && values.revenue > 0)) throw new AppError('Vendas e receita inconsistentes com as visitas informadas.');
  const evidence = text(input.evidence, 'Referência do resultado', 1000);
  // These are user reports, never verified or invented marketplace events.
  decision.feedback = { ...values, currency: 'BRL', evidence, origin: 'user_report', recordedAt: new Date(now).toISOString(), net: Math.round((values.revenue - values.cost) * 100) / 100 };
  project.events.push({ at: new Date(now).toISOString(), message: `Resultado informado pelo usuário para ${decision.selected.title}; não verificado por integração.` });
}
