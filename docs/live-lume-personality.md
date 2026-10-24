# Lume: voz e humor contextual

Incremento sobre PR #16, sem mudar jogo, encoder, watchdog ou permissões TikTok.

No painel Áudio e atuação, **Usar Lume feminina e brincalhona**, seguido de **Salvar áudio e atuação**, seleciona Kokoro pf_dora e humor `cheeky`. Configurações existentes não são sobrescritas. O worker precisa da instalação Kokoro já documentada; o fallback continua disponível e não é apresentado como voz neural.

Falas originais acompanham rosas, comentários sobre o jogo, alimentação, vitória, empate e derrota. A seleção é local, sem API paga. Guarda as últimas 12 escolhas por sessão, com variação determinística. O duplo sentido leve só é elegível em uma de cada quatro escolhas e com intervalo mínimo de 60 segundos. Não há insultos a espectadores ou incentivo para gastar. O modo gentil permanece disponível.

As músicas aprovadas continuam prioritárias: uma reação curta vem após o jingle selecionado; eventos agrupados não acrescentam falas. Sem repertório, presentes recebem fala contextual, sem apresentar TTS como canto. Fala usa o mixer e sincronização existentes. Kokoro recebe perfis de velocidade limitados (0,96 acolhedora; 0,98 irônica; 1,06 animada), com pausas no texto. Isso não é controle neural de emoção nem aprovação artística. O cache distingue os perfis.

## Rádio brasileira: pendência explícita

O catálogo atual aceita ambiente de 4–60 segundos, três variações e 18 MB por experiência. Portanto ainda não oferece rádio de músicas completas. Não foram importadas nem aprovadas faixas externas nesta alteração. Ampliar a duração exige fluxo de decodificação/memória limitado, revisão de direitos de cada arquivo e escuta humana. Uma licença de música para vídeo não é automaticamente autorização para uma rádio via RTMP.

## Escuta

A naturalidade, humor e ritmo precisam de revisão humana. A mudança não substitui o motor nem autoriza compras. As amostras devem ser sintetizadas pelo worker com Kokoro instalado e comparadas antes de usar em transmissão pública.

Seis amostras neurais reais estão em `docs/evidence/lume-personality/*.flac` (compressão sem perdas). Geradas com pf_dora, zero fallback/falha. Tempos de síntese e textos em `samples.json`; ainda **não aprovadas por escuta humana**. Reproduzir: `HUBLOAN_KOKORO_MODEL=... HUBLOAN_KOKORO_PYTHON=... node server/live-worker/lume-samples.mjs pasta`. O script falha se Kokoro não sintetizar; não substitui silenciosamente pela voz robótica.

## Validação desta alteração

Suíte de backend: 190 testes, 188 aprovados, dois testes opcionais ignorados (Piper neural e renderer WebGL, sem suas variáveis de configuração). Inclui teste RTMP de performance recebido e decodificado, e proteção do watchdog. Um terceiro teste específico de jingle/agrupamento foi adicionado depois: arquivo `live-lume.test.mjs` executado novamente, 3/3 aprovados. Build e lint do módulo agents passaram. Não foi produzida uma nova gravação de 120 segundos nesta alteração; a evidência anterior não comprova estas novas falas. As seis amostras reais comprovam síntese neural, não aprovação artística.
