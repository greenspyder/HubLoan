# Prioridade comercial — revisão de 04/10/2026

O critério de desenvolvimento é chegar a uma oferta, comprador e receita observáveis, apurar custos e aprender. Infraestrutura, mapa, armazém, integrações e consentimentos existentes são preservados.

## Comparação e execução implementada

| Canal | Capacidade oficial pesquisada | HubLoan nesta versão |
| --- | --- | --- |
| Fiverr | Não foi verificada API pública adequada para criar/manter Gigs e atender pedidos. Acesso não autorizado, scraping e mensagens em massa são proibidos. IA é permitida dentro das regras e direitos, respeitando preferências do cliente. | Thumbnails como serviço sob demanda: kit editável, amostra no armazém, publicação e atendimento manuais. Sem credencial Fiverr coletada ou automação de navegador. |
| Etsy | Open API v3 oferece criação de rascunho, imagens e arquivos digitais, atualização de listing e acesso autorizado a dados. Exige app, chave e OAuth2 com PKCE/scopes. O caminho de aprovação depende de uso próprio ou por terceiros. Scraping para contornar API é vedado. | Preparação manual para downloads originais elegíveis. Não há OAuth/app Etsy implementado. Uso de IA deve ser declarado no listing; pacotes de prompts não são elegíveis. |
| itch.io | Integração existente para packs em páginas autorizadas. | Preservada; kit manual adicional para experimentos. Não importar receita de página inteira como venda de um pack específico. |
| Loja própria | Checkout, webhook e downloads existentes. | Complementar; tráfego não é presumido. Experimentos externos são separados para evitar atribuição duplicada. |

Fontes oficiais consultadas:
- https://help.fiverr.com/hc/en-us/articles/37554441398929-Our-Community-Standards
- https://help.fiverr.com/hc/en-us/articles/37554976380177-Using-AI-on-Fiverr-Guidelines-for-freelancers-and-clients
- https://help.fiverr.com/hc/en-us/articles/9234443621137-Your-earnings-page
- https://developers.etsy.com/documentation/
- https://developers.etsy.com/documentation/essentials/authentication/
- https://developers.etsy.com/documentation/tutorials/listings/
- https://www.etsy.com/legal/creativity/
- https://www.etsy.com/legal/fees/

Fiverr informa remuneração de 80% do pedido concluído. Etsy informa tarifa de listing de US$0,20 e transação de 6,5%, além de custos que variam (processamento, publicidade, câmbio, impostos e outros). Isso não é custo total calculado automaticamente: lançar valores efetivos do relatório do vendedor, sem duplicar taxas já deduzidas. Uma API key OpenAI não abre conta, loja, aprovação nem recebimento nesses marketplaces.

## Caminho mais curto

1. Vendas → experimento pequeno → Modo Primeira Venda; registrar fonte recente e hipótese. Não tratar tendência ou preço anunciado como comprador.
2. Definir escopo, público, preço proposto, prazo e qualidade; criar apenas uma amostra. Executar e revisar no Armazém.
3. Preparar kit Fiverr/Etsy, conferir direitos, categoria, tags, imagem e preço na moeda do canal. Publicar manualmente e atender pedidos na plataforma. Preparar kit não declara publicação.
4. Registrar totais acumulados exclusivos da oferta: URL, período, referência, receita bruta, reembolsos, vendas retidas. Visitas, leads, minutos e recompra são opcionais; branco significa desconhecido. Converter para BRL com critério documentado.
5. Lançar API efetivamente consumida, taxas, trabalho e demais custos. Revisar todas as categorias. Resultado só aparece após revisão; qualquer alteração de receita, amostra ou custo invalida a conferência.
6. Astra recebe esses resultados no próximo ciclo autorizado, com procedência e custos por categoria. Comparar períodos/escopos; dados declarados não viram pagamento confirmado. Não há aumento automático de orçamento.

Snapshots substituem os totais anteriores e guardam histórico. Uma URL de oferta pertence a um experimento. Não usar anúncios compartilhados entre testes. Reembolsos externos não são sincronizados: atualizar o relato. O resultado da home refere-se aos experimentos, não ao lucro total do negócio. Visitas podem incluir repetições/robôs. Converter vendas/visitas só quando denominador conhecido e consistente; nunca calcular a partir de leads desconhecidos.

## Modelos e gasto

A mesma chave é consultada em `/v1/models`, e cada seleção é validada em `/v1/models/{id}` ao salvar. Catálogo documentado não garante acesso, saldo ou ferramentas. A conta real não foi consultada durante desenvolvimento.

- Coordenação econômica: modelo principal selecionado; opção GPT-6 Astra com esforço medium.
- Produção previsível: trabalhador selecionado; opção GPT-5.6 Luna sem raciocínio adicional.
- Instalações existentes conservam GPT-4.1 mini até escolha explícita. Não há migração silenciosa de custo nem retry caro automático de resposta truncada.
- Decisões complexas já são roteadas ao principal. Escalonamento adaptativo de baixa confiança de um trabalhador é trabalho futuro: exige avaliações de qualidade e controle de chamadas antes de autorizar novas tentativas.
- Registro por chamada conserva modelo, uso de tokens, status e reserva. Estimativa de tokens em USD usa tabela Standard de referência, sem ferramentas/imagens, câmbio, impostos ou fatura. Contexto acima de 272k fica sem estimativa. Não converter a reserva em custo contábil nem somar a estimativa USD a despesas BRL.
- Reservas existentes bloqueiam envios antes da chamada dentro dos tetos declarados; não garantem fatura máxima. Configure valores conservadores para o principal e limites no provedor. GPT-6 Astra pode usar até 4.000 tokens de saída/raciocínio nas decisões de texto; uma resposta incompleta não é repetida automaticamente.

Preços por milhão de tokens de texto, entrada/saída USD: GPT-6 Astra 10/50; GPT-5.6 Luna 0,20/1,20; GPT-4.1 mini 0,40/1,60. Modelos opcionais não são ativados só por existir no catálogo.

Fontes: https://developers.openai.com/api/docs/models/gpt-6-astra ; https://developers.openai.com/api/docs/models/gpt-5.6-luna ; https://developers.openai.com/api/docs/models/gpt-4.1-mini ; https://developers.openai.com/api/docs/pricing ; https://developers.openai.com/api/docs/guides/latest-model .

## Próximos passos condicionados a evidência

Primeiro testar uma oferta e registrar os resultados. Só depois avaliar OAuth Etsy, importação de pedidos, escalonamento adaptativo e integração de novos canais. Não copiar arte de terceiros, inventar compradores nem tratar produção ou animação como retorno financeiro.
