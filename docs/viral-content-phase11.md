# Viral Content Factory 1.1 — entrega incremental para revisão

Base auditada: master ce8a392 (PRs 22, 23 e 24 integradas). Reutiliza missão/fila/checkpoints/Armazém, Seed Snake, renderer Three.js, mixer, speech, catálogo e experimentos de audiência. Não altera física, RTMP, watchdog, autenticação ou aprovação comercial. Zero novas dependências e zero chamadas pagas.

## Implementado

`viral-director.mjs` registra 90 s de simulação determinística (limite 120 s), detecta crescimento, proximidade, eliminação e resultado. Prioridade explicável: peso do evento + inverso de frequência. Proximidade não é alegada como escapada. Não há inferência de audiência, surpresa ou viralidade.

Timeline: gancho, desenvolvimento, momento principal e conclusão; quatro cortes reais, seleção de trecho anterior ao evento, prévia identificada, replay identificado a 0,65x. O relógio dos frames/effects é rebaseado para mídia; voz não desacelera junto com o jogo. Não há segundo jogo nem renderer. Eventos, origem, tempos e decisão constam no relatório. O fallback é gameplay contextual quando não há highlight. Não implementa ainda acelerar trechos.

Atuação usa expressões já existentes por cena; não é improvisação por LLM. Arquétipos disponíveis passam a ser usados também no modo editorial sem inventar usuários/donativos. Não houve remodelagem artística nesta entrega.

Legendas de até cinco palavras, margens maiores e HUD simplificado. Intervalo total vem do PCM, distribuição das palavras é estimada (não alinhamento fonético). O lip sync continua por envelope. Cenas e narração têm controles distintos; sincronização narrativa fina ainda requer revisão.

A rota `/agentes/viral` permite selecionar trilha ambiente aprovada no workspace, editar roteiro como nova versão, assistir ao MP4 e consultar timeline. Aprovação/download continuam no Armazém. O servidor revalida hash/direitos do catálogo existente. Climas musicais ainda não classificados automaticamente.

## Validação

215 testes backend aprovados, quatro pulados; zero falhas. Build e lint dos módulos alterados aprovados. Testes direcionados verificam determinismo, transições observadas, limites, replay, relógio e legendas sem sobreposição. Os três arquivos passaram FFprobe e decodificação FFmpeg. Renderer real Chromium/WebGL em software. Logs e relatórios em `docs/evidence/viral11`.

Vídeos novos: comedy 15s/225 frames, battle 25s/375, champion 16s/240; todos 360×640, H.264/AAC, 15 quadros distintos por segundo de mídia. Tempo de produção completo: 11,253 / 18,882 / 13,718 s. Isso não valida RTMP em tempo real nem 720p30. Não se alterou watchdog. Ver hashes/probes. Não foram reutilizados arquivos 1.0.

Detecção simples de tela preta no RGB bloqueia mais de 1 s; MP4, dimensões, áudio, duração e decode são verificados antes de devolver o artefato. Inspeção de texto cortado/oclusão ainda é humana; nenhuma nota heurística desbloqueia publicação.

## Avaliação perceptiva e comparação

Inspecionados quadros distribuídos dos três baselines e novos arquivos, não reprodução audiovisual integral. A 1.0 mostrava gameplay contínuo e cabeçalho técnico persistente. A 1.1 mostra cortes, replay e rostos de arquétipos distintos, com legendas mais curtas. Quadros de apresentação mostram focinhos/orelhas diferentes e título legível.

Problemas visíveis: corpos podem cobrir rostos em close; arena ainda simples; modelo procedural perceptível; formato comedy ainda depende excessivamente do gameplay e de texto roteirizado. Não está comprovado que os vídeos são engraçados ou retêm público. Sem revisão auditiva perceptiva: inteligibilidade/naturalidade/humor e mixagem precisam de escuta humana.

## Voz e música — pendências

Pasta local Kokoro vazia e HUBLOAN_KOKORO_MODEL não configurado: demos usam eSpeak declarado. Infraestrutura Kokoro/pf_dora mantida. Instalar os pesos/config/vozes exigidos por `kokoro_bridge.py`, configurar HUBLOAN_KOKORO_MODEL e HUBLOAN_KOKORO_PYTHON e repetir captura; nenhum modelo foi comprado. Não declarar voz neural validada.

As demos não selecionam trilha licenciada; efeitos e voz saem pelo mixer existente. Seleção de trilha no painel está implementada, mas demonstração musical desta versão permanece pendente. Biblioteca de humor extensível, maior refinamento artístico, atuação verdadeiramente protagonista, alinhamento por palavras, perfis adicionais e revisão auditiva não estão concluídos. A PR deve permanecer em rascunho.

## Reprodução

Node/dependências já existentes, FFmpeg/FFprobe e Chromium. Configure HUBLOAN_CHROMIUM. Para software GL: HUBLOAN_SOFTWARE_GL=1; desativação do sandbox somente em ambiente isolado. TTS local espeak-ng como fallback ou Kokoro configurado. Execute `node server/viral-demo.mjs /pasta/saida`. Não transmite, publica ou cobra. O vídeo battle usa fixture editorial determinística com quatro personagens e eliminação de Ember verificada; nomes não são espectadores.

Custos de API: zero. CPU/RAM/energia: infraestrutura desconhecida, não custo zero. Experimentação comercial continua em Astra/experimentos existentes; não foi medida retenção e não há novas alegações de causalidade.
