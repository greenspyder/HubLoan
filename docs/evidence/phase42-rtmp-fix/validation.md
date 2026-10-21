# RTMP e latência — 21/10/2026

Código fonte: `cd1a755` (mesmo conteúdo executado na captura antes de consolidar os commits locais). PR #16 e base `codex/live-factory-director` preservadas. Sem merge, deploy de produção ou chamadas pagas.

## Diagnóstico e correções

As falhas anteriores mostravam o orçamento de frames excedendo 2 s sob carga. Na execução isolada, os dois testes RTMP passaram antes das novas correções; portanto não atribuímos todas as falhas a um defeito único de conexão.

O worker prepara um frame real em até 5 s antes de iniciar o relógio de mídia, evitando contar compilação/cache frio como atraso sustentado. O watchdog mantém limites de 2 s de atraso, 8 s sem progresso, 7 s sem contato e 10 s de heartbeat do runtime. Falhas agora têm códigos seguros no relatório, sem stderr que possa conter stream key. O teste injeta renderização lenta e verifica `FRAME_BUDGET_EXCEEDED` e estado ERROR; também interrompe o FFmpeg e provoca falha do renderer.

A tentativa de polling de 500 ms atingiu o limite existente de 120 requisições/IP/min e parou perto de 59 s (`rate-limit-regression.log`). O intervalo final é **750 ms**, cerca de 80 polls/min mais preparação/arquivos. O limite não foi ampliado. Vários workers no mesmo IP ainda compartilham esse limite.

Outra tentativa completou mídia, mas falhou a exigência da segunda variação: atuações já terminadas continuavam na fila do backend (`queue-regression.log`). O mixer agora confirma IDs concluídos/descartados/interrompidos; o backend autenticado remove somente esses jobs da experiência autorizada. Mantém fila de seis, deduplicação, ranking, histórico recente, permissões e isolamento. Confirmações são limitadas a 64 IDs; dados inválidos são rejeitados. Nunca interpreta confirmação de áudio como confirmação pública de live.

## Nova recepção real

- Receptor FFmpeg RTMP independente em loopback: **126.037000 s**, H.264 360×640/15 FPS e AAC mono 48 kHz.
- 1890 frames em 126.021 s: **14.998 FPS efetivos**. Estado STOPPED, nenhuma falha final.
- Decodificação integral aprovada; correlação entre AAC recebido e PCM original: **0.999849**.
- Três jingles instrumentais de teste distintos, música ambiente nos 1890 frames, comentário narrado, 12 intervenções da apresentadora, Top 6 com seis participantes simulados e oito rodadas.
- Kokoro pf_dora: seis sínteses neurais, sete acertos de cache, zero fallback e zero falhas TTS/música. Um item inferior interrompido pela prioridade, zero descartes por idade nesta captura.
- Preparação visual: 354.7 ms. 31 frames demoraram acima do orçamento individual; isso não equivale a frames perdidos. Atraso máximo acumulado: **203.7 ms**.
- RSS Node: 266.1 MiB; CPU acumulada Node 19.804 s. GPU/CPU e RAM agregadas de todos os processos e custo de energia não medidos. Software WebGL; perfil GPU/HD30 e horas de operação não validados.
- Média render roundtrip: 34.17 ms/frame; readback 20.34 ms/frame. Readback permanece o maior custo medido. Preparação faz o renderer contabilizar um frame a mais que o encoder, intencionalmente.

Arquivo: `live-factory-42-126s-20261021.mp4`, entregue na conversa, SHA256 `47b7cf54a0463849d059daefad3650f423683abc32690dac9164c0c047332cb0`. Não foi substituído áudio ou produzido vídeo promocional separado. Os binários grandes estão nos arquivos entregues; fonte e relatórios são versionados. Eventos, nomes, fotos ilustrativas e presentes são simulação de operador; não representam TikTok real ou receita.

## Latência observada

Milissegundos do evento até PCM efetivamente iniciado no mixer (ou etapas discriminadas), relógio local, todas as amostras desta captura. A correlação independente confirma que esse PCM chegou ao receptor. **Não mede latência de rede até espectador/TikTok.**

| Medida | n | Média ms | p95 ms | Máximo ms |
|---|---:|---:|---:|---:|
| pending | 12 | 0.0 | 0.0 | 0.0 |
| synthesis | 12 | 834.3 | 2871.0 | 2871.0 |
| reaction | 15 | 1539.5 | 5930.0 | 5930.0 |
| queue | 15 | 250.7 | 2339.0 | 2339.0 |
| segment | 16 | 1787.9 | 5930.0 | 5930.0 |
| preloaded | 3 | 1339.3 | 2900.0 | 2900.0 |

`reaction`: primeiro áudio do job; `segment`: cada segmento, incluindo resposta após comentário; `preloaded`: faixas locais; `pending`: antes do preparo; `synthesis`: preparo/cache; `queue`: depois do preparo. O máximo anterior era 12.597 ms e agora é 5.930 ms, redução observada de 52,9%. O relatório anterior não tinha média/p95 comparáveis. São execuções diferentes, não um benchmark pareado. **A meta de p95 <2 s não foi atingida**: faixa pré-carregada teve p95 2.900 ms e inclui espera legítima por outra performance. Não há promessa de reação instantânea.

## Revisão visual efetivamente realizada

Inspecionados o contact-sheet com 12 momentos distribuídos e o frame recebido em 22 s, em resolução nativa. Arena e ação ficam dentro das bordas nos frames observados; câmera varia sem cortar os cantos do campo. Plantas periféricas podem ser cortadas. Top 6 em duas linhas permite distinguir posições e nomes, com bom contraste, sem texto sobre a arena. Diálogo ocupa painel separado; apresentadora ainda fica próxima do cartão Top 6.

Limites: sobra área vazia no topo; cobras ainda pequenas nos planos gerais e expressões do jogo pouco perceptíveis; avatares flutuantes parecem separados da arena. O resultado continua com apresentação de jogo casual. Frames isolados não validam toda a fluidez ou sincronização labial. **Não houve escuta humana nem aprovação da naturalidade ou qualidade musical.** Não alegamos revisão auditiva integral.

## Música original: importada, aprovação pendente

`Lume — Jardim Digital`: candidata instrumental de partitura fixa original, 132 BPM, 24 compassos / 43,636 s. Síntese offline sem samples externos, CC0 declarada na entrega; não é geração musical por IA nem canto. Fonte reproduzível em `scripts/music/lume-jardim-digital.py` (Python + NumPy). Arquivo WAV entregue na conversa e metadados em `music/track.json`.

Importação pela API real foi verificada em workspace local isolado (`candidate-import.json`). O catálogo a classifica ORIGINAL_INSTRUMENTAL, **approved=false**. Não foi importada na conta de produção do operador. O validador de `server/live-music.mjs` exige hash, pré-escuta e revisão dos direitos; não registramos `listened=true` em nome de alguém que não ouviu. Por isso essa candidata **não toca no vídeo**: a gravação usa apenas faixas de teste aprovadas pelo harness, explicitamente identificadas. O passo de ouvir/aprovar a música brasileira e testar sua reprodução na live permanece pendente; nenhuma aprovação artística foi simulada.

## Testes

Backend **188/188**, zero ignorados, inclusive WebGL, integridade, isolamento, deduplicação, OAuth, emergência, falhas de TTS/encoder, fila e RTMP. Teste de gravação real aprovado separadamente. Build e lint do módulo agents aprovados (logs), com aviso de bundle grande. Nenhuma funcionalidade comercial fora do escopo foi alterada.
