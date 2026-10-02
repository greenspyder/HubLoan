import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Activity, ArrowUpRight, Bot, Check, Cpu, Download, Layers, Pause, Play, Plus, Radio, Terminal } from "lucide-react";
import { addMission, approveMission, createWorkspace, parseWorkspace, simulateMission } from "../services/workspace";
import type { Workspace } from "../services/workspace";
import "../workspace.css";

const storageKey = "hubloan.agent-workspace.v1";
const statusLabels = { queued: "Na fila", review: "Em revisão", approved: "Aprovada" };
const missionPresets = [
  { label: "Produtos digitais", title: "Planejar uma coleção de produtos digitais", brief: "Pesquise um nicho e proponha três conceitos originais para produtos digitais ou impressão sob demanda. Defina público, formato, critérios de qualidade e etapas de produção para revisão humana." },
  { label: "Thumbnails", title: "Planejar thumbnails para YouTube", brief: "Prepare um briefing para três thumbnails de YouTube. Defina tema, público, composição visual e variações de título. A entrega será revisada antes da produção das imagens." },
  { label: "Assets de jogos", title: "Planejar um pacote de assets 2D", brief: "Planeje um pacote original de assets 2D para jogos. Defina estilo, resolução, lista de elementos, formatos de exportação e critérios de consistência visual." },
];

function loadWorkspace(): { workspace: Workspace; error: string } {
  try { return { workspace: parseWorkspace(localStorage.getItem(storageKey)), error: "" }; }
  catch { return { workspace: createWorkspace(), error: "Não foi possível ler os dados salvos. Exporte a sessão antes de sair; o armazenamento automático está suspenso." }; }
}

