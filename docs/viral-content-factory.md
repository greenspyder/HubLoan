# Viral Content Factory 1.0 — incremento offline

Base master bcfbdf9, independente das otimizações RTMP da PR A.

`/agentes/viral` cria roteiros persistentes nos objetos de missão existentes. Reutiliza fila limitada, cancelamento, lease, checkpoints, autenticação do workspace e revisão no Armazém. Formatos: comedy (10–25s), battle (15–40s), champion (10–30s). Storyboard é planejamento editorial, nunca evidência de acontecimentos.

O adaptador `viral-render.mjs` usa o mesmo Three.js, Seed Snake, camera rig, Kokoro/localSpeech e mixer. Prepara narração antes da captura, avança simulação determinística, captura quadros distintos, mistura PCM, gera SRT e compõe MP4 H.264/AAC com o FFmpeg existente. MP4 e capa são entregues pela rota autenticada de artefatos existente. Nenhuma geração paga e nenhuma publicação automática.

Limites: 360×640 / 15 quadros por segundo de mídia **offline**, até 40 segundos, 8 MB de MP4, dez minutos de preparação/render, cinco segundos por frame. Isso não prova 15 FPS em tempo real. Arquivos intermediários RGB ficam em diretório temporário privado e são apagados ao terminar/cancelar. Checkpoint retoma o render concluído; falha no meio reinicia essa etapa, não o vídeo a partir do último frame.

Requisitos: FFmpeg/ffprobe, Chromium em HUBLOAN_CHROMIUM, WebGL. Kokoro usa HUBLOAN_KOKORO_MODEL/PYTHON; fallback eSpeak deve estar instalado e é identificado no relatório. Falta de voz impede a entrega em vez de aprovar vídeo mudo. Ambiente sem GPU pode precisar HUBLOAN_SOFTWARE_GL=1; não desative sandbox fora de container isolado.

API de missão aceita `liveShort.music={experienceId,trackId}`: apenas faixa ambiente aprovada do mesmo workspace, carregada pelo store e validada por hash. Interface de seleção musical ainda pendente. Sem seleção, não usa música procedural como se fosse catálogo aprovado.

Reproduzir demonstrações: `HUBLOAN_EVIDENCE_DIR=/diretorio node server/tests/fixtures/viral-demo.mjs`. As gravações não contêm espectadores reais; são cenas editoriais da simulação. Relatório distingue voz neural/fallback, hashes de quadros, tempo de renderização e histórico real de rodadas. A versão inicial de Battle mostra gameplay contínuo; seleção automática de melhores momentos ainda não implementada.

## Revisão obrigatória / pendências

Revisar imagem, áudio, direitos, legendas e alegações do roteiro antes de distribuir. Aprovação técnica não atesta qualidade artística, naturalidade, viralidade ou retenção. Faltam edição de roteiro salvo/versões dedicadas, escolha musical no painel, covers editoriais, edição de highlights e avaliação artística dos três vídeos. Integração Astra/experimentos/distribuição é uma entrega separada. Custos de infraestrutura desconhecidos; chamadas de provedores pagas: zero.
