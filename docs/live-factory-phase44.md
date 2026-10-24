# Live Factory 4.4 — Lume no centro do espetáculo

## Base e auditoria

Auditado em 23/10/2026: não existe `main`. `master` permanece em 05634c6. PR #17 foi mergeada em `codex/live-factory-director`, commit 74e21af. Esta branch deriva desse merge; não implica atualizar master nem fazer deploy.

A captura documentada na PR #17 (código ff60d87) usa instrumentais de teste. O vídeo posterior `Lume-Brazilian-Sunsets-126s.mp4` usa realmente **Brazilian Sunsets — Ketsa**, com aprovação explícita do operador. Seu caminho importa o WAV de hash `ac907c95596fc433d14aea4ea76f00c833bd6dcc4a4c1bd16f18eea72250a3e5`, aprova o mesmo hash e seleciona esse ID no mixer; o receptor verifica correlação AAC/PCM. Os commits locais dessa integração, anteriormente entregues em bundle, foram recuperados nesta branch. Portanto a observação do operador e a descrição antiga da PR referem-se a gravações diferentes.

Inspeção da referência: frames distribuídos ao longo dos 126 s e frame nativo; decodificação integral de áudio/vídeo. Comparação direta do áudio decodificado com o WAV aprovado encontrou correlação máxima 0,99858 e 11 janelas acima de 0,95; confirma presença da faixa, não qualidade artística. Não houve audição humana nem reprodução audiovisual perceptiva completa. A inspeção anterior revelou presenter pequeno, espaço vazio, coroa sobre créditos e arena reconhecível. Não substituir essa limitação por aprovação artística automática.

## Implementado

- Reutilização de `advanceGamePerformance`, memória da Lume e `createDirector`: novos comentários contextuais sobre alvo próximo, disputa pelo mesmo alimento e curva ao lado de obstáculo. Intervalo mínimo 12 s; perseguição comentada somente após 24 s de silêncio. Nenhum participante ou presente gerado pela autonomia.
- Resposta curta antes do jingle, em vez de esperar o instrumental terminar. Sete falas previsíveis preparadas localmente antes do encoder; heartbeat continua durante preparação, cache limitado existente preservado. Falas preparadas não aguardam uma síntese dinâmica já em curso.
- Acento curto original no mixer confirma presentes elegíveis. Fala e jingle continuam seriais; música ambiente tem ducking. Prioridade especial, fade de interrupção, expiração e cancelamento mantidos.
- Latências independentes: primeiro efeito, primeira fala, primeira música, segmentos e conclusão de jobs completados. Jobs interrompidos não entram como completos. Métricas continuam calculadas a partir do evento, não do instante em que entrou na fila.
- Telemetria compacta e arredondada mantém heartbeat abaixo do limite existente de 2048 bytes. Até oito confirmações recentes por heartbeat; histórico de reprodução permanece apenas no relatório local. Corrigida rejeição detectada no teste inicial ao enviar o diário completo. Watchdog, limite de atraso de dois segundos e autenticação não foram relaxados.
- Apresentadora sempre visível, maior; cabeças/corpos do jogo ampliados, enquadramento estabilizado próximo ao centro da arena, variação lateral contextual discreta, diálogo deslocado para não cobrir o rosto, avatares afastados dos créditos e rótulo de simulação com contraste.
- Música utiliza duração restante para direção; instrumental não dispara direção de fala. Boca segue envelope vocal real, não fonemas. Instrumental mantém boca fechada.

## Voz e música

Kokoro `pf_dora` preservada, sem migração. O inventário oficial lista uma voz feminina pt-BR e duas masculinas; não há evidência de alternativa feminina melhor nesse conjunto. Piper Faber permanece como alternativa técnica já testada, não como substituição artística feminina. Naturalidade não aprovada por nós.

`voice-review.mjs` exporta seis situações e três leituras da mesma frase com warm/wry/excited. A diferença é velocidade/pontuação; não alegar controle emocional neural treinado. Requer modelo local e os mesmos requisitos de `kokoro_bridge.py`.

