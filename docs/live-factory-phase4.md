# Live Factory 4.0 — Seed Snake 3D e voz neural local

## Base auditada e decisão

`master` 05634c6c52f9fc412540df11ba57750ea628a8b2 incorpora PRs #9–#13, inclusive a fase 3.2. Foram lidos runtime, jogo, snapshots, transmissão/grants, mixer, speech, performance, avatares, painel, persistência e testes. A evidência 3.2 foi examinada por frame: arena plana e apresentação pequena. Não houve reprodução auditiva completa nesta sessão.

Mantidos física de 200 ms/BFS, crescimento, colisões, rodadas, store, Top 6, consentimento/fotos, eventos autenticados/dedup, orçamento, Astra/sugestões revisáveis, um único runtime, mixer PCM e encoder. Astra continua com sugestões determinísticas; não foi introduzido um agente generativo paralelo. Eventos TikTok LIVE continuam indisponíveis. Login Kit não concede essas permissões. Transmissão pública continua UNCONFIRMED.

Three.js foi escolhido para a camada visual: geometria procedural, materiais, luzes, câmera e WebGL2 sem adicionar física ou áudio. Babylon também suporta WebGL/WebGPU, mas seus recursos adicionais não foram necessários nesta integração. O resultado **é capturado pelo worker**, não depende do painel aberto. A cena usa modelos originais construídos em código: cabeça/olhos/boca, corpo tubular por Catmull-Rom, jardim elevado, maçãs, pedras e partículas. Interpolação reaproveita `sceneFrame`; não altera os estados do jogo.

Piper 1.3.0 com `pt_BR-faber-medium` foi selecionado para a implementação neural inicial após síntese CPU real e medição. O modelo tem ~63 MB e 22.050 Hz; o áudio é reamostrado pelo decoder existente para PCM mono 48 kHz. A documentação do modelo declara pt_BR, um locutor e dataset CC0. Piper atual é GPL-3.0; modelo e mecanismo são componentes instalados pelo operador, não embutidos no repositório. Preserve as licenças ao redistribuir. Três ritmos de fala não equivalem a três locutores neurais treinados. Kokoro é uma alternativa futura, não foi comparado auditivamente nem instalado. Não se afirma superioridade perceptual sem escuta.

## Caminho operacional

```text
runtime existente → snapshots interpolados → Three.js/WebGL2 em Chromium controlado
→ RGB com overlays → stdin do FFmpeg existente → MP4 ou RTMP/RTMPS
performance existente → Piper opcional → cache/fila/mixer existente → PCM → mesmo FFmpeg
```

- `scene3d.mjs`: apresentação pura; câmera acompanha suavemente cobra/alvo sem recortar intencionalmente a arena. Close-up do apresentador usa o mesmo desenho de cabeça. Boca recebe RMS do PCM efetivamente misturado; narração secundária não abre a boca do Lume. Versos continuam **fala ritmada**, não canto melódico.
- `render3d.mjs`: processo Chromium local via pipe, sem servidor HTTP nem navegação externa; recebe somente snapshots e fotos normalizadas. Não recebe stream key/token. Bloqueia requisições de rede; fotos somente PNG base64 limitado. Falha de WebGL ou timeout termina o worker com segurança; não troca silenciosamente 3D por 2D.
- `neural-speech.mjs`/`piper_bridge.py`: processo persistente, um modelo CPU, duas threads de inferência, uma requisição por vez, 200 caracteres, oito segundos de áudio, timeout 5 s. Inicialização limitada a 15 s. Modelo local até 150 MB e configuração pt_BR. Cancelamento mata o processo. Falha faz fallback eSpeak, registrado nas métricas; se ambos falharem, mixer mantém música e silêncio de voz.
- `worker.mjs`: mesmo encoder e autorização; seleciona renderer/voz. Mantém limite de 30 min, heartbeat, watchdog, emergência, backpressure e limite de 2 s de atraso. Não retoma transmissão pública automaticamente.
- Falas autônomas usam resultados reais das rodadas e cooldown mínimo de 20 s, respeitando configuração maior. Não geram presentes, espectadores ou ranking. Nenhuma chamada de LLM/API paga.
- Comunidade reaproveita ranking persistido: figuras 3D nas laterais, foto consentida no rosto, líder destacado e faixa Top 6. Não altera vantagens/regras do jogo. Toda interação de teste permanece rotulada como simulada.

