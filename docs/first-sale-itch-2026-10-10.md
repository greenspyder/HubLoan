# Primeira Venda Autônoma — fatia implementada em 10/10/2026

## Baseline e escopo

HEAD remoto inicial: `4d6ce4e27a904cefd63742a8359b9811c5eed5be` (`master`, PR #5 já incorporado). Conferido novamente antes de preparar o PR. A árvore local foi comparada por hashes de todos os arquivos com a árvore GitHub `666515e86359240a70d77d0ccf97bd78da82c190`. Alterações antigas em outros diretórios locais não foram reutilizadas nem sobrescritas.

Esta entrega cobre uma fatia das fases A/B, não todo o negócio autônomo. Sem deploy, publicações comerciais, pagamentos, alteração fiscal, pesquisa paga ou novas dependências. Nenhuma venda foi simulada como resultado do usuário. Fixtures são exclusivamente testes isolados.

## Gargalos encontrados

| Gargalo observado no código | Impacto na primeira venda | Esforço/risco | Decisão |
|---|---|---|---|
| Projeto limitado por chamadas, sem teto monetário próprio | Alto: pesquisa e execução podem consumir limites separados | Médio/médio | Escopo compartilhado no preflight existente |
| Descoberta selecionava hipótese e já enfileirava produção | Alto: gasto antes da decisão sobre experimento | Baixo/médio | Novo modo opt-in pausa após decisão persistida |
| Itch aceitava entrega em revisão com autorização genérica | Crítico: disponibilização de arquivo inadequado | Médio/médio | Aprovação de qualidade + release por versão/destino/licença/preço declarado |
| Configuração itch só aceitava página pública | Alto: incentivava publicar página antes do pack revisado | Baixo/baixo | Upload autorizado em rascunho; visibilidade continua externa |
| API conectada sem estado de pagamentos | Alto: usuário pode confundir integração com prontidão | Baixo/baixo | Conferência humana com proveniência, validade e estados separados |
| Descoberta e oferta não compartilhavam projeto | Alto: orçamento e contexto desconectados | Médio/médio | `experiment.projectId`, amostra herda projeto e referências preservam origem |
| Divulgação itch e atribuição financeira ainda incompletas | Alto após publicação | Maior/alto | Não reescrever marketing agora; registrar limitação |

## Antes / depois

Antes: formulário técnico → pesquisa → produção automática → revisão e oferta em menus separados; itch aceitava upload em revisão.

Agora: Início → **Primeira Venda Autônoma** → objetivo, teto de exposição em reais, autonomia → descoberta autorizada → hipótese persistida, pausa antes de produção → preparar experimento existente na fábrica compatível → revisar evidência/escopo/preço → criar amostra → produção com orçamento compartilhado → Armazém/Sentinel/revisão humana → oferta → autorização itch específica → upload em página existente, inclusive rascunho → conferência externa de publicação/pagamentos → resultados no experimento existente.

O fluxo ainda exige navegação para o Armazém. Formatos sem publicação itch integrada mostram a limitação. Não foi feita uma refatoração global de navegação. Projetos antigos mantêm seu comportamento e orçamento ausente é explicitado; a pausa após descoberta vale somente para novos projetos `firstSale`.

## Implementação e fontes de verdade

- `server/ai-costs.mjs`: preflight soma exposição de coordenação, experimentos vinculados e missões de todo o projeto, incluindo retries. Mantém limites por chamada/tarefa/dia/mês/experimento. A reserva e o preflight continuam na mesma mutação transacional. Custos declarados ativos também reduzem disponibilidade; podem ser conservadoramente contados junto de exposição não conciliada, nunca apresentados como gasto confirmado.
- `autonomy.mjs`, `runner.mjs`: valida orçamento positivo, preserva objetivo, pesquisa com preflight antes da primeira chamada, pausa após decisão sem criar missão de produção. Retomar projeto com decisão já salva não dispara outra pesquisa. Rejeição não é venda fracassada nem evidência de mercado.
- `experiments.mjs`, `validation.mjs`: vínculos no mesmo workspace, sem mudar IDs, preços existentes ou versões; criação de amostra herda projeto. Referências copiadas da decisão mantêm proveniência. Evidência humana continua explicitamente não verificada.
- `first-sale.mjs`: projeção determinística, sem banco/estado/LLM paralelo. Próxima ação considera bloqueios, revisão, execução, prontidão, oferta e observações da página. Visitas sem compras são hipótese diagnóstica e os totais são históricos.
- `itch-readiness.mjs`: conta de vendedor, entrevista, aprovação fiscal, destino de repasses e aceitação de pagamentos são conferências **owner-reported**, não API verified. Depois de 30 dias exigem reconferência. Troca de chave invalida conferência corrente, preservando histórico interno. Fiscal/repasse pendentes não são automaticamente tratados como bloqueio de aceitar pagamentos: dependem do modo de recebimento. Stripe não participa da decisão.
- `itch-release.mjs`, `commerce.mjs`, `app.mjs`: upload manual e automático exigem `approved`, versão hash atual, destino e licença atuais, preço/moeda declarados e autorização de 72h. Generic autoPublish não basta. Gates específicos do experimento continuam obrigatórios. A API/Butler não configura preço ou visibilidade; preço externo não é verificado. Upload incerto continua sem retry automático.
- `domain.mjs`: resumo derivado na resposta do workspace; nada de credenciais no frontend.
- UI: componentes `FirstSaleProject`, `ItchReadiness`, `ItchRelease`; integração em AutonomousProjects, BusinessHome, RequiredActions, CommercePanel, MarketplaceOffer, OfferJourney; contratos agentApi e textos salesChannels. Formulários verticais e controles por toque reaproveitam CSS responsivo existente.

| Métrica / estado | Fonte | Limite da interpretação |
|---|---|---|
| Teto e disponibilidade do projeto | Projeto + ledger aiCosts + custos declarados dos experimentos | Teto de exposição para novas chamadas; não teto de cobrança contratado com provider |
| IA confirmada | `confirmedMinor` do ledger | Ausência não significa custo zero |
| Reserva / exposição incerta | status e reserva por chamada | Não é gasto efetivo confirmado |
| API itch conectada / páginas / views / purchases / earnings | API oficial profile/games | Totais históricos da página, não atribuição ao projeto |
| Situação fiscal, repasses, aceitar pagamentos | Conferência registrada pelo proprietário | Não validada automaticamente; não comprova checkout concluído |
| Upload | Butler e registro persistido da tentativa | Não significa página pública ou venda |
| Receita/profit do projeto | Experimentos e economia existentes | Nova projeção não calcula lucro com dados incompletos; permanece a apurar |
| R$50/R$100 recorrentes | Objetivos textuais | Nenhum marco de recorrência marcado como atingido |

## Invariantes e compatibilidade

Nenhuma migração destrutiva. Campos opcionais em JSON; leitura de projetos antigos preservada. Mesmos store, autenticação bearer/workspace, providers, fila, Sentinel, checkpoints, compras/downloads, Stripe e integrações. Não alterados preços publicados, licenças de compras, dados fiscais ou credenciais. Nenhuma dependência StarNet/comercial nova.

**Mudança intencional de segurança:** uploads novos de packs antigos agora precisam de qualidade aprovada e autorização específica. Uploads já concluídos/compras existentes não são removidos. Reverter integralmente a mudança restauraria a falha; se necessário, desative novos uploads durante rollback, preservando os dados novos.

## Verificação

Baseline: 129/129 testes passaram. Pós-alteração: **138/138 testes passaram** com `node --test server/tests/*.test.mjs`; **build aprovado** com `npm run build` no frontend (TypeScript + Vite); **ESLint dos 11 componentes/serviços alterados sem erros**; `git diff --check` limpo. Aviso npm sobre configuração de proxy do ambiente, sem falha. Regressões adicionadas cobrem teto compartilhado, concorrência, herança de orçamento, descoberta sem produção, ausência de rerun automático, proveniência, dados antigos, rejeição em revisão, autorizações por versão, isolamento entre espaços, upload em rascunho e independência do Stripe.

A suíte existente também cobre retomada após três sprites/checkpoints, revisão parcial, reprovação Sentinel, compra real versus teste, idempotência, reembolsos e persistência após restart. Nenhuma chamada paga necessária.

Não foi possível validar visualmente a jornada em navegador/mobile nesta execução: Playwright está disponível, mas o executável Chromium não está instalado. Build/TypeScript não substituem essa validação. Nenhuma validação end-to-end contra conta comercial real foi feita.

## Estado real da conta e pendências

A implementação foi verificada com store local isolado e mocks. **Não foi acessado o workspace de produção autenticado nem o painel privado itch.io.** A aprovação fiscal, destino de repasses, aceitação de pagamentos, visibilidade atual de Secondbrain e modo atual do Stripe não foram confirmados nesta execução. O contexto fornecido pelo proprietário não é promovido a fato observado.

O dono deve conferir essas informações no painel itch.io e registrar somente o que ele comprovar. A entrevista fiscal concluída não basta para afirmar que repasses estão aprovados. O Stripe de testes da loja própria não impede por si só vendas no itch.io.

## Limitações e próxima prioridade

1. Validar em staging/mobile e conferir a prontidão real do itch.io. Depois, pesquisar dentro de um teto conservador e escolher uma única oferta.
2. Distribuição itch: fluxo atual de marketing privilegia produtos da loja própria. Este PR não afirma automatizar divulgação de listings itch. Tags/página/comunidades exigem plano permitido e autorização; não há spam/bot novo.
3. Receitas por transação, comprador independente, taxas, tributos/repasse e recorrência mensal ainda precisam de conciliação. Totais históricos da API não resolvem isso.
4. Pesquisa interrompida antes de salvar uma decisão pode demandar nova chamada ao retomar. Checkpoints de produção são preservados, mas não foi construído um novo checkpoint por subpesquisa.
5. UI de oferta conserva o preço experimental BRL existente; autorização itch pede moeda/preço próprios da página, sem conversão implícita. Justificativa é humana, não validação de preço pelo mercado.
6. Limite monetário controla reservas de novas chamadas, não cobranças externas reais nem compras/serviços fora do HubLoan. Reservas subestimadas podem não cobrir fatura do provedor.

## Referências externas efetivamente usadas

Documentação oficial, consultada em 10/10/2026:
- https://itch.io/docs/api/serverside — catálogo e métricas; nenhum endpoint fiscal usado.
- https://itch.io/docs/creators/payments — distingue aceitar pagamentos, modos de recebimento e repasses.
- https://itch.io/docs/butler/pushing.html — upload para projeto existente.

Sem copiar código, assets ou identidade dessas referências. Não foi importado código de StarNet, Agents Office, MoneyPrinter, Zenite ou CLI-Anything nesta fatia; nenhuma obrigação de licença externa nova.
