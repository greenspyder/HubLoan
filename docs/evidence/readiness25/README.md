# Production Readiness 2.5 — correções verificadas, aceite audiovisual parcial

## Auditoria inicial
Trabalho iniciado em `094c7d1edb8d2ba36e58e9048788b920d3122434`, branch `codex/viral-audiovisual12`. Produção: `master` em `07a539e856fed6196a2344c547b1385a657cfc5e`. Árvores idênticas; a diferença era o merge. Nenhuma funcionalidade integrada foi descartada.

Vercel: `frontend/vercel.json` encaminha `/api/agents` ao Render e desabilita deploy automático da branch de trabalho. Render: Dockerfile inicia `server/index.mjs`, inclui FFmpeg, não inclui pesos Kokoro/Chatterbox nem eSpeak. Configurações privadas do dashboard Render/Vercel não estão acessíveis; não foram alterados segredos ou planos. A versão anterior foi comprovada em produção na tarefa precedente. A saúde agora expõe versão e SHA `RENDER_GIT_COMMIT` quando disponível, sem inventar um SHA se a variável não existir.

| Componente | Implementado e verificado | Pendência |
|---|---|---|
| Voice Studio | Perfil global, aprovação, catálogo remoto, separação local/nuvem, bloqueio preventivo de arquivos ausentes | Ouvir/aprovar áudio real ElevenLabs |
| ElevenLabs | Transporte compartilhado, cotas, cache, limites, diagnósticos; testes controlados | Credencial própria acessível do workspace + consumo autorizado |
| Higgsfield | Adaptador de imagem Soul v2, estimativa, jobs, persistência; testes controlados | Geração real; vídeo premium não implementado |
| Astra | Campanha persistente, cinco propostas por modelo, plano validado, orçamento, fila | Modelo não conectado no ambiente de teste |
| Viral Factory | Renderizadores locais e motor vocal compartilhado preservados | MP4 multimodal premium ponta a ponta |
| Live Factory | Prévia real local codificada; continuidade sem voz; filas/fallback testados | Narração neural, latência real ElevenLabs e música importada não validadas nesta prévia |

## Bugs corrigidos
1. Amostra local ausente: botões desabilitados antes da requisição; opções não instaladas explicitamente indisponíveis. Cloud e local têm seções distintas. Nenhum download automático de pesos.
2. Diagnóstico remoto: `VOICE_NOT_FOUND` difere de `VOICE_REMOTE_MODEL_INCOMPATIBLE`, mantendo códigos próprios para configuração, autenticação, cota, timeout e síntese.
3. Inicialização local: falha do subprocesso não impede a criação do caminho de fallback quando este foi explicitamente permitido para continuidade live.
4. Estimativa Higgsfield: null, vazio, boolean e campos ausentes não viram US$0. Custo desconhecido continua bloqueado para geração de imagem.
5. Jobs Higgsfield `failed/nsfw/canceled` persistem como estados terminais, não como polling infinito. Não são reenviados automaticamente; reservas conservadoras não são liberadas sem reconciliação.
6. Mixer: silêncio inserido após falha de TTS não conta como fala reproduzida, não gera `firstSpeech`, não cria apresentação de fala e não infla latência de reprodução. Gameplay continua.
7. Erros estruturados de orçamento são preservados na rota Voice Studio.

## Evidências reais
- `live-continuity.mp4`: prévia local real de 8 segundos, 360×640, 64 quadros, encoder STOPPED, decodificação integral FFmpeg; hash e streams em `live-report.json`. Inspeção visual em `live-frame.jpg`. Não houve transmissão pública. Gameplay/efeitos continuaram sem modelo neural ou eSpeak. Nenhuma fala foi produzida, nenhuma trilha importada foi validada. Não é demonstração artística nem produção autônoma da Astra.
- Execução Astra `c487419c-a0e6-44cd-8212-b1039d1049fe`: briefing genérico, sem roteiro manual; **Failed / MODEL_NOT_CONNECTED**. Persistência reaberta (`execution.json`, `persistence.json`). Não substituímos a falha por vídeo manual.
- Browser real: amostra indisponível bloqueada antes de chamar API, aprovação bloqueada, estados de conexão reais, sem overflow em 390/1440px, screenshots em `ui/`.

## Testes
Backend: **289 testes, 280 passaram, 0 falhas, 9 ignorados** (`backend-tests.txt`). Inclui regressões existentes de voz, campanhas, autenticação, isolamento, persistência, mixer e câmeras; não equivale a testes neurais/RTMP ignorados.
Build frontend aprovado e lint do componente alterado aprovado (`build.txt`, `lint.txt`). Lint global tinha pendências fora deste escopo registradas em 2.4; não é declarado aprovado. Sintaxe/backend exercitados pela suíte Node.
Novos testes cobrem custo desconhecido, diferenciação modelo/voz, job terminal sem reenvio, falha de inicialização e silêncio não contado como narração. Mocks são usados somente nesses testes de contrato, nunca como prova de API real.

## Custos e bloqueios
Zero chamadas de geração premium executadas nesta tarefa; nenhum crédito de ElevenLabs/Higgsfield foi gasto por este trabalho. Não há credenciais runtime do workspace do usuário acessíveis nesta sessão. Os conectores ChatGPT não autorizam o backend e não comprovam cotas da conta runtime. Não presumimos plano/créditos nem solicitamos segredos no chat.

A entrega funcional é parcial: aguardam credenciais e autorização a síntese real, escuta oficial da Lume, geração Higgsfield e teste multimodal. Vídeo premium Higgsfield, revisão visual automática efetiva e edição/reexecução parcial de cenas continuam pendentes de implementação; cache evita repetir assets idênticos, mas não representa um editor de cenas completo. Nenhuma nova voz foi aprovada automaticamente. Nenhuma métrica demonstra viralidade ou qualidade artística.

Merge/deploy autorizados abrangem estas correções compatíveis e testadas; não significam aceite audiovisual completo. SHAs e verificação dos endpoints publicados serão informados na entrega após implantação.

Fontes oficiais reconsultadas: https://elevenlabs.io/docs/api-reference/models/list ; https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md ; https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference . Não foram inventados endpoints, preços ou modelos.