## Instalação local

Requisitos: Node 24, Python 3.10+ compatível com Piper, FFmpeg/ffprobe, Chrome/Chromium com WebGL2, eSpeak NG como fallback. Use ambiente virtual, sem instalar modelos globalmente. Não use um browser com sessão pessoal; Puppeteer cria perfil temporário isolado.

```sh
npm ci --prefix server
python3 -m venv .venv-live
.venv-live/bin/pip install piper-tts==1.3.0
mkdir -p live-models
.venv-live/bin/python -m piper.download_voices --download-dir live-models pt_BR-faber-medium
export HUBLOAN_PIPER_MODEL="$PWD/live-models/pt_BR-faber-medium.onnx"
export HUBLOAN_PIPER_PYTHON="$PWD/.venv-live/bin/python"
export HUBLOAN_CHROMIUM=/caminho/absoluto/para/chromium
```

Instale Chrome/Chromium pelo distribuidor oficial. Também pode instalar Chrome for Testing headless shell com `npx @puppeteer/browsers install chrome-headless-shell@141.0.7390.78 --path ./live-browser` e apontar `HUBLOAN_CHROMIUM` para o executável. Essa versão foi usada na evidência; atualize e revalide em ambientes operacionais.

SHA-256 do modelo testado: `858555e3a064209c57088fe6bd70c4c3dc54d03eaa00c45d5ecaf43a33f95aa7`. Modelos/browser/venv/config com credenciais não devem ser commitados. Os caminhos variam no Windows (`Scripts/python.exe`, `chrome.exe`); validação de referência foi Linux, Windows permanece sem ensaio.

O sandbox do Chromium fica habilitado por padrão. Em container de teste descartável que já isole o processo, existe opt-in `HUBLOAN_UNSANDBOXED_RENDERER=1`; não é recomendação para máquina de uso geral. `HUBLOAN_SOFTWARE_GL=1` seleciona SwiftShader explicitamente, para hosts sem GPU, com custo maior de CPU. Sem WebGL não há saída 3D; o operador pode escolher o modo SVG existente.

## Prévia e envio

1. No painel existente, configure Seed Snake e habilite atuação/áudio. Inicie a experiência.
2. Baixe autorização de **prévia**, proteja o arquivo com `chmod 600 hubloan-worker.json`.
3. Execute:

```sh
node server/live-worker/worker.mjs --config hubloan-worker.json --renderer three --voice neural --profile light --seconds 96 --output previa-3d.mp4
```

4. Abra esse MP4 no seletor local da seção Experiência, com som. É o mesmo renderer/mixer/encoder da transmissão. O Canvas do painel continua sendo **referência 2D sem o mixer**, explicitamente identificado. Não há prévia 3D ao vivo no frontend nesta entrega.
5. Para RTMP, encerre/revogue a autorização anterior, obtenha autorização de transmissão e configure um endpoint autorizado no arquivo local, conforme fase 3. Acrescente `--transmit`. Não imprima nem compartilhe a configuração ou stream key. TikTok exige acesso da conta a um caminho de transmissão autorizado; não foi validado com conta real.
6. Pause ou encerre pelo painel; emergência revoga a autorização. SIGINT/SIGTERM também encerram o worker. Fechar o painel não encerra o worker local.

`--renderer svg --voice local` preserva o modo anterior. Fallback neural é visível no relatório (`speech.fallback`, `speech.failures`); uma execução com fallback não comprova voz neural bem-sucedida.

