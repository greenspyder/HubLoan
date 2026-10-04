import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Map, Plus, Warehouse } from 'lucide-react';
import type { Workspace } from '../services/agentApi';
import { EconomicOverview } from './EconomicOverview';
import { FactoryCards } from './FactoryCards';
import { RobotSprite } from './RobotSprite';
import { StationMap } from './StationMap';
import { brl, economicView, factoryUrl } from '../services/businessView';
import '../business-home.css';

export function BusinessHome({ workspace: w, onSelect }: { workspace: Workspace; onSelect: (id: string) => void }) {
  const navigate = useNavigate();
  const decisions = w.autonomy.projects.flatMap(p => (p.decisions || []).map(d => ({ ...d, projectName: p.name }))).sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const latest = decisions[0];
  const planning = w.autonomy.projects.find(p => p.status === 'planning');
  const review = w.missions.filter(m => m.status === 'review');
  const e = economicView(w);
  const best = (w.factories || []).filter(f => f.resultMinor !== null && f.resultMinor > 0).sort((a, b) => b.resultMinor! - a.resultMinor!)[0];
  const next = review.length ? { title: `${review.length} entrega${review.length === 1 ? '' : 's'} esperando sua revisão`, body: 'Confira a qualidade antes de colocar uma oferta à venda.', label: 'Abrir armazém', href: '/agentes/armazem' } : !w.experiments?.length ? { title: 'Seu próximo marco: a primeira oferta', body: 'Escolha um público, um canal e um teste pequeno. Planejar não consome API.', label: 'Planejar primeiro teste', href: '/agentes/vendas#experiments' } : e.pendingObservations ? { title: 'Registre o que aconteceu no marketplace', body: 'Informe visitas e vendas observadas, mesmo quando forem zero. O teste precisa de evidências.', label: 'Registrar resultados', href: '/agentes/vendas#experiments' } : e.result === null ? { title: 'Descubra o resultado dos seus testes', body: 'Revise os custos de API, taxas e trabalho para apurar o resultado.', label: 'Conferir custos', href: '/agentes/vendas#experiments' } : { title: 'Decida o próximo teste com evidências', body: 'Compare resultados, período e canal antes de aumentar a produção.', label: 'Comparar testes', href: '/agentes/vendas#experiments' };
  return <div className="business-home">
    <header className="bh-hero"><div><p className="aw-eyebrow">SEUS NEGÓCIOS, EM UM SÓ LUGAR</p><h1>Pequenos testes.<br /><span>Negócios de verdade.</span></h1><p>Administre suas fábricas. Valide a demanda. Acompanhe o resultado.</p></div><Link className="bh-warehouse" to="/agentes/armazem"><Warehouse size={25} /><span><strong>Armazém</strong><small>{review.length ? `${review.length} para revisar` : 'Arquivos e entregas'}</small></span><ChevronRight size={18} /></Link></header>
    <EconomicOverview workspace={w} />
    <section className="bh-manager" aria-label="Astra, gestor dos negócios"><div className="bh-astra-avatar"><RobotSprite commander role="coordinator" delivery={false} /></div><div className="bh-manager-copy"><p className="aw-eyebrow">ASTRA · GESTOR / CEO</p><h2>{planning ? 'Analisando o próximo movimento' : latest ? 'Última decisão registrada' : 'Vamos validar o primeiro negócio'}</h2><p>{planning ? `${planning.name}: ${planning.phase}` : latest ? latest.selected ? latest.selected.title : 'Nenhuma oportunidade passou pelos critérios da última análise.' : 'Ainda não há análise comercial registrada. Comece por uma oferta pequena e compradores alcançáveis.'}</p>{latest && !planning && <small>{new Date(latest.observedAt).toLocaleString('pt-BR')} · {latest.projectName}</small>}<Link to="/agentes/avancado#astra">{latest ? 'Ver decisão e evidências' : 'Ver como Astra decide'} <ArrowRight size={15} /></Link></div><div className="bh-next"><span>PRÓXIMA AÇÃO SUGERIDA PELO PAINEL</span><h3>{next.title}</h3><p>{next.body}</p><Link className="aw-button" to={next.href}>{next.label} <ArrowRight size={15} /></Link></div></section>
    {!w.settings.configured && <p className="bh-setup-note">Você já pode planejar testes. Para pesquisar ou produzir com IA, <Link to="/agentes/conexoes#settings">conecte sua chave</Link> e revise o limite de gastos.</p>}
    <section className="bh-businesses" aria-labelledby="businesses-title"><div className="bh-section-heading"><div><p className="aw-eyebrow">CADA FÁBRICA É UM NEGÓCIO</p><h2 id="businesses-title">Suas fábricas</h2></div><Link to="/agentes/base#factories"><Plus size={16} /> Gerenciar negócios</Link></div><FactoryCards workspace={w} /><p className="bh-scope">Marcos mostram registros existentes, não uma previsão de lucro. Valores por fábrica cobrem apenas testes atribuídos a ela. Receita externa é declarada por você.</p></section>
    {best && <aside className="bh-best"><span>Maior resultado positivo registrado nos testes</span><Link to={factoryUrl(best.id)}>{best.name} · {brl(best.resultMinor!)} <ArrowRight size={16} /></Link><small>Compare períodos e canais antes de decidir onde investir.</small></aside>}
    <details className="bh-map"><summary><Map size={21} /><span><strong>Seu distrito de negócios</strong><small>Mapa 2D das operações reais · abrir para explorar</small></span><ChevronRight size={19} /></summary><StationMap workspace={w} onSelect={onSelect} onFactory={id => navigate(factoryUrl(id))} compact /></details>
  </div>;
}
