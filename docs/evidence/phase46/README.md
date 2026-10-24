# Live Factory 4.6 — evidência recuperada e reexecutada

Gravação operacional de **186,026 s**, produzida pelo worker existente, enviada por RTMP loopback e recebida em FFmpeg independente. H.264/AAC, **360×640, 15 FPS**, **2.790 quadros decodificados distintos**, zero pares adjacentes idênticos. Arquivo entregue ao operador: `Lume-4.6-186s.mp4`. SHA-256: `de63171406e147949bb84b6788615730c7c90eb2853209dc4faef51ec7e2cef2`.

A execução anterior perdeu arquivos temporários; este relatório usa exclusivamente a nova execução do código recuperado. Dados brutos: `performance-report.json`, `video-validation.json`, `capture.log`, `backend-tests.log`.

## Implementado e testado

- Rig no renderer existente: acompanhamento traseiro, frontal, lateral e tático; seleção contextual, permanência mínima, amortecimento, protagonista e perda de alvo.
- Jade/Ember distintos, pálpebras/língua/olhar refinados, cauda afilada, relevo original e marcas instanciadas. Física intacta.
- Lume em quadro durante fala/performance/comunidade; voz e jogo permanecem independentes.
- Suíte backend: **202 aprovados, zero falhas, um teste Piper opcional pulado** (203 total). O teste RTMP de performance é reexecutado por 186 s separadamente, não somar como teste único adicional. Testes direcionados recuperados: 9 aprovados; teste de câmeras refinado: 3 aprovados (há sobreposição).
- Build e lint do módulo aprovados. Vite mantém aviso de chunk >500 kB; não se declara lint global.
- Kokoro `pf_dora`: **20 sínteses neurais, zero fallback/falha**. Mixer: zero falhas TTS/música. Correlação PCM original × AAC recebido: **0,997856**.
- Testes anteriores de autorização, isolamento, emergência, watchdog, falhas de encoder e fila continuam na suíte aprovada. Watchdog não foi removido ou relaxado.

## Comparação medida

| Métrica | 4.5 preservada | 4.6 nova |
|---|---:|---:|
| Resolução/FPS | 360×640 / 15 | 360×640 / 15 |
| Quadros decodificados distintos | 2.790 | 2.790 |
| Quadros atrasados | 57 | 22 |
| Atraso máximo acumulado | 215,67 ms | 205,67 ms |
| Readback médio | 25,82 ms | 22,92 ms |
| Primeira fala média | 1.974 ms | 1.945 ms |
| Primeira fala p95/máximo | 3.768 ms | 3.688 ms |
| Primeiro efeito médio | 392 ms | 319 ms |
| Primeiro efeito máximo | 724 ms | 643 ms |

Não é benchmark causal isolado: câmera, carga e momento dos eventos variam. Meta <2 s para todas as reações continua pendente. Áudio pré-carregado: média 1.255 ms, máximo 3.444 ms. Primeiro segmento musical: média 6.497 ms, máximo 7.976 ms, incluindo espera semântica pela fala. Reação completa máxima 16.231 ms inclui reprodução da performance.

Tempo máximo de um quadro: 270 ms. CPU Node acumulada: 27,03 s; RSS Node final ~330 MiB. Durante captura, observação de processo Kokoro ~1,8 GiB; RSS final após encerramento não mede pico. Telemetria agregada Chrome CPU/RSS indisponível (`null`); não inventar consumo total/GPU. Contêiner 8 CPUs/8 GiB, software WebGL. 720p/30 e GPU dedicada permanecem sem validação. APIs pagas: zero. Energia/hardware não precificados.

## Câmeras realmente presentes

Contagem do renderer, incluindo um quadro de preparação: Tactical 1.150; Front 1.049; Follow 491; Action 101. Aproximadamente 59% dos quadros têm enquadramento solicitado de proximidade. As transições amortecidas fazem a pose demorar a alcançar o enquadramento solicitado; contagem não equivale a avaliação artística de cada quadro. 182 amostras de telemetria sem fallback de segurança. Houve alternância de protagonista e rodadas autônomas.

- Frontal em movimento: **25 s**, `received-Front.png` e `sequence-Front.jpg`.
- Traseira/curvas: **115,733 s**, `received-Follow.png` e `sequence-Follow.jpg`.
- Lateral/resultado: **33,733 s**, `received-Action.png`.
- Superior/contexto: **111,6 s**, `received-Tactical.png`.
- Top 6 expandido: **71 s**, `received-Top6.png`.

`before-after.jpg` usa o mesmo estado determinístico para comparar 4.5 e 4.6, seguido dos novos ângulos. `faces.jpg` compara a mesma expressão/fala no renderer de cada versão. Não são imagens geradas para substituir o jogo. `contact.jpg` cobre a gravação a intervalos de dez segundos.

## Validado visualmente — escopo e crítica

Inspecionados contato distribuído nos 186 s, quadros nativos e sequências de seis quadros frontal/traseira. Observados rosto em movimento, língua/boca, corpo seguindo curvas, outro personagem em profundidade, coleta/partículas, vitória, apresentadora falando e Top 6. O close-up muda claramente a percepção em relação à 4.5. Nomes/posições do Top 6 são legíveis na imagem nativa; créditos e avisos continuam pequenos.

Limites perceptíveis: corpo ainda segue curvas do grid, embora interpoladas; algumas curvas ficam angulares; corpo/rival pode cobrir parcialmente rosto; a câmera frontal pode assumir perfil enquanto a cobra vira. Visão tática ainda tem espaço vazio superior/inferior. Rosto permanece procedural e expressões não equivalem a personagem de animação profissional. Câmera lateral tem participação curta. Não houve inspeção perceptiva contínua de todos os quadros nem aprovação artística humana.

## Validado auditivamente / pendente

**Não houve escuta perceptiva nesta execução.** Síntese, decodificação e correlação verificam o caminho de áudio, não naturalidade, humor ou qualidade musical. Arquivo entregue para revisão humana.

Brazilian Sunsets — Ketsa, CC BY 4.0, hash aprovado preservado; não é funk original do HubLoan nem canto IA. Jingles são instrumentais de teste. Presentes, nomes, fotos/avatares e Top 6 são simulações identificadas. Nenhuma audiência/receita real inventada. Não há confirmação de live pública ou integração real de eventos TikTok.

Pendentes: aprovação artística/auditiva, acabamento premium, melhor oclusão em curvas apertadas, visemas, canto IA real, GPU/720p30 e eventos públicos autorizados. A PR deve continuar em rascunho para essa revisão.