## Perfis, recursos e custos

| Perfil | Vídeo | Uso |
|---|---|---|
| light | 360×640, 15 fps, H.264 + AAC | padrão, caminho inicialmente validado em CPU/software |
| smooth | 360×640, 30 fps | depende de hardware; não recomendado sem ensaio real |
| hd | 720×1280, 30 fps, 2,8 Mbps alvo | somente 3D; experimental, não aprovado neste host |

A primeira captura isolada ficou em ~74 ms/frame. Instanciar cenário estático e reduzir tesselação/antialiasing trouxe ~59 ms/frame. Não basta aumentar FPS nominal. O guard de atraso encerra uma execução que não acompanha o relógio de mídia, preservando diagnóstico e exigindo nova autorização.

Não há assinatura nem API paga. Custo de API nesta implementação: zero; energia, CPU, tráfego e hospedagem são custos variáveis não calculados. Meta operacional inicial: computador com pelo menos 4 núcleos, 4 GB livres e WebGL2; isso é orientação para teste, não requisito mínimo certificado. GPU local pode ajudar; nenhum resultado em RTX 4050 foi medido. Hospedagem precisa permitir processos persistentes, Chromium/WebGL, FFmpeg, áudio e rede RTMP de saída; não se presume compatibilidade do Render/Vercel atual. Frontend hospedado não executa encoder.

Telemetria separa Node RSS/CPU, browser CPU/RSS quando disponível, Piper RSS, tempo máximo de frame, atraso e síntese/fallback. CPU do encoder, energia e uso GPU permanecem desconhecidos quando não mensurados. Ensaio de 96 s não valida estabilidade por 30 min.

## Reprodução dos testes e evidência

```sh
npm test --prefix server
npm run build --prefix frontend
(cd frontend && npx eslint src/features/agents src/shared src/app/App.tsx vite.config.ts)
# Com Chromium/Piper e suas variáveis configurados:
node --test server/tests/live-3d.test.mjs
LIVE_3D_EVIDENCE_DIR="$PWD/docs/live-factory-evidence/phase4" node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
```

O último teste envia 96 segundos pelo **worker real** a um FFmpeg receptor RTMP independente, decodifica áudio/vídeo, compara AAC recebido com PCM do mixer, verifica falas neurais, Top 6 e rodadas. Comentário/presentes/retrato são dados de operador simulados. A foto de teste é uma ilustração original, não uma foto de espectador real. Testes de WebGL/Piper são condicionais às dependências; skip não cumpre o aceite audiovisual.

## Fontes técnicas consultadas

- https://threejs.org/docs/pages/WebGLRenderer
- https://www.babylonjs.com/specifications/
- https://pptr.dev/guides/headless-modes
- https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md
- https://github.com/OHF-Voice/piper1-gpl
- https://huggingface.co/rhasspy/piper-voices/tree/main/pt/pt_BR/faber/medium
- https://huggingface.co/hexgrad/Kokoro-82M

## Avaliação visual e auditiva

Inspeção realizada por folha de 12 quadros distribuídos na gravação e sequência de seis quadros a cada 200 ms. A arena elevada, iluminação e perspectiva dão profundidade real; a dupla procura maçãs, muda de direção, cresce, colide e passa por rodadas. O close-up mantém olhos/boca legíveis e os cartões não cobrem o jogo em andamento. A transição de vitória ocupa o centro apenas entre rodadas. A sequência próxima mostra aproximação de maçãs, pontuação e mudança de direção; não foi usado apenas hash de frames como critério visual.

Limites observáveis: os jogadores no fundo da arena e as fotos nas laterais ainda são pequenos; há serrilhado no perfil sem antialiasing. O Top 6 abrevia nomes. O enquadramento é deliberadamente amplo e o movimento de câmera é sutil. Corpos curtos no nascimento e pausas de 3 s são regras existentes. A composição evoluiu para 3D funcional, mas isso não comprova qualidade comercial ou retenção. Recomenda-se revisão em celular antes de autorização pública.

