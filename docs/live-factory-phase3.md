# Live Factory 3.0 — primeira entrega vertical

## Auditoria em 2026-10-15

HEAD principal auditado: `a235a4efe418504907e8f187a19478bfd933ec2d`, merge do PR #10, sem commits posteriores no início. PR #9 (merge `63fb8d8`) criou o runtime; PR #10 (`9cc7579`) adicionou editor, regras, Canvas/WebAudio e OAuth. Ambos estão incorporados. O vídeo citado pelo proprietário não estava disponível nesta sessão; não foi analisado nem copiado.

Reutilizados: `live-factory.mjs` (único runtime, lease, heartbeat, fila e sessões); `store.mjs` (CAS SQLite/PostgreSQL por workspace); `app.mjs` (autenticação e isolamento); editor de personagem, `LiveStage`, `liveScene`, navegação e Conexões. `video-production.mjs` já usa Sharp, FFmpeg/ffprobe e subprocessos limitados para clipes. O encoder contínuo precisa de ciclo e watchdog próprios, por isso é um consumidor local do estado do mesmo runtime, não um segundo cérebro. Nenhuma dependência npm nova.

TikTok Afiliados e marketing preparam conteúdo, não autorizam LIVE. `tiktok.mjs` mantém Login Kit, state de uso único, AES-GCM e identidade verificada; publicação, transmissão e eventos continuam independentes. Astra usa `strategy.mjs`, controles de orçamento e agentes compartilhados: esta entrega não acrescenta chamada de modelo, reserva de IA ou sistema financeiro paralelo.

Ambiente de validação: Node 24, FFmpeg e ffprobe disponíveis, Sharp existente, CPU Linux sem GPU. A hospedagem real não foi provisionada ou presumida capaz de executar encoder. O frontend estático/Vercel sozinho não executa este worker. Nenhuma credencial TikTok/stream key foi utilizada.

## O que funciona

- Seed Snake: dois personagens identificáveis, autonomia determinística, movimentos, colisões simultâneas, sementes, pontuação, empate/vitória/derrota, ranking e reinício de rodadas após 3 s. Template registrado com interfaces `configure/create/advance/event`, separado dos renderers.
- O scheduler existente continua a cada 2 s; avança passos de 200 ms, com catch-up máximo de 25 passos e 30 snapshots para apresentação contínua atrasada 2,5 s. Não existe física no encoder ou chamada de IA por frame.
- Configuração versionada de jogo: dois nomes, cenário do editor existente, rodadas de 15–180 s; até cinco experiências existentes, persistidas. O editor completo do Lume permanece. Os dois avatares do jogo têm nomes/cores próprios; personalidades e regras independentes completas por jogador são próximas etapas.
- Eventos de teste autenticados: desafio pede uma curva segura para o primeiro personagem; comemoração concede um ponto. Origem SIMULATED_OPERATOR explícita, ID, horário, dedup, sessão, prioridade e limites existentes. Rodadas geram histórico INTERNAL_GAME. Não são espectadores nem presentes reais.
- Worker explícito: SVG original rasterizado por Sharp → RGB 360×640, 15 fps → FFmpeg H.264 + PCM local sintetizado → AAC → RTMP/RTMPS ou MP4 de prévia. Sem navegador/GPU. Áudio segue o mesmo relógio da imagem, com volume/mute persistentes. O jogo funciona sem som. TTS não implementado.
- Painel cria/configura/inicia/pausa/encerra, mostra jogo e telemetria, baixa autorização restrita à experiência e revoga worker. Fechar painel não encerra o worker. Computador e backend precisam continuar ativos.

## Operação local

1. Instale Node 24 e FFmpeg/ffprobe por fonte oficial; clone o repositório e execute `npm ci --prefix server`.
2. Backend/frontend devem estar na versão desta PR. Localmente: `npm ci --prefix frontend`, `npm run build --prefix frontend`, `npm start --prefix server`. Abra `http://localhost:5000/agentes/live`.
3. Crie experiência, abra **Jogo**, escolha nomes/duração e salve. Em **Personagem**, ajuste cenário/volume. Inicie teste; confira movimento, eventos e histórico.
4. Em **Transmissão**, escolha **Somente prévia local**, baixe `hubloan-worker.json`. O arquivo contém uma credencial temporária: não compartilhe, não faça commit. No Linux/macOS: `chmod 600 hubloan-worker.json`. No Windows, restrinja a ACL ao usuário do processo.
5. Execute na raiz do repositório:

```sh
node server/live-worker/worker.mjs --config hubloan-worker.json --seconds 30 --output previa.mp4
ffplay previa.mp4
```

6. Confira imagem e som. Após o encerramento, gere nova autorização, agora **Envio ao destino autorizado no computador**. Edite SOMENTE o arquivo local: `destination` deve conter URL RTMP/RTMPS completa incluindo stream key, fornecida pelo destino; `authorizedDestination` deve ser `true`. O destino não é enviado ao backend ou navegador. Não use endpoints encontrados aleatoriamente.
7. Inicie explicitamente:

```sh
node server/live-worker/worker.mjs --config hubloan-worker.json --transmit --seconds 1800
```

8. Acompanhe **Enviando mídia** e confirme recepção nas ferramentas do destino. O HubLoan mantém **transmissão pública não confirmada**. Encerre com Ctrl+C, revogação no painel ou emergência. Para outra sessão/worker, obtenha nova autorização.

O backend exige HTTPS, exceto loopback local; redirecionamentos são recusados para não encaminhar credencial. Não use URL de frontend estático como backend. O download usa o backend configurado pelo frontend. Subpaths de API além de `/api/agents` não são suportados.

RTMPS ativa verificação TLS. RTMP não criptografa transporte; use apenas onde explicitamente permitido e preferencialmente em teste local. FFmpeg recebe o destino em argumentos do processo; outros usuários privilegiados da mesma máquina podem vê-lo. Execute em máquina confiável, sem gravar comandos/configuração em logs ou transmitir tela que mostre a chave. O worker descarta stderr do encoder por poder conter segredos; erros públicos são sanitizados. A chave permanece no arquivo local e deve ser removida ao terminar. Arquivo `.lock` impede dois processos usando a mesma configuração; após queda abrupta, confirme que não há encoder antes de remover um lock abandonado.

## Segurança e estados

Autorização de worker: segredo aleatório de 256 bits, apenas hash persistido; vinculada a um workspace, experiência, sessão e modo, com prazo máximo de 30 min. Não aceita credencial para controlar outras rotas, não recebe código de acesso do workspace. Uma instância por autorização; troca após perda exige nova autorização humana. A rotação aguarda confirmação de parada ou janela de segurança de 10 s. Autorizar envio no painel não dispara processo nem escolhe destino: também exige execução local `--transmit` e destino autorizado.

| Estado | Evidência / limite |
|---|---|
| READY | Autorização emitida; processo ainda não comprovado |
| STARTING | Worker autenticado iniciou preparação |
| PREVIEW | FFmpeg reportou frames para arquivo local |
| SENDING_MEDIA | FFmpeg reportou frames na saída RTMP; não confirma recepção pública |
| STOP_REQUESTED | Revogação solicitada; aguarda reconhecimento |
| STOPPED | Worker relatou encerramento ou autorização não tinha instância ativa |
| DEGRADED | Heartbeat do worker expirou; autorização revogada |
| ERROR | Worker relatou interrupção; nova autorização necessária |
| publicStatus UNCONFIRMED | Sem API confiável de confirmação da plataforma |

Telemetria é declaração do worker autorizado, não prova independente de TikTok. Nenhum estado encoder conectado/publicamente confirmado é fabricado. O teste usa receptor independente e decodificação como evidência técnica.

Heartbeat do worker a cada 2 s, fetch máximo 3 s; primeira falha encerra conservadoramente, sem reconnect automático. Watchdog encerra se encoder não avança por 8 s ou backend sem contato por 7 s; SIGTERM seguido de SIGKILL após 3 s. Backend marca degradação após 10 s enquanto runtime está ativo. Pausa congela jogo e mantém mídia da cena pausada; emergência revoga e encerra sessão. Uma máquina travada pode não responder ao painel: confirme encerramento também no destino. OBS/LIVE Studio externos não recebem revogação automática.

Limites: 30 min, 360×640/15 fps, encoder e Sharp com um thread de processamento configurado, escrita com backpressure, um FFmpeg por processo, histórico e filas limitados. Medidas de RSS/CPU do renderer e bytes codificados no relatório final; bytes codificados não equivalem a tráfego de rede. Para isolamento rígido de CPU/RAM use limites do sistema/container; esta fase não instala serviço nem processos ilimitados em background.

## TikTok e alternativa assistida

