# Live Factory 4.1 — Entertainment Director

## Base e auditoria

Base: commit `008cdda`, PR #14 (4.0), ainda aberto na auditoria. A master `05634c6` contém a 3.2/PR #13. Este PR é dependente da branch `codex/live-factory-3d`; não integra nem publica a 4.0 automaticamente.

Auditados jogo, runtime, renderer Three.js, captura Chromium, PCM/mixer, Piper, performance, avatares e prova RTMP 4.0. A gravação anterior tinha personagens distantes, câmera quase fixa, apresentador isolado, legenda genérica permanente e ranking pequeno. O gargalo anterior de HD foi ~186 ms/frame em software WebGL. Permanecem os mesmos runtime, encoder, autorização temporária, watchdog, pausa, revogação, isolamento e limites de sessão.

## Implementação

`server/live-director.mjs` é estado de apresentação por sessão, sem relógio próprio, rede ou alterações no jogo. Consome snapshots interpolados no tempo de mídia do worker. Reconhece aumento real de pontuação, morte, resultado, disputa por alvo, mudança de direção adjacente a pedra (desvio, não colisão inventada), ranking e PCM de fala. Prioridade: resultado > colisão > comunidade > risco > disputa > fala > alimentação. Intervalo mínimo entre decisões: 3,5 s; cooldowns por categoria: 6–14 s. Depois do destaque há Recovery antes de Follow. Overview abre a sessão; Close-up acompanha fala; Action destaca busca/disputa; Celebration destaca resultado/comunidade. Contadores são incluídos no relatório do worker.

A câmera interpola posição e alvo, ajustando distância à separação entre cabeça e alimento. Os personagens ganham cabeça maior, olhar direcionado e sobrancelhas expressivas. O apresentador aparece durante fala/reação, acompanhando visualmente a ação; não ocupa permanentemente o palco inferior. Boca usa RMS do PCM do mixer existente, não a hora de solicitação de TTS. Ranking compacto expande durante a aparição de avatares. Legenda genérica permanente removida. Overlays administrativos não entram na cena.

Maçã dourada opcional: desativada por padrão; disponível a cada 3 ou 5 novos alimentos gerados. Vale dois pontos e dois segmentos (segundo segmento no próximo movimento sem alimento). Posição usa a geração determinística existente, acessível igualmente às duas cobras; presentes não alteram essa regra. Editável com sessão encerrada no editor existente. Falas autônomas sobre alimentação e resultados reais têm cooldown mínimo de 12 s, variação e memória recente. Empates não são narrados como derrota.

No mixer original, desvio junto à pedra reduz brevemente a trilha e acrescenta acento sonoro curto. Nenhum novo mixer, runtime, encoder, dependência ou chamada paga.

## Operação e prévia fiel

Instalação e variáveis de Chromium/Piper/FFmpeg continuam em [fase 4](live-factory-phase4.md). Configure jogo e performance no painel, inicie o runtime e baixe autorização de prévia. No computador do operador:

```sh
node server/live-worker/worker.mjs --config hubloan-worker.json --seconds 120 --renderer three --voice neural --profile light --output previa.mp4
```

O MP4 usa o mesmo renderer e mixer do RTMP. Abra-o no controle de amostra do painel. O Canvas continua explicitamente 2D de referência, sem equivalência ao worker. Só transmita com destino autorizado e autorização de modo stream; envio de mídia continua distinto de confirmação pública.

## Voz e limites

Mantido Piper `pt_BR-faber-medium`, um locutor, CPU, modelo ~63 MB, português brasileiro, com fallback eSpeak. Host/bright/deep mudam ritmo; não são três locutores neurais treinados. Frases com pontuação emocional não equivalem a controle neural de emoção. Não há ferramenta de escuta nesta execução: naturalidade, pronúncia e melhoria perceptual exigem revisão humana dos arquivos. Não substituí o modelo sem evidência auditiva. Fala ritmada continua sem canto melódico.

Perfis light (360×640/15), smooth (360×640/30) e HD experimental (720×1280/30) preservados. Não se promete 30 fps/GPU com base em testes de software. Nenhum custo de API; CPU, energia, tráfego e hospedagem têm custo variável desconhecido. TikTok LIVE requer endpoint autorizado; comentários/presentes reais continuam sem adaptador oficial validado. Comunidade da prova é explicitamente simulada, retrato original de teste.

## Validação e avaliação

Resultados e avaliação da gravação são registrados abaixo após execução. A inspeção de quadros não equivale a assistir e ouvir a gravação inteira. Validação artística final em celular permanece humana.

### Resultado medido

