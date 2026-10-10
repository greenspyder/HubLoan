import { DeliveryReview } from '../components/DeliveryReview';
import { EtsyConnection } from '../components/EtsyConnection';
import { OfferJourney } from '../components/OfferJourney';
import { SalesChannelsPanel } from '../components/SalesChannelsPanel';
import { BusinessHome } from '../components/BusinessHome';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { screens, sectionScreen, sectionUrl } from '../services/navigation';
import { ConnectionsPanel } from '../components/ConnectionsPanel';
import { FactoriesPanel } from '../components/FactoriesPanel';
import { AiCostsPanel } from '../components/AiCostsPanel';
import { KnowledgePanel } from '../components/KnowledgePanel';
import { AstraConsole } from '../components/AstraConsole';
import { ExperimentsPanel } from '../components/ExperimentsPanel';
import { EngineeringPanel } from '../components/EngineeringPanel';
import { MarketingPanel } from '../components/MarketingPanel';
import { ShopPanel } from '../components/ShopPanel';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Bot, Check, Cpu, Download, Layers, Pause, Play, Plus, Radio, Terminal, KeyRound, RefreshCw, X } from 'lucide-react';
import { agentApi, getAccessCode, restoreAccessCode, productionLabels } from '../services/agentApi';
import type { Workspace, Mission, MissionStatus, ProductionKind } from '../services/agentApi';
import '../workspace.css';
import { StationMap } from '../components/StationMap';
import { CommercePanel } from '../components/CommercePanel';
import { AutonomousProjects } from '../components/AutonomousProjects';

const labels: Record<MissionStatus, string> = { draft: 'Rascunho', queued: 'Na fila', running: 'Executando', review: 'Sua revisão', approved: 'Aprovada', failed: 'Falhou', cancelled: 'Cancelada', rejected: 'Rejeitada' };
const presets = [
  { label: 'Mobília 3D', kind: 'model3d' as const, title: 'Mesa low poly original', brief: 'Crie uma mesa de madeira low poly com tampo e quatro pernas, em metros, altura 0,75m. Materiais originais simples, chão em y=0. Entregue GLB e OBJ com texturas e cena de demonstração.' },
  { label: 'Produtos digitais', kind: 'text' as const, title: 'Criar uma coleção original de produtos digitais', brief: 'Produza três conceitos originais de produtos digitais para quem organiza a rotina. Entregue o conteúdo de um produto completo, textos de apresentação e um plano de validação. Não invente demanda, preços de concorrentes ou vendas.' },
  { label: 'Thumbnails', kind: 'thumbnail' as const, title: 'Thumbnail original para YouTube', brief: 'Gere uma thumbnail original sobre montar uma central de agentes de IA. Visual tecnológico verde e preto, composição legível em celular, contraste alto e espaço para título curto. Não use marcas ou rostos de terceiros.' },
  { label: 'Pack 2D', kind: 'sprites' as const, title: 'Mobília 2D para uma estação futurista', brief: 'Produza quatro objetos separados: mesa, cadeira, armário e terminal. Estilo cartoon top-down, paleta verde escuro e cinza, iluminação superior consistente. PNGs transparentes, atlas e cena de demonstração para Godot. Inclua instruções para Unity.' },
  { label: 'Blog', kind: 'text' as const, title: 'Artigo sobre organizar trabalho com agentes', brief: 'Escreva um artigo original de 800 palavras para iniciantes sobre organização de tarefas com agentes de IA. Inclua exemplos, limites práticos e checklist. Não invente pesquisas, links, resultados financeiros ou experiências pessoais.' },
  { label: 'Protótipo', kind: 'text' as const, title: 'Criar um pequeno jogo de navegador', brief: 'Entregue um arquivo HTML completo, com CSS e JavaScript incorporados, de um jogo simples de coletar energia em uma estação espacial. Controles por teclado e botões de toque. Sem bibliotecas externas. Explique como salvar e abrir. Não afirme que o código foi testado.' },
];
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível concluir a ação.'; }
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }


