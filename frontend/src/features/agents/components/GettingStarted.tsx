import { useState } from 'react';
import type { Workspace } from '../services/agentApi';
import { agentApi } from '../services/agentApi';
type Props = { workspace: Workspace; busy: boolean; mutate: (operation: () => Promise<Workspace>, success?: string) => Promise<Workspace | null>; onSelect: (id: string) => void };
export function GettingStarted({ workspace, busy, mutate, onSelect }: Props) {
  const [confirm, setConfirm] = useState(false);
  const agent = workspace.agents.find(a => a.enabled && a.id === 'creator') || workspace.agents.find(a => a.enabled);
  const pending = workspace.missions.find(m => ['queued', 'running'].includes(m.status));
  const ready = workspace.missions.find(m => ['review', 'approved'].includes(m.status));
  const next = !workspace.settings.configured ? 0 : !ready ? 1 : !workspace.shop?.enabled || !workspace.shop.livemode ? 2 : 3;
  const steps = [
    { title: 'Conectar a IA', detail: 'Só a chave OpenAI é necessária para começar. GitHub e pagamentos são opcionais nesta etapa.', done: workspace.settings.configured, href: '#settings' },
    { title: 'Produzir e revisar', detail: 'Faça um teste pequeno, acompanhe o robô e confira o arquivo antes de pensar em vender.', done: Boolean(ready), href: '#new-mission' },
    { title: 'Preparar recebimento', detail: 'Depois de validar a entrega, conecte Stripe, licença e preço. Modo de teste não é venda real.', done: Boolean(workspace.shop?.enabled && workspace.shop.livemode), href: '#shop' },
    { title: 'Divulgar e medir', detail: 'Conecte um canal seu e acompanhe compras confirmadas. Faturamento não equivale a lucro.', done: Boolean(workspace.marketing?.enabled), href: '#marketing' },
  ];
  async function firstTest() {
    if (!agent) return;
    const result = await mutate(() => agentApi.addMission('Meu primeiro teste: organização semanal', 'Crie um template original de planejamento semanal para freelancers em português brasileiro. Entregue um Markdown útil e curto: instruções, tabela editável, prioridades e checklist. Sem links externos, preços ou vendas inventadas. Ao final indique como avaliar utilidade com uma pessoa real; não alegue demanda comprovada.', agent.id, 'text', true), 'Teste enfileirado. Acompanhe na estação; quando terminar, abra a entrega e baixe o Markdown.');
    if (result) { setConfirm(false); const mission = result.missions.find(m => m.title === 'Meu primeiro teste: organização semanal' && ['queued', 'running'].includes(m.status)); if (mission) onSelect(mission.id); }
  }
  return <section className="aw-panel aw-start" id="start"><div className="aw-section-title"><div><p className="aw-eyebrow">COMECE POR UM TESTE PEQUENO</p><h2>Seu próximo passo</h2></div><span className="aw-badge">{steps.filter(s => s.done).length}/4 etapas prontas</span></div><p className="aw-caption">Você pode criar, revisar e baixar entregas com IA. Para vender, é preciso conectar recebimento e chegar a compradores. A aplicação ajuda a testar oportunidades; não garante lucro.</p><ol className="aw-start-steps">{steps.map((s, i) => <li key={s.title} className={s.done ? 'is-ready' : next === i ? 'is-next' : ''}><span>{s.done ? '✓' : i + 1}</span><div><strong>{s.title}</strong><p>{s.detail}</p><a href={s.href}>{s.done ? 'Ver configuração' : next === i ? 'Começar esta etapa →' : 'Abrir etapa →'}</a></div></li>)}</ol>
    {!workspace.settings.configured ? <a className="aw-button" href="#settings">Conectar IA para começar</a> : pending ? <div className="aw-actions"><button className="aw-button" onClick={() => onSelect(pending.id)}>Acompanhar: {pending.title}</button><a className="aw-button aw-secondary" href="#station">Ver robôs trabalhando</a></div> : ready ? <div className="aw-actions"><button className="aw-button" onClick={() => onSelect(ready.id)}>Abrir minha entrega</button><a className="aw-button aw-secondary" href="#autonomy">Descobrir oportunidades</a></div> : <div className="aw-first-test"><p>Primeiro teste sugerido: template de organização semanal em Markdown. Usa três chamadas de texto pagas. Se você já autorizou publicação automática na loja, essa autorização continua valendo.</p><label className="aw-checkbox"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} /> Autorizo este teste usando a minha API</label><button className="aw-button" disabled={busy || !confirm || !agent} onClick={() => void firstTest()}>Criar meu primeiro teste</button>{!agent && <p>Reative um agente em <a href="#agents">Agentes</a> para produzir.</p>}<a className="aw-button aw-secondary" href="#new-mission">Prefiro escrever meu briefing</a></div>}
    <details><summary>O que já funciona e o que ainda falta?</summary><p>Funciona: texto/código, imagens, thumbnails e packs 2D/3D, pesquisa web autorizada, loja Stripe, envio de packs ao itch.io, anúncios em Mastodon/Telegram e propostas de melhoria no GitHub com aprovação para merge.</p><p>CapCut, edição/legendagem de vídeo e publicação no TikTok não estão conectados. A IA pode preparar roteiros privados, mas isso não é um vídeo publicado. O servidor precisa estar ativo; hospedagem que dorme interrompe o trabalho.</p></details>
  </section>;
}
