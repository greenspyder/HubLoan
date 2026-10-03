import { useEffect, useRef, useState } from 'react';
import type { Mission, Workspace } from '../services/agentApi';
import './station.css';
import { RobotSprite } from './RobotSprite';
import { StationScenery } from './StationScenery';

type Point = { x: number; y: number };
function roomFor(mission: Mission) {
  if (['review', 'approved'].includes(mission.status)) return 'archive';
  if (mission.phase.includes('Planejando')) return 'research';
  if (mission.phase.includes('Revisando')) return 'review';
  return mission.factoryId || `factory-${mission.kind}`;
}
function Robot({ id, name, color, target, active, demo, delivery, status, onClick }: { demo: boolean; delivery: boolean; id: string; name: string; color: string; target: Point; active: boolean; status: string; onClick: () => void }) {
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
    const animation = node.animate(path.map(point => ({ left: `${point.x}%`, top: `${point.y}%` })), { duration: 3200, easing: 'linear' });
    animation.onfinish = () => { delete node.dataset.moving; };
    return () => { animation.cancel(); delete node.dataset.moving; };
  }, [x, y]);
  return <button ref={element} className={`sm-robot ${demo ? 'sm-robot-demo' : ''} ${id === 'coordinator' ? 'sm-robot-commander' : ''} ${active ? 'sm-robot-working' : ''}`} style={{ left: `${target.x}%`, top: `${target.y}%`, '--robot-color': color } as React.CSSProperties} onClick={onClick} title={`${name}: ${status}`} aria-label={`${name}: ${status}`}>
    <RobotSprite commander={id === 'coordinator'} role={id} delivery={delivery} /><span>{name}</span><i /></button>;
}
export function StationMap({ workspace, onSelect, onFactory }: { workspace: Workspace; onSelect: (id: string) => void; onFactory: (id: string) => void }) {
  const factories = workspace.factories || [];
  const places = [
    {id:'command',name:'ASTRA',sub:'Coordenação',color:'#75dff5',href:'#astra'},
    {id:'research',name:'LABORATÓRIO',sub:'Pesquisa de oportunidades',color:'#4ee4b2',href:'#autonomy'},
    {id:'archive',name:'ARMAZÉM',sub:`${workspace.missions.filter(m=>['review','approved'].includes(m.status)).length} entregas · abrir arquivos`,color:'#efc46b',href:'#missions'},
    ...factories.map(f=>({id:f.id,name:f.name.toUpperCase(),sub:f.blocker?'Integração pendente':f.running?`${f.running} em produção`:f.queued?`${f.queued} na fila`:`${f.delivered} entregas · em espera`,color:f.blocker?'#82909f':'#bdff70',href:''})),
    {id:'review',name:'QUALIDADE',sub:'Revisão das entregas',color:'#cd9bff',href:'#missions'},
  ];
  const worldHeight = Math.ceil(places.length / 3) * 245 + 45;
  const rooms = places.map((r,i)=>({...r,x:3+(i%3)*33,y:(25+Math.floor(i/3)*245)/worldHeight*100,w:28,h:195/worldHeight*100,point:{x:17+(i%3)*33,y:(135+Math.floor(i/3)*245)/worldHeight*100}}));
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
    const home = agent.id === 'research' ? 'research' : agent.id === 'reviewer' ? 'review' : factories[0]?.id || 'command';
    const room = rooms.find(room => room.id === (mission ? roomFor(mission) : home)) || rooms[0];
    const target = { x: room.point.x + (index % 3 - 1) * 5, y: room.point.y + (Math.floor(index / 3) % 3) * 2.4 };
    return { id: agent.id, name: agent.name, target, color: room.color, roomId: room.id, active: mission?.status === 'running', mission, status: mission?.status === 'running' ? mission.phase : !agent.enabled ? 'Novas tarefas pausadas' : mission ? 'Entrega disponível no armazém' : 'Aguardando uma missão' };
  });
  const coordinatorRoom = rooms.find(room => room.id === (planning?.phase.includes('Pesquisando') ? 'research' : 'command'))!;
  const coordinator = { id: 'coordinator', name: 'Astra', target: coordinatorRoom.point, color: '#68d9f0', roomId: coordinatorRoom.id, active: Boolean(planning), mission: undefined, status: planning?.phase || (workspace.autonomy?.enabled ? 'Monitorando o próximo ciclo' : 'Coordenador em espera') };
  const engineerRoom = rooms.find(room => room.id === (engineeringJob?.phase.toLowerCase().includes('revis') ? 'review' : 'command'))!;
  const engineer = { id: 'engineer', name: 'Forge', target: { x: engineerRoom.point.x + 5, y: engineerRoom.point.y + 2.4 }, color: '#efc46b', roomId: engineerRoom.id, active: Boolean(engineeringJob), mission: undefined, status: engineeringJob?.phase || 'Engenharia em espera; melhorias exigem autorização' };
  const allRobots = [coordinator, ...robots, engineer].map((robot, index) => previewing ? { ...robot, roomId: rooms[(previewStep + index) % rooms.length].id, target: rooms[(previewStep + index) % rooms.length].point, status: 'Prévia visual de movimento e gestos; nenhuma execução de IA', active: false, demo: true } : { ...robot, demo: false });
  const selected = allRobots.find(robot => robot.id === focused);
  const latestEvents = [...workspace.missions.flatMap(mission => mission.events.map(event => ({ ...event, name: mission.title }))), ...(workspace.autonomy?.projects || []).flatMap(project => project.events.map(event => ({ ...event, name: project.name }))), ...(workspace.engineering?.jobs || []).flatMap(job => job.events.map(event => ({ ...event, name: job.title })))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  function selectRobot(id: string) { const robot = allRobots.find(r => r.id === id); setFocused(id); if (robot?.mission) onSelect(robot.mission.id); }
  return <div className="sm-station">
    <div className="sm-toolbar"><span><i className={operating ? 'sm-live' : ''} /> {previewing ? 'PRÉVIA VISUAL / SEM IA' : operating ? 'OPERAÇÃO EM ANDAMENTO' : 'BASE EM ESPERA'}</span><div className="aw-actions"><button className="aw-button aw-secondary" disabled={operating} onClick={() => setPreview(!preview)}>{previewing ? 'Encerrar prévia' : 'Testar movimento'}</button><button className="aw-button aw-secondary" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? 'Ver base inteira' : 'Explorar detalhes'}</button></div></div>
    {previewing && <p className="sm-preview-notice">Prévia da animação: os robôs percorrem o mapa sem executar IA, gerar custos ou alterar suas missões.</p>}
    {<p className="sm-map-help">Deslize o mapa para os lados para explorar as salas. Use a lista de robôs abaixo para selecionar uma função.</p>}
    <div className="sm-scroll" tabIndex={zoom ? 0 : undefined} aria-label="Base de operações; mapa rolável quando ampliado"><div className={`sm-map sm-business-map ${zoom ? 'sm-map-zoom' : ''}`} style={{aspectRatio:`1000/${worldHeight}`}}>
      <StationScenery rooms={rooms} height={worldHeight} />
      {rooms.map(room => <section key={room.id} className={`sm-room ${allRobots.some(robot => robot.roomId === room.id && robot.active) ? 'sm-room-active' : ''}`} style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%`, '--room-color': room.color } as React.CSSProperties}><header>{room.href ? <a href={room.href}>{room.name}</a> : <button onClick={() => onFactory(room.id)}>{room.name}</button>}<i /></header><small>{room.sub}</small></section>)}
      {allRobots.map(robot => <Robot key={robot.id} {...robot} delivery={Boolean(robot.mission && ['review', 'approved'].includes(robot.mission.status) && (robot.mission.hasArtifact || robot.mission.output))} onClick={() => selectRobot(robot.id)} />)}
      <div className="sm-map-caption">{workspace.settings.configured ? 'API CONECTADA' : 'SEM CHAVE DE API'} · {workspace.missions.filter(m => ['review', 'approved'].includes(m.status)).length} ENTREGAS REAIS</div>
    </div></div>
    <p className="sm-map-help">Toque no nome de uma fábrica para ver sua função e preparar um projeto. O armazém abre as entregas. <a href="#factories">Criar ou gerenciar fábricas →</a></p>
    <div className="sm-crew" aria-label="Selecionar robô">{allRobots.map(robot => <button key={robot.id} className={focused === robot.id ? 'is-selected' : ''} aria-pressed={focused === robot.id} onClick={() => selectRobot(robot.id)}><i style={{ background: robot.color }} /><strong>{robot.name}</strong>{robot.id === 'coordinator' && <b className="sm-commander-tag">ORQUESTRADOR</b>}<span>{previewing ? 'Prévia' : robot.active ? 'Em execução' : 'Em espera'}</span></button>)}</div>
    <div className="sm-inspector"><div><strong>{selected ? selected.name : 'Sua equipe de robôs'}</strong><p>{selected ? selected.status : 'Escolha um robô no mapa ou na lista. As mudanças de sala acompanham etapas registradas no servidor; a prévia é apenas visual.'}</p>{selected?.mission && <button className="aw-button aw-secondary" onClick={() => { onSelect(selected.mission!.id); document.getElementById('terminal')?.scrollIntoView({ behavior: 'smooth' }); }}>Abrir tarefa e entrega</button>}{selected?.id === 'coordinator' && <a href="#astra">Ver decisões e evidências do Astra →</a>}{selected?.id === 'coordinator' && <p>Astra é a identidade visual do orquestrador Orion. Usa o modelo configurado na conexão de IA, sem adicionar outro provedor.</p>}{selected?.id === 'engineer' && <a href="#improvements">Abrir melhorias da aplicação →</a>}</div><span className="aw-badge">{previewing ? 'CUSTO DA PRÉVIA: ZERO' : operating ? 'EXECUÇÃO REAL' : 'SEM EXECUÇÃO'}</span></div>
    <div className="sm-feed">{latestEvents.length ? latestEvents.map((event, index) => <p key={index}><time>{new Date(event.at).toLocaleTimeString('pt-BR')}</time><span>{event.message}</span></p>) : <p><span>Nenhum evento de execução registrado. Conecte a IA e crie seu primeiro teste no início da página.</span></p>}</div>
  </div>;
}
