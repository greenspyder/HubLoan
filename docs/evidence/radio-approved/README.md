# Música ambiente aprovada — evidência RTMP

Código testado: 064be00. Brazilian Sunsets, Ketsa, CC BY 4.0, importada e aprovada pelo hash autorizado pelo operador. Os créditos aparecem no vídeo. A seleção ocorreu no workspace isolado do teste, não em produção.

## Resultado
Receptor independente recebeu e decodificou 126,037 s, 360×640, 15 FPS; 1890 frames, 29 atrasados, atraso máximo do pipeline 210,67 ms. Watchdog preservado; encerramento normal. Correlação do áudio recebido com PCM: 0,9998665. Música ambiente presente nos 1890 frames. Kokoro pf_dora: 13 sínteses neurais, nenhum fallback ou erro. Sem chamadas pagas.

Reação até início: média 2082,64 ms, p95/máximo 3467 ms (11 amostras). A síntese teve média 1690,54 ms. A espera de segmentos posteriores chegou a 15022 ms: não confundir essa medida com início da reação. Meta abaixo de 2 s não foi atingida para todas as reações. Em comparação à evidência anterior (média 2178 ms, máximo 3303 ms), a média caiu aproximadamente 4%, mas o máximo aumentou: não há melhoria uniforme.

## Verificação
Backend: 190 testes aprovados e 2 opcionais ignorados; WebGL/Piper executados separadamente: 4 aprovados. Build frontend e lint restrito ao módulo aprovados. Teste RTMP completo aprovado. Logs anexos; lint global não foi repetido nesta execução.

Inspeção visual realizada no frame de 22 s e em contato de 12 frames ao longo da captura. Arena e personagens permanecem visíveis nas amostras; Top 6 é legível no frame nativo de 360×640. Texto perde legibilidade ao reduzir; permanece espaço vazio e pequena sobreposição da coroa com os créditos no topo. A câmera varia, mas o refinamento artístico não está concluído. Essa amostragem não equivale a assistir ao vídeo completo. Não foi realizada escuta: naturalidade da voz e direção sonora exigem revisão humana.

## Limites
Eventos e participantes explicitamente simulados. Jingles são instrumentais de teste, não canto por IA. A faixa ambiente é obra de Ketsa, não obra original do HubLoan nem funk gerado por IA. Transmissão técnica recebida não confirma TikTok público. Software WebGL; perfil 720p/30 FPS não validado. RSS do worker 317 MB não inclui toda a árvore de processos; CPU/GPU totais desconhecidas. Readback: 37,66 s acumulados, principal parcela medida do renderer.

Fonte: https://freemusicarchive.org/music/Ketsa/cc-by-free-to-use-for-anything/brazilian-sunsets/
Licença: https://creativecommons.org/licenses/by/4.0/
Conversão técnica: PCM mono 24 kHz; sem alteração musical intencional. Custo de aquisição/API confirmado: zero; energia/hardware não precificados.

Alterações e evidências locais ainda não publicadas na PR #17: abertura do Codespace bloqueada por revisão automática devido ao limite de uso. Sem merge ou deploy.