- Prova final: `phase41/performance-received.mp4`, 126,101 s, 1.891 frames, 360×640/15 fps, H.264/AAC, receptor FFmpeg independente e decodificação integral. Correlação AAC recebido/PCM: 0,995409. O worker encerrou normalmente; confirmação pública permanece UNCONFIRMED.
- Oito rodadas reais; 10 destaques de alimentação, sete disputas, cinco falas, uma mudança de comunidade e seis resultados selecionados pelo diretor. Não houve cue de quase colisão nesta gravação: a tensão demonstrada é disputa real pelo mesmo alimento. O desvio junto à pedra foi validado em teste determinístico e no PCM.
- 11 sínteses Piper, três cache hits, zero fallback/falha/descarte; 14 segmentos reproduzidos (11 host, um comentário, dois versos). Síntese máxima 256 ms; latência máxima até reprodução 937 ms. Nenhuma chamada LLM. Eventos sociais do operador limitados ao começo; o restante segue autonomamente.
- 86 frames ultrapassaram o orçamento individual; atraso acumulado máximo ~450 ms, recuperado. Nenhum frame descartado pelo worker, que usa backpressure e encerra em sobrecarga. Não confundir essa métrica com perda de rede, indisponível.
- Node RSS ~247 MB e CPU ~14,54 s, excluindo subprocessos. CPU/RAM do Chromium/Piper/FFmpeg e GPU não mensuráveis aqui. Host: nove CPUs visíveis AMD EPYC 9V74, ~9,7 GiB RAM, software WebGL. Não é requisito mínimo certificado. Modelo de voz ~63 MB, CPU com duas threads; nenhum hardware do operador/GPU foi testado.
- Benchmark isolado, 35 frames após aquecimento: 360×640 média 51,5 ms/p90 55,9 ms; 720×1280 média 190,3 ms/p90 204,3 ms. Ambos acima do orçamento de 33,3 ms: **30 fps não aprovado neste ambiente**.
- Suíte completa: 175 aprovados, zero falha/skip; mais dois casos novos passaram posteriormente (177 testes distintos). Revalidação final focada: nove aprovados, incluindo enquadramento em 30 snapshots sucessivos, WebGL, Piper, diretor e mixer. Build e ESLint aprovados; aviso preexistente de bundle >500 KB. Testes anteriores cobrem persistência, isolamento, grants, deduplicação, limites, renderer/encoder interrompidos e emergência.

Reprodução da prova (com dependências locais configuradas):

```sh
LIVE_3D_EVIDENCE_DIR=docs/live-factory-evidence/phase41 node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
node --test --test-concurrency=1 server/tests/*.test.mjs
npm run build --prefix frontend
cd frontend && npx eslint src/features/agents src/shared src/app/App.tsx vite.config.ts
```

### Avaliação crítica visual e auditiva

Inspecionados `contact.jpg` (12 quadros distribuídos a cada dez segundos), `motion.jpg` (seis quadros espaçados em 200 ms) e a comparação com o contact sheet 4.0. A primeira captura 4.1 revelou cabeça junto à borda; antes da prova final foi adicionado ajuste de enquadramento por projeção dos pontos de cabeça/alimento. Testes adicionais verificam os limites após movimentos e rodadas, sem modificar o jogo.

A câmera agora acompanha posições distintas e alterna escala; a cabeça/faces são perceptivelmente maiores que na 4.0. A sequência curta mostra avanço contínuo e corpo seguindo curvas, sem salto evidente nesses quadros. Maçãs vermelhas/douradas, crescimento, placar, partículas e vencedores comunicam acontecimentos. O líder com foto de teste aparece na faixa superior; ranking se recolhe. Apresentador olha na direção do protagonista e a boca é acionada pelo PCM, mas a inspeção estática não certifica lip-sync perceptual.

Limites: 15 fps e serrilhado ainda visíveis; alguns planos cortam partes periféricas da arena/adversário, privilegiando protagonista/alimento. Expressões do jogador são mais legíveis, mas discretas; a apresentação ainda gira em torno de alimentação e rodadas semelhantes. A composição não foi validada com a interface real TikTok sobreposta e pequenos textos/rodapé podem perder contraste sobre partes claras. Não foi medido interesse ou retenção de público, nem assistido/ouvido o vídeo inteiro por ferramenta audiovisual.

As amostras `voz-alegria.wav`, `voz-surpresa.wav` e `voz-frustracao.wav` foram sintetizadas com o mesmo modelo pt-BR, sem fallback. `voice-review.json` registra textos/tempos e revisão auditiva pendente. Não afirmar que a voz é natural, que emoções estão convincentes ou que houve melhoria perceptual de voz nesta fase. Revisão humana com som no celular é a próxima etapa. Não foi implementada nova Astra generativa, cenário temporário/obstáculo variável, integração de eventos TikTok real ou validação de transmissão prolongada. Esta entrega melhora direção e legibilidade; não certifica todo o objetivo artístico/comercial.
