# Loop comercial com evidências — 04/10/2026

## Referência audiovisual e arquitetura preservada
Vídeo lv_0_20261004111316.mp4, 3min05,6s: pesquisa de ofertas Etsy existentes → variação de design → listing/POD; outbox de entregas; serviços de thumbnails Fiverr/Upwork; packs no itch.io; painel de faturamento. Os valores exibidos são afirmações do autor e não comprovam lucro, automação técnica ou resultado replicável. POD requer parceiro, logística, margem e integrações adicionais: não foi apresentado como capacidade digital pronta do HubLoan.

Reutilizados: Atlas (pesquisa), Astra/coordenador (decisão econômica), Nova/creator (produção), Sentinel/reviewer (revisão), provider Responses/web search, routing/costProvider, fábricas, armazém, experimentos, validação de uma amostra, MarketplaceOffer, OfferJourney, upload itch.io, loja Stripe, divulgação e mapa 2D. Referências são campos do experimento/decisão existente; não há catálogo comercial paralelo.

## Fluxo normal
1. Home → fábrica → Preparar Gig/listing. O canal e a fábrica vêm preenchidos.
2. Salvar público, hipótese, limite e janela cria o experimento existente, sem gasto.
3. Oportunidade: autorizar pesquisa (busca + análise) ou registrar observações legítimas que você conferiu. Cada fonte tem URL, data, preço opcional, escopo e sinais. Dados extraídos pela IA continuam explicitamente não verificados de modo independente.
4. Astra compara três ou mais vendedores e sinais sustentados nas fontes, separando características repetidas, inferência e hipótese. Preços/favoritos isolados não bastam. Comparação textual é conservadora, não demonstra causalidade.
5. Confirmar evidência e escopo/preço proposto; produzir uma amostra dentro dos limites. Opcionalmente preparar metadata original com uma chamada de trabalhador. Fiverr inclui categoria a conferir, Basic/Standard/Premium, FAQ e requisitos editáveis.
6. Armazém/revisão: conferir amostra, direitos e originalidade contra as fontes. Aprovação fica vinculada à versão e metadata. Alterar bytes, preview, referências ou oferta invalida a revisão de originalidade. Não há algoritmo que garanta ausência de infração ou compare pixels de todas as referências.
7. Publicação: Etsy oficial após consentimento por oferta; Fiverr assistido; itch.io no destino existente revisado; loja Stripe como canal separado.
8. Registrar/sincronizar resultados reais; registrar despesas e revisar custos. Valores desconhecidos não viram zero. Astra usa hipótese, evidência inicial, observação, resultado e conclusão limitada nas próximas análises autorizadas. Isso é memória contextual, não treinamento dos pesos.

## Etsy: configuração exata
1. Abrir/ativar a loja Etsy e registrar uma aplicação adequada no Developer Portal. A aprovação/acesso depende da Etsy; não é fornecido pelo HubLoan.
2. Registrar callback HTTPS exatamente: `https://hubloan.onrender.com/api/agents/etsy/callback` no deploy atual. Se o servidor mudar, o backend usa SHOP_WEBHOOK_ORIGIN.
3. Conexões → Etsy: keystring, shared secret e ID numérico da loja.
4. Preparar autorização → Autorizar HubLoan na Etsy → entrar como proprietário da loja → consentir em `shops_r listings_r listings_w transactions_r`.
5. Atualizar a tela: conectado só após troca de código e conferência da propriedade da loja. Credenciais, verifier e tokens AES-GCM ficam no servidor. A chave estável de criptografia já utilizada pela aplicação é necessária; não há token Etsy no frontend.
6. Na oferta: revisar amostra e originalidade, informar ID de categoria oficial e preço na moeda da loja; confirmar elegibilidade/direitos e autorizar publicação, incluindo possíveis taxas Etsy.

API implementada: draft digital `type=download`, imagem de apresentação, arquivo digital, ativação `state=active`, ID/URL da API e sincronização sob demanda de receipts pagas no período por listing. Renovação automática desabilitada. Imagens/ZIP das fábricas existentes são reutilizados; texto puro sem imagem ainda precisa de preparo adicional.

Toda intenção de publicação é persistida antes de enviar. Timeout/reinício/upload incerto nunca repete criação ou uploads silenciosamente. Conferir listing existente consulta API; draft incompleto pede finalização na Etsy. Não existe recuperação automática que possa duplicar cobrança.

Limites: até 1.000 receipts por sincronização; exceder deixa conciliação pendente. Deduplicação por receipt e substituição de snapshot. Receita automática BRL somente para receipts inequívocas, sem descontos/reembolsos/pedidos mistos. Moedas estrangeiras e casos ambíguos permanecem A apurar. Visitas/favoritos/recompras não são fabricados. Ledger/payments e webhooks foram consultados, mas a conciliação completa de taxas e eventos em segundo plano ainda não foi implementada; despesas reais continuam registradas/revisadas pelo proprietário. Custos da loja inteira não são atribuídos arbitrariamente a um pack. Sem credenciais, não foi possível validar contra uma loja real.

## Fiverr e automação
Não foi encontrada documentação pública oficial de criação/publicação de Gigs por API. Não há botão Conectar Fiverr, scraper, endpoint privado ou bot de publicação. O kit fica pronto para revisar, copiar/baixar; o proprietário publica, registra URL, atende pedidos e informa totais reais. Pesquisa usa fontes públicas legítimas e observações fornecidas, sem afirmar acesso a vendas privadas.

Níveis 0 manual, 1 preparado, 2 assistido, 3 automático, 4 autônomo controlado são explicados na Home. O loop atual é nível 2; subetapas Etsy são integradas e autorizadas. Não existe nível 4 completo. Novos limites/permissões não são aumentados por agentes.

