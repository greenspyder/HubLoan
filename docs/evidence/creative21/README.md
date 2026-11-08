# Viral Content Factory 2.1 — entrega parcial, autonomia não comprovada

Base auditada: `89d98ea4b66c5fc41a91be95769147d2867309f4`, mesma branch `codex/viral-audiovisual12`. [Auditoria](audit.md). Nenhuma nova PR, merge, deploy, RTMP ou publicação.

## O que foi implementado

Uma solicitação ao endpoint autenticado `/api/agents/creative-campaigns` cria uma campanha e uma missão na fila existente. O runner executa pesquisa autorizada via provider existente (ou contexto interno declarado), pede cinco propostas com comparação e seleção de três ao modelo, valida os roteiros/planos e cria automaticamente três produções. Não chama o catálogo de roteiros locais da 2.0 como fallback.

- Estados persistidos: Researching, Ideating, Selecting, Scripting, Planning, Rendering, Validating, ReadyForReview, Failed, Cancelled. Seleção/roteiro/plano vêm da mesma resposta estruturada do modelo; os estados não representam chamadas distintas inexistentes.
- Seleção exige três adaptadores diferentes (comedy, battle, mystery), duas rejeições justificadas e planos validados antes de despachar qualquer vídeo. Resposta inválida pode receber uma segunda tentativa com o erro; checkpoints preservam respostas e custos. Políticas de `strategy.mjs` continuam aplicadas pelo provider.
- Mesmo store/CAS, runner, TTS, Voice Studio e Armazém. Não existe fila paralela de renderização. Propostas, experimentos e planos são snapshots das decisões recebidas. Custos usam o ledger existente; infraestrutura permanece desconhecida.
- Limites: uma campanha ativa por workspace, 30 no histórico, duas tentativas de planejamento, 30 minutos por execução, oito minutos para pesquisa/planejamento, concorrência global já existente, uma retomada explícita após falha. Timeout e lease expirado passam a Failed, inclusive após recarregar o workspace. Pausa/cancelamento não autoriza publicação.
- A interface `/agentes/viral` aceita a solicitação, mostra eventos, justificativas, planos, qualidade e falhas; propostas/produções reutilizam os controles de revisão e vídeo existentes. O botão da interface usa contexto interno; pesquisa externa requer `webResearch:true` na API e está sujeita ao orçamento conectado.

## Contrato visual executável

`creative-plan.mjs` limita ações, câmeras, duração, transições e referências de narração. Não interpreta texto livre como comandos. Timeline contínua, gancho/desenvolvimento/recompensa e cobertura temporal das falas são obrigatórios.

| Adaptador | Ações executadas | Limite real |
|---|---|---|
| Character/comedy | Pausa de atuação facial e gameplay; câmeras Front/Action/Follow | Não gera gestos físicos arbitrários; quatro cenas em 18s |
| Gameplay/battle | Acontecimento e replay com IDs da simulação registrada | Não inventa resultados; quatro cenas em 25s |
| Mystery | Aproximação do viajante, sinal, revelação luminosa, três escalas de câmera | Vocabulário visual ainda restrito a porta/viajante/luz; três cenas de 6s |

As ações e câmeras recebidas chegam aos adaptadores existentes. Legendas derivam da narração. Eventos sonoros suportados neste contrato: narração; efeitos arbitrários e novas músicas não são alegados. Cortes são explícitos; transições não implementadas são rejeitadas. O microconto deixou de ignorar inteiramente o plano, mas ainda não é uma ferramenta geral de storytelling.

Comparação de roteiros por sobreposição lexical detecta repetição literal aproximada; não mede originalidade semântica ou viralidade. A validação final confere artefatos, status técnico, diversidade de quadros e problemas reportados pelo renderer. A avaliação artística continua humana. Inspeção perceptiva automática sofisticada e correção criativa após renderização continuam pendentes; falhas de produção param a campanha e permitem uma retomada limitada.

## Teste real de autonomia

Solicitação enviada pela API, sem roteiro nem cenas: “Pesquise oportunidades criativas e produza três vídeos curtos, em formatos distintos, para avaliação.”

**Execução `176c182c-fe69-47db-825b-2b3f60809ee0`: Researching → Failed.**

