# Live Factory 4.7 — direção e acabamento incremental

## Base auditada

`master` em `8d7eac38108adf3e394123a177f528eb3832e800`, merge da PR #19. PR #20 direcionada à master, sem dependência de branch não mergeada. A gravação de referência 4.6 é `Lume-4.6-186s.mp4`, SHA-256 `de63171406e147949bb84b6788615730c7c90eb2853209dc4faef51ec7e2cef2`.

A inspeção dos quadros da 4.6 mostrou corpo angular, rosto ocasionalmente oculto e longas aberturas táticas. Runtime, física, autenticação, worker, encoder, mixer, Kokoro, catálogo aprovado, Top 6 e watchdog foram preservados. Nenhuma API paga.

## Implementado

- O diretor existente mantém Follow, Front, Action e Tactical. A abertura tática termina após 1,8 s; cortes normais conservam permanência mínima de 5 s. Disputas por alimento motivam câmera lateral. O campo `pacing` distingue exploração, tensão, reação e recompensa a partir das mesmas decisões/eventos, sem nova simulação.
- O rig verifica a linha de visão contra volumes conservadores do corpo próprio e rival, excluindo o pescoço conectado ao rosto. Corrige lateral/altura e verifica também a pose amortecida. Não é raycasting de toda a geometria: oclusões residuais continuam possíveis. Não torna corpos invisíveis.
- Duas passagens de arredondamento do caminho antes da curva do corpo, mantendo a cabeça e a cauda nas posições recebidas. Sem mudar colisões, placar, decisão ou frequência da física. A aparência pode cortar visualmente o interior de uma curva; isso não altera a hitbox.
- Crânio deformado no mesmo factory original; proporções e cavidades oculares ajustadas; mandíbula menos mecânica; interpolação das poses faciais e assimetria em deboche/confusão. Jade e Ember mantêm silhuetas distintas. Continua geometria procedural original, não um asset profissional aprovado.
- Escamas menos salientes, relevo mais discreto, contraste do piso reduzido e neblina de profundidade. Geometria do corpo limitada a 160 segmentos; atributos GPU reutilizados. Ainda há alocação temporária na CPU.
- 18 novas falas locais distribuídas entre disputa, risco, busca, alimentação, vitória e derrota. Memória e seleção determinística existentes preservadas. São textos editoriais, não improvisação de IA. Eventos sociais da demonstração continuam simulados.

## Som, custos e pendências

Kokoro `pf_dora`, mixer e Brazilian Sunsets — Ketsa, CC BY 4.0 — preservados. Essa faixa não representa por si só a identidade funk/eletrônica solicitada. Não foi importada outra faixa nem alterada aprovação do catálogo de produção. Jingles de teste continuam instrumentais identificados.

LLM criativo permanece desligado (`aiMode: off`). Não foi criado um adaptador pago ou liberado orçamento. Replays, visemas fonéticos, canto IA real, novo repertório brasileiro aprovado e um asset de personagem com acabamento profissional permanecem pendentes. A boca usa envelope PCM; isso não é lip-sync fonético.

## Reprodução

Os mesmos requisitos da 4.6: Node 24+, FFmpeg, Chromium, Kokoro 82M local, PyTorch CPU, eSpeak NG para fonetização. Configure `HUBLOAN_CHROMIUM`, `HUBLOAN_KOKORO_PYTHON`, `HUBLOAN_KOKORO_MODEL`, `HUBLOAN_TTS_BINARY` e bibliotecas nativas quando necessário. Software WebGL opcional com `HUBLOAN_SOFTWARE_GL=1`; não desabilite sandbox fora de ambiente isolado que exija isso.

```sh
npm ci --prefix server
npm ci --prefix frontend
npm test --prefix server
npm run build --prefix frontend
(cd frontend && npx eslint src/features/agents src/shared)
node server/live-worker/camera-review.mjs docs/evidence/phase47
mkdir -p /tmp/live47
LIVE_ENTERTAINMENT_EVIDENCE=1 \
LIVE_REPERTOIRE_EVIDENCE_DIR=/tmp/live47 \
LIVE_EVIDENCE_PROFILE=light \
LIVE_APPROVED_AMBIENT_WAV=/caminho/brazilian-sunsets.wav \
node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
```

Teste com destino RTMP controlado, receptor FFmpeg independente e workspace isolado. Não prova transmissão pública nem autorização de eventos TikTok. Meta 720×1280/30 exige novo teste em hardware adequado; não inferir suporte a partir de configuração disponível.

Resultados, comparações e revisão perceptiva em `evidence/phase47/README.md`. Aprovação técnica não equivale a aprovação artística.