Fontes oficiais: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md e https://huggingface.co/hexgrad/Kokoro-82M/blob/main/README.md . Pesos Apache-2.0; preservar avisos ao distribuir modelos. Não incluídos neste pacote.

Brazilian Sunsets é ambiente instrumental licenciado CC BY 4.0, não funk original do HubLoan. Créditos na imagem e metadados preservados. Nenhuma faixa aprovada foi substituída. Playlist/crossfade/limite de três faixas continuam no mixer existente. Esta evidência possui uma única faixa ambiente aprovada: não comprova uma rádio brasileira variada. Jingles usados são fixtures instrumentais claramente identificadas. Canto real e repertório funk/pop dependem de arquivos autorizados e revisão humana; não houve chamada musical paga.

## Reproduzir

```sh
# Instalar dependências do repositório e ambiente local descrito na fase 4.2.
export HUBLOAN_CHROMIUM=/caminho/chrome-headless-shell
export HUBLOAN_KOKORO_MODEL=/caminho/kokoro-model
export HUBLOAN_KOKORO_PYTHON=/caminho/venv/bin/python
export HUBLOAN_TTS_BINARY=/caminho/espeak-ng
# Em host de teste sem GPU, se necessário:
export HUBLOAN_SOFTWARE_GL=1
# Não desabilitar sandbox em produção; opção existente serve apenas a container isolado.
mkdir -p docs/evidence/phase44
LIVE_ENTERTAINMENT_EVIDENCE=1 LIVE_EVIDENCE_PROFILE=cpu \
LIVE_APPROVED_AMBIENT_WAV=/caminho/brazilian-sunsets.wav \
LIVE_REPERTOIRE_EVIDENCE_DIR="$PWD/docs/evidence/phase44" \
node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
node server/live-worker/voice-review.mjs docs/evidence/phase44/voice
```

O cenário estendido dura 186 s; primeiros 30 s sem eventos sociais. Depois comentário e presentes simulados, foto genérica autorizada, Top 6 e duas variações de rosa. Receptor FFmpeg independente, decodificação integral e comparação de áudio; nenhum TikTok real é requisito do teste.

## Custos e limites

Zero APIs pagas, assinatura ou infraestrutura contratada. Instalação Kokoro CPU e pesos de aproximadamente 328 MB; total da RAM inclui processos externos não inteiramente medidos pelo RSS do Node. Teste software WebGL não estima desempenho de uma GPU. Meta 720×1280/30 FPS não validada; preservar perfis light/smooth/hd com watchdog e interrupção segura.

Revisão artística humana obrigatória para voz, humor, trilha e retenção. Sem alegação de audiência/receita ou integração oficial de eventos TikTok. Resultado técnico e classificação de validações em `docs/evidence/phase44/README.md`.

Validação de regressão: 198/198 testes backend antes do ajuste final do perfil (6/6 direcionados depois) com ambiente Piper/WebGL/eSpeak disponível, build frontend e lint do módulo aprovados. Uma tentativa inicial da nova captura foi interrompida pelo watchdog por FRAME_BUDGET_EXCEEDED durante processamento concorrente de mídia; não foi ocultada nem aceita como evidência completa. Log preservado para diagnóstico.

A tentativa isolada em light também excedeu o limite após cerca de 75 s: não atribuir tudo à concorrência. Adicionado perfil opcional CPU 360×640/8 FPS, sem alterar light/smooth/hd, qualidade dos materiais ou watchdog. A nova geometria/composição e software WebGL não sustentaram 15 FPS neste host; isso é regressão de capacidade observada neste ambiente, não meta atingida. Registro de reprodução da faixa foi corrigido também quando a música é o segundo segmento do job.

A tentativa intermediária de CPU a 10 FPS também falhou no watchdog aos 1794 frames (~179,4 s de mídia), atraso 2054 ms; não foi aceita. O fallback CPU foi reduzido para 8 FPS, mantendo as resoluções e perfis anteriores. Não apresentar este fallback como qualidade final de entretenimento.
