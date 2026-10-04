> Atualização posterior: consulte [commercial-loop.md](commercial-loop.md) para referências, ações necessárias e integração oficial Etsy. A descrição abaixo registra o fluxo anterior.

# Canais de venda e primeira oferta

## O que foi reutilizado
Fábricas, APIs `/experiments` e ações existentes, FirstSaleValidation, MarketplaceOffer, custos/revisão de ExperimentsPanel e upload itch.io. Nenhum segundo cadastro comercial ou automação Fiverr/Etsy foi criado.

## Como testar
1. Na Home, localize Thumbnail Studio: Fiverr e **Preparar primeiro Gig** devem estar visíveis. Assets mostram Etsy e itch.io separadamente.
2. Clique no CTA: fábrica/canal vêm preenchidos. Informe público, hipótese, orçamento e prazo. Salvar cria somente o teste com Modo Primeira Venda; não chama IA.
3. Registre evidência e oferta; crie uma amostra. Executar IA é uma ação explícita e paga, sujeita aos limites existentes.
4. Prepare título, descrição, tags e direitos. Revise a amostra na etapa Revisar.
5. Em Publicar, copie/baixe o kit. Fiverr/Etsy abrem para publicação manual. Informe a URL e confirme publicação; isso não cria vendas.
6. Em Registrar resultado, informe o snapshot acumulado real, taxas/outros custos e revisão. Campos desconhecidos continuam desconhecidos; resultado permanece A apurar até completar os dados.
7. Vendas abre Canais de venda; Loja própria e Resultados/custos têm abas separadas. Detalhes das fábricas também têm os CTAs.

## Limites verdadeiros
Fiverr/Etsy são fluxos assistidos. Relatos externos não são pagamentos confirmados pela API. Itch.io envia packs para uma página existente configurada: não cria a página nem comprova vendas. O envio da amostra exige revisão e autorização explícita vinculada ao conteúdo, destino, licença e validade. Não há envio automático da amostra. Astra recebe estados e proveniência nos próximos ciclos existentes; abrir a tela não consome IA.

## Verificação
`npm test --prefix server`: 101 testes aprovados.
`npm run build --prefix frontend`: aprovado.
`cd frontend && npx eslint src/features/agents src/app/App.tsx vite.config.ts`: aprovado.

## Arquivos alterados
- `frontend/src/features/agents/components/BusinessHome.tsx`
- `frontend/src/features/agents/components/ExperimentsPanel.tsx`
- `frontend/src/features/agents/components/FactoriesPanel.tsx`
- `frontend/src/features/agents/components/FactoryCards.tsx`
- `frontend/src/features/agents/components/FirstSaleValidation.tsx`
- `frontend/src/features/agents/components/MarketplaceOffer.tsx`
- `frontend/src/features/agents/components/OfferJourney.tsx`
- `frontend/src/features/agents/components/SalesChannelsPanel.tsx`
- `frontend/src/features/agents/marketplaces.css`
- `frontend/src/features/agents/pages/AgentWorkspacePage.tsx`
- `frontend/src/features/agents/services/agentApi.ts`
- `frontend/src/features/agents/services/businessView.ts`
- `frontend/src/features/agents/services/navigation.ts`
- `frontend/src/features/agents/services/salesChannels.ts`
- `server/app.mjs`
- `server/commerce.mjs`
- `server/commercial.mjs`
- `server/domain.mjs`
- `server/experiments.mjs`
- `server/factories.mjs`
- `server/learning.mjs`
- `server/tests/commercial.test.mjs`
- `server/tests/validation.test.mjs`
- `server/validation.mjs`
- `docs/marketplace-journey.md`
