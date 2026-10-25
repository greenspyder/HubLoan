# Live Factory 4.9 — auditoria e primeiro incremento

Base auditada: master bcfbdf9 (merge PR #21). A 4.8 não entregou captura de seis minutos validada: 15 FPS excedeu orçamento, 8 FPS passou no teste reduzido; captura 3D de seis competidores falhou após 19 quadros. Esses resultados continuam sendo limitações, não aceites da 4.9.

## Alterações verificadas

A busca de área livre agora reutiliza componentes conexos dentro de cada decisão de um jogador. Antes, até três destinos alcançáveis repetiam a mesma busca. A ocupação e as reservas continuam isoladas por jogador/passo. Não alteramos física, colisões, ranking, prioridade, watchdog ou grants.

O histórico de cada rodada registra sobrevivência individual, identificador e se o jogador chegou vivo ao encerramento. Sobreviventes têm tempo censurado pelo fim da rodada; isso não representa tempo até morte.

O renderer registra preparação dos snapshots/diretor e duração total de evaluate, além dos tempos existentes de WebGL, captura, readback, conversão, serialização e decode. evaluate inclui trabalho do navegador e transporte; não é uma medida isolada de IPC nem de GPU.

## Evidência

`docs/evidence/phase49/simulation-benchmark.json`: três pares de 1.500 passos / seis competidores. Tempos antes: 912,7 / 767,4 / 817,6 ms; depois: 592,5 / 487,1 / 475,8 ms. Ambiente compartilhado, sem alegação de ganho de FPS. As trajetórias completas dos três cenários de 15 minutos permaneceram idênticas, excluindo o campo novo de sobrevivência.

`survival.json` contém rodadas e tempos individuais. Eliminações precoces permanecem; a otimização não é uma correção de balanceamento. `targeted-tests.log`: cinco testes aprovados.

## Aceite pendente

Ainda faltam instrumentação de codificação/IPC isolados, medição audiovisual atual, correção comprovada de sobrevivência precoce, refinamento artístico comparado e receptor independente com seis minutos de mídia. Não declarar 15 FPS, 720p/30, naturalidade de voz ou qualidade artística aprovados a partir deste incremento. PR mantida em rascunho.

Reproduzir: `node --test server/tests/live-survival49.test.mjs server/tests/live-champions.test.mjs` e `node server/tests/fixtures/champions48-survival.mjs`. Nenhuma chamada paga.
