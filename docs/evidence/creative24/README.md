# Creative Studio 2.4 — entrega parcial, 12/11/2026

## Auditoria e continuidade
Base: `6b0328183fddc69dc8ddc77769d72b9a7e41179b`, branch `codex/viral-audiovisual12`. O remoto usa `master`, não `main`. A versão 2.2 já foi incorporada ao histórico de master; este trabalho continua na branch autorizada, sem merge, deploy ou publicação.

| Capacidade | Estado verificado |
|---|---|
| Campanhas, fila, checkpoints, isolamento, cancelamento/retomada | Existentes em 2.1; reutilizados |
| Creative Studio responsivo, revisão, player e gerador manual | Existentes em 2.2; preservados |
| Voice Studio, Kokoro, Chatterbox, renderizadores 3D | Código existente; modelos neurais indisponíveis neste ambiente |
| Visual Commentary e direção de humor multimodal | Ausentes na base; caminho experimental implementado nesta entrega |
| ElevenLabs/Higgsfield runtime | Adaptadores implementados e testados com transporte controlado; sem inferência real autenticada |
| Publicação autônoma | Não habilitada |

## Implementação
`media-providers/index.mjs`: contratos de fala/alinhamento e imagem, descoberta autenticada de vozes/modelos/cota ElevenLabs, síntese com timestamps, estimativa/submissão/status/cancelamento Higgsfield. Somente o adaptador documentado Soul v2 standard está implementado; não representa o catálogo inteiro. Vídeo e sound effects premium não estão integrados.

`multimodal-studio.mjs`: credenciais criptografadas por workspace, projeção pública sem segredos, revisão concorrente, limites diário/campanha, reservas persistentes e resultados reutilizados na mesma campanha. Envio de resultado incerto não é repetido automaticamente. Valores efetivamente cobrados permanecem desconhecidos; reserva não garante preço externo. Imagem exige estimativa válida antes do envio; fala exige cota verificável e autorização explícita de custo monetário desconhecido.

`commentary-campaign.mjs`: a fila existente solicita cinco propostas e seleção ao modelo, valida plano, congela perfil de narração e aguarda `AwaitingBudget`. Autorização vinculada à versão do plano libera uma produção. Máximo de seis operações externas; timeout de produção e polling limitado. Não há roteiro final escrito manualmente para demonstração.

`visual-commentary.mjs`: contrato fechado de cenas, beats setup/escalation/payoff, movimentos 2D, imagens, diagramas, círculos/setas, texto local, áudio por segmento e legendas a partir dos timestamps efetivos. Composição FFmpeg 360×640/15fps, decodificação integral, hash e proveniência. Intenções deadpan/documentary/etc. orientam o planejamento; não se afirma aplicação neural dessas intenções. Os controles de voz usados são apenas os suportados pelo modelo descoberto.

Frontend: seleção de modo, duração, plano recolhível, recursos estimados, autorização explícita; conexões reais, cotas consultadas, perfil de narração de teste e reservas em Studio avançado. Não altera a voz global da Lume nem habilita voz premium em lives.

## Verificação
- Backend: **265 passaram, 0 falhas, 8 ignorados**, 273 testes (`backend-tests.txt`). Inclui sete testes novos de contratos, isolamento, criptografia, limites, fila e MP4 local real.
- Build frontend: passou (`build.txt`).
- Lint dos cinco arquivos frontend alterados: passou (`scoped-lint.txt`).
- Lint completo: **11 erros e 2 avisos em arquivos não alterados**, detalhados em `full-lint.txt`; portanto lint global não está aprovado.
- Browser real: iniciar, cancelar, retomar, persistência visual, erro de modelo, provedores desconectados, nenhum vídeo falso, zero erros de página; sem overflow em 320/390/768/1440px (`ui-check.txt`). Screenshots reais em `ui/`.
- Nenhuma nova validação de transmissão RTMP/GPU/voz neural real foi feita; testes ignorados não são aprovações.

## Teste autônomo real e bloqueio
Execução **a277b6ef-116e-4e3e-ab9f-5c3920b816f6**, solicitação genérica exigida pelo usuário. Resultado persistido e reaberto: **Failed / MODEL_NOT_CONNECTED**. Evidências `execution.json` e `persistence.json`. Não houve cinco propostas reais, síntese premium, asset premium ou MP4 autônomo concluído. O MP4 do teste unitário é uma validação controlada do renderer, não uma demonstração criativa da Astra.

As ferramentas conectadas ao ChatGPT foram consultadas sem geração: Higgsfield informou 10 créditos no workspace do conector (plano free); ElevenLabs retornou catálogo filtrado de vozes femininas PT. Esses dados não comprovam saldo/cota da API do servidor nem transferem credenciais. Nenhuma chamada de geração paga foi realizada.

## Como retomar
1. Configurar a conexão do modelo da Astra e seu orçamento no workspace.
2. Configurar credenciais próprias pelas entradas protegidas de Studio avançado, nunca em código ou chat; consultar vozes/modelos/cota e salvar perfil de teste.
3. Definir limite diário de mídia e iniciar o modo documentário absurdo.
4. Revisar roteiro e cenas; consultar estimativas. Autorizar explicitamente o orçamento somente após avaliar operações e custos desconhecidos.
5. Executar pela fila existente e revisar MP4/voz/imagem/humor antes de qualquer publicação.

## Pendências e limites
Aceite 2.4 **não atingido**: faltam síntese e geração reais autenticadas e teste integrado com gasto autorizado. Integração completa ao perfil global Voice Studio e escolha oficial de voz permanecem pendentes. Não há aprovação artística automática, revisão visual multimodal real do MP4, regeneração parcial editável, comparação de versões dedicada, reutilização entre campanhas, catálogo dinâmico Higgsfield completo, clipes premium, sound effects ou reconciliação automática de cobranças. Checkpoints reaproveitam mídia da mesma campanha; composição local pode reiniciar. Um job remoto com falha/resultado incerto exige inspeção, sem reenvio automático. Continuidade de personagens não é garantida. O limite contábil não configura hard cap na conta externa.

## Fontes oficiais consultadas
- https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- https://elevenlabs.io/docs/api-reference/models/list
- https://elevenlabs.io/docs/api-reference/user/subscription/get
- https://docs.higgsfield.ai/docs/authentication.md
- https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md
- https://open.higgsfield.ai/models/higgsfield-ai/soul/v2/standard/api-reference
- https://open.higgsfield.ai/quick-start
- https://open.higgsfield.ai/terms-of-service

Não foram fixados preços de catálogo nem presumidos direitos comerciais de qualquer asset futuro. Cada resultado exige proveniência e revisão dos termos/autorizações aplicáveis. Não usar referência de pessoa real sem autorização.
