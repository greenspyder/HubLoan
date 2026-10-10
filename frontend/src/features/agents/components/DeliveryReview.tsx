import { useState } from 'react';
import { agentApi } from '../services/agentApi';
import type { Mission, Workspace } from '../services/agentApi';
type Props = { mission: Mission; busy: boolean; mutate: (op: () => Promise<Workspace>, message?: string) => Promise<Workspace | null> };
export function DeliveryReview({ mission, busy, mutate }: Props) {
  const [feedback, setFeedback] = useState('');
  const [components, setComponents] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [override, setOverride] = useState(false);
  const quality = mission.qualityReview;
  const blocked = quality && quality.decision !== 'APPROVE';
  async function approve() {
    const updated = await mutate(() => agentApi.action(mission.id, 'approve', blocked ? { override, reason: feedback, version: mission.releaseVersion } : {}), 'Qualidade aprovada por revisão humana. Publicação exige autorização comercial separada.');
    if (updated) { setFeedback(''); setOverride(false); }
  }
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
    {quality && <div className="aw-notice"><h3>Sentinel · {quality.inconclusive ? 'INCONCLUSIVO' : quality.decision === 'APPROVE' ? 'Qualidade aprovada pelo revisor automático' : quality.decision === 'REGENERATE_PARTIAL' ? 'Ajustes parciais necessários' : 'Entrega reprovada pelo revisor automático'}</h3><p>{quality.summary}</p><p>Validade técnica: verificada na produção. Uso no motor e valor comercial: a apurar. Publicação: não autorizada por esta análise.</p>{quality.objects.map(o => <p key={o.file}><strong>{o.file}: {o.apparentPerspective}</strong> · {o.evidence}</p>)}{quality.criteria.map(c => <p key={c.id}><strong>{{visual_consistency:'Coerência visual',perspective:'Perspectiva',relative_scale:'Escala relativa',palette_lighting:'Paleta e iluminação'}[c.id] || c.id}: {c.status === 'PASS' ? 'Atendido' : c.status === 'FAIL' ? 'Defeito identificado' : 'A apurar'}</strong> · {c.evidence}{c.adjustment && ` Ajuste: ${c.adjustment}`}</p>)}{quality.components.length > 0 && mission.status === 'review' && <button className="aw-button aw-secondary" disabled={busy} onClick={() => { setComponents(quality.components); setFeedback(quality.criteria.filter(c => c.status === 'FAIL').map(c => `${c.components.join(', ')}: ${c.adjustment}`).join('\n').slice(0,2000)); }}>Preparar ajustes sugeridos</button>}<p>Julgamento visual por IA; não é medição nem garantia. Preparar ajustes apenas preenche a revisão — não envia chamadas.</p></div>}
    {['review', 'approved', 'rejected'].includes(mission.status) && <>
      <h3>Revisar entrega</h3>
      <label>O que precisa mudar?<textarea value={feedback} maxLength={2000} onChange={e => setFeedback(e.target.value)} placeholder="Ex.: mesa e armário precisam usar a mesma perspectiva dos demais objetos." /></label>
      {!!mission.reviewComponents?.length && <fieldset><legend>Regenerar somente os objetos selecionados</legend>{mission.reviewComponents.map(c => <label key={c}><input type="checkbox" checked={components.includes(c)} onChange={e => setComponents(e.target.checked ? [...components, c] : components.filter(x => x !== c))} /> {c}</label>)}</fieldset>}
      <p>O atlas e a revisão serão reconstruídos. Novas chamadas usam os limites de orçamento existentes; arquivos e custos anteriores permanecem no histórico.</p>
      {blocked && mission.status === 'review' && <label><input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} /> Revisei os arquivos e desejo contrariar o Sentinel. A justificativa acima será registrada.</label>}
      <div className="aw-actions">{mission.status === 'review' && <button className="aw-button" disabled={busy || Boolean(blocked && (!override || !feedback.trim()))} onClick={() => void approve()}>Aprovar por revisão humana</button>}
      <button className="aw-button aw-secondary" disabled={busy || !feedback.trim() || !components.length} onClick={() => void submit('adjust')}>Solicitar ajustes selecionados</button>
      <button className="aw-button aw-secondary" disabled={busy || !feedback.trim() || mission.status === 'rejected'} onClick={() => void submit('reject')}>Rejeitar</button></div>
      {!mission.reviewComponents?.length && <p>Ajustes parciais disponíveis para packs 2D com checkpoints completos. Esta entrega pode ser aprovada ou rejeitada com feedback.</p>}
    </>}
    {!!mission.reviewVersions?.length && <details><summary>Versões anteriores ({mission.reviewVersions.length})</summary>{mission.reviewVersions.map(v => <div key={v.id}><p>{new Date(v.at).toLocaleString('pt-BR')} · {v.feedback}</p><button className="aw-button aw-secondary" onClick={() => void version(v.id)}>Baixar versão anterior</button></div>)}</details>}
    {mission.reviews?.map((r, i) => <p key={i}>{r.decision === 'REJECT' ? 'Rejeição' : r.decision === 'HUMAN_OVERRIDE' ? 'Revisão humana justificada' : 'Ajustes solicitados'}: {r.feedback}</p>)}
    {error && <p role="alert">{error}</p>}
  </section>;
}
