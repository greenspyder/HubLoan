// Third-party commercial records; execution, costs, projects and reviews stay shared.
import { randomUUID } from 'node:crypto';
import { AppError, text, addMission, queueMission, missionById } from './domain.mjs';
import { createProject, projectById } from './autonomy.mjs';
import { costTotals } from './ai-costs.mjs';
import { digest } from './execution-checkpoints.mjs';
import { releaseVersion } from './shop-release.mjs';
import { videoScenes } from './video-production.mjs';
const init = w => w.affiliates ||= { accounts: [], products: [], campaigns: [] };
const date = () => new Date().toISOString();
const programs = ['tiktok_shop', 'external'];
function url(value, name) {
  try { const u = new URL(text(value, name, 1000)); if(u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) throw Error(); return u.href; }
  catch { throw new AppError(`${name}: informe uma URL HTTPS pública, sem credenciais.`); }
}
function find(items, id, name) { const item = items.find(x => x.id === id); if(!item) throw new AppError(`${name} não encontrado neste espaço.`,404); return item; }
function limit(items, max) { if(items.length >= max) throw new AppError('Limite de registros atingido.'); }
function minor(value, name, max=100000000) { if(!Number.isSafeInteger(value) || value<0 || value>max) throw new AppError(`${name}: use centavos não negativos.`); return value; }
function observed(value) { const n=Date.parse(value); if(!Number.isFinite(n) || n>Date.now()+60000 || n<Date.now()-30*86400000) throw new AppError('Confira os dados no programa: a observação precisa ser dos últimos 30 dias.'); return new Date(n).toISOString(); }
function fresh(product) { return Date.parse(product.observedAt) >= Date.now()-30*86400000; }
function currentVersion(c,m) { return digest([c.id,c.accountId,c.product,c.brief,c.caption,c.missionId,releaseVersion(m)]); }
function ready(w,c) {
 const m=missionById(w,c.missionId), account=find(init(w).accounts,c.accountId,'Conta');
 if(m.status!=='approved' || !m.artifact || m.videoReport?.technicalStatus!=='TECHNICALLY_VALID') throw new AppError('Revise e aprove o MP4 atual antes de preparar a publicação.',409);
 if(!fresh(c.product) || !fresh(account)) throw new AppError('Comissão ou elegibilidade desatualizada. Confira no programa e prepare uma nova campanha.',409);
 return m;
}
export function affiliateAction(w, action, input) {
 const a=init(w);
 if(action==='project') {
  if(input.budgetMinor !== 0) throw new AppError('Esta primeira campanha usa montagem local, sem APIs pagas. O teto de APIs é R$ 0; infraestrutura a apurar.');
  const p=createProject(w,{name:input.name||'TikTok Afiliados',goal:input.goal||'Testar uma oferta de terceiro e obter a primeira comissão verificável.',kind:'text',mode:'goal',maxDeliveries:1,maxCalls:1,intervalMinutes:60,research:false,start:false},null,null);
  p.businessType='affiliate'; p.budgetMinor=0; p.phase='Selecione uma conta e um produto de terceiro';
 } else if(action==='account') {
  limit(a.accounts,10);
  if(input.authorized!==true || !programs.includes(input.program)) throw new AppError('Confirme sua autorização e o programa da conta.');
  const handle=text(input.handle,'Usuário TikTok',24).replace(/^@/,'');
  if(!/^[A-Za-z0-9_.]{2,24}$/.test(handle)) throw new AppError('Usuário TikTok inválido.');
  if(a.accounts.some(x=>x.handle===handle && x.program===input.program)) throw new AppError('Esta conta já foi registrada neste programa.');
  a.accounts.push({id:randomUUID(),handle,program:input.program,connection:'ASSISTED_NOT_CONNECTED',eligibility:'OWNER_ATTESTED',evidence:url(input.evidence,'Fonte de elegibilidade'),conditions:text(input.conditions,'Condições da conta/programa',1500),observedAt:observed(input.observedAt),createdAt:date()});
 } else if(action==='product') {
  limit(a.products,100);
  const account=find(a.accounts,input.accountId,'Conta');
  if(input.verified!==true || input.available!==true) throw new AppError('Confira disponibilidade, comissão e elegibilidade deste produto no programa.');
  if(!['percent','fixed'].includes(input.commissionType)) throw new AppError('Tipo de comissão inválido.');
  const commission=minor(input.commissionValue,'Comissão', input.commissionType==='percent'?10000:100000000);
  if(commission===0) throw new AppError('Informe a comissão observada, maior que zero.');
  if(!/^[A-Z]{3}$/.test(input.currency||'')) throw new AppError('Moeda inválida.');
  a.products.push({id:randomUUID(),accountId:account.id,program:account.program,name:text(input.name,'Produto',100),seller:text(input.seller,'Vendedor',100),platform:text(input.platform,'Plataforma/programa',100),externalId:text(input.externalId,'Identificador externo',150),officialUrl:url(input.officialUrl,'Página oficial'),affiliateUrl:url(input.affiliateUrl,'Link afiliado autorizado'),priceMinor:minor(input.priceMinor,'Preço observado'),currency:input.currency,commission:{type:input.commissionType,value:commission,source:url(input.commissionSource,'Fonte da comissão')},conditions:text(input.conditions,'Condições de comissão e uso no TikTok',2000),rights:text(input.rights,'Permissão de uso dos recursos',1500),rightsSource:url(input.rightsSource,'Fonte da licença/permissão'),audience:text(input.audience,'Público',500),hypothesis:text(input.hypothesis,'Hipótese de conversão',1000),available:true,observedAt:observed(input.observedAt),verification:'OWNER_ATTESTED_WITH_SOURCE',createdAt:date()});
 } else if(action==='campaign') {
  limit(a.campaigns,100);
  const p=projectById(w,input.projectId), product=find(a.products,input.productId,'Produto');
  if(p.businessType!=='affiliate') throw new AppError('Escolha um projeto TikTok Afiliados.');
  if(!fresh(product)) throw new AppError('Reimporte os dados comerciais após conferir a comissão atual.');
  if(a.campaigns.some(c=>c.projectId===p.id && !c.publication)) throw new AppError('Conclua a campanha existente antes de produzir outra.',409);
  const brief=text(input.brief,'Roteiro',1000); videoScenes(brief);
  const caption=text(input.caption,'Legenda comercial',2000);
  if(!/#publi\b/i.test(caption)) throw new AppError('Inclua #publi e divulgue a relação de afiliado na legenda.');
  if(input.claimsReviewed!==true) throw new AppError('Confira as afirmações do roteiro e os direitos dos materiais.');
  const images=input.images;
  if(!Array.isArray(images) || !images.length) throw new AppError('Envie imagens autorizadas.');
  const c={id:randomUUID(),projectId:p.id,accountId:product.accountId,product:structuredClone(product),brief,caption,createdAt:date(),reports:[]};
  const m=addMission(w,{title:`Afiliado · ${product.name}`.slice(0,100),brief,kind:'video',agentId:'creator'});
  m.projectId=p.id; m.affiliateCampaignId=c.id; m.purpose='affiliate-promotion'; m.videoImages=images;
  c.missionId=m.id; a.campaigns.unshift(c); queueMission(w,m.id);
  p.produced++; p.phase='Vídeo afiliado na fila; revisão humana obrigatória';
 } else if(action==='revise') {
  const c=find(a.campaigns,input.campaignId,'Campanha'),m=missionById(w,c.missionId);
  if(c.publication || !['review','approved','rejected'].includes(m.status)) throw new AppError('Aguarde a entrega. Uma publicação registrada não pode ser alterada silenciosamente.',409);
  if(input.version!==currentVersion(c,m) || input.claimsReviewed!==true) throw new AppError('Confira a versão atual e autorize os ajustes.',409);
  limit(m.revisions||[],5);
  const brief=text(input.brief,'Roteiro',1000); videoScenes(brief);
  const caption=text(input.caption,'Legenda comercial',2000);
  if(!/#publi\b/i.test(caption)) throw new AppError('Inclua #publi na legenda.');
  const feedback=text(input.feedback,'Ajustes solicitados',2000);
  (m.revisions ||= []).push({id:randomUUID(),at:date(),feedback,components:[],artifact:m.artifact,output:m.output,execution:structuredClone(m.execution),brief:m.brief,videoImages:m.videoImages});
  (c.revisions ||= []).push({at:date(),brief:c.brief,caption:c.caption,approval:c.approval});
  m.brief=brief; c.brief=brief; c.caption=caption;
  if(input.images?.length) m.videoImages=input.images;
  delete c.approval;
  m.status='failed'; queueMission(w,m.id);
  m.events.push({at:date(),message:`Ajuste de vídeo solicitado: ${feedback}. Versão anterior preservada.`});
 } else if(action==='authorize') {
  const c=find(a.campaigns,input.campaignId,'Campanha'), m=ready(w,c);
  if(input.version!==currentVersion(c,m) || input.authorize!==true || input.disclosure!==true || input.claimsReviewed!==true) throw new AppError('Confira a versão atual, informações comerciais e identificação de publicidade.',409);
  c.approval={version:currentVersion(c,m),at:date(),expiresAt:Date.now()+72*3600000,mode:'ASSISTED',accountId:c.accountId};
 } else if(action==='published') {
  const c=find(a.campaigns,input.campaignId,'Campanha'), m=ready(w,c);
  if(!c.approval || c.approval.version!==currentVersion(c,m) || c.approval.expiresAt<=Date.now()) throw new AppError('Autorize a versão atual antes de registrar a publicação.',409);
  const u=new URL(url(input.url,'URL da publicação')), account=find(a.accounts,c.accountId,'Conta');
  if(u.hostname!=='www.tiktok.com' || !u.pathname.startsWith(`/@${account.handle}/video/`) || !/^\d+$/.test(u.pathname.split('/').at(-1))) throw new AppError('Use a URL completa do vídeo na conta escolhida.');
  if(c.publication) { if(c.publication.url!==u.href) throw new AppError('A publicação já foi registrada. O histórico não será substituído.',409); return; }
  c.publication={url:u.href,at:date(),origin:'OWNER_REPORTED_NOT_API_VERIFIED'};
 } else if(action==='report') {
  const c=find(a.campaigns,input.campaignId,'Campanha');
  if(!c.publication) throw new AppError('Registre primeiro a publicação.');
  limit(c.reports,100);
  const report={id:randomUUID(),at:date(),observedAt:observed(input.observedAt),source:url(input.source,'Fonte das métricas'),origin:'OWNER_REPORTED_NOT_API_VERIFIED',currency:c.product.currency};
  for(const key of ['views','clicks','orders','estimatedMinor','approvedMinor','receivedMinor']) report[key]= input[key] == null ? null : minor(input[key],key);
  report.note=text(input.note,'Período e identificação do relatório/repasse',1000);
  // Cumulative snapshots, never additive imports. Unknown remains null.
  c.reports.push(report);
 } else throw new AppError('Ação de afiliados inválida.',404);
}
export function publicAffiliates(w) {
 const a=w.affiliates || {accounts:[],products:[],campaigns:[]};
 return {accounts:a.accounts,products:a.products,publishing:'ASSISTED_ONLY',oauth:'NOT_IMPLEMENTED',campaigns:a.campaigns.map(c=>{
  const m=w.missions.find(x=>x.id===c.missionId), latest=c.reports.at(-1)||null;
  const costs=costTotals((w.aiCosts?.entries||[]).filter(e=>e.taskId===c.missionId));
  const version=m?currentVersion(c,m):null;
  const authorizationCurrent=Boolean(m?.status==='approved' && fresh(c.product) && fresh(a.accounts.find(x=>x.id===c.accountId)||{}) && c.approval?.version===version && c.approval?.expiresAt>Date.now());
  let next='Acompanhe a produção no servidor.';
  if(m?.status==='failed'||m?.status==='cancelled')next='Retome a tarefa existente; checkpoints válidos serão reutilizados.';
  if(m?.status==='review')next='Assista ao MP4 e revise qualidade, afirmações e direitos.';
  if(m?.status==='rejected')next='Entrega rejeitada. Corrija o roteiro/material antes de novo teste.';
  if(m?.status==='approved') next=authorizationCurrent?'Baixe o MP4 e publique manualmente na conta escolhida.':'Autorize a versão, conta e informações comerciais atuais.';
  if(c.publication) next=latest?.views===0?'Sem visitas observadas: teste distribuição permitida antes de produzir mais.':latest?.views>0 && latest?.orders===0?'Visitas sem pedidos relatados: investigue público, oferta e preço. Hipótese, não conclusão.':'Registre métricas e comissões no programa; aguarde evidências antes de escalar.';
  const {revisions, ...visible}=c;
  return {...visible,revisionCount:revisions?.length||0,version,authorizationCurrent,next,costs,latest,netMinor:null,costCompleteness:'INCOMPLETE'};
 })};
}
