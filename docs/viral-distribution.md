# Astra e distribuição assistida — PR C

Extensão dos experimentos existentes, sem economia ou agente paralelos. `POST /experiments` aceita `kind: audience`, lista de missões `liveShort`, hipótese, público, canal, orçamento em centavos e prazo. Não exige vendas fictícias como meta. Custos usam os lançamentos existentes; resultado financeiro permanece desconhecido.

Após aprovação da missão, `POST /experiments/:id/audience-kit` com `missionId` prepara título, descrição, hashtags, checklist e vínculo à versão. Arquivo MP4/capa continuam nas rotas autenticadas de artefatos. Não envia nada ao TikTok.

`audience-published` exige missionId, versão aprovada e URL HTTPS de TikTok/Instagram/YouTube; registra relato do operador, não confirmação de API. URLs não podem ser atribuídas a dois experimentos.

`audience-observed` registra snapshots manuais com missionId, observedAt, evidence e contagens opcionais views/likes/comments/shares/followers, retention (0–1) e averageWatchSeconds. Seguidores exigem attributionEvidence. Dados ausentes são null, snapshots não são somados e duplicações são rejeitadas. Isolamento usa a mesma autenticação de workspace.

`commercialLearning` fornece audienceExperiments à Astra existente, separando hipótese, observações manuais e inferência cautelosa. Não executa modelo, não declara viralidade nem causa/efeito, não aprova gastos, não aumenta orçamento e não publica.

Testes: cinco aprovados, incluindo regressão de custos, isolamento, versão, duplicação e snapshots. **Pendente:** comparação assistida de períodos, integração oficial de métricas, teste de publicação manual pelo operador. Preparação de API TikTok continua desativada, conforme integração existente. Não alegamos pesquisa atual de novas permissões ou validação de publicação.

O painel Viral inclui criação de experimento com orçamento escolhido, preparação de kit aprovado, registro de URL publicada manualmente e snapshot de visualizações. Demais métricas estão disponíveis pelo contrato da API; editor completo permanece pendente.