## Controles e bloqueios
Orçamentos diário/mensal/por chamada/por tarefa existentes preservados. Pesquisa, metadata e produção vinculadas ao teste também conferem janela e limite financeiro antes de enviar chamada. Reservas continuam distintas da fatura; a soma de reservas e custos declarados é um bloqueio conservador, não resultado financeiro.

Astra pausa novos ciclos comerciais quando há amostra sem publicação, publicação sem resultado ou teste ainda aberto. Estoque não distribuído bloqueia outra descoberta/produção comercial. Missões manuais e projetos de tarefas internas continuam disponíveis; o bloqueio não converte todo texto interno em produto.

Ações necessárias na Home: autorização Etsy, revisão da versão, oferta para publicar, upload incerto e observação de resultados. Ausência de ação não significa execução automática; a tela informa se há ciclo/fila em andamento.

## Documentação oficial consultada
- https://developers.etsy.com/documentation/essentials/authentication/
- https://developers.etsy.com/documentation/tutorials/listings/
- https://www.etsy.com/openapi/generated/oas/3.0.0.json
- https://developers.etsy.com/documentation/tutorials/payments/
- https://developers.etsy.com/documentation/essentials/rate-limits/
- https://developers.etsy.com/documentation/essentials/webhooks/
- https://www.etsy.com/legal/creativity/ — criações próprias assistidas por IA com disclosure; pacotes de prompts não são elegíveis.
- https://www.etsy.com/developers/your-apps
- https://help.fiverr.com/hc/en-us/articles/32242973123985-Our-Community-Standards
- https://help.fiverr.com/hc/en-us/articles/360011421218-Requirements-and-guidelines-for-your-Gig

## Validação e limites de conclusão
Build TypeScript/Vite, lint do módulo e testes do servidor. Testes Etsy usam provider injetado e respostas controladas: OAuth/state, redaction/criptografia, publicação uma vez, consentimento, uploads incertos, reconciliação, duplicação de receipts, moeda estrangeira, pedidos mistos/reembolsos e rate limit sem retry. Nenhuma venda ou publicação em marketplace real foi criada durante a verificação.

A meta nível 4 ainda exige avaliação de qualidade/similaridade, conciliação multimoeda/taxas, eventos/polling durável, regras por fábrica/canal e evidência de que a autonomia vale o gasto. Atendimento Fiverr, serviços completos/POD e aquisição garantida de compradores não foram simulados.

## Comparação com a implementação encontrada
1. Já existiam pesquisa Atlas, produção Nova, revisão Sentinel, coordenação Astra, fábricas, armazém, orçamento, Experimentos, Primeira Venda e publicação/destinos de distribuição.
2. Pesquisa → decisão → produção → estoque e testes pequenos já correspondiam a partes do vídeo.
3. Descoberta competitiva, preparação comercial, feedback financeiro e visibilidade dos marketplaces eram parciais: pesquisar tendências não garantia referências comparáveis nem evidência de demanda. A preparação anterior de UX estava local e não publicada.
4. Faltavam referências estruturadas, comparação entre vendedores, revisão vinculada à versão, OAuth/publicação Etsy, tratamento de resultados incertos e bloqueio econômico por estoque não distribuído.
5. Foram reutilizados os mesmos agentes, provider, filas, experimentos, fábricas, artefatos e orçamento; foram adicionados campos e operações ao fluxo existente.

## Arquivos alterados nesta entrega
- `docs/commercial-loop.md`
- `docs/marketplace-journey.md`
- `frontend/src/features/agents/components/BusinessHome.tsx`
- `frontend/src/features/agents/components/ConnectionsPanel.tsx`
- `frontend/src/features/agents/components/EconomicOverview.tsx`
- `frontend/src/features/agents/components/EtsyConnection.tsx`
- `frontend/src/features/agents/components/ExperimentsPanel.tsx`
- `frontend/src/features/agents/components/FactoriesPanel.tsx`
- `frontend/src/features/agents/components/FactoryCards.tsx`
- `frontend/src/features/agents/components/FirstSaleValidation.tsx`
- `frontend/src/features/agents/components/MarketReferences.tsx`
- `frontend/src/features/agents/components/MarketplaceOffer.tsx`
- `frontend/src/features/agents/components/OfferJourney.tsx`
- `frontend/src/features/agents/components/RequiredActions.tsx`
- `frontend/src/features/agents/components/SalesChannelsPanel.tsx`
- `frontend/src/features/agents/marketplaces.css`
- `frontend/src/features/agents/pages/AgentWorkspacePage.tsx`
- `frontend/src/features/agents/services/agentApi.ts`
- `frontend/src/features/agents/services/businessView.ts`
- `frontend/src/features/agents/services/navigation.ts`
- `frontend/src/features/agents/services/salesChannels.ts`
- `server/ai-costs.mjs`
- `server/app.mjs`
- `server/commerce.mjs`
- `server/commercial.mjs`
- `server/domain.mjs`
- `server/etsy.mjs`
- `server/experiments.mjs`
- `server/factories.mjs`
- `server/learning.mjs`
- `server/market-references.mjs`
- `server/market.mjs`
- `server/reference-research.mjs`
- `server/runner.mjs`
- `server/tests/commercial.test.mjs`
- `server/tests/etsy.test.mjs`
- `server/tests/market-references.test.mjs`
- `server/tests/market.test.mjs`
- `server/tests/specializations.test.mjs`
- `server/tests/validation.test.mjs`
- `server/validation.mjs`
