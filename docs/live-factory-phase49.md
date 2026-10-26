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

## Fechamento desta entrega

A tentativa RTMP com seis competidores a 360×640/15 FPS foi interrompida por FRAME_BUDGET_EXCEEDED após 374 quadros, com atraso máximo observado de 2006,67 ms. Na saída inspecionada, readback somou 10655,5 ms e serialização 7912,5 ms em 375 frames do renderer. Esses números foram lidos durante a execução; os arquivos temporários dessa tentativa não permaneceram disponíveis na retomada.

A conversão Base64 antiga usava spread/string/btoa em Chromium sem toBase64 nativo. Foi substituída por preenchimento de bytes ASCII e TextDecoder, preservando cada pixel. Testes de round-trip cobrem todos os perfis e rejeitam comprimento inválido. Não modificamos limite de atraso ou watchdog.

A segunda tentativa ultrapassou dois minutos sem falha observada, mas o arquivo/relatório de encerramento não permaneceu disponível na retomada. **Não há captura de seis minutos validada nesta entrega.** Não declarar estabilidade, ganho final de FPS ou aceite audiovisual a partir dessa tentativa incompleta. A otimização permanece em rascunho para nova medição operacional persistida.

PR B #23 entrega três MP4s offline reais e PR C #24 integra experimentos de audiência. Essas entregas não substituem o aceite RTMP. Acabamento dos personagens, sobrevivência precoce, voz neural e trilha aprovada continuam pendentes de validação nesta fase.
