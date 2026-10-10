import { useState } from 'react';
import { agentApi } from '../services/agentApi';
import type { Mission, Workspace } from '../services/agentApi';
type Props = { mission: Mission; busy: boolean; mutate: (op: () => Promise<Workspace>, message?: string) => Promise<Workspace | null> };
export function DeliveryReview({ mission, busy, mutate }: Props) {
  const [feedback, setFeedback] = useState('');
  const [components, setComponents] = useState<string[]>([]);
  const [error, setError] = useState('');
  async function submit(decision: 'adjust' | 'reject') {
    const updated = await mutate(() => agentApi.review(mission.id, decision, feedback, components, mission.releaseVersion), decision === 'adjust' ? 'Ajustes na fila. Objetos não selecionados serão preservados.' : 'Entrega rejeitada. Arquivos preservados.');
    if (updated) { setFeedback(''); setComponents([]); }
  }
  async function version(id: string) {
    try {
      setError(''); const blob = await agentApi.image(mission.id, false, id);
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = mission.artifactFilename || 'hubloan-entrega.zip'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao baixar versão.'); }
  }
  return <section className="aw-delivery-review" aria-label="Revisão da entrega">
    {['review', 'approved', 'rejected'].includes(mission.status) && <>
      <h3>Revisar entrega</h3>
      <label>O que precisa mudar?<textarea value={feedback} maxLength={2000} onChange={e => setFeedback(e.target.value)} placeholder="Ex.: mesa e armário precisam usar a mesma perspectiva dos demais objetos." /></label>
      {!!mission.reviewComponents?.length && <fieldset><legend>Regenerar somente os objetos selecionados</legend>{mission.reviewComponents.map(c => <label key={c}><input type="checkbox" checked={components.includes(c)} onChange={e => setComponents(e.target.checked ? [...components, c] : components.filter(x => x !== c))} /> {c}</label>)}</fieldset>}
      <p>O atlas e a revisão serão reconstruídos. Novas chamadas usam os limites de orçamento existentes; arquivos e custos anteriores permanecem no histórico.</p>
      <div className="aw-actions">{mission.status === 'review' && <button className="aw-button" disabled={busy} onClick={() => void mutate(() => agentApi.action(mission.id, 'approve'), 'Entrega aprovada. Publicação exige autorização comercial separada.')}>Aprovar</button>}
      <button className="aw-button aw-secondary" disabled={busy || !feedback.trim() || !components.length} onClick={() => void submit('adjust')}>Solicitar ajustes selecionados</button>
      <button className="aw-button aw-secondary" disabled={busy || !feedback.trim() || mission.status === 'rejected'} onClick={() => void submit('reject')}>Rejeitar</button></div>
      {!mission.reviewComponents?.length && <p>Ajustes parciais disponíveis para packs 2D com checkpoints completos. Esta entrega pode ser aprovada ou rejeitada com feedback.</p>}
    </>}
    {!!mission.reviewVersions?.length && <details><summary>Versões anteriores ({mission.reviewVersions.length})</summary>{mission.reviewVersions.map(v => <div key={v.id}><p>{new Date(v.at).toLocaleString('pt-BR')} · {v.feedback}</p><button className="aw-button aw-secondary" onClick={() => void version(v.id)}>Baixar versão anterior</button></div>)}</details>}
    {mission.reviews?.map((r, i) => <p key={i}>{r.decision === 'REJECT' ? 'Rejeição' : 'Ajustes solicitados'}: {r.feedback}</p>)}
    {error && <p role="alert">{error}</p>}
  </section>;
}
