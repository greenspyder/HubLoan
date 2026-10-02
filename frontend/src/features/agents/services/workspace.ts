export type Agent = { id: string; name: string; role: string; enabled: boolean };
export type Mission = { id: string; title: string; brief: string; agentId: string; status: "queued" | "review" | "approved"; output: string; createdAt: string };
export type Workspace = { version: 1; agents: Agent[]; missions: Mission[] };

export function createWorkspace(): Workspace {
  return { version: 1, agents: [
    { id: "research", name: "Atlas", role: "Pesquisa e planejamento", enabled: true },
    { id: "creator", name: "Nova", role: "Produção de conteúdo", enabled: true },
    { id: "reviewer", name: "Sentinel", role: "Revisão e qualidade", enabled: true },
  ], missions: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseWorkspace(raw: string | null): Workspace {
  if (raw === null) return createWorkspace();
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.agents) || !Array.isArray(value.missions)) throw new Error("Formato de dados inválido.");
  const agents: Agent[] = value.agents.map((agent: unknown) => {
    if (!isRecord(agent) || typeof agent.id !== "string" || typeof agent.name !== "string" || typeof agent.role !== "string" || typeof agent.enabled !== "boolean") throw new Error("Cadastro de agentes inválido.");
    return { id: agent.id, name: agent.name, role: agent.role, enabled: agent.enabled };
  });
  if (new Set(agents.map(agent => agent.id)).size !== agents.length) throw new Error("Identificadores de agentes duplicados.");
  const missions: Mission[] = value.missions.map((mission: unknown) => {
    if (!isRecord(mission) || typeof mission.id !== "string" || typeof mission.title !== "string" || typeof mission.brief !== "string" || typeof mission.agentId !== "string" || !agents.some(agent => agent.id === mission.agentId) || !["queued", "review", "approved"].includes(String(mission.status)) || typeof mission.output !== "string" || typeof mission.createdAt !== "string" || Number.isNaN(Date.parse(mission.createdAt))) throw new Error("Cadastro de missões inválido.");
    return { id: mission.id, title: mission.title, brief: mission.brief, agentId: mission.agentId, status: mission.status as Mission["status"], output: mission.output, createdAt: mission.createdAt };
  });
  if (new Set(missions.map(mission => mission.id)).size !== missions.length) throw new Error("Identificadores de missões duplicados.");
  return { version: 1, agents, missions };
}

export function addMission(workspace: Workspace, title: string, brief: string, agentId: string): Workspace {
  const agent = workspace.agents.find(candidate => candidate.id === agentId);
  if (!agent?.enabled) throw new Error("Escolha um agente disponível.");
  if (!title.trim() || title.trim().length > 100 || !brief.trim() || brief.trim().length > 3000) throw new Error("Informe um título de até 100 caracteres e um briefing de até 3.000 caracteres.");
  return { ...workspace, missions: [{ id: crypto.randomUUID(), title: title.trim(), brief: brief.trim(), agentId, status: "queued", output: "", createdAt: new Date().toISOString() }, ...workspace.missions] };
}

export function simulateMission(workspace: Workspace, id: string): Workspace {
  const mission = workspace.missions.find(candidate => candidate.id === id);
  if (!mission || mission.status !== "queued") throw new Error("A missão precisa estar na fila.");
  const agent = workspace.agents.find(candidate => candidate.id === mission.agentId);
  if (!agent?.enabled) throw new Error("Reative o agente antes de simular.");
  const output = `SIMULAÇÃO LOCAL — nenhum modelo de IA foi chamado.\n\nMissão: ${mission.title}\nResponsável: ${agent.name} (${agent.role})\n\nBriefing recebido:\n${mission.brief}\n\nPlano de execução:\n1. Definir critérios de entrega e fontes.\n2. Produzir uma primeira versão conforme o briefing.\n3. Revisar a qualidade e solicitar aprovação humana.\n\nEste texto é um modelo fixo para testar o fluxo. A entrega real depende da integração com um provedor de IA.`;
  return { ...workspace, missions: workspace.missions.map(candidate => candidate.id === id ? { ...candidate, status: "review", output } : candidate) };
}

export function approveMission(workspace: Workspace, id: string): Workspace {
  if (!workspace.missions.some(mission => mission.id === id && mission.status === "review")) throw new Error("Somente missões em revisão podem ser aprovadas.");
  return { ...workspace, missions: workspace.missions.map(mission => mission.id === id ? { ...mission, status: "approved" } : mission) };
}
