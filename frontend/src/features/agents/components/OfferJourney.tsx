import { MarketReferences, OriginalityReview } from './MarketReferences';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { agentApi, type Workspace, type Factory } from '../services/agentApi';
import { channelState, existingOffer, factoryChannels, marketplaceNames, offerContext, offerUrl, publicationState, type MarketplaceId } from '../services/salesChannels';
import { FirstSaleValidation } from './FirstSaleValidation';
import { MarketplaceOffer } from './MarketplaceOffer';
import { ExperimentCard } from './ExperimentsPanel';
import '../marketplaces.css';

type Props = { workspace: Workspace; busy: boolean; mutate: (op: () => Promise<Workspace>, message?: string) => Promise<Workspace | null> };
export function OfferJourney(props: Props) {
  const { workspace: w, busy, mutate } = props;
  const location = useLocation(), navigate = useNavigate();
  const q = new URLSearchParams(location.search);
  const explicit = w.experiments?.find(e => e.id === q.get('experiment'));
  const context = explicit && offerContext(explicit);
  const factory = w.factories?.find(f => f.id === (context?.factoryId || q.get('factory')));
  const channel = (context?.channel || q.get('channel')) as MarketplaceId;
  const valid = factory && factoryChannels(factory).includes(channel);
  const experiment = explicit || (valid ? existingOffer(w, factory.id, channel) : undefined);
  const [stage, setStage] = useState(experiment ? experiment.ended || experiment.marketplace?.publication || experiment.marketplaceMetrics ? 4 : experiment.validationReadiness?.qualityCurrent && experiment.marketplace ? 3 : experiment.marketplace && experiment.validation?.sampleId ? 2 : 1 : 0), [error, setError] = useState('');
  const state = channelState(w, channel, factory);
  if (!valid) return <section className="aw-panel"><h2>Escolha um negócio e um canal</h2><Link className="aw-button" to="/agentes/vendas">Ver canais de venda</Link></section>;
  const sample = w.missions.find(m => m.id === experiment?.validation?.sampleId);
  const checks = [Boolean(experiment), Boolean(experiment?.marketplace && sample), Boolean(experiment?.validationReadiness?.qualityCurrent), Boolean(experiment?.marketplace?.publication || experiment?.marketplaceMetrics || sample?.publication?.status === 'uploaded'), Boolean(experiment?.marketplaceMetrics && experiment.metrics.costComplete)];
  async function start(event: React.SubmitEvent<HTMLFormElement>, f: Factory) {
    event.preventDefault(); setError('');
    const d = new FormData(event.currentTarget);
    const budget = String(d.get('budget'));
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(budget) || Number(budget.replace(',', '.')) <= 0) { setError('Informe um orçamento maior que zero, com até duas casas decimais.'); return; }
    const before = new Set(w.experiments?.map(e => e.id));
    const result = await mutate(() => agentApi.addExperiment({ name: String(d.get('name')), hypothesis: String(d.get('hypothesis')), audience: String(d.get('audience')), channel: marketplaceNames[channel], days: Number(d.get('days')), budgetMinor: Math.round(Number(budget.replace(',', '.')) * 100), minSales: 1, minNetMinor: 1, missionIds: [], salesChannel: { factoryId: f.id, channel } }), 'Oferta iniciada. Validação ativada; nenhuma chamada de IA ou publicação realizada.');
    const created = result?.experiments?.find(e => !before.has(e.id) && offerContext(e)?.factoryId === f.id && offerContext(e)?.channel === channel);
    if (created) { navigate(offerUrl(f.id, channel, created.id), { replace: true }); setStage(1); }
  }
  return <section className="sc-journey aw-panel"><Link className="sc-back" to="/agentes/vendas">← Canais de venda</Link><div className="sc-journey-heading"><div><p className="aw-eyebrow">{factory.name} → {marketplaceNames[channel]}</p><h2>{channel === 'fiverr' ? 'Seu primeiro Gig no Fiverr' : `Seu listing no ${marketplaceNames[channel]}`}</h2><p>{publicationState(experiment)}</p></div><span className={`sc-status sc-${state.tone}`}>{state.label}</span></div><p className="aw-caption">{state.detail}</p>
    <nav className="sc-steps" aria-label="Etapas da oferta">{['Canal e teste', 'Oportunidade e oferta', 'Originalidade e revisão', 'Publicar', 'Resultado e aprendizado'].map((name, i) => <button key={name} disabled={!experiment && i > 0} aria-current={stage === i ? 'step' : undefined} onClick={() => setStage(i)}><span>{checks[i] ? '✓' : i + 1}</span>{name}<small>{checks[i] ? 'Registrado' : 'A conferir'}</small></button>)}</nav>
    {stage === 0 && <>{experiment ? <div className="sc-summary"><h3>{experiment.name}</h3><p>{experiment.audience} · {marketplaceNames[channel]}</p><p>Oferta vinculada à fábrica. O mesmo teste guarda os custos e resultados.</p><button className="aw-button" onClick={() => setStage(1)}>Continuar preparação</button></div> : <form className="aw-form sc-start" onSubmit={event => void start(event, factory)}><h3>O que você quer oferecer?</h3><p>Salvamos o teste comercial necessário e ativamos o Modo Primeira Venda. Meta inicial: uma venda retida e resultado positivo após revisar os custos.</p><label>Fábrica<input readOnly value={factory.name} /></label><label>Canal<select value={channel} onChange={event => navigate(offerUrl(factory.id, event.target.value))}>{factoryChannels(factory).map(c => <option key={c} value={c}>{marketplaceNames[c]}</option>)}</select></label><label>Nome da oferta<input name="name" required maxLength={100} defaultValue={`${factory.name} · primeira oferta`} /></label><label>Quem pode comprar?<input name="audience" required maxLength={300} placeholder="Ex.: canais pequenos de culinária no YouTube" /></label><label>O que vai oferecer e por que alguém compraria?<textarea name="hypothesis" required maxLength={1000} placeholder="Descreva uma oferta pequena para um problema observado." /></label><div className="aw-columns"><label>Orçamento do teste (R$)<input name="budget" required inputMode="decimal" placeholder="Ex.: 20,00" /></label><label>Prazo de observação (dias)<input name="days" type="number" min={1} max={90} defaultValue={7} required /></label></div><small>Este orçamento acompanha custos declarados. Os limites de execução da IA continuam nas conexões.</small><button className="aw-button" disabled={busy || !w.salesJourneyVersion}>Salvar e preparar {channel === 'fiverr' ? 'meu Gig' : 'meu listing'}</button>{!w.salesJourneyVersion && <p role="status">O servidor ainda está atualizando este fluxo. Aguarde a atualização antes de salvar.</p>}{error && <p role="alert">{error}</p>}</form>}</>}
    {experiment && <>{experiment.ended && <p className="aw-notice">Teste encerrado. Você pode registrar resultados e custos. Para outra oferta, volte aos canais e prepare um novo teste.</p>}{stage === 1 && <><MarketReferences {...props} experiment={experiment}/><FirstSaleValidation {...props} experiment={experiment} stage="prepare" /><MarketplaceOffer {...props} experiment={experiment} stage="prepare" /></>}{stage === 2 && <><MarketplaceOffer {...props} experiment={experiment} stage="review" /><FirstSaleValidation {...props} experiment={experiment} stage="review" /><OriginalityReview {...props} experiment={experiment}/></>}{stage === 3 && <MarketplaceOffer {...props} experiment={experiment} stage="publish" />}{stage === 4 && <><MarketplaceOffer {...props} experiment={experiment} stage="results" /><ExperimentCard {...props} experiment={experiment} financialOnly /></>}<div className="sc-journey-footer">{stage > 0 && <button className="aw-button aw-secondary" onClick={() => setStage(stage - 1)}>← Voltar</button>}{stage < 4 && <button className="aw-button" onClick={() => setStage(stage + 1)}>Próxima etapa →</button>}<Link to={`/agentes/vendas#experiment-${experiment.id}`}>Ver análise do teste</Link></div></>}
  </section>;
}
