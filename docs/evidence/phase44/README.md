# Live Factory 4.4 — entrega verificável, revisão artística pendente

Código da captura: **ce1c165**, branch local `codex/live-factory-entertainment44`, base 74e21af (merge PR #17 em `codex/live-factory-director`). `main` não existe; master não incorpora essa sequência. Não houve merge nem deploy.

## Evidência real

Receptor RTMP independente recebeu **186,026 segundos**, H.264/AAC, **360×640, 8 FPS, 1488 frames**. Decodificação integral aprovada; correlação AAC recebido / PCM do mixer **0,99713**. Ambiente Brazilian Sunsets aprovado por hash, créditos na imagem, Kokoro feminina, três jingles instrumentais de teste, Top 6 e presentes explicitamente simulados. Primeiros 30 s sem eventos sociais; jogo e comentários internos continuam.

Watchdog ativo: encerramento normal da tentativa final; **142 frames atrasados**, atraso máximo do pipeline **1316 ms**, máximo por frame **611 ms**. Não equivalem a frames perdidos: todos os 1488 foram enviados no perfil fixo; houve atraso de processamento. Duas tentativas light/15 FPS e uma CPU/10 FPS falharam e foram preservadas nos logs. A 10 FPS foram 1794 frames antes de exceder 2 s de atraso; essa tentativa não foi aceita. Perfil CPU final é fallback, não qualidade artística aprovada. Light/15, smooth/30 e HD continuam disponíveis mas não foram sustentados nesta nova demonstração.

## Latência observada (ms)

| Métrica | PR #17 | Captura aprovada posterior | 4.4 |
|---|---:|---:|---:|
| Reação inicial média | 2178 | 2083 | 2480 |
| Reação inicial p95/máximo | 3303 | 3467 | 4636 |
| Maior início de segmento | 15015 | 15022 | 8070 |
| Primeiro efeito de presente: média / máximo | não medido | não medido | 180 / 349 |
| Primeira música: média / máximo | não separado | não separado | 6472 / 8070 |
| Reação preparada: média / máximo | não separado | não separado | 1331 / 3570 |

**Não houve melhora global da primeira fala.** O especial teve primeira fala em 244 ms; os demais podem esperar a fala corrente. A meta <2 s não foi atingida para toda fala preparada. A troca de ordem evita esperar o jingle inteiro para agradecer, mas desloca o início musical para depois da fala. Conclusão integral dos jobs completados: média 7332 ms, máximo 17151 ms; inclui reprodução da música, não é latência de início. Um job interrompido não entra como completo. Preparação de sete falas antes do encoder: **17,05 s**, registrada, não escondida na latência.

## Classificação

| Categoria | Resultado |
|---|---|
| IMPLEMENTADO | Diretor existente com contexto de disputa/risco/alimento; cache antecipado, fala antes do jingle, acento imediato, métricas separadas, Lume/cobras maiores, câmera e overlays ajustados. |
| TESTADO | Suíte 198/198 antes do ajuste final do perfil de 10 para 8 FPS; 6/6 testes direcionados após esse ajuste; captura RTMP final com código ce1c165 passou. Build frontend e lint do módulo aprovados. Sem nova declaração de lint global. |
| VALIDADO VISUALMENTE | Contato de 19 frames a cada 10 s ao longo da captura, frames nativos de 22/45/65 s. Lume inteira e mais presente, arena ocupa mais tela, Top 6 e diálogos legíveis a 360 px; vitórias/derrotas e música identificadas. Não é inspeção de cada frame nem aprovação perceptiva de fluidez. |
| VALIDADO AUDITIVAMENTE | **Não**. Não há capacidade de escuta nesta sessão. Nove WAVs Kokoro reais, sem fallback, entregues para avaliação humana. Decodificação/correlação não provam naturalidade. |
| PENDENTE | Ritmo mais variado, repetição de falas, voz e humor aprovados por escuta, rádio funk/pop autorizada com variedade, canto IA real, 15/30 FPS sustentados, TikTok público e publicação da PR. |

## Avaliação crítica

O enquadramento usa melhor a largura/altura da arena; as cabeças aumentaram de escala 1,18 para 1,48 e o apresentador de 0,5 para 0,66. Os créditos não estão sob a coroa nas amostras; rosto não está cortado. Top 6 continua compacto e abaixo da ação. Restam áreas vazias na parte inferior durante silêncio e alguns detalhes pequenos. Variação de câmera é discreta, não uma direção cinematográfica completa.

O registro contém comentários contextualizados de disputa, colheita, vitória e derrota; nenhuma atividade social foi fabricada. Porém ainda há repetição: a fala sobre fome reaparece e a frase de espaço para virar ocorre em intervenções consecutivas. É uma limitação real do repertório curto e da seleção, não resolvida por chamar isso de improvisação. Não afirmar aumento de retenção ou humor artisticamente aprovado.

A faixa ambiente é obra de Ketsa, **CC BY 4.0**, não composição do HubLoan nem funk contemporâneo. A verificação do vídeo anterior contra o WAV autorizado encontrou correlação máxima 0,99858: confirma a observação do operador de que havia Brazilian Sunsets. A descrição antiga da PR #17 se refere a outra captura. Jingles continuam INSTRUMENTAL_TEST, boca não simula canto durante instrumental. Não houve geração musical nem API paga.

## Recursos, operação e publicação

Host de teste: cgroup com quota de 8 CPUs e limite de 8 GiB, software WebGL. RSS Node final ~338 MB; o snapshot intermediário registrou Python/Kokoro ~1,64 GB e múltiplos processos Chromium. Não somar apenas RSS Node como se fosse toda a operação; CPU/GPU totais isoladas não foram medidas. Meta 720×1280/30 FPS requer validação no hardware alvo. Hardware/energia não precificados; APIs: zero.

A integração GitHub recusou `create_branch` com **403 Resource not accessible by integration**. **Nenhuma nova PR foi criada**. Branch, commits, patch, bundle e descrição proposta estão no pacote. O bloqueio anterior do Codespace por revisão automática/limite de uso também permanece sem tentativa de contorno. Não houve merge/deploy público.
