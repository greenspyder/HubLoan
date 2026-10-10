import { AppError, text } from './domain.mjs';
import { releaseVersion } from './shop-release.mjs';
export function authorizeItchRelease(w, m, input, now = Date.now()) {
  const c = w.commerce, target = c?.targets?.[m.kind];
  if (m.status !== 'approved' || m.purpose === 'experiment-preparation' || m.artifact?.mime !== 'application/zip') throw new AppError('Aprove a qualidade do pack no Armazém antes de autorizar o upload.',409);
  if (!c?.secret || !c.license || !target) throw new AppError('Configure destino e licença itch.io.');
  if (input.authorize !== true || input.version !== releaseVersion(m)) throw new AppError('Autorize explicitamente a versão atual.',409);
  if (!Number.isSafeInteger(input.priceMinor) || input.priceMinor < 1 || input.priceMinor > 10000000 || !/^[A-Z]{3}$/.test(input.currency || '')) throw new AppError('Informe preço positivo em centavos e moeda da página.');
  m.itchRelease = { version: releaseVersion(m), targetId: target.id, targetUrl: target.url, license: c.license, priceMinor: input.priceMinor, currency: input.currency,
    rationale: text(input.rationale, 'Justificativa e incerteza do preço', 1200), origin: 'owner-authorized', at: new Date(now).toISOString(), expiresAt: now + 72 * 3600000 };
  m.events.push({at:new Date(now).toISOString(),message:'Upload itch.io autorizado para esta versão, destino, preço declarado e licença. Preço externo não alterado nem verificado pela API.'});
}
export function itchReleaseCurrent(w, m, now = Date.now()) {
  const r = m.itchRelease, c = w.commerce, target = c?.targets?.[m.kind];
  return Boolean(m.status === 'approved' && m.purpose !== 'experiment-preparation' && r?.origin === 'owner-authorized' && r.version === releaseVersion(m) && r.expiresAt > now && r.targetId === target?.id && r.targetUrl === target?.url && r.license === c?.license && Number.isSafeInteger(r.priceMinor) && r.priceMinor > 0 && /^[A-Z]{3}$/.test(r.currency));
}