export function AgentWorkspacePage() {
  const [initial] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState(initial.workspace);
  const [storageError, setStorageError] = useState(initial.error);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [agentId, setAgentId] = useState("research");
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "HubLoan · Central de agentes";
  }, []);

  function commitWorkspace(next: Workspace) {
    setWorkspace(next);
    if (initial.error) return;
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("Não foi possível salvar no navegador. Exporte a sessão para preservar suas alterações."); }
  }

  function mutate(operation: (current: Workspace) => Workspace) {
    try { const next = operation(workspace); commitWorkspace(next); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a ação."); }
  }

  function submitMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = addMission(workspace, title, brief, agentId);
      commitWorkspace(next); setSelectedId(next.missions[0].id); setTitle(""); setBrief(""); setFilter("all"); setMessage("Missão adicionada à fila.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao criar missão."); }
  }

  function submitAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agentName.trim() || !agentRole.trim()) { setMessage("Informe o nome e a função do agente."); return; }
    const id = crypto.randomUUID();
    commitWorkspace({ ...workspace, agents: [...workspace.agents, { id, name: agentName.trim(), role: agentRole.trim(), enabled: true }] });
    setAgentId(id); setAgentName(""); setAgentRole(""); setMessage("Agente cadastrado.");
  }

  function exportWorkspace() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "hubloan-agentes.json"; link.click(); URL.revokeObjectURL(url);
  }

  const selected = workspace.missions.find(mission => mission.id === selectedId);
  const filtered = workspace.missions.filter(mission => filter === "all" || mission.status === filter);
  const activeAgents = workspace.agents.filter(agent => agent.enabled).length;

  return (
    <div className="agent-workspace">
      <aside className="aw-sidebar">
        <a className="aw-brand" href="#overview"><span><Cpu size={22} /></span><div>HUBLOAN<small>AGENT OPERATING SYSTEM</small></div></a>
        <p className="aw-eyebrow">WORKSPACE / 01</p>
        <nav aria-label="Navegação da central">
          <a href="#overview"><Layers size={18} /> Visão geral</a>
          <a href="#agents"><Bot size={18} /> Agentes <small>{workspace.agents.length}</small></a>
          <a href="#missions"><Activity size={18} /> Missões <small>{workspace.missions.length}</small></a>
          <a href="#terminal"><Terminal size={18} /> Terminal</a>
        </nav>
        <div className="aw-sidebar-bottom"><Radio size={17} /><div>Ambiente local<small>Provedor de IA não conectado</small></div></div>
      </aside>

      <main className="aw-main" id="overview">
        <header className="aw-topbar"><span>CENTRAL DE OPERAÇÕES <b>/</b> VISÃO GERAL</span><span className="aw-badge">MODO DEMONSTRAÇÃO</span></header>
        <section className="aw-heading"><div><p className="aw-eyebrow">SEU TIME. UMA CENTRAL.</p><h1>Da ideia à execução<span>.</span></h1><p>Organize agentes, distribua missões e acompanhe cada entrega.</p></div><button className="aw-button aw-secondary" onClick={exportWorkspace}><Download size={16} /> Exportar sessão</button></section>
        <div className="aw-notice"><Radio size={17} /><p><strong>Comece pelo fluxo.</strong> As execuções são simuladas, sem chamadas de IA ou custos de API. Os dados ficam neste navegador.</p></div>
        {storageError && <p className="aw-error" role="alert">{storageError}</p>}
        <p className="aw-feedback" role="status">{message}</p>

        <section className="aw-metrics" aria-label="Indicadores">
          {[{ label: "AGENTES DISPONÍVEIS", value: String(activeAgents).padStart(2, "0"), detail: `${workspace.agents.length} cadastrados`, icon: Bot }, { label: "MISSÕES NA FILA", value: String(workspace.missions.filter(m => m.status === "queued").length).padStart(2, "0"), detail: "Prontas para simular", icon: Layers }, { label: "AGUARDANDO REVISÃO", value: String(workspace.missions.filter(m => m.status === "review").length).padStart(2, "0"), detail: "Aprovação humana", icon: Activity }, { label: "CUSTO DE API", value: "R$ 0,00", detail: "Nenhum provedor conectado", icon: Cpu }].map(metric => <article className="aw-metric" key={metric.label}><div><span>{metric.label}</span><metric.icon size={18} /></div><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}
        </section>

        <section className="aw-panel aw-flow"><div className="aw-section-title"><div><p className="aw-eyebrow">ORQUESTRAÇÃO</p><h2>Um fluxo claro para cada missão</h2></div><span className="aw-badge">SIMULAÇÃO LOCAL</span></div><ol>{["Briefing", "Agente responsável", "Revisão humana", "Entrega aprovada"].map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong><small>{["Defina o objetivo", "Simule a execução", "Confira o resultado", "Registre a conclusão"][index]}</small></li>)}</ol></section>

        <div className="aw-columns">
          <section className="aw-panel" id="agents"><div className="aw-section-title"><div><p className="aw-eyebrow">EQUIPE</p><h2>Seus agentes</h2></div><Bot size={22} /></div>
            <div className="aw-agent-list">{workspace.agents.map((agent, index) => <article className="aw-agent" key={agent.id}><span className="aw-avatar">{agent.name.slice(0, 2).toUpperCase()}</span><div><h3>{agent.name}</h3><p>{agent.role}</p><small>AGENTE {String(index + 1).padStart(2, "0")} · {agent.enabled ? "DISPONÍVEL" : "PAUSADO"}</small></div><button className="aw-icon-button" aria-label={`${agent.enabled ? "Pausar" : "Reativar"} ${agent.name}`} onClick={() => mutate(current => ({ ...current, agents: current.agents.map(candidate => candidate.id === agent.id ? { ...candidate, enabled: !candidate.enabled } : candidate) }))}>{agent.enabled ? <Pause size={17} /> : <Play size={17} />}</button></article>)}</div>
            <form className="aw-form aw-agent-form" onSubmit={submitAgent}><h3>Adicionar agente</h3><label>Nome<input value={agentName} onChange={event => setAgentName(event.target.value)} placeholder="Ex.: Orion" maxLength={40} required /></label><label>Função<input value={agentRole} onChange={event => setAgentRole(event.target.value)} placeholder="Ex.: Pesquisa de tendências" maxLength={100} required /></label><button className="aw-button aw-secondary" type="submit"><Plus size={16} /> Cadastrar agente</button></form>
          </section>

          <section className="aw-panel"><div className="aw-section-title"><div><p className="aw-eyebrow">NOVA MISSÃO</p><h2>O que vamos construir?</h2></div><ArrowUpRight size={22} /></div>
            <div className="aw-presets" aria-label="Exemplos de missão">{missionPresets.map(preset => <button className="aw-button aw-secondary" key={preset.label} onClick={() => { setTitle(preset.title); setBrief(preset.brief); }}>{preset.label}</button>)}</div>
            <form className="aw-form" onSubmit={submitMission}><label>Título da missão<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Planejar uma coleção digital" maxLength={100} required /></label><label>Briefing<textarea value={brief} onChange={event => setBrief(event.target.value)} placeholder="Descreva o objetivo, o público e o resultado esperado…" maxLength={3000} rows={5} required /><small>{brief.length}/3.000 caracteres</small></label><label>Agente responsável<select value={agentId} onChange={event => setAgentId(event.target.value)} required><option value="" disabled>Selecione um agente</option>{workspace.agents.map(agent => <option key={agent.id} value={agent.id} disabled={!agent.enabled}>{agent.name} · {agent.role}{agent.enabled ? "" : " (pausado)"}</option>)}</select></label><button className="aw-button" type="submit" disabled={activeAgents === 0}><Plus size={17} /> Adicionar à fila</button></form>
          </section>
        </div>

        <section className="aw-panel" id="missions"><div className="aw-section-title"><div><p className="aw-eyebrow">PIPELINE</p><h2>Missões em andamento</h2></div><label className="aw-filter">Filtrar<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todas</option><option value="queued">Na fila</option><option value="review">Em revisão</option><option value="approved">Aprovadas</option></select></label></div>
          {filtered.length === 0 ? <div className="aw-empty"><Layers size={28} /><h3>{workspace.missions.length ? "Nenhuma missão neste filtro" : "Sua próxima ideia começa aqui"}</h3><p>Crie uma missão com um briefing e escolha quem vai executá-la.</p></div> : <div className="aw-missions">{filtered.map(mission => <article key={mission.id} className="aw-mission"><div><h3>{mission.title}</h3><small>{workspace.agents.find(agent => agent.id === mission.agentId)?.name} · {new Date(mission.createdAt).toLocaleDateString("pt-BR")}</small></div><span className={`aw-status aw-status-${mission.status}`}>{statusLabels[mission.status]}</span><div className="aw-actions"><button className="aw-button aw-secondary" onClick={() => setSelectedId(mission.id)}>Detalhes</button>{mission.status === "queued" && <button className="aw-button" disabled={!workspace.agents.find(agent => agent.id === mission.agentId)?.enabled} onClick={() => { mutate(current => simulateMission(current, mission.id)); setSelectedId(mission.id); }}><Play size={14} /> Simular</button>}{mission.status === "review" && <button className="aw-button" onClick={() => mutate(current => approveMission(current, mission.id))}><Check size={15} /> Aprovar simulação</button>}</div></article>)}</div>}
        </section>

        <section className="aw-panel aw-terminal" id="terminal"><div className="aw-section-title"><div><p className="aw-eyebrow">SAÍDA DA MISSÃO</p><h2><Terminal size={19} /> Terminal</h2></div><span className="aw-badge">LOCAL</span></div>{selected ? <><h3>{selected.title} · {statusLabels[selected.status]}</h3><pre>{selected.output || `Briefing:\n${selected.brief}\n\nAguardando simulação. Use o botão Simular na lista de missões.`}</pre></> : <p>Selecione uma missão para ver o briefing e a saída da simulação.</p>}</section>
        <footer className="aw-footer"><span>HubLoan / Central de agentes · primeira versão</span><a href="/admin">Abrir módulo de crédito <ArrowUpRight size={13} /></a></footer>
      </main>
    </div>
  );
}
