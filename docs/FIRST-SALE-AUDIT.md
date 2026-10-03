# Auditoria do caminho até a primeira venda — 02/10/2026

Escopo: leitura do backend e interface do HubLoan, testes automatizados e conferência da interface publicada. Não foi realizada compra real, contato com cliente nem chamada paga de IA. Sucesso técnico não demonstra demanda nem lucro.

## Três obstáculos encontrados

1. **Serviço não é um produto digital automaticamente entregue.** `server/opportunities.mjs` mantém `service_fulfillment`, edição/legendas de vídeo e publicação YouTube/TikTok indisponíveis. Pode haver pesquisa ou preparação privada; não há contratação de um cliente nem execução desse serviço. O modo Primeira venda usa um produto digital na loja própria, sem fingir integração de serviços.
2. **A revisão anterior não impedia publicação automática.** Loja/itch.io aceitavam missões em `review` quando já autorizados. As novas amostras do modo de validação exigem revisão humana declarada, liberação explícita da versão exata e preço da loja igual à oferta. O worker ignora amostras bloqueadas; a API manual também bloqueia. As integrações dos demais produtos mantêm seus consentimentos anteriores. O modo de validação não publica no itch.io, cujas métricas de página não atribuem uma compra à amostra.
3. **Gasto e resultado ainda exigem conferência humana.** Pagamentos Stripe reais e retidos alimentam o teste. API, taxas, impostos, trabalho e outras despesas são declarados; o orçamento em reais não bloqueia cobranças. Recomendar repetir exige resultado positivo, meta atingida, custos revisados e amostra aprovada. Não existe escala automática nem garantia de retorno.

## Fluxo implementado

Em Experimentos, ative o modo em um plano aberto sem entregas. Registre fonte pública consultada nos últimos 30 dias e o problema observado; a origem permanece declarada pelo proprietário, não independentemente verificada. Defina escopo, preço proposto, prazo e critérios de qualidade. Crie uma única amostra em rascunho e execute explicitamente em Missões quando houver chave e disposição para pagar pela produção.

Examine a entrega, registre aprovação/reprovação e libere a versão revisada. A loja ainda precisa estar configurada e autorizada. Prazo encerrado, evidência vencida, mudança de conteúdo, reprovação ou divergência de preço bloqueiam novas publicações dessa amostra. Encerrar o teste não retira produtos já publicados nem interrompe outros projetos; use os controles correspondentes.

Registre interesse, objeções e ausência de resposta sem dados pessoais. Relatos não viram vendas. Silêncio mantém causa desconhecida. Os próximos ciclos recebem esses relatos como contexto privado, separadamente de pagamentos verificados. O painel mostra lacunas de evidência, oferta, qualidade, recebimento, preço, liberação, distribuição, vendas e custos.

O modo é opcional por experimento, não transforma todos os projetos autônomos em prospecção de clientes. Não pesquisa um pedido nem cria uma oferta fictícia ao ser ativado. Para reformular uma amostra reprovada, registre o resultado e planeje um novo teste; não há editor de entregas neste fluxo.

## Evidência de verificação

86 testes do servidor, build e lint do módulo. Cobertura nova: pré-condições e rascunho único; versão/preço/aprovação; isolamento entre espaços; bloqueio manual e automático sem interromper produtos não vinculados; relatos sem receita fictícia; lucro com custos revisados e invalidação por reembolso; encerramento da janela. Provedores de pagamento nos testes são simulados.
