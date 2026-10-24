# Live Factory 4.5 — resultado revisável, não aceite artístico final

Código da captura: b4c922b (d1c8d79 apenas acrescenta documentação). Base 4.4: 09db279. Nova branch local codex/live-factory-character45; criação remota recusada HTTP 403. Nenhuma PR, merge ou implantação realizada.

## Implementado

Factory original de rosto compartilhado pela apresentadora e cobras: três silhuetas distintas em enquadramento equivalente, Jade refinada, mandíbula, língua, focinho, olhos, pálpebras e dez configurações de expressão. Envelope PCM com suavização de mandíbula; não visemas. Reuso dos buffers do corpo enquanto topologia não muda. Seleção de fala menos recente evita repetição imediata ao esgotar uma categoria. Runtime, jogo, mixer, Kokoro, música, Top 6 e watchdog preservados.

## Testado

- Backend: 199 testes aprovados, zero falhas, zero ignorados nessa execução (antes da inclusão do teste isolado do novo factory).
- Personagem/repertório: 5 testes aprovados, incluindo factory novo e não repetição.
- WebGL/Piper: 4 testes reais aprovados após ajuste de buffers.
- Build frontend e lint do módulo: aprovados; build avisa sobre chunks grandes. Não declarar lint global aprovado.
- RTMP: receptor independente recebeu e decodificou H.264/AAC por 186,026 s, 360×640, 15 FPS.
- 2.790 quadros decodificados, 2.790 hashes distintos; zero quadros idênticos consecutivos. Isso verifica ausência de duplicação exata, não qualidade artística.
- 57 quadros atrasados (2,04%); atraso cumulativo máximo 215,67 ms, frame máximo 262 ms. Watchdog inalterado.
- PCM/AAC: correlação 0,9978438; zero falhas TTS/música. Brazilian Sunsets aprovado permaneceu por 2.790 frames. Três jingles de teste INSTRUMENTAIS, não canto IA.
- Nove WAVs Kokoro pf_dora, 9 sínteses neurais, zero fallback; voz feminina disponível para revisão, não aprovada auditivamente.

## Comparação com 4.4

| Medida | 4.4 | 4.5 |
|---|---:|---:|
| Resolução | 360×640 | 360×640 |
| FPS recebido | 8 | 15 |
| Quadros atrasados | 142/1488 | 57/2790 |
| Atraso máximo pipeline | 1316 ms | 216 ms |
| Primeira fala média | 2480 ms | 1974 ms |
| Primeira fala p95/máximo | 4636 ms | 3768 ms |
| Primeiro efeito média | 180 ms | 392 ms |
| Primeiro efeito p95/máximo | 349 ms | 724 ms |
| Primeiro segmento musical máximo | 8070 ms | 7924 ms |
| Pré-carregado máximo | 3570 ms | 3391 ms |

Efeito inicial piorou; não resumir como melhora de todas as latências. Meta <2 s em todas as reações continua pendente. Duração completa inclui fala/música, não é latência inicial. Aquecimento de áudio: 13,07 s antes da mídia. As medições não isolam causalidade: carga do ambiente e geração variam entre ensaios.

Readback médio atual ~25,82 ms, antes ~47,89 ms; ainda gargalo. Node RSS final 344 MB, Python observado ~1,8 GB; esses valores não são RAM total. Orçamento do contêiner: 8 CPUs e 8 GiB. CPU Node ~28,63 s em 186,02 s; não inclui encoder/Chrome. GPU dedicada, energia, custo financeiro e perfil 720p30 não medidos. Custos de API: nenhuma chamada paga. Custos de máquina desconhecidos.

## Validado visualmente

Inspecionados contato de 19 frames e quadros nativos 45/110 s, além das três propostas e folha expressiva. Cobras, frutas, vitórias, derrotas, presente simulado e Top 6 aparecem; boca da apresentadora tem volume/abertura visível. Arena e rosto não estão cortados nos frames examinados. Comparativo antes/depois usa quadros de momentos diferentes, rotulados, sem alegar condições idênticas.

Avaliação crítica: há avanço sobre boca quase plana, mas o rosto ainda tem acabamento procedural e pálpebras pesadas; algumas expressões são semelhantes, a silhueta ainda pode lembrar outro réptil. Lume não está aprovada como personagem feminina sofisticada. Top 6 é legível no quadro nativo, pequeno no contato; créditos e rodapé continuam pequenos. Há espaço vazio e as mudanças de câmera permanecem sutis. FPS maior foi comprovado, mas inspeção por amostras não substitui assistir ao vídeo completo.

## Validado auditivamente

**Não.** Sem escuta perceptiva nesta execução. Decodificação, correlação PCM/AAC e ausência de fallback não comprovam naturalidade, humor, equilíbrio musical ou qualidade artística. Entregar MP4 e WAVs para revisão humana.

## Pendente

Aprovação/refinamento artístico do rosto; maior distinção de expressões e transições; nova dramaturgia e variações de rodada; melhor uso da área vertical; escuta humana; visemas; canto IA autorizado; 720p30 em hardware apropriado; credenciais/condições oficiais Suno; conexão pública TikTok; publicação de branch/PR. O vídeo contém apenas participantes/presentes simulados. Não inventa audiência ou receita.

Arquivos: performance-report.json, video-validation.json, contact.jpg, frame-*.png, proposals.jpg, refined/, expressions.jpg, before-after.jpg, voice/samples.json, logs. MP4/WAVs entregues separadamente para evitar inflar o histórico git.
