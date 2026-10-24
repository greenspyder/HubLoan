# Validação final da PR #16

Código avaliado: `3aa6c08`. Evidência gerada em 20/10/2026 pelo worker existente, Three.js, Kokoro e receptor FFmpeg RTMP independente em loopback. Nenhuma transmissão TikTok pública.

## Resultado técnico

- Vídeo recebido: 126.037000 s, H.264 360×640 / 15 FPS, AAC 48 kHz. 1890 frames produzidos em 126.020 s (14.998 FPS efetivos).
- Decodificação integral de vídeo e áudio aprovada. Correlação do AAC decodificado com PCM emitido: 0.995370.
- 13 frames atrasados; atraso máximo do laço 440.667 ms. Não equivale a frames perdidos ou latência ponta a ponta.
- Três músicas distintas, música ambiente em 1890 frames, dez falas da apresentadora, um comentário narrado. Zero falhas de música/TTS ou áudio descartado.
- Kokoro: 6 sínteses neurais, zero fallback, máximo 1780 ms. Latência máxima até reprodução 12597 ms: a fila ainda pode atrasar reações e merece refinamento.
- RSS do processo Node: 250.6 MiB; CPU acumulada reportada do Node: 15.091 s. Não inclui todos os subprocessos. CPU/RAM do navegador e TTS, uso de GPU, CPU isolada do encoder e rede não medidos.
- 36 geometrias / uma textura; software WebGL. Execução local de teste utilizou a opção existente de navegador sem sandbox; não é recomendação de hospedagem pública.

| Etapa | Média ms/frame | Máximo ms |
|---|---:|---:|
| pcmMixMs | 0.918 | 7.999 |
| audioPipeMs | 0.085 | 3.005 |
| renderRoundtripMs | 35.254 | 294.639 |
| videoPipeMs | 0.452 | 208.971 |

Leitura de pixels média 21.779 ms; serialização 0.346 ms. Pipes incluem backpressure; submissão Three.js não mede término da GPU. Watchdog preservado.

## Comparação e avaliação visual

A evidência anterior era 216×384/4 FPS; esta execução alcançou 360×640/15 FPS. Não é benchmark controlado de hardware e não comprova 720×1280/30 FPS nem estabilidade por horas.

Inspecionei seis frames distribuídos pela gravação no contact-sheet. Há arena tridimensional, cobras e maçãs reconhecíveis, mudanças de enquadramento, crescimento, rodadas, avatares e mensagens explicitamente simuladas. O ajuste final separa o rosto da apresentadora do diálogo nos frames observados. Permanecem limitações: alguns planos cortam bordas da arena; visão geral reduz as expressões dos jogadores; Top 6 tem texto pequeno; há espaço vazio e composição ainda de jogo casual. Não considero a qualidade artística aprovada apenas pela melhoria técnica. Frames isolados não permitem avaliar toda a fluidez ou sincronização.

Não realizei escuta humana nem avaliação auditiva integral. As seis amostras em `voice/` e o MP4 devem ser ouvidos pelo operador. Não afirmo naturalidade aprovada. A amplitude e intervalos vocais são aproximações, não lip-sync fonético.

## Testes e pendências

Backend 183/183, build e lint aprovados (logs versionados); teste RTMP final aprovado. Testes direcionados 3D registrados separadamente. O build mantém aviso de tamanho de bundle.

**Canto real por IA permanece pendente.** Os três jingles são instrumentais originais CC0 de teste. A preparação de provedores não executa geração, não cobra e não simula resultado. Importação de vocal melódico autorizado e aprovação artística são necessárias. Presentes, nomes e ranking são demonstração; não há audiência, receita ou eventos TikTok reais validados.

Nenhuma API paga utilizada. Energia/hardware/rede são custos desconhecidos, não zero. Perfil HD/30, revisão auditiva, estabilidade prolongada, canto real e permissões TikTok permanecem pendentes. Sem merge ou deploy de produção.
