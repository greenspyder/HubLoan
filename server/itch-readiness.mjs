import { AppError, text } from './domain.mjs';
const fields = ['seller', 'taxInterview', 'taxApproval', 'payoutDestination', 'acceptsPayments'];
// These account states are not returned by the catalog API. Never infer them from a key/upload.
export function recordItchReadiness(w, input, now = Date.now()) {
  if (!w.commerce?.secret) throw new AppError('Conecte itch.io antes de registrar a conferência.');
  const checks = {};
  for (const field of fields) {
    if (!['unknown', 'pending', 'confirmed', 'not_applicable'].includes(input.checks?.[field])) throw new AppError('Estado de conferência inválido.');
    checks[field] = input.checks[field];
  }
  if (checks.acceptsPayments === 'not_applicable' || checks.seller === 'not_applicable') throw new AppError('Conta de vendedor e pagamentos precisam ser conferidos.');
  const record = { checks, note: text(input.note, 'O que foi conferido no painel itch.io', 600), origin: 'owner-reported', checkedAt: new Date(now).toISOString() };
  w.commerce.readinessHistory = [...(w.commerce.readinessHistory || []), record].slice(-50);
  w.commerce.readiness = record;
}
export function itchReadiness(w, now = Date.now()) {
  const c = w.commerce || {}, record = c.readiness;
  const fresh = Boolean(record && Date.parse(record.checkedAt) <= now && now - Date.parse(record.checkedAt) < 30 * 86400000);
  const checks = Object.fromEntries(fields.map(field => [field, record?.checks?.[field] || 'unknown']));
  return { checks, origin: record?.origin || 'unverified', checkedAt: record?.checkedAt, note: record?.note || '', stale: Boolean(record && !fresh),
    paymentReadiness: !c.secret ? 'disconnected' : fresh && checks.seller === 'confirmed' && checks.acceptsPayments === 'confirmed' ? 'owner-reported-ready' : 'needs-check',
    apiVerifiedPayments: false,
    nextAction: !c.secret ? 'Conectar itch.io' : !fresh || checks.seller !== 'confirmed' || checks.acceptsPayments !== 'confirmed' ? 'Conferir conta de vendedor e aceitação de pagamentos no itch.io' : 'Revisar oferta, preço, licença e página comprável; prontidão informada pelo proprietário',
    noteOnScope: 'Entrevista fiscal, aprovação e repasse são estados separados. O Stripe da loja própria não determina os pagamentos do itch.io.' };
}
