import { useEffect, useRef, useState } from 'react';
import type { Mission, Workspace } from '../services/agentApi';
import './station.css';
import { StationScenery } from './StationScenery';

type Point = { x: number; y: number };
const rooms = [
  { id: 'research', name: 'LABORATÓRIO', sub: 'Pesquisa & planejamento', x: 3, y: 6, w: 28, h: 22, color: '#4ee4b2', point: { x: 17, y: 19 } },
  { id: 'command', name: 'NÚCLEO CENTRAL', sub: 'Coordenador de operações', x: 36, y: 3, w: 28, h: 24, color: '#bdff70', point: { x: 50, y: 17 } },
  { id: 'factory', name: 'FÁBRICA', sub: 'Texto & código', x: 69, y: 6, w: 28, h: 22, color: '#efc46b', point: { x: 83, y: 19 } },
  { id: 'studio', name: 'ESTÚDIO', sub: 'Direção de arte & imagens', x: 3, y: 36, w: 28, h: 22, color: '#6caaff', point: { x: 17, y: 49 } },
  { id: 'archive', name: 'ARMAZÉM', sub: 'Entregas produzidas', x: 36, y: 37, w: 28, h: 24, color: '#8ae4bc', point: { x: 50, y: 51 } },
  { id: 'review', name: 'QUALIDADE', sub: 'Revisão da entrega', x: 69, y: 36, w: 28, h: 22, color: '#cd9bff', point: { x: 83, y: 49 } },
].map(room => ({ ...room, y: room.y / .64, h: room.h / .64, point: { x: room.point.x, y: room.point.y / .64 } }));
function roomFor(mission?: Mission) {
  if (!mission) return 'factory';
  if (['review', 'approved'].includes(mission.status)) return 'archive';
  if (mission.phase.includes('Planejando')) return 'research';
  if (mission.phase.includes('Revisando')) return 'review';
  return ['image', 'thumbnail', 'sprites'].includes(mission.kind) ? 'studio' : 'factory';
}
function Robot({ name, color, target, active, status, onClick }: { name: string; color: string; target: Point; active: boolean; status: string; onClick: () => void }) {
  const { x, y } = target;
  const element = useRef<HTMLButtonElement>(null);
  const position = useRef(target);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const previous = position.current;
    position.current = { x, y };
    if (previous.x === x && previous.y === y) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const path = [previous, { x: previous.x, y: 50 }, { x, y: 50 }, { x, y }];
    node.dataset.moving = 'true';
    const animation = node.animate(path.map(point => ({ left: `${point.x}%`, top: `${point.y}%` })), { duration: 2600, easing: 'linear' });
    animation.onfinish = () => { delete node.dataset.moving; };
    return () => { animation.cancel(); delete node.dataset.moving; };
  }, [x, y]);
  return <button ref={element} className={`sm-robot ${active ? 'sm-robot-working' : ''}`} style={{ left: `${target.x}%`, top: `${target.y}%`, '--robot-color': color } as React.CSSProperties} onClick={onClick} title={`${name}: ${status}`} aria-label={`${name}: ${status}`}>
    <svg viewBox="0 0 30 36" aria-hidden="true" shapeRendering="crispEdges"><ellipse cx="15" cy="34" rx="13" ry="2" fill="#030b17" opacity=".7" /><path fill="#fff2bd" d="M13 0h4v3h-4z" /><path fill="var(--robot-color)" d="M14 1h2v5h-2zM7 6h16v3h3v13h-3v3H7v-3H4V9h3z" /><path fill="#152820" d="M8 10h14v10H8z" /><path className="sm-eyes" fill="#d5ffaf" d="M10 12h3v4h-3zm7 0h3v4h-3z" /><path fill="#d5ffaf" d="M12 18h6v1h-6z" /><path fill="var(--robot-color)" d="M9 25h12v5H9zM1 15h3v11H1zm25 0h3v11h-3z" /><path fill="#658674" d="M8 24h14v2H8z" /><path className="sm-leg-left" fill="var(--robot-color)" d="M8 30h5v5H8z" /><path className="sm-leg-right" fill="var(--robot-color)" d="M17 30h5v5h-5z" /></svg><span>{name}</span><i /></button>;
}
export function StationMap({ workspace, onSelect }: { workspace: Workspace; onSelect: (id: string) => void }) {
  const [focused, setFocused] = useState('');
  const [zoom, setZoom] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const planning = workspace.autonomy?.projects.find(project => project.status === 'planning');
  const activeMissions = workspace.missions.filter(mission => mission.status === 'running');
  const engineeringJob = workspace.engineering?.jobs.find(job => job.status === 'running' || job.release?.status === 'merging');
  const operating = Boolean(planning || activeMissions.length || engineeringJob);
  const previewing = preview && !operating;
  useEffect(() => {
    if (!previewing) return;
    const timer = setInterval(() => setPreviewStep(step => step + 1), 4000);
    return () => clearInterval(timer);
  }, [previewing]);
  const robots = workspace.agents.map((agent, index) => {
    const mission = activeMissions.find(mission => mission.agentId === agent.id) || workspace.missions.find(mission => mission.agentId === agent.id && ['review', 'approved'].includes(mission.status));
    const home = agent.id === 'research' ? 'research' : agent.id === 'reviewer' ? 'review' : 'factory';
    const room = rooms.find(room => room.id === (mission ? roomFor(mission) : home))!;
    const target = { x: room.point.x + (index % 3 - 1) * 5, y: room.point.y + (Math.floor(index / 3) % 3) * 2.4 };
    return { id: agent.id, name: agent.name, target, color: room.color, roomId: room.id, active: mission?.status === 'running', mission, status: mission?.status === 'running' ? mission.phase : !agent.enabled ? 'Novas tarefas pausadas' : mission ? 'Entrega disponível no armazém' : 'Aguardando uma missão' };
  });
  const coordinatorRoom = rooms.find(room => room.id === (planning?.phase.includes('Pesquisando') ? 'research' : 'command'))!;
  const coordinator = { id: 'coordinator', name: 'Orion', target: coordinatorRoom.point, color: '#bdff70', roomId: coordinatorRoom.id, active: Boolean(planning), mission: undefined, status: planning?.phase || (workspace.autonomy?.enabled ? 'Monitorando o próximo ciclo' : 'Coordenador em espera') };
  const engineerRoom = rooms.find(room => room.id === (engineeringJob?.phase.toLowerCase().includes('revis') ? 'review' : 'factory'))!;
  const engineer = { id: 'engineer', name: 'Forge', target: { x: engineerRoom.point.x + 5, y: engineerRoom.point.y + 2.4 }, color: '#efc46b', roomId: engineerRoom.id, active: Boolean(engineeringJob), mission: undefined, status: engineeringJob?.phase || 'Engenharia em espera; melhorias exigem autorização' };
  const allRobots = [coordinator, ...robots, engineer].map((robot, index) => previewing ? { ...robot, roomId: rooms[(previewStep + index) % rooms.length].id, target: rooms[(previewStep + index) % rooms.length].point, status: 'Prévia visual do movimento; nenhuma execução de IA', active: false } : robot);
  const selected = allRobots.find(robot => robot.id === focused);
  const latestEvents = [...workspace.missions.flatMap(mission => mission.events.map(event => ({ ...event, name: mission.title }))), ...(workspace.autonomy?.projects || []).flatMap(project => project.events.map(event => ({ ...event, name: project.name }))), ...(workspace.engineering?.jobs || []).flatMap(job => job.events.map(event => ({ ...event, name: job.title })))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  function selectRobot(id: string) { const robot = allRobots.find(r => r.id === id); setFocused(id); if (robot?.mission) onSelect(robot.mission.id); }
  return <div className="sm-station">
    <div className="sm-toolbar"><span><i className={operating ? 'sm-live' : ''} /> {previewing ? 'PRÉVIA VISUAL / SEM IA' : operating ? 'OPERAÇÃO EM ANDAMENTO' : 'BASE EM ESPERA'}</span><div className="aw-actions"><button className="aw-button aw-secondary" disabled={operating} onClick={() => setPreview(!preview)}>{previewing ? 'Encerrar prévia' : 'Testar movimento'}</button><button className="aw-button aw-secondary" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? 'Ver base inteira' : 'Explorar detalhes'}</button></div></div>
    {previewing && <p className="sm-preview-notice">Prévia da animação: os robôs percorrem o mapa sem executar IA, gerar custos ou alterar suas missões.</p>}
    {zoom && <p className="sm-map-help">Deslize o mapa para os lados para explorar as salas. Use a lista de robôs abaixo para selecionar uma função.</p>}
    <div className="sm-scroll" tabIndex={zoom ? 0 : undefined} aria-label="Base de operações; mapa rolável quando ampliado"><div className={`sm-map ${zoom ? 'sm-map-zoom' : ''}`}>
      <StationScenery rooms={rooms} />
      {rooms.map(room => <section key={room.id} className={`sm-room ${allRobots.some(robot => robot.roomId === room.id && robot.active) ? 'sm-room-active' : ''}`} style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%`, '--room-color': room.color } as React.CSSProperties}><header><span>{room.name}</span><i /></header><small>{room.sub}</small></section>)}
      {allRobots.map(robot => <Robot key={robot.id} {...robot} onClick={() => selectRobot(robot.id)} />)}
      <div className="sm-map-caption">{workspace.settings.configured ? 'API CONECTADA' : 'SEM CHAVE DE API'} · {workspace.missions.filter(m => ['review', 'approved'].includes(m.status)).length} ENTREGAS REAIS</div>
    </div></div>
    <div className="sm-crew" aria-label="Selecionar robô">{allRobots.map(robot => <button key={robot.id} className={focused === robot.id ? 'is-selected' : ''} aria-pressed={focused === robot.id} onClick={() => selectRobot(robot.id)}><i style={{ background: robot.color }} /><strong>{robot.name}</strong><span>{previewing ? 'Prévia' : robot.active ? 'Em execução' : 'Em espera'}</span></button>)}</div>
    <div className="sm-inspector"><div><strong>{selected ? selected.name : 'Sua equipe de robôs'}</strong><p>{selected ? selected.status : 'Escolha um robô no mapa ou na lista. As mudanças de sala acompanham etapas registradas no servidor; a prévia é apenas visual.'}</p>{selected?.mission && <button className="aw-button aw-secondary" onClick={() => { onSelect(selected.mission!.id); document.getElementById('terminal')?.scrollIntoView({ behavior: 'smooth' }); }}>Abrir tarefa e entrega</button>}{selected?.id === 'engineer' && <a href="#improvements">Abrir melhorias da aplicação →</a>}</div><span className="aw-badge">{previewing ? 'CUSTO DA PRÉVIA: ZERO' : operating ? 'EXECUÇÃO REAL' : 'SEM EXECUÇÃO'}</span></div>
    <div className="sm-feed">{latestEvents.length ? latestEvents.map((event, index) => <p key={index}><time>{new Date(event.at).toLocaleTimeString('pt-BR')}</time><span>{event.message}</span></p>) : <p><span>Nenhum evento de execução registrado. Conecte a IA e crie seu primeiro teste no início da página.</span></p>}</div>
  </div>;
}
