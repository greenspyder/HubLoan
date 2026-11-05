# Evidência 1.2 — nova execução

**Estado: revisão humana; PR em rascunho.** Nenhuma escuta perceptiva foi realizada pelo agente. Os MP4s têm áudio decodificável, mas isso não comprova naturalidade, humor ou qualidade da mixagem.

## Resultados medidos

| Formato | Duração | Quadros distintos | Produção total | Quadro médio / p95 | Geometrias |
|---|---:|---:|---:|---:|---:|
| comedy | 18.000000 s | 270 | 59.86 s | 130.8 / 239.7 ms | 35 |
| battle | 25.000000 s | 375 | 48.31 s | 83.6 / 137.2 ms | 34 |
| champion | 20.000000 s | 300 | 43.14 s | 93.9 / 178.8 ms | 32 |

Todos: 360×640, H.264, AAC mono 48 kHz, 15 FPS de mídia, zero quadros pretos na verificação, 4 falas neurais por vídeo, zero fallback/falhas. Música presente em todos os blocos; picos PCM abaixo de 0,34. Render offline em software WebGL: o tempo de produção supera a duração. **Isso não valida live a 15 FPS nem 720p/30.** O teste WebGL foi concorrente ao início da comédia, portanto os tempos não são benchmark causal entre formatos.

Suíte: 222 testes, 218 aprovados, 4 pulados, zero falhas. WebGL direcionado: 3 aprovados, 1 Piper opcional pulado. Build e lint passaram; build manteve aviso de bundle acima de 500 kB. Watchdog não foi enfraquecido. O teste facial agora reconhece três geometrias únicas (esfera, crânio e focinho), em vez de duas; o teste WebGL mantém seu orçamento original.

## Inspeção visual efetuada

Inspecionadas folhas de quadros distribuídos pelos três vídeos e comparação de apresentação no mesmo instante (4 s). Os instantes equivalentes não garantem pose/câmera idênticas entre versões.

- Comedy: rosto grande, mandíbula e olhos perceptíveis, corpo da apresentadora visível, legendas legíveis. A personagem ainda tem acabamento procedural e o jogo continua visualmente ativo atrás dela; não equivale a uma animação profissional autônoma.
- Battle: highlight, antecipação e replay identificados, arena legível em parte dos planos. Persistem corpos sobrepostos, rostos ocultos e expressão de derrota semelhante entre personagens. Não considerar o refinamento cinematográfico concluído.
- Champion: focinho longo e orelhas diferenciadas visíveis; câmera ainda mostra alguns rostos de costas/lado. A comparação demonstra geometria alterada, mas não comprova melhoria artística universal.
- Legendas ocupam área central inferior e podem cobrir parte do rosto pequeno da apresentadora. Esse é um ajuste futuro necessário.

Não assisti/escutei integralmente os arquivos. Não há aprovação auditiva, artística ou afirmação sobre retenção. O operador deve avaliar os três arquivos antes de marcar a PR como pronta.

## Comparação com 1.1

1.1 utilizava fallback eSpeak nos exemplos; estes novos arquivos têm prova de execução Kokoro pf_dora, com síntese local e metadados reais. A seleção de highlights/timeline/replay é reutilizada, não uma funcionalidade nova atribuída à 1.2. A música é a faixa já autorizada, não uma nova identidade musical. Colisões e sobrevivência não foram alteradas. Catálogo completo por clima, câmera sem oclusões, visemas e acabamento artístico final continuam pendentes.

Os arquivos JSON por formato incluem roteiro, timeline, histórico simulado, tempos, recursos, voz, música e métricas do mixer. `validation.json` contém hashes e verificação independente por FFmpeg/ffprobe. Não há espectadores reais ou publicações automáticas.
