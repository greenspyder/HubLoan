import { useEffect, useRef, useState } from 'react';
import type { Mission, Workspace } from '../services/agentApi';
import './station.css';

type Point = { x: number; y: number };
const rooms = [
  { id: 'research', name: 'LABORATÓRIO', sub: 'Pesquisa & planejamento', x: 3, y: 6, w: 28, h: 22, color: '#4ee4b2', point: { x: 17, y: 19 } },
  { id: 'command', name: 'NÚCLEO CENTRAL', sub: 'Coordenador de operações', x: 36, y: 3, w: 28, h: 24, color: '#bdff70', point: { x: 50, y: 17 } },
  { id: 'factory', name: 'FÁBRICA', sub: 'Texto & código', x: 69, y: 6, w: 28, h: 22, color: '#efc46b', point: { x: 83, y: 19 } },
  { id: 'studio', name: 'ESTÚDIO', sub: 'Direção de arte & imagens', x: 3, y: 36, w: 28, h: 22, color: '#6caaff', point: { x: 17, y: 49 } },
  { id: 'archive', name: 'ARMAZÉM', sub: 'Entregas produzidas', x: 36, y: 37, w: 28, h: 24, color: '#8ae4bc', point: { x: 50, y: 51 } },
  { id: 'review', name: 'QUALIDADE', sub: 'Revisão da entrega', x: 69, y: 36, w: 28, h: 22, color: '#cd9bff', point: { x: 83, y: 49 } },
];
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
    const path = [previous, { x: previous.x, y: 32 }, { x, y: 32 }, { x, y }];
    node.dataset.moving = 'true';
    const animation = node.animate(path.map(point => ({ left: `${point.x}%`, top: `${point.y}%` })), { duration: 2600, easing: 'linear' });
    animation.onfinish = () => { delete node.dataset.moving; };
    return () => { animation.cancel(); delete node.dataset.moving; };
  }, [x, y]);
  return <button ref={element} className={`sm-robot ${active ? 'sm-robot-working' : ''}`} style={{ left: `${target.x}%`, top: `${target.y}%`, '--robot-color': color } as React.CSSProperties} onClick={onClick} title={`${name}: ${status}`} aria-label={`${name}: ${status}`}>
    <svg viewBox="0 0 30 36" aria-hidden="true" shapeRendering="crispEdges"><path fill="var(--robot-color)" d="M14 1h2v5h-2zM7 6h16v3h3v13h-3v3H7v-3H4V9h3z" /><path fill="#152820" d="M8 10h14v10H8z" /><path className="sm-eyes" fill="#d5ffaf" d="M10 12h3v4h-3zm7 0h3v4h-3z" /><path fill="#d5ffaf" d="M12 18h6v1h-6z" /><path fill="var(--robot-color)" d="M9 25h12v5H9zM1 15h3v11H1zm25 0h3v11h-3z" /><path fill="#658674" d="M8 24h14v2H8z" /><path className="sm-leg-left" fill="var(--robot-color)" d="M8 30h5v5H8z" /><path className="sm-leg-right" fill="var(--robot-color)" d="M17 30h5v5h-5z" /></svg><span>{name}</span><i /></button>;
}
export function StationMap({ workspace, onSelect }: { workspace: Workspace; onSelect: (id: string) => void }) {
  const [focused, setFocused] = useState('');
  const [zoom, setZoom] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const planning = workspace.autonomy?.projects.find(project => project.status === 'planning');
  const activeMissions = workspace.missions.filter(mission => mission.status === 'running');
  const previewing = preview && !planning && activeMissions.length === 0;
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
  const allRobots = [coordinator, ...robots].map((robot, index) => previewing ? { ...robot, target: rooms[(previewStep + index) % rooms.length].point, status: 'Prévia visual do movimento; nenhuma execução de IA', active: false } : robot);
  const selected = allRobots.find(robot => robot.id === focused);
  const latestEvents = [...workspace.missions.flatMap(mission => mission.events.map(event => ({ ...event, name: mission.title }))), ...(workspace.autonomy?.projects || []).flatMap(project => project.events.map(event => ({ ...event, name: project.name })))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  return <div className="sm-station"><div className="sm-toolbar"><span><i className={activeMissions.length || planning ? 'sm-live' : ''} /> {previewing ? 'PRÉVIA VISUAL / SEM IA' : activeMissions.length || planning ? 'OPERAÇÃO EM ANDAMENTO' : 'ESTAÇÃO EM ESPERA'}</span><div className="aw-actions"><button className="aw-button aw-secondary" disabled={Boolean(planning) || activeMissions.length > 0} onClick={() => setPreview(!preview)}>{previewing ? 'Encerrar prévia' : 'Testar movimento'}</button><button className="aw-button aw-secondary" onClick={() => setZoom(!zoom)}>{zoom ? 'Ver estação inteira' : 'Ampliar mapa'}</button></div></div>{previewing && <p className="sm-preview-notice">Prévia da animação: os robôs percorrem o mapa sem executar IA, gerar custos ou alterar suas missões.</p>}<div className="sm-scroll"><div className={`sm-map ${zoom ? 'sm-map-zoom' : ''}`} aria-label="Mapa da estação; clique nos robôs para acompanhar as tarefas">
    <div className="sm-hall sm-hall-main" />{[17, 50, 83].map(x => <div key={x} className="sm-hall sm-hall-branch" style={{ left: `${x - 1.5}%` }} />)}
    {rooms.map(room => <section key={room.id} className={`sm-room ${allRobots.some(robot => robot.roomId === room.id && robot.active) ? 'sm-room-active' : ''}`} style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%`, '--room-color': room.color } as React.CSSProperties}><header><span>{room.name}</span><i /></header><small>{room.sub}</small><div className="sm-machines"><div className="sm-console"><b /><span /><span /></div><div className="sm-console"><b /><span /><span /></div></div><div className="sm-room-door" /></section>)}
    <div className="sm-core"><span /><small>BUS DE OPERAÇÕES</small></div>
    {allRobots.map(robot => <Robot key={robot.id} {...robot} onClick={() => { setFocused(robot.id); if (robot.mission) onSelect(robot.mission.id); }} />)}
    <div className="sm-map-caption">{workspace.settings.configured ? 'API CONECTADA' : 'SEM CHAVE DE API'} / {workspace.missions.filter(m => ['review', 'approved'].includes(m.status)).length} ENTREGAS / {allRobots.length} FUNÇÕES</div>
  </div></div><div className="sm-inspector"><div><strong>{selected ? selected.name : 'Selecione um robô'}</strong><p>{selected ? selected.status : 'O movimento acompanha mudanças de etapa no servidor. Sem tarefas, os robôs ficam em espera.'}</p></div><span className="aw-badge">{planning ? 'COORDENAÇÃO ATIVA' : activeMissions.length ? 'PRODUÇÃO ATIVA' : 'SEM EXECUÇÃO'}</span></div><div className="sm-feed">{latestEvents.length ? latestEvents.map((event, index) => <p key={index}><time>{new Date(event.at).toLocaleTimeString('pt-BR')}</time><span>{event.message}</span></p>) : <p><span>Nenhum evento de execução registrado. Crie uma missão ou inicie um projeto autônomo.</span></p>}</div></div>;
}