Não houve ferramenta disponível para ouvir o áudio ou assistir continuamente ao vídeo. Foram verificados PCM não silencioso, síntese real do modelo pt_BR, saída AAC decodificada, correlação com o mixer e envelope de boca. **Naturalidade, pronúncia e expressividade da voz continuam pendentes de revisão auditiva humana.** Não se declara atendido esse critério de aceite nem se promete que Piper resolve sozinho a qualidade artística. O áudio de versos é falado/ritmado, não cantado melodicamente. A voz secundária usa o mesmo locutor neural com outro ritmo, não uma identidade vocal treinada separada.

Testes de regressão: 172 aprovados, sem falhas nem skips na execução local com dependências instaladas. Build frontend e ESLint aprovados; permanece aviso preexistente de bundle acima de 500 KB. Testes cobrem isolamento/grants/dedup/emergência existentes, falha de encoder/render, jogo persistente, ranking/fotos, mixer/fallback, nova voz neural, boca/câmera WebGL, limite de geometria e comentários autônomos sem público inventado.

O benchmark isolado de 720×1280 teve média após aquecimento de **185,7 ms/frame** (~5,4 fps), muito acima dos 33,3 ms necessários para 30 fps. Portanto HD **não está aprovado neste host**, nem o benchmark é prova de transmissão HD. Os relatórios do browser podem ter CPU/RSS indisponíveis sob namespace; esses valores permanecem desconhecidos, não são custo zero.

[Vídeo recebido](live-factory-evidence/phase4/performance-received.mp4) · [Relatório RTMP](live-factory-evidence/phase4/performance-report.json) · [Quadros](live-factory-evidence/phase4/contact.jpg) · [Movimento](live-factory-evidence/phase4/motion.jpg) · [Benchmark HD](live-factory-evidence/phase4/hd-benchmark.json).

Pendente: aprovação auditiva em pt-BR, direção artística adicional, avatares maiores/mais legíveis, comparação perceptual com outros modelos, HD/30 fps em GPU real, sessões prolongadas, prévia 3D ao vivo no painel e API oficial autorizada de eventos TikTok LIVE. O caminho RTMP técnico não equivale a transmissão TikTok pública confirmada. Nenhum merge ou deploy de produção foi executado nesta entrega.

## Resultado medido da gravação final

- Receptor independente: **96,021 s, 1.440 frames H.264 360×640/15 fps + AAC**; decodificação integral aprovada. Correlação AAC/PCM: **0,99599**.
- Sete rodadas concluídas. Nove segmentos reproduzidos (seis host, um comentário, dois versos), oito sínteses neurais e um cache hit; nenhum fallback/falha TTS ou chamada de IA. Síntese máxima 257 ms, latência máxima até reprodução 1.091 ms.
- Todos os frames previstos foram enviados. 102 frames excederam o orçamento individual; atraso acumulado máximo ~546 ms, abaixo do limite de 2 s, recuperado durante o ensaio. Pico de render/pipeline: 402 ms. Isso não equivale a fluidez perfeita a 30 fps.
- RSS do Node ~225 MB; CPU Node ~12,43 s, excluindo Chromium, Piper e FFmpeg. Browser/RSS de subprocessos indisponíveis no namespace deste host. O coletor CDP da captura reportou CPU 0: **valor inválido para estimar consumo**, não custo zero. A versão final normaliza esse caso para `null`; apenas telemetria mudou após a captura, sem mudança audiovisual.
- Host de teste: Linux x86-64, CPU identificada como AMD EPYC 9V74, memória visível ~9,7 GiB, WebGL por SwiftShader sem GPU dedicada. Não é benchmark do computador do operador. Evidência produzida em container isolado com opt-in de Chromium sem sandbox; padrão de operação mantém sandbox.