Login Kit autoriza identidade; Content Posting API publica conteúdo; nenhum dos dois concede stream key ou eventos LIVE. O operador precisa verificar elegibilidade/acesso LIVE na própria conta e disponibilidade de destino externo. Se TikTok fornecer URL e chave autorizadas, o worker aceita o destino completo. Se não fornecer, use LIVE Studio ou OBS assistido: captura da janela da cena 9:16 e áudio do navegador/sistema, teste de gravação, início manual nas ferramentas oficiais. Nesse caminho a página deve permanecer aberta. Não há controle remoto OBS implementado.

Não foi verificado acesso de parceiro a eventos LIVE/comentários/presentes. O adaptador continua **não suportado**; não há biblioteca não oficial, endpoint inventado, audiência, presente ou receita simulada. Nenhuma transmissão real no TikTok foi validada. Fontes oficiais consultadas em 2026-10-15:

- https://developers.tiktok.com/docs/en/login-kit-overview
- https://developers.tiktok.com/docs/en/content-sharing-guidelines
- https://www.tiktok.com/live/studio/help (índice oficial recuperado: acesso, fontes, preparação; páginas detalhadas bloquearam acesso automatizado)
- https://support.tiktok.com/ (suporte oficial informa LIVE Studio/OBS para LIVE pelo computador; acesso depende da conta)

## Astra, custos e próximos passos

Astra mantém sugestões revisáveis existentes. Regras locais supervisionam heartbeat, limites e transições de rodada, com registros para revisão humana. Não há decisão generativa nem início público autônomo. Planejar/preparar/testar/autorizar são do operador; observar/transição/encerramento por falha são determinísticos. Relatório técnico do worker e histórico são insumos; aprendizado automático entre lives e seleção autônoma de experiências ficam pendentes.

| Modo | Requisitos | Custos e limites |
|---|---|---|
| Local, implementado e testado | Computador ativo, Node/FFmpeg, backend persistente e rede | Sem serviço novo pago. Energia/CPU/internet desconhecidos; não opera se computador dorme |
| Hospedado, mesmo CLI possível mas não provisionado | VM/container sempre ativo, FFmpeg/Sharp, saída RTMP, armazenamento e limites CPU/RAM | Sem GPU obrigatória; preço depende do host, não estimado em moeda. Não adequado a frontend estático ou função efêmera |

IA confirmada nesta entrega: zero chamadas / custo de API zero. Rede estimada pelo teto configurado de vídeo+áudio: ordem de 350–450 MB/h, antes de variação/overhead; sessões limitadas a meia hora. Valores efetivos dependem da cena, rede e provedor. CPU/RAM medidos no teste não garantem capacidade em outro computador. Audiência, receita e lucro continuam desconhecidos.

Próximos passos: validar conta TikTok autorizada e requisitos de bitrate/resolução do destino; teste prolongado e de rede; perfis 720×1280/30 fps após medir CPU; confirmação oficial/receptor externo autenticado; múltiplos personagens com regras completas; duplicação/versões de experiências; novos plugins de jogo; direção Astra com orçamento explícito. A entrega é vertical, não a totalidade da plataforma autônoma 3.0 nem aprovação de produção.

## Evidências e reprodução

`server/tests/live-stream.test.mjs` inicia backend real isolado, jogo, worker e receptor FFmpeg em RTMP loopback; recebe 18 s, verifica H.264/AAC, decodifica inteiro, compara frames em movimento e PCM não silencioso. Interrompe encoder e verifica erro persistido. Testes adicionais cobrem isolamento, token, modo, concorrência, revogação, dedup, limites, rodada e pausa. Suites anteriores cobrem SQLite após reabertura, OAuth e controles existentes.

```sh
npm test --prefix server
npm run build --prefix frontend
cd frontend && npx eslint src/features/agents
```

Para preservar nova evidência, execute na raiz:

```sh
LIVE_EVIDENCE_DIR=/caminho/privado/evidencia node --test server/tests/live-stream.test.mjs
```

FFmpeg ausente faz apenas o teste audiovisual pular explicitamente; isso não atende ao aceite de transmissão. Nesta execução nenhum teste foi pulado. Evidência incluída: [relatório](live-factory-evidence/rtmp-report.json), [vídeo recebido](live-factory-evidence/rtmp-received.mp4), [frame extraído](live-factory-evidence/rtmp-frame.png). O MP4 é remux do FLV recebido via RTMP, não uma captura direta do renderer. Receptor registra EOF/I/O ao publicador desconectar; a mídia recebida foi decodificada e validada. Não equivale a teste de longa duração ou transmissão pública.