function Artifact({ mission }: { mission: Mission }) {
  const [asset, setAsset] = useState<{ url: string; preview: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; const urls: string[] = [];
    const create = (blob: Blob) => { const url = URL.createObjectURL(blob); urls.push(url); return url; };
    Promise.all([agentApi.image(mission.id), mission.hasPreview ? agentApi.image(mission.id, true) : Promise.resolve(null)]).then(([blob, preview]) => {
      if (!active) return;
      const url = create(blob); setAsset({ url, preview: preview ? create(preview) : blob.type.startsWith('image/') ? url : '' });
    }).catch(error => { if (active) setError(errorMessage(error)); });
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [mission.id, mission.hasPreview, mission.releaseVersion]);
  return <div className="aw-artifact">{error ? <p role="alert">{error}</p> : asset ? <>{asset.preview && <img src={asset.preview} alt={`Prévia dos arquivos de ${mission.title}; confira antes de usar`} />}<a className="aw-button" href={asset.url} download={mission.artifactFilename || `hubloan-${mission.id}.png`}><Download size={16} /> {mission.artifactMime === 'application/zip' ? 'Baixar pacote ZIP' : 'Baixar PNG'}</a></> : <p>Carregando arquivos…</p>}</div>;
}

export function AgentWorkspacePage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const location = useLocation(), navigate = useNavigate();
  const screen = screens.find(s => s.id === location.pathname.split('/')[2]) || screens[0];
  const section = location.hash.slice(1);
  const [messageError, setMessageError] = useState(false);
  function openMission(id: string) { setSelectedId(id); navigate(sectionUrl('terminal')); }
  const busyRef = useRef(false);
  const [title, setTitle] = useState(''), [brief, setBrief] = useState(''), [agentId, setAgentId] = useState('research');
  const [kind, setKind] = useState<ProductionKind>('text'), [execute, setExecute] = useState(true);
  const [agentName, setAgentName] = useState(''), [agentRole, setAgentRole] = useState('');
  const [filter, setFilter] = useState('all'), [selectedId, setSelectedId] = useState('');
  const [apiKey, setApiKey] = useState(''), [model, setModel] = useState(''), [decisionModel,setDecisionModel] = useState(''), [imageModel, setImageModel] = useState('');
  const [restoreCode, setRestoreCode] = useState('');
  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    const stamp = ++epoch.current;
    try { const data = await agentApi.workspace(); if (epoch.current === stamp) { setWorkspace(data); setConnectionError(''); } }
    catch (error) { if (epoch.current === stamp) setConnectionError(errorMessage(error)); }
  }, []);
  useEffect(() => {
    document.title = 'HubLoan · Central de agentes';
    let alive = true; let timer: ReturnType<typeof setTimeout>;
    async function poll() { await refresh(); if (alive) timer = setTimeout(poll, 15000); }
    void poll();
    return () => { alive = false; clearTimeout(timer);
      // Invalidate pending network responses; this ref is a request counter, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      epoch.current++;
    };
  }, [refresh]);
  const loaded = Boolean(workspace);
  useEffect(() => {
    const legacy = sectionScreen[section];
    if (legacy && !location.pathname.startsWith('/agentes/')) { navigate(sectionUrl(section), {replace:true}); return; }
    document.title = `HubLoan · ${screen.title}`;
    if (loaded) { const target = document.getElementById(section); if (target) target.scrollIntoView({block:'start'}); else window.scrollTo(0,0); }
  }, [location.pathname, location.search, section, screen.title, navigate, loaded]);
  async function mutate(operation: () => Promise<Workspace>, success = '') {
    if (busyRef.current) return null;
    busyRef.current = true; setBusy(true); epoch.current++; setMessage(''); setMessageError(false);
    try { const data = await operation(); setWorkspace(data); setConnectionError(''); setMessage(success); return data; }
    catch (error) { setMessageError(true); setMessage(errorMessage(error)); return null; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function submitMission(event: FormEvent) {
    event.preventDefault();
    const data = await mutate(() => agentApi.addMission(title, brief, agentId, kind, execute && Boolean(workspace?.settings.configured)), execute && workspace?.settings.configured ? 'Missão na fila. A execução começa automaticamente no servidor.' : 'Rascunho salvo. Conecte a IA para executar.');
    if (data) { setSelectedId(data.missions[0].id); setTitle(''); setBrief(''); setFilter('all'); }
  }
  async function submitAgent(event: FormEvent) { event.preventDefault(); const data = await mutate(() => agentApi.addAgent(agentName, agentRole), 'Agente cadastrado.'); if (data) { setAgentId(data.agents[data.agents.length - 1].id); setAgentName(''); setAgentRole(''); } }
  async function connect(event: FormEvent) { event.preventDefault(); const data = await mutate(() => agentApi.saveSettings(apiKey, model || workspace!.settings.model, imageModel || workspace!.settings.imageModel,decisionModel || workspace!.settings.decisionModel || workspace!.settings.model), 'Chave validada e salva. Confira o orçamento antes de iniciar a produção.'); if (data) setApiKey(''); }
  async function restore(event: FormEvent) { event.preventDefault(); try { restoreAccessCode(restoreCode); epoch.current++; setWorkspace(null); setSelectedId(''); setRestoreCode(''); await refresh(); setMessage('Espaço restaurado pelo código de acesso.'); } catch (error) { setMessage(errorMessage(error)); } }
  const [factoryId, setFactoryId] = useState('');
  const enabled = workspace?.agents.filter(agent => agent.enabled).length || 0;
  const activeFactoryId = new URLSearchParams(location.search).get('factory') || factoryId;
  const selected = workspace?.missions.find(mission => mission.id === (new URLSearchParams(location.search).get('mission') || selectedId));
  const running = workspace?.missions.filter(mission => mission.status === 'running') || [];
  const filtered = workspace?.missions.filter(mission => filter === 'all' || mission.status === filter) || [];
  return <div className="agent-workspace" onClickCapture={e => { const a = (e.target as HTMLElement).closest('a'); const href = a?.getAttribute('href'); if (href?.startsWith('#') && sectionScreen[href.slice(1)] && !e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(sectionUrl(href.slice(1))); } }}>
    <aside className="aw-sidebar"><a className="aw-brand" href="#overview"><span><Cpu size={22} /></span><div>HUBLOAN<small>SEUS NEGÓCIOS COM IA</small></div></a><p className="aw-eyebrow">SEU DISTRITO DE NEGÓCIOS</p><nav aria-label="Seus negócios">{screens.filter(s => !['conexoes', 'avancado', 'oferta'].includes(s.id)).map(s => <Link key={s.id} to={`/agentes/${s.id}`} aria-current={screen.id === s.id ? 'page' : undefined}><Layers size={18} /> {s.title}</Link>)}</nav><details className="aw-technical-nav"><summary>Configurações e ferramentas</summary><nav aria-label="Configurações">{screens.filter(s => ['conexoes', 'avancado'].includes(s.id)).map(s => <Link key={s.id} to={`/agentes/${s.id}`} aria-current={screen.id === s.id ? 'page' : undefined}>{s.title}</Link>)}</nav></details><div className="aw-sidebar-bottom"><Radio size={17} /><div>{workspace?.settings.configured ? 'IA conectada' : 'Aguardando conexão'}<small>{running.length ? 'Missão em execução' : 'Sem execução ativa'}</small></div></div></aside>
    <main className="aw-main" id="overview"><header className="aw-topbar"><span>HUBLOAN / {screen.title.toUpperCase()}</span><span className="aw-badge">{connectionError ? 'SEM CONEXÃO' : workspace ? 'SERVIDOR CONECTADO' : 'CONECTANDO'}</span></header>
      {!['inicio','oferta'].includes(screen.id) && <section className="aw-heading"><div><p className="aw-eyebrow">UMA IDEIA. UMA ENTREGA REAL.</p><h1>{screen.title}<span>.</span></h1><p>{screen.description}</p></div><button className="aw-button aw-secondary" disabled={!workspace} onClick={() => download(new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' }), 'hubloan-entregas.json')}><Download size={16} /> Exportar histórico</button></section>}
      {connectionError && <div className="aw-error" role="alert">{connectionError} <button className="aw-button aw-secondary" onClick={() => void refresh()}><RefreshCw size={14} /> Tentar novamente</button></div>}
      {(busy || message) && <div className={`aw-feedback aw-toast ${messageError ? 'is-error' : ''}`} role={messageError ? 'alert' : 'status'} aria-live="polite"><span>{busy ? 'Processando… Aguarde a confirmação do servidor.' : message}</span>{!busy && <button className="aw-icon-button" aria-label="Fechar mensagem" onClick={() => setMessage('')}><X size={18} /></button>}</div>}
      {!workspace && <div className="aw-panel aw-empty"><Cpu size={30} /><h2>Conectando sua central</h2><p>O primeiro acesso pode demorar se a hospedagem estiver iniciando.</p><details><summary>Restaurar espaço com código de acesso</summary><form className="aw-form" onSubmit={restore}><label>Código<input type="password" value={restoreCode} onChange={e => setRestoreCode(e.target.value)} required /></label><button className="aw-button">Restaurar</button></form></details></div>}
      {workspace && <>
      {screen.id === 'inicio' && <BusinessHome workspace={workspace} onSelect={openMission} />}
      {screen.id === 'base' && <><section className="aw-panel" id="station"><div className="aw-section-title"><div><p className="aw-eyebrow">VISUALIZAÇÃO DA OPERAÇÃO</p><h2>A estação</h2></div><span className="aw-badge">{running.length ? 'ATIVIDADE REAL' : 'EM ESPERA'}</span></div><StationMap workspace={workspace} onSelect={openMission} onFactory={id => { setFactoryId(id); navigate(`/agentes/base?factory=${encodeURIComponent(id)}#factories`); }} /><p className="aw-caption">Cada robô representa uma função de IA. Ele muda de sala quando a tarefa muda de etapa; sem atividade, aguarda. A estação não registra vendas ou receitas sem integração.</p></section>
      <FactoriesPanel selectedId={activeFactoryId} onSelect={id => { setFactoryId(id); navigate(`/agentes/base?factory=${encodeURIComponent(id)}#factories`); }} workspace={workspace} busy={busy} mutate={mutate} /></>}
      {screen.id === 'producao' && <AutonomousProjects workspace={workspace} busy={busy} mutate={mutate} />}
      {screen.id === 'oferta' && <OfferJourney key={location.search} workspace={workspace} busy={busy} mutate={mutate} />}
      {screen.id === 'vendas' && <><nav className="aw-tabs" aria-label="Vendas"><Link to="/agentes/vendas" aria-current={!section || section==='channels'?'page':undefined}>Canais de venda</Link><Link to="/agentes/vendas#shop" aria-current={section==='shop'?'page':undefined}>Loja própria</Link><Link to="/agentes/vendas#experiments" aria-current={section==='experiments'||section.startsWith('experiment-')?'page':undefined}>Resultados e custos · análise</Link></nav>{section==='shop'?<ShopPanel workspace={workspace} busy={busy} mutate={mutate}/>:section==='experiments'||section.startsWith('experiment-')?<ExperimentsPanel workspace={workspace} busy={busy} mutate={mutate}/>:<SalesChannelsPanel workspace={workspace}/>}</>}

      {screen.id === 'divulgacao' && <MarketingPanel workspace={workspace} busy={busy} mutate={mutate} />}
      {screen.id === 'conexoes' && <><EtsyConnection workspace={workspace} busy={busy} mutate={mutate}/><ConnectionsPanel workspace={workspace} />{section === 'costs' && <div id="costs"><AiCostsPanel workspace={workspace} busy={busy} mutate={mutate} /></div>}{section === 'commerce' && <div><CommercePanel workspace={workspace} busy={busy} mutate={mutate} /></div>}</>}
      {screen.id === 'avancado' && <><nav className="aw-tabs" aria-label="Ferramentas avançadas">{[['astra','Decisões'],['knowledge','Segundo cérebro'],['improvements','Melhorias'],['agents','Equipe']].map(([id,name]) => <Link key={id} to={sectionUrl(id)} aria-current={(section || 'astra') === id ? 'page' : undefined}>{name}</Link>)}</nav>{(!section || section === 'astra') && <AstraConsole workspace={workspace} />}{section === 'knowledge' && <KnowledgePanel workspace={workspace} busy={busy} mutate={mutate} />}{section === 'improvements' && <EngineeringPanel workspace={workspace} busy={busy} mutate={mutate} />}</>}
      {screen.id === 'avancado' && section === 'agents' && <section className="aw-panel" id="agents"><div className="aw-section-title"><div><p className="aw-eyebrow">EQUIPE</p><h2>Seus agentes</h2></div><Bot size={22} /></div><div className="aw-agent-list">{workspace.agents.map(agent => <article className="aw-agent" key={agent.id}><span className="aw-avatar">{agent.name.slice(0, 2).toUpperCase()}</span><div><h3>{agent.name}</h3><p>{agent.role}</p><small>{running.some(m => m.agentId === agent.id) ? 'EXECUTANDO' : agent.enabled ? 'DISPONÍVEL' : 'NOVAS TAREFAS PAUSADAS'}</small></div><button className="aw-icon-button" disabled={busy} aria-label={`${agent.enabled ? 'Pausar novas tarefas de' : 'Reativar'} ${agent.name}`} onClick={() => void mutate(() => agentApi.toggleAgent(agent.id, !agent.enabled))}>{agent.enabled ? <Pause size={17} /> : <Play size={17} />}</button></article>)}</div><form className="aw-form aw-agent-form" onSubmit={submitAgent}><h3>Adicionar função de agente</h3><label>Nome<input value={agentName} onChange={e => setAgentName(e.target.value)} maxLength={40} required /></label><label>Função<input value={agentRole} onChange={e => setAgentRole(e.target.value)} maxLength={100} required /></label><button className="aw-button aw-secondary" disabled={busy}><Plus size={16} /> Cadastrar</button></form></section>}
      {screen.id === 'producao' && <details open={section === 'new-mission'}><summary>Criar uma entrega com meu briefing</summary><section className="aw-panel" id="new-mission"><div className="aw-section-title"><div><p className="aw-eyebrow">NOVA MISSÃO</p><h2>O que vamos produzir?</h2></div><Plus size={22} /></div><div className="aw-presets">{presets.map(preset => <button className="aw-button aw-secondary" key={preset.label} onClick={() => { setTitle(preset.title); setBrief(preset.brief); setKind(preset.kind); }}>{preset.label}</button>)}</div><form className="aw-form" onSubmit={submitMission}><label>Título<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required /></label><label>Briefing<textarea value={brief} onChange={e => setBrief(e.target.value)} rows={5} maxLength={6000} placeholder="Objetivo, público e entrega esperada…" required /><small>{brief.length}/6.000</small></label><label>Entrega<select value={kind} onChange={e => setKind(e.target.value as ProductionKind)}>{Object.entries(productionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Responsável<select value={agentId} onChange={e => setAgentId(e.target.value)}>{workspace.agents.map(agent => <option key={agent.id} value={agent.id} disabled={!agent.enabled}>{agent.name} · {agent.role}</option>)}</select></label><label className="aw-checkbox"><input type="checkbox" checked={execute} disabled={!workspace.settings.configured} onChange={e => setExecute(e.target.checked)} /> Executar automaticamente ao criar</label><small className="aw-caption">{kind === 'thumbnail' ? '4 chamadas: plano, direção, fundo e revisão visual. Informe assunto, público e resumo do vídeo no briefing.' : kind === 'sprites' ? '7 chamadas: plano, estilo, quatro objetos e revisão visual.' : kind === 'model3d' ? '2 chamadas de texto; geometria e texturas são construídas no servidor.' : kind === 'image' ? 'Duas etapas de texto e uma geração de imagem.' : 'Três etapas de texto: plano, produção e revisão.'} Chamadas usam a sua chave e podem gerar custos.</small><button className="aw-button" disabled={busy || !enabled}><Play size={17} /> {workspace.settings.configured && execute ? 'Criar e executar' : 'Salvar rascunho'}</button></form></section></details>}
      {screen.id === 'armazem' && <><section className="aw-panel" id="missions"><div className="aw-section-title"><div><p className="aw-eyebrow">PIPELINE</p><h2>Missões e entregas</h2></div><label className="aw-filter">Filtrar<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todas</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>{!filtered.length ? <div className="aw-empty"><Layers size={28} /><h3>Nenhuma missão aqui</h3><p>Escolha um exemplo ou descreva sua própria entrega.</p></div> : <div className="aw-missions">{filtered.map(m => <article className="aw-mission" key={m.id}><div><h3>{m.title}</h3><small>{workspace.agents.find(a => a.id === m.agentId)?.name} · {productionLabels[m.kind]}{m.purpose === 'experiment-preparation' ? ' · KIT DE EXPERIMENTO PRIVADO' : ''} · {m.phase}</small></div><span className={`aw-status aw-status-${m.status}`}>{labels[m.status]}</span><div className="aw-actions"><button className="aw-button aw-secondary" onClick={() => openMission(m.id)}>Detalhes</button>{['draft', 'failed', 'cancelled'].includes(m.status) && <button className="aw-button" disabled={busy || !workspace.settings.configured || !workspace.agents.find(a => a.id === m.agentId)?.enabled} onClick={() => void mutate(() => agentApi.action(m.id, 'run'), 'Missão na fila.')}><Play size={14} /> {m.status === 'draft' ? 'Executar' : 'Retomar etapas pendentes'}</button>}{['queued', 'running'].includes(m.status) && <button className="aw-button aw-secondary" disabled={busy} onClick={() => void mutate(() => agentApi.action(m.id, 'cancel'), 'Cancelada. Chamadas já enviadas podem ter sido cobradas.')}><X size={14} /> Cancelar</button>}{m.status === 'review' && <button className="aw-button" disabled={busy} onClick={() => void mutate(() => agentApi.action(m.id, 'approve'), 'Entrega aprovada por você.')}><Check size={14} /> Aprovar</button>}</div></article>)}</div>}</section>
      <section className="aw-panel aw-terminal" id="terminal"><div className="aw-section-title"><div><p className="aw-eyebrow">SAÍDA DA MISSÃO</p><h2><Terminal size={19} /> Entrega e registro</h2></div>{selected?.output && <button className="aw-button aw-secondary" onClick={() => download(new Blob([selected.output], { type: 'text/markdown;charset=utf-8' }), `hubloan-${selected.id}.md`)}><Download size={15} /> Baixar texto</button>}</div>{selected ? <><h3>{selected.title} · {labels[selected.status]}</h3>{selected.error && <p className="aw-error" role="alert">{selected.error}</p>}{selected.hasArtifact && <Artifact key={`${selected.id}:${selected.releaseVersion}`} mission={selected} />}<DeliveryReview key={selected.id} mission={selected} busy={busy} mutate={mutate} /><details><summary>Briefing original</summary><pre>{selected.brief}</pre></details><pre>{selected.output || selected.phase}</pre><div className="aw-log">{selected.events.map((event, index) => <p key={index}><time>{new Date(event.at).toLocaleTimeString('pt-BR')}</time> {event.message}</p>)}</div><p className="aw-caption">{selected.tokens.toLocaleString('pt-BR')} tokens registrados · {selected.images} imagens concluídas · tentativa {selected.attempt} · {selected.completedSteps || 0} etapas salvas para retomada. O painel do provedor é a referência de cobrança.</p></> : <p>Selecione Detalhes em uma missão para ver a entrega e as etapas reais.</p>}</section></>}
      {screen.id === 'conexoes' && section === 'settings' && <section className="aw-panel" id="settings"><div className="aw-section-title"><div><p className="aw-eyebrow">CONEXÃO</p><h2><KeyRound size={20} /> Ativar sua IA</h2></div><span className="aw-badge">{workspace.settings.configured ? 'CHAVE SALVA' : 'SEM CHAVE'}</span></div><form className="aw-form" onSubmit={connect}><label>Chave da OpenAI<input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={workspace.settings.configured ? 'Preencha apenas para trocar a chave' : 'sk-…'} autoComplete="off" required={!workspace.settings.configured} maxLength={1000} /></label><div className="aw-columns"><label>Trabalhadores<select value={model || workspace.settings.workerModel || workspace.settings.model} onChange={e => setModel(e.target.value)}><option value="gpt-4.1-mini">GPT-4.1 mini · econômico</option><option value="gpt-4.1">GPT-4.1</option><option value="gpt-5.6-luna">GPT-5.6 Luna · tarefas previsíveis</option></select></label><label>Astra / decisões econômicas<select value={decisionModel || workspace.settings.decisionModel || workspace.settings.model} onChange={e=>setDecisionModel(e.target.value)}>{(workspace.settings.modelCatalog||[{id:"gpt-4.1-mini"}]).map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select></label><label>Modelo de imagem<select value={imageModel || workspace.settings.imageModel} onChange={e => setImageModel(e.target.value)}><option value="gpt-image-1-mini">GPT Image 1 mini · econômico</option><option value="gpt-image-1.5">GPT Image 1.5</option></select></label></div><div className="aw-actions"><button className="aw-button" disabled={busy}><Radio size={16} /> {workspace.settings.configured ? 'Salvar conexão' : 'Validar e conectar IA'}</button>{workspace.settings.configured && <button className="aw-button aw-secondary" type="button" disabled={busy} onClick={() => void mutate(agentApi.disconnect, 'Chave removida e fila cancelada.')}>Desconectar e cancelar fila</button>}<a className="aw-button aw-secondary" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Criar chave</a></div></form><p className="aw-caption">A chave fica criptografada no servidor e não volta para a interface. Imagens podem exigir verificação da organização na OpenAI. Limite gastos no painel do provedor. Pesquisa web pode ser ativada nos projetos autônomos e tem cobrança adicional. Uploads de packs podem ser autorizados na integração itch.io. Preço, checkout e recebimento são configurados na loja. Execução de código de terceiros permanece indisponível.</p><p className="aw-caption">Uma chave, modelos por função. Ao salvar, consultamos os modelos acessíveis e validamos os escolhidos, sem gerar conteúdo. Acesso ao modelo não comprova saldo nem garante acesso a todas as ferramentas. Decisões usam o modelo principal; produção usa o trabalhador. Sem aumento automático de orçamento.</p><details><summary>Preços de referência e disponibilidade</summary><p>USD por milhão de tokens de texto; consulta documental em 04/10/2026. Pesquisa, imagens e outras cobranças ficam fora desta tabela.</p>{workspace.settings.modelCatalog?.map(m=><p key={m.id}>{m.id}: entrada ${m.input}, saída ${m.output}. {workspace.settings.availableModels?.includes(m.id)?"Listado pela sua chave na última consulta":"Acesso ainda não confirmado"}</p>)}<a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noreferrer">Tabela oficial atual</a></details><details className="aw-access"><summary>Acesso em outro celular e backup</summary><p>Este navegador guarda seu código de acesso. Baixe e guarde como uma senha: ele permite acessar suas missões e usar a chave conectada. Sem o código, não há recuperação deste espaço.</p><button className="aw-button aw-secondary" onClick={() => { try { download(new Blob([getAccessCode()], { type: 'text/plain' }), 'hubloan-codigo-de-acesso.txt'); } catch (error) { setMessage(errorMessage(error)); } }}><Download size={16} /> Guardar código de acesso</button><form className="aw-form" onSubmit={restore}><label>Restaurar outro espaço<input type="password" value={restoreCode} onChange={e => setRestoreCode(e.target.value)} required maxLength={64} /></label><button className="aw-button aw-secondary" disabled={busy}>Restaurar espaço</button></form></details></section>}
      <footer className="aw-footer"><span>HubLoan · dados no {workspace.storage === 'postgres' ? 'PostgreSQL' : 'servidor local SQLite'}</span><span>Servidor inativo pausa o trabalho. Projetos autorizados retomam tarefas pendentes ao voltar.</span></footer>
      </>}
    </main>
  </div>;
}
