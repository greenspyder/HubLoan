# Live Factory 3.2 — O jardim do Lume

## Auditoria

Base: master `3314bc02ee93dae88a5d7b3d9c04cee8858851e3`, merge do PR #12, verificada por fetch e metadados do GitHub em 15/10/2026. PR #11 já incorporado. Inspecionados jogo, runtime, snapshots, broadcast, renderer, mixer, TTS, persistência, avatares, painel e controles. A gravação recebida do PR #12 foi inspecionada por quadros extraídos: corpos em blocos, alimento como pontos pequenos, espaço vazio e sobreposição de legendas/ranking sobre o jogo. O código usava snapshots discretos e alternava o alimento-alvo a cada passo. Não houve escuta humana/automática completa do vídeo nesta sessão.

## Mudanças integradas

- O jogo existente conserva passos de 200 ms, snapshots limitados, pontuação e rodadas. Busca em largura encontra uma maçã alcançável; na falta de caminho, procura área livre. Nenhum LLM controla movimentos. Três pedras visíveis são obstáculos reais, além de paredes/corpos. O editor explica as regras. Alimento nasce fora de obstáculos/corpos; comer aumenta corpo/pontuação; colisão encerra a rodada. Nascimentos variam por rodada.
- Um compositor SVG puro compartilhado em `frontend/src/shared/live-visual.mjs` substitui a duplicação visual Canvas/worker. Interpolação limitada entre snapshots da mesma rodada/fase; não extrapola nem altera física. Cabeça gira pela menor transição angular, corpo segue o caminho com curvas, olhos piscam, boca e alimentação animam, pontuação sobe, colisões geram partículas e encerramento tem transição/contagem/confetes.
- Direção original de jardim: maçãs vermelhas com folha, rochas, cores consistentes, sombras discretas e folhas com balanço. Não foram copiados assets/personagens da live de referência.
- Composição 9:16: apresentador no topo, placar, tabuleiro central, cartão de fala e faixa própria da comunidade. Legendas e avatares não cobrem o tabuleiro. Top 6 reutiliza estado persistido: entradas/saídas, braços animados, coroa e deslocamento entre posições. Fotos seguem validação anterior e fallback; nenhuma URL é buscada.
- O mixer existente fornece RMS e posição do segmento PCM efetivamente misturado. Boca abre conforme energia real da fala, fica fechada no silêncio/fallback e durante narração secundária. Versos têm balanço baseado na posição de reprodução, mais nota musical; não se afirma canto melódico nem sincronização fonética. O jogo continua sem falas/presentes.
- Mesmo encoder, autorização, watchdog, emergência e mixer. Perfil `light` 360×640/15 fps continua padrão; `smooth` usa 30 fps e 1.600 amostras PCM por frame (48 kHz), mesmo relógio de mídia. Telemetria inclui tempo máximo de renderização, frames atrasados e atraso acumulado; atraso superior a 2 s interrompe com erro em vez de continuar acumulando latência. Não há retomada pública automática.

## Prévia e operação

O Canvas usa o mesmo desenho e interpolação, mas não recebe PCM/posição de fala do worker. Isso é indicado na interface; não se fingem vozes ao vivo. A prévia fiel é o MP4 do mesmo worker, reproduzível na seção Experiência pelo seletor local de arquivo (sem upload). Backend deve continuar ativo.

1. Configure Seed Snake, personagem e áudio; inicie a sessão.
2. Em Transmissão, baixe autorização de **prévia**, proteja com `chmod 600 hubloan-worker.json`.
3. Com Node 24, FFmpeg/ffprobe, dependências existentes e eSpeak NG instalado:

```sh
node server/live-worker/worker.mjs --config hubloan-worker.json --seconds 66 --profile smooth --output previa.mp4
```

4. Abra o MP4 no painel e confira imagem/som. Em máquinas limitadas, use `--profile light`. Confira relatórios, não apenas FPS configurado.
5. Para enviar RTMP/RTMPS, obtenha nova autorização de envio e configure o destino autorizado localmente conforme [fase 3](live-factory-phase3.md). Nunca faça commit do arquivo com credenciais.

