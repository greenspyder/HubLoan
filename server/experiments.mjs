import { randomUUID, createHash } from 'node:crypto';
import { AppError, text } from './domain.mjs';
const categories = ['api', 'fees', 'taxes', 'ads', 'labor', 'hosting', 'other'];
function integer(value, name, min = 0, max = 100000000) { if (!Number.isSafeInteger(value) || value < min || value > max) throw new AppError(`${name}: valor inteiro inválido.`); return value; }
function find(w, id) { const e = w.experiments?.find(e => e.id === id); if (!e) throw new AppError('Experimento não encontrado.', 404); return e; }
function scope(w, e) {
  const products = new Set((w.shop?.products || []).filter(p => e.missionIds.includes(p.missionId)).map(p => p.id));
  const end = Date.parse(e.closedAt || e.endsAt);
  const orders = (w.shop?.orders || []).filter(o => products.has(o.productId) && o.paidAt && o.livemode === true && o.currency === 'brl' && Date.parse(o.paidAt) >= Date.parse(e.createdAt) && Date.parse(o.paidAt) <= end);
  const missions = w.missions.filter(m => e.missionIds.includes(m.id));
  const fingerprint = createHash('sha256').update(JSON.stringify({ orders: orders.map(o => [o.id, o.priceMinor, o.refundedMinor || 0, o.status]), missions: missions.map(m => [m.id, m.attempt, m.tokens, m.images, m.status, m.events.length]), costs: e.costs.map(c => [c.id, c.voidedAt || '']) })).digest('hex');
  return { orders, missions, fingerprint };
}
export function createExperiment(w, input, now = Date.now()) {
  w.experiments ||= [];
  if (w.experiments.length >= 50) throw new AppError('Limite de 50 experimentos.');
  const days = integer(input.days, 'Prazo', 1, 90);
  const ids = input.missionIds;
  if (!Array.isArray(ids) || ids.length > 30 || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new AppError('Seleção de entregas inválida.');
  for (const id of ids) { if (!w.missions.some(m => m.id === id && m.purpose !== 'experiment-preparation')) throw new AppError('Escolha entregas deste espaço, sem kits privados.'); if (w.experiments.some(e => e.missionIds.includes(id))) throw new AppError('Uma entrega só pode pertencer a um experimento.', 409); }
  const e = { id: randomUUID(), name: text(input.name, 'Nome', 100), hypothesis: text(input.hypothesis, 'Hipótese', 1000), audience: text(input.audience, 'Público', 300), channel: text(input.channel, 'Canal', 200), budgetMinor: integer(input.budgetMinor, 'Orçamento', 1), minSales: integer(input.minSales, 'Meta de vendas', 1, 10000), minNetMinor: integer(input.minNetMinor, 'Meta de resultado'), missionIds: ids, createdAt: new Date(now).toISOString(), endsAt: new Date(now + days * 86400000).toISOString(), costs: [], review: null };
  w.experiments.unshift(e); return e;
}
export function experimentAction(w, id, action, input = {}, now = Date.now()) {
  const e = find(w, id);
  if (action === 'cost') {
    if (e.costs.length >= 500) throw new AppError('Limite de 500 lançamentos.');
    if (!categories.includes(input.category)) throw new AppError('Categoria inválida.');
    e.costs.unshift({ id: randomUUID(), amountMinor: integer(input.amountMinor, 'Custo', 1), category: input.category, note: text(input.note, 'Descrição', 300), recordedAt: new Date(now).toISOString(), origin: 'owner-declared' }); e.review = null;
  } else if (action === 'void') { const c = e.costs.find(c => c.id === input.costId); if (!c) throw new AppError('Custo não encontrado.', 404); if (c.voidedAt) throw new AppError('Lançamento já estornado.', 409); c.voidedAt = new Date(now).toISOString(); e.review = null;
  } else if (action === 'link') { if (e.closedAt || now >= Date.parse(e.endsAt)) throw new AppError('Vincule entregas antes de encerrar o teste.', 409); const mission = w.missions.find(m => m.id === input.missionId && m.purpose !== 'experiment-preparation'); if (!mission) throw new AppError('Entrega não encontrada.', 404); if (e.missionIds.length >= 30 || w.experiments.some(x => x.missionIds.includes(mission.id))) throw new AppError('Entrega já vinculada ou limite atingido.', 409); e.missionIds.push(mission.id); e.review = null;
  } else if (action === 'review') { if (input.complete !== true) throw new AppError('Confirme a revisão de todas as categorias de custo.'); const s = scope(w, e); if (s.missions.some(m => ['queued', 'running'].includes(m.status))) throw new AppError('Aguarde a produção terminar para revisar os custos.', 409); e.review = { at: new Date(now).toISOString(), fingerprint: s.fingerprint };
  } else if (action === 'close') { if (e.closedAt) throw new AppError('Experimento já encerrado.', 409); e.closedAt = new Date(Math.min(now, Date.parse(e.endsAt))).toISOString(); e.review = null;
  } else throw new AppError('Ação inválida.');
}
export function publicExperiments(w, now = Date.now()) {
  return (w.experiments || []).map(e => {
    const { orders, missions, fingerprint } = scope(w, e);
    const grossMinor = orders.reduce((n, o) => n + o.priceMinor, 0);
    const refundedMinor = orders.reduce((n, o) => n + Math.min(o.priceMinor, Math.max(0, o.refundedMinor || 0)), 0);
    const heldMinor = orders.reduce((n, o) => n + (o.status === 'revoked' ? Math.max(0, o.priceMinor - (o.refundedMinor || 0)) : 0), 0);
    const sales = orders.filter(o => o.status !== 'revoked' && (o.refundedMinor || 0) < o.priceMinor).length;
    const costMinor = e.costs.filter(c => !c.voidedAt).reduce((n, c) => n + c.amountMinor, 0);
    const costComplete = Boolean(e.review?.fingerprint === fingerprint && !missions.some(m => ['queued', 'running'].includes(m.status)));
    const balanceMinor = grossMinor - refundedMinor - heldMinor - costMinor;
    const ended = Boolean(e.closedAt || now >= Date.parse(e.endsAt));
    const recommendation = costMinor >= e.budgetMinor ? 'budget' : !costComplete ? 'incomplete' : sales >= e.minSales && balanceMinor >= e.minNetMinor ? 'validated' : ended ? 'stop' : 'observe';
    const { review, ...safe } = e;
    return { ...safe, reviewedAt: review?.at, currency: 'BRL', ended, metrics: { grossMinor, refundedMinor, heldMinor, sales, costMinor, balanceMinor, costComplete, resultMinor: costComplete ? balanceMinor : null, recommendation, budgetRemainingMinor: e.budgetMinor - costMinor } };
  });
}
