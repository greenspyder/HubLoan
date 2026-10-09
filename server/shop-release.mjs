import { createHash } from 'node:crypto';
import { AppError, text } from './domain.mjs';

export function releaseVersion(m) {
  return createHash('sha256').update(JSON.stringify([m.id,m.attempt,m.title,m.kind,m.output,m.artifact || null])).digest('hex');
}
export function approveShopRelease(w,m,input,now=Date.now()) {
  if(m.status!=='approved' || m.purpose==='experiment-preparation') throw new AppError('Aprove a qualidade da entrega no Armazém antes de autorizar a venda.',409);
  if(input.authorize!==true || input.version!==releaseVersion(m)) throw new AppError('Confira a versão atual e autorize explicitamente esta oferta.',409);
  if(!Number.isSafeInteger(input.priceMinor)||input.priceMinor<500||input.priceMinor>1000000) throw new AppError('Informe o preço desta oferta entre R$ 5 e R$ 10.000.');
  if(!w.shop?.license || !w.shop?.slug) throw new AppError('Configure a loja e a licença antes de autorizar.');
  const experiment=w.experiments?.find(e=>e.id===m.validationExperimentId);
  if(experiment?.validation?.offer?.priceMinor!=null && experiment.validation.offer.priceMinor!==input.priceMinor) throw new AppError('O preço precisa corresponder à oferta do experimento.',409);
  m.shopRelease={version:releaseVersion(m),priceMinor:input.priceMinor,currency:'brl',channel:'shop',slug:w.shop.slug,license:w.shop.license,rationale:text(input.rationale,'Justificativa e incerteza do preço',1200),origin:'owner-authorized',at:new Date(now).toISOString(),expiresAt:now+72*3600000};
  m.events.push({at:new Date(now).toISOString(),message:'Oferta autorizada para a loja própria: versão e preço individuais. Preço não validado pelo mercado.'});
}
export function shopReleaseCurrent(w,m,now=Date.now()) {
  const r=m.shopRelease;
  return Boolean(m.status==='approved'&&r&&r.origin==='owner-authorized'&&r.channel==='shop'&&r.currency==='brl'&&r.version===releaseVersion(m)&&r.slug===w.shop?.slug&&r.license===w.shop?.license&&r.expiresAt>now&&Number.isSafeInteger(r.priceMinor)&&r.priceMinor>=500&&r.priceMinor<=1000000);
}
export function assertShopRelease(w,m) {
  if(!shopReleaseCurrent(w,m)) throw new AppError('Venda bloqueada: aprove a qualidade e autorize a versão, o preço e a licença desta oferta para a loja.',409);
}
