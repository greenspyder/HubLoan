# Live Factory 4.7 — entrega incremental e evidências

Base: master com PR #19 integrada (`8d7eac3`). Código operacional validado: `0ec1fda`. Sem merge/deploy automático.

## Resultado verificável

Captura RTMP real para receptor FFmpeg independente: **186,026167 s, 360×640, H.264/AAC, 15 FPS**, 2.790 quadros decodificados distintos, zero pares adjacentes idênticos. Vídeo entregue ao operador como **Lume-4.7-186s.mp4**.

SHA-256: `0ee7e4e0fdc93cb3330a94d97a1fdebfcc9481abbcc25dd87119e40257b7edcb`.

- Backend: **206 aprovados, zero falhas, um teste opcional de Piper pulado** (207 no total).
- Build e lint do módulo aprovados; aviso existente de chunk >500 kB.
- Teste RTMP longo adicional aprovado com o código após correção da cauda.
- Kokoro pf_dora: 23 sínteses neurais, zero fallback/falhas. Zero falhas de música.
- Watchdog, heartbeat, autorização, isolamento, emergência, mixer e física preservados.

## Comparação 4.6 × 4.7

| Medida | 4.6 | 4.7 final |
| --- | ---: | ---: |
| Quadros distintos | 2.790 | 2.790 |
| Quadros atrasados | 22 | 26 |
| Atraso acumulado máximo | 205,67 ms | 249,67 ms |
| Primeira fala média | 1.945 ms | 2.192 ms |
| Primeira fala p95/máximo | 3.688 ms | 4.259 ms |
| Primeiro efeito médio | 319 ms | 501 ms |
| Primeiro efeito máximo | 643 ms | 703 ms |
| Visão tática | 41,2% | 12,8% |
| Falhas TTS/música | 0/0 | 0/0 |

**Latência não melhorou.** Meta universal abaixo de 2 s não foi atingida. Jingles ainda aguardam a sequência de fala (máximo 8,22 s); reação completa inclui a reprodução (máximo 16,90 s).

Câmeras incluindo um quadro de preparação: Tactical 358, Action 690, Front 1.024, Follow 719. Contagens não equivalem a uma avaliação artística das transições.

Software WebGL, Chromium headless 158, contêiner 8 CPUs/8 GiB. Node RSS 324,9 MiB, excluindo subprocessos. Python observado em aproximadamente 1,8 GiB, não pico medido. CPU/RSS agregado do navegador indisponível. Readback médio aproximadamente 25,38 ms, principal custo observado. GPU submit não mede execução GPU; pipe inclui backpressure. Ambiente reinstalado (4.6 usava Chromium 156); conteúdo/timing variam, portanto não é benchmark causal controlado. 720p/30 não validado.

## Evidências e inspeção visual

- [Antes/depois frontal](Front-comparison.jpg)
- [Antes/depois Follow](Follow-comparison.jpg)
- [Antes/depois do rosto](face-comparison.jpg)
- [Estudo de expressões](expressions.jpg)
- [Quadros distribuídos do MP4 final](contact.jpg)
- [Sequência frontal recebida](sequence-Front.jpg)
- [Sequência Follow recebida](sequence-Follow.jpg)

Comparações usam o mesmo estado determinístico e os renderers reais; estudo facial é diagnóstico estático, não prova de gameplay. A evidência operacional é o MP4. Inspeção realizada em 19 quadros distribuídos de 0 a 180 s e sequências Front (~80,53 s), Follow (~88,8 s), Action (~125,8 s) e visão tática inicial. Imagens de sequência desta pasta foram novamente extraídas do mesmo MP4 preservado.

Diferenças perceptíveis: mais proximidade dos personagens, corpo arredondado, marcas menos salientes, contraste menos agressivo e variedade maior de falas. A primeira captura revelou marcas flutuando na cauda; foram corrigidas antes da captura final.

Limitações observadas: fruta/rival ainda ocultam parte do rosto; curvas continuam influenciadas pelo grid; algumas transições perdem contexto; expressões como medo/surpresa e orgulho/determinação ainda se parecem. O rosto continua procedural. Top 6 é legível no quadro nativo; créditos pequenos. **Não declarar acabamento premium ou eliminação das oclusões concluídos.**

## Avaliação como espectador

1. **Primeiros cinco segundos:** abertura tática seguida de aproximação torna a ação mais próxima; não demonstra retenção.
2. **Jogo moderno ou protótipo:** ainda protótipo estilizado, com materiais e cenário simples.
3. **Personagens vivos:** movimento, olhar e mandíbula ajudam, mas construção procedural permanece evidente.
4. **Entendimento:** frutas e placar são claros; aproximações podem ocultar parte do tabuleiro.
5. **Momento divertido:** textos sobre estacionamento do corpo e rivalidade têm contexto; graça depende de avaliação humana.
6. **Câmera melhora emoção:** aumenta presença facial, mas mais cortes não provam maior entretenimento.
7. **Lume interessante:** apresentação integrada e falas contextuais locais; não é improvisação de IA.
8. **Repetição:** novas frases ajudam; rodadas e expressões ainda se repetem.
9. **Motivo para continuar:** rivalidade e reações são hipóteses de interesse, sem métricas reais de audiência.

## Estado de aceite e áudio

| Área | Estado |
| --- | --- |
| Câmera, corpo, poses, repertório | Implementados incrementalmente |
| Backend, build, lint e RTMP | Testados |
| Quadros, sequências e comparações | Inspecionados visualmente |
| Avaliação auditiva perceptiva | **Não realizada: ferramenta de escuta indisponível** |
| Aprovação artística premium | Pendente |
| Canto IA, visemas, replay, improvisação LLM | Pendentes |
| Nova identidade musical brasileira | Pendente |
| Transmissão pública TikTok | Não confirmada |

O áudio recebido está no vídeo para revisão humana. Não houve dublagem substituta. Decodificação AAC não comprova naturalidade nem humor. Brazilian Sunsets — Ketsa, CC BY 4.0 — preservada; não equivale ao repertório funk solicitado. Jingles são testes instrumentais identificados. Primeiros 30 segundos sem eventos sociais; comentários/presentes/Top 6 posteriores simulados.

Não houve API paga. Energia/hardware têm custo desconhecido, não declarado zero. LLM continua desligado. Sem novas receitas, espectadores ou métricas de retenção inventadas.

## Proveniência e reprodução

Uma limpeza automática removeu os logs brutos e relatório local após execução. Este resumo registra os resultados efetivamente observados nas saídas de ferramentas; **não é reconstrução de logs originais**. O código já estava no GitHub e o vídeo em armazenamento persistente. Os quatro blobs comparativos foram publicados antes da limpeza e preservados. O MP4 recuperado teve duração/codecs e SHA-256 reconferidos.

Instruções de instalação e reprodução em [live-factory-phase47.md](../../live-factory-phase47.md). Próxima etapa: revisão humana do vídeo, modelagem facial mais elaborada, redução de oclusões e benchmark na GPU do operador. A entrega permanece em rascunho e não cumpre integralmente o aceite artístico da missão.