Causa: `MODEL_NOT_CONNECTED`. O workspace local de teste não tem chave conectada. As credenciais do workspace de produção não estão neste checkout e não foram copiadas. A chamada externa não foi enviada; não houve pesquisa, inferência, propostas, planos ou MP4s gerados nessa execução. Não substituímos as decisões por fixtures e não reutilizamos vídeos anteriores.

[Registro completo](execution.json), [reabertura do banco comprovando persistência](persistence.json), [log](autonomy-attempt.txt).

Há testes controlados de contrato em que uma resposta de modelo fornecida pelo teste leva ao despacho automático de três formatos. **Isso não comprova autonomia real**: esses testes não são os cinco conceitos ou os três vídeos exigidos para aceite.

## Testes executados

- Backend: **257 passaram, zero falhas, 8 ignorados, 265 totais**. [Log](backend.txt).
- Quatro testes de campanha: falha sem modelo sem fallback; limites/CAS/isolamento/retomada; planos e repetição; seleção/despacho com provedor controlado. [Log](campaign-tests.txt).
- Treze testes direcionados incluindo regressão do runner: passaram. [Log](targeted.txt). Uma regressão introduzida no polling ocioso foi detectada e corrigida antes da entrega.
- Nove testes antigos de voz/câmera agora passam: a inspeção final de câmera executa os nove raios mesmo após outra falha, preservando rejeição barata na busca de candidatos. O limite de vistas do teste foi atualizado de 200 para os 400 já usados pela implementação. [Log](camera-regression.txt).
- Build e lint dos arquivos frontend alterados passaram. [Build](build.txt), [lint](lint.txt). Não foi alegado lint global limpo.
- Tentativa de demonstração real do frontend e testes WebGL falharam antes da inspeção: Chromium não conseguiu criar socket de singleton (`Operation not permitted`); uma segunda tentativa também falhou. [Log](browser-failure.txt), [segunda tentativa](browser-retry-failure.txt), [WebGL](webgl-failure.txt). Não há screenshot nem aprovação visual fabricada.

## Como repetir sem direção manual do desenvolvedor

Usar o painel num workspace já conectado, ativar o orçamento e autorizar as chamadas, fornecer apenas a solicitação genérica e iniciar a campanha. Não fornecer roteiros nem selecionar os três conceitos. A escolha pertence à resposta da Astra. Para execução local de integração: `node server/creative-autonomy-check.mjs /diretorio/de/evidencias`. Por padrão cria um workspace vazio e evidencia dependências ausentes. Para testar uma conexão local existente, o operador pode indicar `HUBLOAN_CAMPAIGN_DB` e `HUBLOAN_CAMPAIGN_TOKEN` no ambiente privado; o script não imprime nem grava o token. Ele chama a API, percorre o runner até estado terminal e baixa somente os artefatos da campanha pela rota autenticada. Não chama renderizadores diretamente.

Não envie credenciais pelo chat. Uma conexão feita no frontend deve continuar sendo gerenciada pelo mecanismo existente. Após conectar o modelo e configurar limites, a campanha pode ser retomada uma vez; qualquer novo erro permanece registrado.

## Pendências de aceite

1. Executar a campanha com conexão real de modelo e orçamento no workspace apropriado. Validar respostas, seleção, cinco propostas e três produções sem fixtures.
2. Validar os planos novos com renderer real, navegador funcional e perfil neural instalado. Não houve novos MP4s nesta etapa.
3. Ampliar o vocabulário de atuação e mistério, melhorar validação perceptiva e testar correção limitada de problemas visuais. Não está comprovada qualidade artística ou diversidade semântica.
4. Testar a interface num Chromium funcional. O build não substitui essa inspeção.
5. Para TikTok: contratos indicam publicação desabilitada, autenticação oficial e revisão humana. Scheduler, fila de publicação, monitoramento oficial, idempotência de envio, coleta automática de métricas e frequência ainda precisam de implementação/autorização separada. Não existe publicação autônoma nesta versão.

**Não considerar a versão 2.1 concluída.** A separação entre modelo decisor e runner executor foi implementada e testada em contratos; a prova end-to-end criativa real permanece bloqueada pela conexão de modelo e pelas dependências do ambiente.
