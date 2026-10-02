export type Agent = { id: string; name: string; role: string; enabled: boolean };
export type MissionStatus = 'draft' | 'queued' | 'running' | 'review' | 'approved' | 'failed' | 'cancelled';
export type Mission = { id: string; title: string; brief: string; agentId: string; kind: 'text' | 'image'; status: MissionStatus; output: string; error: string; phase: string; createdAt: string; events: { at: string; message: string }[]; tokens: number; images: number; attempt: number; hasArtifact: boolean; projectId?: string; sequence?: number; decisionId?: string; plan?: string };
export type MarketOption = { id: string; title: string; audience: string; rationale: string; uncertainty: string; test: string; kind: 'text' | 'image'; score: number; scores: Record<string, number>; sourceUrls: string[] };
export type ExperimentInput = { visits: number; sales: number; revenue: number; cost: number; evidence: string };
export type MarketDecision = { id: string; observedAt: string; candidates: MarketOption[]; selected: MarketOption | null; report: string; sources: { title: string; url: string }[]; feedback?: ExperimentInput & { net: number; currency: string; origin: string; recordedAt: string } };
export type Project = { id: string; name: string; goal: string; mode?: 'goal' | 'discover'; market?: { allowImages?: boolean; market: string; channels: string; restrictions: string }; maxCalls: number; calls: number; decisions?: MarketDecision[]; kind: 'text' | 'image'; maxDeliveries: number; intervalMinutes: number; research: boolean; status: 'active' | 'planning' | 'paused' | 'completed'; phase: string; produced: number; tokens: number; searches: number; error: string; nextRunAt: number; expiresAt: number; events: { at: string; message: string }[]; researchReport?: { output: string; sources: { title: string; url: string }[] } };
export type ProjectInput = Pick<Project, 'name' | 'goal' | 'kind' | 'maxDeliveries' | 'intervalMinutes' | 'research'> & { start: boolean; mode?: 'goal' | 'discover'; maxCalls?: number; market?: Project['market'] };
export type Workspace = { version: 2; autonomy: { enabled: boolean; durable: boolean; projects: Project[] }; agents: Agent[]; missions: Mission[]; settings: { model: string; imageModel: string; maxOutputTokens: number; configured: boolean }; storage: 'postgres' | 'sqlite' };
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
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${getAccessCode()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(200000) });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('A API ainda não está pronta. Aguarde o deploy do backend e tente novamente.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao acessar a central.');
  return data as T;
}
export const agentApi = {
  workspace: () => request<Workspace>('/workspace'),
  addProject: (input: ProjectInput) => request<Workspace>('/projects', 'POST', input),
  experiment: (projectId: string, decisionId: string, input: ExperimentInput) => request<Workspace>(`/projects/${projectId}/decisions/${decisionId}/feedback`, 'POST', input),
  projectAction: (id: string, action: 'pause' | 'resume') => request<Workspace>(`/projects/${id}/${action}`, 'POST'),
  saveSettings: (apiKey: string, model: string, imageModel: string) => request<Workspace>('/settings', 'POST', { apiKey, model, imageModel }),
  disconnect: () => request<Workspace>('/settings', 'DELETE'),
  addAgent: (name: string, role: string) => request<Workspace>('/agents', 'POST', { name, role }),
  toggleAgent: (id: string, enabled: boolean) => request<Workspace>(`/agents/${id}`, 'PATCH', { enabled }),
  addMission: (title: string, brief: string, agentId: string, kind: 'text' | 'image', execute: boolean) => request<Workspace>('/missions', 'POST', { title, brief, agentId, kind, execute }),
  action: (id: string, action: 'run' | 'cancel' | 'approve') => request<Workspace>(`/missions/${id}/${action}`, 'POST'),
  async image(id: string) {
    const response = await fetch(`${base}/missions/${id}/artifact`, { headers: { Authorization: `Bearer ${getAccessCode()}` } });
    if (!response.ok) throw new Error('Não foi possível carregar a imagem.');
    return response.blob();
  },
};
