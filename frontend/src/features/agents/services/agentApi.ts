export type MarketReference = {id:string;marketplace:string;seller:string;category:string;product:string;url:string;observedAt:string;observedPrice:string|null;signals:{kind:string;value:string;scope:string;sourceUrl:string}[];features:string[];inference:string;hypothesis:string;ipRisk:string;opportunity:string;origin:string};
export type Etsy = {implemented:boolean;configured:boolean;connected:boolean;shopId?:number;shopName?:string;currency?:string;error:string;redirectUri?:string;mode:string;level:number;note:string};
export type MarketplaceObservation = {origin?:string; listing:string;reference:string;period:string;grossMinor:number;refundedMinor:number;sales:number;visits:number|null;leads:number|null;humanMinutes:number|null;repeatSales:number|null };
export type MarketplaceMetrics = MarketplaceObservation & {costMinor:number;resultMinor:number|null;conversion:number|null;confidence:string};
export type Validation = { sampleId?: string; evidence?: {url:string;summary:string;observedAt:string}; offer?: {scope:string;criteria:string;priceMinor:number;deliveryDays:number}; quality?: {approved:boolean;reason:string}; release?: {at:string}; feedback:{outcome:string;reason:string;at:string}[] };
export type Knowledge = { repository: string; configured: boolean; enabled: boolean; expiresAt?: number; usedWrites: number; maxWrites: number; importedAt?: string; importedCount?: number; error: string; note: string; notes: { id: string; title: string; content: string; observedAt: string; kind: string; path: string; publishedAt?: string }[] };
export type SalesChannel = { factoryId: string; channel: 'fiverr' | 'etsy' | 'itchio' };
export type BusinessExperimentInput = { projectId?: string; salesChannel?: SalesChannel; name: string; hypothesis: string; audience: string; channel: string; budgetMinor: number; days: number; minSales: number; minNetMinor: number; missionIds: string[] };
export type BusinessExperiment = Omit<BusinessExperimentInput, 'days'> & { id: string; marketReferences?:MarketReference[];marketComparison?:{patterns:{feature:string;sellers:number}[];distinctSellers:number;sufficient:boolean;note:string};referenceResearch?:{status:string;error?:string;expiresAt?:number};originality?:{approved:boolean;reason:string};originalityCurrent?:boolean; marketplace?: {packages?:string;faq?:string;category?:string;requirements?:string;etsy?:{status:string;listingId?:number;error?:string};apiSync?:{note:string;matchedReceipts:number;unresolved:number};channel:string;factoryId:string;title:string;description:string;tags:string;license:string;status:string;publication?:{listing:string;at:string;origin:string};observation?:MarketplaceObservation};marketplaceMetrics?:MarketplaceMetrics|null; validation?: Validation; validationReadiness?: { checks:{id:string;label:string;met:boolean}[]; qualityCurrent:boolean; canConsiderRepeating:boolean; publicationAllowed:boolean; note:string }; createdAt: string; endsAt: string; closedAt?: string; reviewedAt?: string; ended: boolean; currency: string; costs: { id: string; amountMinor: number; category: string; note: string; recordedAt: string; voidedAt?: string }[]; metrics: { grossMinor: number; refundedMinor: number; heldMinor: number; sales: number; costMinor: number; balanceMinor: number; costComplete: boolean; resultMinor: number | null; recommendation: string; budgetRemainingMinor: number } };
export type EngineeringSettings = { enabled: boolean; maxJobs: number; maxCalls: number };
export type Engineering = EngineeringSettings & { configured: boolean; authorized: boolean; repository: string; expiresAt?: number; usedCalls: number; usedJobs: number; error: string; roles: { id: string; name: string; role: string }[]; diagnostics: { id: string; priority: string; title: string; evidence: string; type: string; action?: string; files?: string[] }[]; jobs: { id: string; taskId: string; title: string; status: string; phase: string; createdAt: string; branch: string; headSha?: string; baseSha?: string; release?: { status: string; approvedAt: string; mergeSha?: string; error?: string; deployment?: { vercel: string; backend: string; note: string } }; plan?: string; edits?: { path: string; before: string; after: string }[]; review?: { approved: boolean; reason: string; testsExecuted: boolean }; prUrl?: string; checks?: { status: string; note: string; observedAt?: string }; error: string; events: { at: string; message: string }[] }[] };
export type MarketingChannel = 'mastodon' | 'telegram' | 'bluesky';
export type SharingChannel = 'whatsapp' | 'linkedin' | 'reddit' | 'instagram' | 'tiktok';
export type MarketingSettings = { enabled: boolean; intervalMinutes: number; maxPosts: number };
export type Marketing = MarketingSettings & { expiresAt?: number; grantUsed: number; error: string; note: string; channels: { kind: MarketingChannel; configured: boolean; name: string }[]; campaigns: { id: string; channel: MarketingChannel | SharingChannel; productId: string; title: string; text: string; link: string; status: string; createdAt: string; postedAt?: string; url?: string; error: string; visits: number; purchases: number; grossMinor: number; refundedMinor: number; testPurchases: number }[] };
export type ShopProduct = { id: string; missionId?: string; title: string; description: string; kind: ProductionKind; priceMinor: number; currency: string; publishedAt: string; listed: boolean; filename: string; license: string; bytes: number; hasPreview?: boolean };
export type ShopSettings = { name: string; contact: string; license: string; enabled: boolean; autoPublish: boolean; maxProducts: number; prices: Record<ProductionKind, number> };
export type Shop = ShopSettings & { configured: boolean; slug: string; expiresAt?: number; livemode: boolean; error: string; products: ShopProduct[]; metrics: { purchases: number; grossMinor: number; refundedMinor: number; currency: string; netProfit: null; testPurchases: number } };
export type StoreGame = { id: number; title: string; url: string; published: boolean; classification: string; views: number | null; purchases: number | null; downloads: number | null; earnings: { currency: string; grossMinor: number }[]; observedAt: string; origin: string; scope: string; note: string };
export type CommerceSettings = { autoPublish: boolean; background: boolean; maxUploads: number; targets: { sprites?: number | string; model3d?: number | string }; license: string };
export type ItchChecks = Record<'seller' | 'taxInterview' | 'taxApproval' | 'payoutDestination' | 'acceptsPayments', 'unknown' | 'pending' | 'confirmed' | 'not_applicable'>;
export type Commerce = { readiness?: { checks: ItchChecks; paymentReadiness: string; checkedAt?: string; note: string; stale: boolean; nextAction: string };  configured: boolean; autoPublish: boolean; background: boolean; maxUploads: number; uploads: number; expiresAt?: number; games: StoreGame[]; targets: Record<string, { id: number; title: string; url: string }>; error: string; license: string };
export type ProductionKind = 'text' | 'image' | 'thumbnail' | 'sprites' | 'model3d';
export const productionLabels: Record<ProductionKind, string> = { text: 'Texto / código', image: 'Imagem PNG', thumbnail: 'Thumbnails YouTube (ZIP)', sprites: 'Pack 2D transparente (ZIP)', model3d: 'Mobília 3D GLB / OBJ (ZIP)' };
export type Agent = { id: string; name: string; role: string; enabled: boolean };
export type MissionStatus = 'draft' | 'queued' | 'running' | 'review' | 'approved' | 'failed' | 'cancelled' | 'rejected';
export type QualityReview = { decision: 'APPROVE' | 'REGENERATE_PARTIAL' | 'REJECT'; inconclusive: boolean; summary: string; technicalValid: boolean; commerciallyReady: null; approvedForRelease: boolean; components: string[]; criteria: {id:string;status:string;evidence:string;components:string[];adjustment:string}[]; objects: {file:string;apparentPerspective:string;evidence:string}[] };
export type Mission = { itchRelease?: {version:string;priceMinor:number;currency:string;rationale:string;expiresAt:number}; qualityReview?: QualityReview; reviewComponents?: string[]; reviewVersions?: {id:string;at:string;feedback:string;components:string[]}[]; reviews?: {decision:string;feedback:string}[]; completedSteps?: number; releaseVersion?: string; shopRelease?: { priceMinor: number; rationale: string; expiresAt: number }; factoryId?: string | null; id: string; title: string; brief: string; agentId: string; kind: ProductionKind; status: MissionStatus; output: string; error: string; phase: string; createdAt: string; events: { at: string; message: string }[]; tokens: number; images: number; attempt: number; hasArtifact: boolean; hasPreview?: boolean; artifactMime?: string; artifactFilename?: string; purpose?: 'experiment-preparation'; projectId?: string; sequence?: number; decisionId?: string; plan?: string; publication?: { status: string; error?: string; target: { url: string; title: string }; channel?: string; note?: string } };
export type MarketOption = { id: string; title: string; audience: string; rationale: string; uncertainty: string; test: string; kind: ProductionKind; score: number; businessModel?: string; platform?: string; monetization?: string; costs?: Record<string, string>; successCriterion?: string; experimentUnits?: number; execution?: { status: 'executable' | 'preparation' | 'blocked'; missing: { capability: string; reason: string }[]; note: string }; scores: Record<string, number>; sourceUrls: string[] };
export type ExperimentInput = { visits: number; sales: number; revenue: number; cost: number; evidence: string };
export type MarketDecision = { memoryUsed?: { id: string; title: string; origin: string }[]; model?: string; learning?: { observedAt: string; experiments: { id: string; evidenceState: string; metrics: BusinessExperiment['metrics'] }[]; note: string }; id: string; observedAt: string; candidates: MarketOption[]; selected: MarketOption | null; report: string; sources: { title: string; url: string }[]; feedback?: ExperimentInput & { net: number; currency: string; origin: string; recordedAt: string } };
export type Project = { firstSale?: boolean; budgetMinor?: number; commercialSummary?: { costs: CostTotals & {declaredMinor:number}; budgetMinor:number|null; remainingMinor:number|null; next:{code:string;label:string;href:string}; experimentIds:string[]; note:string };  factoryId?: string; id: string; name: string; goal: string; mode?: 'goal' | 'discover'; market?: { scope?: 'broad' | 'products'; allowPreparation?: boolean; allowImages?: boolean; specializations?: ProductionKind[]; market: string; channels: string; restrictions: string }; maxCalls: number; calls: number; decisions?: MarketDecision[]; kind: ProductionKind; maxDeliveries: number; intervalMinutes: number; research: boolean; status: 'active' | 'planning' | 'paused' | 'completed'; phase: string; produced: number; tokens: number; searches: number; error: string; nextRunAt: number; expiresAt: number; events: { at: string; message: string }[]; researchReport?: { output: string; sources: { title: string; url: string }[] } };
export type ProjectInput = Pick<Project, 'name' | 'goal' | 'kind' | 'maxDeliveries' | 'intervalMinutes' | 'research'> & { firstSale?: boolean; budgetMinor?: number; factoryId?: string; start: boolean; mode?: 'goal' | 'discover'; maxCalls?: number; market?: Project['market'] };
export type CostTotals = { hasConfirmedCosts: boolean; confirmedMinor: number; reservedMinor: number; unknownMinor: number; exposureMinor: number };
export type AiCosts = { day?: CostTotals; month?: CostTotals; taskMinor: number; enabled: boolean; dailyMinor: number; monthlyMinor: number; callMinor: number; ceilings: Record<string, number>; dayMinor: number; monthMinor: number; entries: { id: string; taskId: string; agentId: string; model: string; kind: string; reservedMinor: number; exposureMinor?: number; confirmedMinor?: number | null; sentAt?: string | null; executionId?: string; status: string; tokens: number; estimatedTextUsd?:number|null; actualModel?:string; searches?:number }[] };
export type Factory = { id: string; name: string; kind: ProductionKind | "video" | "service" | "software"; role: string; audience: string; channel: string; blocker: string | null; missions: number; running: number; queued: number; delivered: number; projects: number; reservedMinor: number; grossMinor: number; costMinor: number; resultMinor: number | null; experimentIds: string[]; mixedExperiments: number };
export type Workspace = { etsy?:Etsy;
  salesJourneyVersion?: number; factories?: Factory[]; aiCosts?: AiCosts; version: 2; strategy?: { validationPriorities?: { id: string; title: string; instruction: string }[] }; knowledge?: Knowledge; experiments?: BusinessExperiment[]; engineering?: Engineering; marketing?: Marketing; shop?: Shop; commerce?: Commerce; autonomy: { enabled: boolean; durable: boolean; projects: Project[] }; agents: Agent[]; missions: Mission[]; settings: { workerModel?:string;decisionModel?:string;availableModels?:string[];modelsCheckedAt?:string;modelCatalog?:{id:string;input:number;cached:number;output:number;role:string}[]; model: string; imageModel: string; maxOutputTokens: number; configured: boolean }; storage: 'postgres' | 'sqlite' };
