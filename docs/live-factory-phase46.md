# Live Factory 4.6 — Cinematic Snake (rascunho)

Base: merge da PR #18 `4fbea3b`, em `codex/live-factory-director`. A `master` estava em `05634c6` (3.2); a PR para master inclui as dependências 4.0–4.5. Nenhum merge/deploy automático.

O diretor existente escolhe Follow traseira, Front frontal, Action lateral e Tactical superior a partir de eventos reais, liderança e proximidade de obstáculos. Permanência mínima de 5 s, exceto início de rodada/perda de alvo. Rig de apresentação no mesmo renderer, sem outra simulação ou encoder. Amortecimento exponencial, área segura vertical, recuperação tática; proteção de altura específica às rochas/bordas da arena atual, não colisão genérica com novos obstáculos altos.

Lume mantém Jade; Faísca usa Ember do mesmo factory. Pálpebras, língua e olhar refinados; corpo com cauda afilada, relevo original de escamas e marcas instanciadas. Buffers GPU reutilizados. Física, áudio, Kokoro, Top 6, watchdog e autorização preservados. Apresentadora aparece durante falas/performance/comunidade; jogo ganha espaço durante silêncio.

Boca por envelope PCM, sem visemas; nenhum canto IA novo. Biblioteca musical e aprovação por hash preservadas. Brazilian Sunsets (Ketsa, CC BY 4.0) mantém autorização anterior.

## Validação

A sessão anterior executou testes e uma captura RTMP de 186 s, mas os arquivos temporários desapareceram após reinicialização do ambiente. Esses resultados não são prova do código recuperado nesta PR. A nova validação e gravação devem ser anexadas antes de retirar o rascunho.

Reprodução: Node 24+, `npm ci --prefix server`, `npm ci --prefix frontend`, Chromium em `HUBLOAN_CHROMIUM`, FFmpeg e Kokoro local configurado conforme 4.4/4.5. `npm test --prefix server`; `npm run build --prefix frontend`; lint em `frontend/src/features/agents` e `frontend/src/shared`.

Captura: `LIVE_ENTERTAINMENT_EVIDENCE=1 LIVE_REPERTOIRE_EVIDENCE_DIR=/tmp/live46 LIVE_EVIDENCE_PROFILE=light LIVE_APPROVED_AMBIENT_WAV=/caminho/brazilian-sunsets.wav node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs` (criar pasta antes). Receptor FFmpeg independente, eventos simulados identificados; não confirma live pública TikTok.

Metas 720p/30 e aprovação artística/auditiva pendentes. Nenhuma API paga. Prévia Canvas administrativa simplificada; gravação do worker é a referência audiovisual fiel.
