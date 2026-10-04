import { Link } from 'react-router-dom';
import { ArrowUpRight, Wallet, Receipt, ShoppingBag, Scale } from 'lucide-react';
import type { Workspace } from '../services/agentApi';
import { brl, economicView } from '../services/businessView';

export function EconomicOverview({ workspace }: { workspace: Workspace }) {
  const e = economicView(workspace);
  const stripeBRL = e.confirmed?.currency?.toLowerCase() === 'brl';
  const revenue = e.declared + (stripeBRL ? e.confirmed!.grossMinor : 0);
  const observed = Boolean(e.confirmed || (workspace.experiments || []).some(t => t.marketplaceMetrics));
  const cards = [
    { label: 'Receita registrada', value: observed ? brl(revenue) : 'Sem dados', detail: 'Confirmada + declarada em R$', icon: Wallet },
    { label: 'Custos registrados', value: brl(e.costs), detail: 'Despesas declaradas nos testes', icon: Receipt },
    { label: 'Resultado dos testes', value: e.result === null ? 'A apurar' : brl(e.result), detail: e.result === null ? 'Depende de dados e custos completos' : 'Após reembolsos e custos revisados', icon: Scale },
    { label: 'Vendas registradas', value: String(e.sales), detail: `${e.active} teste${e.active === 1 ? '' : 's'} em observação`, icon: ShoppingBag },
  ];
  return <section className="bh-economy" aria-label="Finanças reais">
    <div className="bh-finances">{cards.map(c => <article key={c.label}><div><span>{c.label}</span><c.icon size={19} /></div><strong className={c.label === 'Resultado dos testes' && e.result !== null ? e.result > 0 ? 'bh-positive' : e.result < 0 ? 'bh-negative' : '' : ''}>{c.value}</strong><small>{c.detail}</small></article>)}</div>
    <details className="bh-data-note"><summary>De onde vêm os valores?</summary><p>Receita bruta da loja Stripe: {e.confirmed ? (e.confirmed.grossMinor / 100).toLocaleString('pt-BR', { style: 'currency', currency: e.confirmed.currency || 'BRL' }) : 'Sem dados'}. Receita externa declarada por você: {brl(e.declared)}; não verificada por API. Moedas diferentes não são somadas. Compras de teste não contam.</p><p>Custos e resultado cobrem somente os experimentos registrados, não toda a aplicação. Reservas de API não são despesas faturadas. Sem revisão completa, o resultado fica “A apurar”. {e.pendingObservations > 0 && `${e.pendingObservations} teste(s) externo(s) ainda sem observação de vendas.`}</p><Link to="/agentes/vendas#experiments">Conferir lançamentos <ArrowUpRight size={14} /></Link></details>
  </section>;
}