720×1280 não foi liberado: ainda exige medir CPU e qualidade prolongada. Limite de 30 minutos, permissões TikTok e bloqueio de eventos reais permanecem. Não houve chamada paga, serviço novo obrigatório, merge ou deploy de produção. Docker copia somente o compositor compartilhado adicional; não inicia worker automaticamente.

## Validação e limites de avaliação

A primeira tentativa a 30 fps falhou no critério de duração recebida. Um padrão SVG repetido consumia tempo desproporcional: benchmark isolado caiu de ~27,7 para ~12,4 ms/frame ao remover essa textura. Ela foi removida; efeitos e personagens permaneceram. Isso ilustra por que FPS nominal não é prova de fluidez.

Reprodução:

```sh
npm test --prefix server
npm run build --prefix frontend
(cd frontend && npx eslint src/features/agents src/shared src/app/App.tsx vite.config.ts)
LIVE_VISUAL_EVIDENCE_DIR=/caminho/evidencia node --test server/tests/live-performance.test.mjs
```

O último comando usa receptor RTMP independente, 66 segundos e perfil smooth, comenta, presenteia, carrega retrato original de teste e verifica áudio/vídeo decodificados. Requer eSpeak NG/FFmpeg; skip não atende ao aceite. Os testes novos verificam perseguição/crescimento/colisão, minuto autônomo sem congelamento maior que a pausa de rodada, interpolação sem mutação/transição indevida, envelope de áudio, composição, avatares, limites e erro deliberado do renderer. Testes anteriores preservam auth, isolamento, dedup, persistência e falha do encoder.

A avaliação visual usa contato de quadros ao longo do vídeo e sequências próximas para movimento/alimentação/fala. Não é uma avaliação perceptual contínua com escuta. O MP4 é entregue para revisão humana; não se afirma retenção de espectadores ou qualidade comercial comprovada. A voz continua eSpeak, a criatividade continua determinística, e presentes/participantes continuam simulação explícita. Comentários longos são limitados a quatro linhas; nomes do Top 6 são abreviados na faixa pequena. Próximo passo: ensaio humano de legibilidade/ritmo/voz em celular, antes de transmissão pública.

## Resultado observado

- 168 testes de backend aprovados, nenhum skip/falha. Build e ESLint aprovados; aviso preexistente de bundle >500 KB permanece. Teste adicional de 66 s aprovado no perfil smooth.
- Receptor: 66,026 s, 1.980 frames, H.264 360×640/30 fps + AAC; decodificação integral aprovada. Correlação do áudio recebido com PCM do mixer: 0,99697. Cinco rodadas; seis sínteses (1 comentário, 3 falas, 2 versos), zero falhas TTS e zero chamadas de IA.
- Worker: ~231 MB RSS, ~37,53 s CPU do processo (exclui encoder), 6.471.014 bytes codificados; 10 frames excederam seu orçamento individual, pico 266 ms, recuperados até completar 1.980 frames em 66 s. Não significa desempenho garantido em qualquer máquina nem teste prolongado. O guard adicional de atraso acumulado foi validado na suíte final; a captura foi feita imediatamente antes dessa proteção, com compositor/pipeline equivalentes.
- Avaliação por quadros em intervalos de 6 s e sequência a cada 200 ms: maçãs reconhecíveis, caminho intencional, corpo crescendo e curvas, expressões de fala, ranking com retrato e transições de rodada legíveis. O tabuleiro continua visível enquanto a cobra fala. A sequência 2–3 s mostra aproximação, consumo e mudança de direção, e o teste de interpolação verifica também posições intermediárias.
- Limites visuais: a faixa Top 6 ainda tem nomes pequenos/abreviados; precisa de revisão em celular real. Os primeiros segundos têm corpos curtos por regra, depois crescem. Há pausas legítimas de até 3 s entre rodadas. Não foi feita escuta completa nem avaliação de retenção de público. A apresentação visual é mais clara que a 3.1, mas a voz sintética e o repertório determinístico continuam limitações do espetáculo.

[Gravação recebida por RTMP](live-factory-evidence/phase32/performance-received.mp4) · [relatório](live-factory-evidence/phase32/performance-report.json) · [quadros ao longo do vídeo](live-factory-evidence/phase32/phase32-contact.jpg) · [sequência de movimento](live-factory-evidence/phase32/phase32-motion.jpg). O último espaço preto da folha de contato é uma célula vazia, não um frame preto da transmissão.
