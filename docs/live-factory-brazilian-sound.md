# Live Factory 4.2 — identidade brasileira e respostas rápidas

Base auditada: PR #16, `db62581`; branch `codex/live-factory-repertoire`, base `codex/live-factory-director` preservada. Evolução do mixer/diretor existentes, sem segundo pipeline.

## Pesquisa e limites — 20/10/2026

[Spotify, 11/03/2026](https://newsroom.spotify.com/2026-03-11/loud-and-clear-music-economics-highlights/): funk brasileiro consta entre os gêneros acima de US$50 milhões em royalties com crescimento de 36% em 2025. Isso não comprova viralidade no TikTok nem retenção da Lume. [Relatório brasileiro de 11/05/2026](https://newsroom.spotify.com/2026-05-11/artistas-brasileiros-alto-e-claro/) registra cerca de R$2 bilhões de royalties de artistas brasileiros em 2025, sem caracterizar BPM ou batidas.

A consulta ao [TikTok Creative Center Brasil](https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/pt?region=BR) não retornou ranking verificável. Não afirmamos quais músicas estão viralizando. A [biblioteca comercial oficial](https://ads.tiktok.com/help/article/how-to-use-the-commercial-music-library?lang=pt) é uma referência de pesquisa, não uma licença presumida para exportar qualquer faixa para RTMP. Nenhuma música de terceiros foi baixada.

**Hipótese artística:** funk eletrônico sincopado, sub controlado e motivos digitais nostálgicos podem dar uma identidade brasileira própria à Lume. Os BPMs e instrumentos abaixo são decisões criativas, não medições de tendências. Sem cópia de artistas, samples ou melodias.

## Operação e direitos

O painel existente mostra três planos com prompts copiáveis. C é prioritária para avaliação, não automaticamente selecionada/aprovada. Salvar o plano persiste a escolha, não gera som. Arquivos continuam sendo importados com origem/licença/custo, pré-escutados e aprovados por hash, até três por categoria. Uma faixa ambiente aprovada pode ser escolhida como principal; inicia a playlist e as demais aprovadas continuam em rotação. Remover a principal limpa a escolha. Volume e ducking usam os controles existentes. Edição exige sessão encerrada.

Produzir master original fora da live. Entregar cópia WAV PCM16 mono 48 kHz, 48 s de ambiente, entrada/saída compatíveis com crossfade de 1 s. Graves controlados, sem clipping, sem vocais constantes, espaço de 1–4 kHz para a fala. Ouvir no celular e em fones antes de aprovar. Nenhuma destas propostas tem áudio disponível ou aprovação artística nesta entrega.

## Canto: briefs originais para produção antecipada

Voz feminina melódica original, português brasileiro claro, carismática e suave. Não usar TTS com pitch alterado nem imitar cantora. Refrão começa cedo, instrumental deixa espaço para vocal. Pedir mix e stem vocal quando possível; marcar os intervalos vocais após escuta. Nomes dos participantes ficam na legenda, sem regeneração por presente. Até três variações:

| Categoria | Letras propostas | Duração |
|---|---|---|
| Rosas | “Uma rosa acendeu / o jardim que é meu!”; “Rosa no jardim / um sorriso pra mim!”; “Flor chegou, luz brilhou / minha curva dançou!” | 6 s |
| Comuns | “Chegou carinho / mudou meu caminho!”; “Um brilho no chão / virou celebração!”; “Pode chegar / o jardim vai dançar!” | 6–8 s |
| Especiais | “O jardim iluminou / olha a festa que chegou!”; “Luz no ar, deixa girar / hoje eu vim comemorar!”; “Brilha o chão, vibra a estação / Lume acende o refrão!” | 12 s |
| Top 6 | “Mudou a posição / chegou novo campeão!”; “Olha quem subiu / o jardim inteiro viu!”; “Lá no alto vem brilhar / tem lugar pra celebrar!” | 6–8 s |
| Vitórias | “Fiz a curva, fui buscar / essa vitória vou cantar!”; “Maçã na mão, pé no chão / ganhei essa competição!”; “Hoje deu, aconteceu / o jardim floresceu!” | 8 s |

São letras e briefs, não faixas cantadas prontas. Nenhuma produção foi encomendada ou cobrada.

## Provedor e custos

A [API oficial ElevenLabs Music](https://elevenlabs.io/docs/api-reference/music/compose) permite composição por prompt/plano e retorno de áudio. [Preço consultado](https://elevenlabs.io/pricing/api): US$0,15/min. Três candidatas de 48 s = US$0,36 proporcionais; três jingles de 6 s = US$0,045, antes de plano, mínimos, impostos e tentativas. Não são custos confirmados. [Direitos](https://elevenlabs.io/music-terms) dependem de plano e aplicação: verificar licença para jogo/live, exportação e distribuição antes de gerar. Sem orçamento vinculado a uma geração, nenhuma chamada paga foi executada. Suno e ACE-Step mantêm as limitações documentadas em `live-factory-phase42-completion.md`; não instalamos um modelo musical sem validação de recursos/qualidade.

Gerar externamente após autorização, baixar arquivo autorizado, importar com metadados, ouvir, marcar trechos vocais e aprovar o hash. Geração automática segue pendente; catálogo e reprodução local funcionam. Nenhuma geração por presente. Custos de hardware/energia/rede desconhecidos, não zero.

## Fila, sincronização e métricas

Faixas pré-carregadas não esperam síntese. Voz continua serial e com cache existente; preparação é ordenada por prioridade. Especial (prioridade 4) pode interromper item inferior com fade de 40 ms; não interrompe outro especial nem retoma trecho antigo. Falas em espera acima de 6 s e faixas acima de 12 s são descartadas; áudio já iniciado pode terminar. Limites de fila, memória, geração/minuto, emergência e watchdog preservados.

Últimas 256 amostras por tipo: `pending` espera antes da síntese; `synthesis` preparação; `queue` espera após preparo; `reaction` evento até primeiro áudio; `segment` evento até cada segmento; `preloaded` evento até faixa pronta. Média/p95/máximo só incluem itens reproduzidos; descartes são separados. Relógios precisam estar sincronizados. Não mede latência de plataforma. Heartbeat de 2 s impede garantir universalmente reação abaixo de 2 s.

O teste RTMP agora aguarda `SENDING_MEDIA` antes de enviar eventos, evitando narrar comentários que já envelheceram durante inicialização do modelo. Uma tentativa anterior à recuperação falhou por descarte do comentário de startup; asserções de áudio/recepção foram preservadas.

## Visual e desempenho

Regras de câmera incluem cantos da arena, corpos e objetivo; Top 6 tem duas linhas de três nomes com fonte maior. Cabeça e luz reagem à amplitude real com movimentos modestos. Instrumental não anima a boca como canto. Não existe extração de batidas ou lip-sync fonético.

Readback continua necessário na composição Canvas→RGB→FFmpeg. Já há `willReadFrequently`, buffer reutilizado e serialização nativa; não foi introduzido pipeline assíncrono não validado. Não alegamos redução desse gargalo nesta etapa. Software WebGL e métricas são documentados no relatório; HD/30 e hardware com GPU permanecem pendentes.

A demonstração usa instrumentais CC0 de teste porque nenhuma trilha final autorizada foi fornecida. Não representa a sonoridade final A/B/C. Kokoro disponível; escuta humana e canto real pendentes. Sem merge/deploy de produção. Evidências: `evidence/phase42-brazil/`.

## Três propostas completas

### A — Brazilian Funk Hypnosis

130 BPM; 48 s. Planejada, sem áudio.

Sub mono, kick seco, percussão brasileira sincopada original, synth de duas notas.

26 compassos: 2 introdução, 8 tema, 8 resposta, 6 variação, 2 retorno. Aproximadamente 48 s.

> Instrumental original de funk eletrônico brasileiro, 130 BPM, 4/4, 48 segundos. Grave mono controlado, percussão feita do zero e motivo melódico curto memorável. Energia dançante estável, espaço de 1–4 kHz para fala feminina. Sem vocais, samples, imitação de artistas ou melodias existentes. Loop por crossfade de 1 segundo; sem silêncio final, drops agressivos ou distorção.

### B — Underground Digital Dream

144 BPM; 48 s. Planejada, sem áudio.

Plucks digitais, pads nostálgicos, baixo redondo, claps secos e hi-hats deslocados.

28 compassos: 4 abertura, 8 motivo, 8 resposta, 4 variação, 4 retorno. Cerca de 47 s mais cauda para 48 s.

> Instrumental eletrônico original a 144 BPM, sensação half-time, influências genéricas de jerk/plugg, 48 segundos. Plucks nostálgicos, atmosfera misteriosa e acolhedora, percussão assimétrica leve. Motivo novo de quatro notas, baixo limpo, espaço para diálogo. Sem vocais, samples externos, nomes ou imitação de artistas. Loop com crossfade de 1 segundo, sem mudança brusca de energia.

### C — Lume Signature Sound

132 BPM; 48 s. Planejada, sem áudio.

Percussão brasileira original, sub mono, kick compacto, pluck digital cintilante e pad noturno suave.

26 compassos: 2 antecipação, 8 tema, 8 resposta, 6 variação percussiva, 2 retorno. Cerca de 47 s mais cauda para 48 s.

> Identidade original da Lume: funk eletrônico brasileiro e eletrônica underground, 132 BPM, 4/4, 48 segundos. Carismática, dançante e levemente misteriosa. Percussão sincopada original, sub mono controlado, motivo novo de pluck nostálgico. Antecipação e recompensa a cada oito compassos, espaço para voz e jingles. Sem vocais, samples, imitações ou assinatura de artistas. Loop por crossfade de 1 segundo. Candidata para avaliação humana, sem aprovação automática.
