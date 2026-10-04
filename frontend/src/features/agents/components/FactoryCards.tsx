import { Link } from 'react-router-dom';
import { ArrowRight, Box, Check, Film, Image, MonitorPlay, Palette, FileText, Wrench, Code } from 'lucide-react';
import type { Workspace, Factory } from '../services/agentApi';
import { brl, factoryUrl, factoryView } from '../services/businessView';

const icons = { text: FileText, thumbnail: MonitorPlay, sprites: Palette, model3d: Box, image: Image, video: Film, service: Wrench, software: Code };
const product = { text: 'Templates, guias e textos', thumbnail: 'Thumbnails para creators', sprites: 'Packs de assets 2D', model3d: 'Objetos e mobília 3D', image: 'Ilustrações originais', video: 'Conteúdo em vídeo', service: 'Serviços sob demanda', software: 'Software e automações' };

// Decorative building; no productivity animation or financial projection.
function Building({ kind }: { kind: Factory['kind'] }) {
  const Icon = icons[kind];
  return <div className={`bh-building bh-kind-${kind}`} aria-hidden="true"><svg viewBox="0 0 240 130"><ellipse cx="120" cy="116" rx="100" ry="10" fill="currentColor" opacity=".1" /><path d="M40 54 82 30l36 22 38-23 44 26v58H40z" fill="currentColor" opacity=".25" /><path d="M40 54h160v59H40z" fill="currentColor" opacity=".4" /><path d="M40 54 82 30v24m36-2 38-23v25" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /><path d="M175 38V13h15v34" fill="currentColor" opacity=".5" /><path d="M56 66h22v16H56zm34 0h22v16H90zm56 0h22v16h-22z" fill="currentColor" opacity=".8" /><path d="M120 86h60v27h-60z" fill="#102c29" /><path d="M127 94h46m-46 8h46" stroke="currentColor" strokeWidth="3" /><path d="M33 114h176" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg><span><Icon size={29} strokeWidth={1.8} /></span></div>;
}

export function FactoryCards({ workspace }: { workspace: Workspace }) {
  const factories = workspace.factories || [];
  return <div className="bh-factory-grid">{factories.map(f => {
    const v = factoryView(f, workspace);
    return <article className={`bh-factory bh-kind-${f.kind}`} key={f.id}>
      <div className="bh-factory-top"><span className={`bh-state bh-state-${v.state}`}><i />{v.status}</span><Link to={factoryUrl(f.id)} aria-label={`Ver detalhes de ${f.name}`} className="bh-detail-link">Detalhes <ArrowRight size={14} /></Link></div>
      <Building kind={f.kind} />
      <h3><Link to={factoryUrl(f.id)}>{f.name}</Link></h3><p className="bh-product">{product[f.kind]}</p>
      <p className="bh-channel">{f.channel}</p>
      <div className="bh-factory-finances"><div><span>Receita dos testes</span><strong>{v.hasObservation ? brl(f.grossMinor) : 'Sem dados'}</strong></div><div><span>Resultado</span><strong className={f.resultMinor !== null && f.resultMinor > 0 ? 'bh-positive' : f.resultMinor !== null && f.resultMinor < 0 ? 'bh-negative' : ''}>{f.resultMinor === null ? 'A apurar' : brl(f.resultMinor)}</strong></div></div>
      <div className="bh-operation-counts"><span>{v.sales} venda{v.sales === 1 ? '' : 's'} registrada{v.sales === 1 ? '' : 's'}</span><span>{f.delivered} entrega{f.delivered === 1 ? '' : 's'}</span></div>
      <ol className="bh-milestones" aria-label={`Marcos registrados de ${f.name}`}>{v.milestones.map(m => <li key={m.label} className={m.met ? 'is-met' : ''}><span>{m.met ? <Check size={11} /> : <i />}</span>{m.label}<span className="bh-sr-only">: {m.met ? 'registrado' : 'ainda não registrado'}</span></li>)}</ol>
      {f.mixedExperiments > 0 && <small className="bh-excluded">{f.mixedExperiments} teste(s) sem atribuição exclusiva; fora destes valores.</small>}
      <Link className="bh-card-action" to={v.action.href}>{v.action.label}<ArrowRight size={17} /></Link>
    </article>;
  })}{!factories.length && <p className="aw-notice">Nenhuma fábrica carregada. Seus negócios aparecerão aqui quando disponíveis.</p>}</div>;
}
