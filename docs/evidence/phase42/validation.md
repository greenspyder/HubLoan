# Validação Live Factory 4.2 — 19/10/2026

## Evidência operacional

`performance-received.mp4`: saída do worker operacional existente enviada por RTMP loopback e recebida por processo FFmpeg independente, remuxada sem reencenar a experiência. Three.js/WebGL2 real, Seed Snake determinística, mixer PCM existente, H.264 e AAC. Runtime/backend SQLite reais, autorização temporária e watchdog ativos. Não é transmissão pública confirmada.

Duração recebida: 126.037000 s. Resolução 216×384; 504 frames, perfil 4 fps, FPS efetivo 3.999. Todos os streams decodificados por FFmpeg. Correlação AAC decodificado/PCM do mixer: 0.996484; isso comprova integridade técnica, não naturalidade ou qualidade musical.

## Métricas

| Medida | Resultado |
|---|---|
| Estado final | STOPPED |
| Render máximo, incluindo escrita | 303 ms |
| Maior atraso acumulado | 76 ms |
| Frames acima do tempo orçado | 2 (não equivale a frames perdidos) |
| Frames renderizados/codificados | 504/504 |
| RSS Node ao final | 201.7 MiB |
| CPU Node | 5432.0 ms; não inclui Chromium/encoder/TTS |
| CPU/RAM Chromium/TTS/GPU/encoder | Indisponíveis neste ambiente; não inferidos |
| Fala neural / fallback / falha | 5 / 0 / 0 |
| Maior síntese | 1820 ms |
| Maior espera até reprodução | 18669 ms; precisa revisão do ritmo |
| Cache de voz | 6 hits |
| Reprodução host / comentário / música | 10 / 1 / 3 |
| Faixas de eventos distintas | 3 |
| Ambiente importado presente | 504 blocos |
| Falhas musicais / eventos descartados | 0 / 0 |
| Pico PCM absoluto | 0.1060; volume percebido não avaliado |
| Rodadas concluídas | 8 |
| Chamadas LLM / custo API | 0 / zero |

Ambiente: quota cgroup 8 CPUs e 8 GiB, Chromium SwiftShader explicitamente habilitado; sem GPU física comprovada. Execução sem sandbox do Chromium foi opt-in neste container (restrição documentada da fase 4.0), não configuração padrão para máquina do usuário. Não foi aberto serviço remoto. Recursos desconhecidos não foram preenchidos com estimativas.

## Inspeção e avaliação crítica

Foram inspecionados frames do arquivo recebido em intervalos de aproximadamente 20 s e o frame de performance. A arena tem profundidade, maçãs legíveis, cobras reconhecíveis e variação de posição/enquadramento; pontuações, corpos longos e encerramento de rodada aparecem. Avatares e apresentador surgem nos mesmos frames do jogo. O primeiro candidato tinha diálogo cobrindo parte da cobra; a área segura foi ampliada e o teste 3D repetido antes da gravação final.

Esta é inspeção visual de amostras, não reprodução assistida integral do vídeo. Não houve audição: voz feminina neural foi comprovada pela execução do modelo e PCM, mas naturalidade, pronúncia e mix percebido precisam de revisão humana. O pico baixo pode exigir ajuste de volume após escuta.

A qualidade ainda não satisfaz a ambição artística: 4 fps tem movimento perceptivelmente descontínuo; a baixa resolução torna textos/expressões pequenos e as cobras simples. Preservar ação visível limita close-ups. Seis snapshots não demonstram retenção nem permitem afirmar uma experiência hipnótica. A câmera e o repertório são avanço operacional, não aceitação de espetáculo pronto.

## Conteúdo da demonstração

Comentário, rosas em duas variações, presente especial, ranking e foto genérica de fixture são SIMULATED_OPERATOR. Ambiente e jingles foram compostos deterministicamente para testes e dedicados a CC0. Aprovação automatizada apenas dessas fixtures; não houve aprovação auditiva humana. Não são músicas cantadas por IA. Nenhum participante, valor, receita ou evento TikTok real foi fabricado como real.

## Testes

- Backend sequencial: 180/180 passaram (inclui regressões RTMP anteriores).
- Depois da reserva adicional de espaço para diálogos: 4/4 testes 3D/voz passaram.
- Teste audiovisual final: receptor RTMP decodifica H.264/AAC e confirma mais de 120 s, três músicas, voz neural sem fallback, persistência do Top 6, rodadas e zero chamadas pagas.
- Build frontend e ESLint dos cinco arquivos alterados passaram; aviso de chunk grande permanece.
- Logs anexos. Testes paralelos inicialmente sobrecarregaram encoder; execução sequencial passou. Tentativa 6 fps anterior encerrou por atraso >2 s; proteção mantida.

## Pendências antes de aceitar 4.2 artisticamente

Repertório feminino realmente cantado (duas rosas e especial), direitos revisados, escuta comparativa da voz/mix, teste de light/smooth em GPU e melhor composição/expressividade. HD30 e sessões de horas não foram validados. TikTok LIVE depende de credenciais, elegibilidade e adapter oficial autorizado. Recomendado revisar este MP4 antes de escolher repertório ou iniciar live pública.