const accessKey = 'hubloan.workspace.access.v2';
const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const base = configuredBase ? `${configuredBase.endsWith('/api') ? configuredBase : configuredBase + '/api'}/agents` : '/api/agents';
export function getAccessCode() {
  let token = localStorage.getItem(accessKey);
  if (!token) { token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join(''); localStorage.setItem(accessKey, token); }
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Código de acesso salvo inválido. Restaure o código de acesso do seu espaço.');
  return token;
}
export function restoreAccessCode(value: string) {
  const token = value.trim();
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('O código de acesso precisa ter 64 caracteres.');
  localStorage.setItem(accessKey, token);
}
async function request<T>(path: string, method = 'GET', body?: object): Promise<T> {
  let response: Response;
  try { response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${getAccessCode()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) }); } catch { throw new Error(method === 'GET' ? 'Servidor indisponível ou conexão lenta. Tente atualizar em instantes.' : 'Sem confirmação do servidor. Confira o estado atualizado antes de repetir a operação.'); }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('A API ainda não está pronta. Aguarde o deploy do backend e tente novamente.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao acessar a central.');
  return data as T;
}
export const agentApi = {
  prepareCampaign: (productId: string, channel: SharingChannel) => request<Workspace>('/marketing/prepare','POST',{productId,channel}),
  refreshKnowledge: () => request<Workspace>('/knowledge/refresh', 'POST'),
  connectKnowledge: (apiKey: string, authorize: boolean) => request<Workspace>('/knowledge/connect', 'POST', { apiKey, authorize }),
  pauseKnowledge: () => request<Workspace>('/knowledge/pause', 'POST'),
  disconnectKnowledge: () => request<Workspace>('/knowledge', 'DELETE'),
  exportKnowledge: () => request<{ files: { path: string; content: string }[]; privateResults: object }>('/knowledge/export'),
  configureEtsy: (input:{clientId:string;sharedSecret:string;shopId:number}) => request<Workspace>('/etsy/configure','POST',input),
  authorizeEtsy: () => request<{url:string}>('/etsy/authorize','POST'),
  disconnectEtsy: () => request<Workspace>('/etsy','DELETE'),
  etsyAction: (id:string,action:'publish'|'reconcile'|'sync',input:object={}) => request<Workspace>(`/experiments/${id}/etsy-${action}`,'POST',input),
  prepareOffer: (id:string,license:string,authorize:boolean) => request<Workspace>(`/experiments/${id}/prepare-offer`,'POST',{license,authorize}),
  researchReferences: (id:string,query:string,authorize:boolean) => request<Workspace>(`/experiments/${id}/reference-research`,'POST',{query,authorize}),
  addExperiment: (input: BusinessExperimentInput) => request<Workspace>('/experiments', 'POST', input),
  experimentAction: (id: string, action: 'market-reference' | 'originality-review' | 'marketplace-offer' | 'marketplace-results' | 'marketplace-published' | 'cost' | 'void' | 'review' | 'close' | 'link' | 'validation-enable' | 'validation-evidence' | 'validation-offer' | 'validation-sample' | 'validation-quality' | 'validation-release' | 'validation-itch-release' | 'validation-feedback', input: object = {}) => request<Workspace>(`/experiments/${id}/${action}`, 'POST', input),
  connectEngineering: (apiKey: string, authorize: boolean) => request<Workspace>('/engineering/connect', 'POST', { apiKey, authorize }),
  configureEngineering: (input: EngineeringSettings) => request<Workspace>('/engineering/configure', 'POST', input),
  proposeImprovement: (taskId: string) => request<Workspace>('/engineering/jobs', 'POST', { taskId }),
  acknowledgeImprovement: (id: string, checked: boolean) => request<Workspace>(`/engineering/jobs/${id}/acknowledge`, 'POST', { checked }),
  approveImprovement: (id: string, headSha: string, baseSha: string) => request<Workspace>(`/engineering/jobs/${id}/approve`, 'POST', { approve: true, headSha, baseSha }),
  improvementDeployment: (id: string) => request<Workspace>(`/engineering/jobs/${id}/deployment`, 'POST'),
  pauseEngineering: () => request<Workspace>('/engineering/pause', 'POST'),
  disconnectEngineering: () => request<Workspace>('/engineering', 'DELETE'),
  checkImprovement: (id: string) => request<Workspace>(`/engineering/jobs/${id}/checks`, 'POST'),
  connectMarketing: (channel: MarketingChannel, apiKey: string, target: string, authorize: boolean) => request<Workspace>('/marketing/connect', 'POST', { channel, apiKey, target, authorize }),
  configureMarketing: (input: MarketingSettings) => request<Workspace>('/marketing/configure', 'POST', input),
  disconnectMarketing: (channel: MarketingChannel) => request<Workspace>(`/marketing/channels/${channel}`, 'DELETE'),
  skipCampaign: (id: string) => request<Workspace>(`/marketing/campaigns/${id}/skip`, 'POST'),
  connectShop: (apiKey: string, authorizeWebhook: boolean) => request<Workspace>('/shop/connect', 'POST', { apiKey, authorizeWebhook }),
  configureShop: (input: ShopSettings) => request<Workspace>('/shop/configure', 'POST', input),
  authorizeShopProduct: (id: string, input: { version: string; priceMinor: number; rationale: string; authorize: boolean }) => request<Workspace>(`/shop/missions/${id}/release`, 'POST', input),
  publishShopProduct: (id: string) => request<Workspace>(`/shop/missions/${id}/publish`, 'POST'),
  listShopProduct: (id: string, listed: boolean) => request<Workspace>(`/shop/products/${id}`, 'PATCH', { listed }),
  connectStore: (apiKey: string) => request<Workspace>('/commerce/connect', 'POST', { apiKey }),
  recordItchReadiness: (input: {checks:ItchChecks;note:string}) => request<Workspace>('/commerce/readiness','POST',input),
  authorizeItchRelease: (id:string,input:{version:string;authorize:boolean;priceMinor:number;currency:string;rationale:string}) => request<Workspace>(`/commerce/missions/${id}/release`,'POST',input),
  configureStore: (input: CommerceSettings) => request<Workspace>('/commerce/configure', 'POST', input),
  syncStore: () => request<Workspace>('/commerce/sync', 'POST'),
  disconnectStore: () => request<Workspace>('/commerce', 'DELETE'),
  publishPack: (id: string) => request<Workspace>(`/commerce/missions/${id}/publish`, 'POST'),
  recoverUpload: (id: string) => request<Workspace>(`/commerce/missions/${id}/recover`, 'POST'),
  workspace: () => request<Workspace>('/workspace'),
  addProject: (input: ProjectInput) => request<Workspace>('/projects', 'POST', input),
  experiment: (projectId: string, decisionId: string, input: ExperimentInput) => request<Workspace>(`/projects/${projectId}/decisions/${decisionId}/feedback`, 'POST', input),
  projectAction: (id: string, action: 'pause' | 'resume') => request<Workspace>(`/projects/${id}/${action}`, 'POST'),
  saveSettings: (apiKey: string, model: string, imageModel: string, decisionModel?:string) => request<Workspace>('/settings', 'POST', { apiKey, model, workerModel:model, decisionModel:decisionModel||model, imageModel }),
  disconnect: () => request<Workspace>('/settings', 'DELETE'),
  addAgent: (name: string, role: string) => request<Workspace>('/agents', 'POST', { name, role }),
  toggleAgent: (id: string, enabled: boolean) => request<Workspace>(`/agents/${id}`, 'PATCH', { enabled }),
  addMission: (title: string, brief: string, agentId: string, kind: ProductionKind, execute: boolean) => request<Workspace>('/missions', 'POST', { title, brief, agentId, kind, execute }),
  action: (id: string, action: 'run' | 'cancel' | 'approve', input: object = {}) => request<Workspace>(`/missions/${id}/${action}`, 'POST', input),
  review: (id: string, decision: 'adjust' | 'reject', feedback: string, components: string[], version?: string) => request<Workspace>(`/missions/${id}/review`, 'POST', { decision, feedback, components, version }),
  async image(id: string, preview = false, version?: string) {
    const response = await fetch(`${base}/missions/${id}/${preview ? 'preview' : 'artifact'}${version ? `?version=${encodeURIComponent(version)}` : ''}`, { headers: { Authorization: `Bearer ${getAccessCode()}` } });
    if (!response.ok) throw new Error('Não foi possível carregar o arquivo.');
    return response.blob();
  },
};
export type PublicCatalog = { name: string; contact: string; enabled: boolean; livemode: boolean; products: ShopProduct[] };
export type PurchaseReceipt = { status: string; title: string; filename: string; livemode: boolean };
async function publicRequest<T>(slug: string, operation = '', method = 'GET', body?: object, receipt?: string): Promise<T> {
  const response = await fetch(`${base}/storefront/${encodeURIComponent(slug)}${operation ? '/' + operation : ''}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(receipt ? { Authorization: `Bearer ${receipt}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(90000) });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Não foi possível acessar esta loja.'); }
  return response.json();
}
export const storefrontApi = {
  visit: (slug: string, productId: string, campaignId: string, visitToken: string) => publicRequest<{ recorded: boolean }>(slug, 'visit', 'POST', { productId, campaignId, visitToken }),
  previewUrl: (slug: string, productId: string) => `${base}/storefront/${encodeURIComponent(slug)}/preview?product=${encodeURIComponent(productId)}`,
  catalog: (slug: string) => publicRequest<PublicCatalog>(slug),
  checkout: (slug: string, productId: string, receiptToken: string, campaignId?: string) => publicRequest<{ url: string }>(slug, 'checkout', 'POST', { productId, receiptToken, campaignId }),
  receipt: (slug: string, receipt: string) => publicRequest<PurchaseReceipt>(slug, 'receipt', 'GET', undefined, receipt),
  async download(slug: string, receipt: string) {
    const response = await fetch(`${base}/storefront/${encodeURIComponent(slug)}/download`, { headers: { Authorization: `Bearer ${receipt}` }, signal: AbortSignal.timeout(90000) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Download indisponível.'); }
    return response.blob();
  },
};

export const configureAiCosts = (input: AiCosts) => request<Workspace>('/ai-costs', 'POST', input);

export const addFactory = (input: Pick<Factory, "name" | "kind" | "role" | "audience" | "channel">) => request<Workspace>("/factories", "POST", input);
