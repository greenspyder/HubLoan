# Loja automática para todas as entregas

## Configuração única na interface

1. Na Stripe, crie/ative sua conta de vendedor e configure recebimento. A aplicação não abre conta, aceita contratos nem cadastra dados bancários por você.
2. Em Loja e vendas → Sua loja automática, informe a chave secreta Stripe e autorize conectar os pagamentos e registrar o webhook. A central registra automaticamente o endpoint; não é necessário configurar webhooks manualmente. Uma chave restrita precisa permitir leitura da conta, Checkout Sessions e escrita de Webhook Endpoints.
3. Defina nome da loja, e-mail público de suporte, licença/condições, preços em reais por formato e limite de produtos. Os valores iniciais são exemplos editáveis, não sugestões validadas de mercado.
4. Marque abrir catálogo e publicação automática. A autorização inclui entregas existentes em revisão e as futuras concluídas. Compartilhe o link público da loja.

Todos os formatos entram na loja própria: texto/código, imagem PNG, thumbnails, packs 2D e mobília 3D. Um produto recebe página, descrição factual do formato, preço, licença e ZIP. Texto/código vira `product.md`; imagens e packs incluem os arquivos originais. Prévia visual reduzida e marcada pode aparecer no catálogo; os arquivos completos ficam protegidos. Código não é executado ou implantado. Não é venda de serviços personalizados ou de itens dentro de jogos.

O itch.io continua opcional para packs de jogos; não substitui esta loja geral. Não há publicação em Etsy, Fiverr, Gumroad ou redes sociais. Abrir a oferta não prova demanda nem distribui anúncios.

## Pagamento e entrega

O comprador usa o checkout hospedado Stripe. A central aceita cartões nesta versão. Nenhum dado de cartão é armazenado no HubLoan. Stripe confirma o pagamento via webhook assinado e consulta servidor a servidor. A página de retorno e o download também consultam a Stripe, inclusive para detectar reembolso/contestação. Compras com valor, moeda, produto, modo ou referência divergentes não liberam arquivos.

Cada compra tem um código aleatório privado, armazenado no navegador e no fragmento do link de retorno. No servidor fica apenas seu hash. O comprador deve guardar o link de retorno em um local privado. O suporte é o contato do vendedor; não há disparo de e-mail ou cadastro de compradores nesta versão. Reembolsos são realizados na Stripe e suspendem o acesso, inclusive os parciais. Contestações também suspendem acesso; recuperação posterior não é automática.

Uma compra só é registrada uma vez; idempotência protege tentativas simultâneas. Uma entrega só cria um produto. Preço, arquivo e licença de produtos publicados são preservados; novas configurações valem para produtos novos. Retirar um produto ou pausar novas vendas preserva os arquivos de compras existentes.

## Operação e limites

A publicação automática roda no servidor sem aba aberta, por até 72 horas após a autorização e dentro do limite de 1–200 produtos. Falha interrompe a publicação; é necessário conferir e renovar a autorização. Encerrar a autorização de publicação não fecha a loja nem expira compras. Textos vazios e tarefas não concluídas não são publicados. Arquivos têm limite de 25 MB; até 5.000 pedidos por loja nesta versão.

Chaves Stripe e segredo do webhook são criptografados com a chave persistente do servidor, independentemente da chave da OpenAI. Arquivos comprados ficam em tabela separada para não serem incluídos em cada leitura/gravação do histórico. A origem pública e a origem do webhook são controladas pelo servidor, não pelo modelo ou pelo comprador. Defaults: frontend Vercel e backend Render atuais. Em outra instalação, configure `SHOP_PUBLIC_ORIGIN` e `SHOP_WEBHOOK_ORIGIN` como origens HTTPS estáveis.

Hospedagem adormecida não produz nem publica novos itens até voltar. Checkout e downloads também dependem de o servidor responder; Stripe repete webhooks que falham. Para disponibilidade comercial contínua, a hospedagem precisa permanecer ativa. Mantenha backups da base: contém catálogo, pedidos, chaves criptografadas e arquivos de vendas.

Métricas contabilizam compras reais e receita bruta confirmadas, separadas de testes. Reembolsos aparecem separadamente; taxas, API, impostos e divulgação não são inferidos. Receita bruta não é lucro. Os agentes recebem o canal conectado, preços e resultados sem códigos de compra, chaves ou dados pessoais dos compradores.

Teste e produção são separados por espaço após a primeira compra para preservar acesso às compras existentes. Valide primeiro com uma chave de teste, em um espaço de teste. Não use cartão real no modo teste.

## Validação desta implementação

Testes automatizados exercitam API real local com provedor Stripe simulado: cinco formatos, publicação duplicada, compra simultânea, downloads privados, assinatura Stripe oficial, eventos repetidos/expirados, pagamento pendente, dados divergentes, reembolsos, suspensão de vendas, preservação de arquivos e reinício do armazenamento. Sem chave do proprietário, não foi realizado pagamento autenticado real nem teste de checkout conectado à Stripe. A conexão e o primeiro checkout de teste continuam necessários para validar a conta e a hospedagem de ponta a ponta.

Fontes oficiais:
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted
- https://docs.stripe.com/api/webhook_endpoints/create
- https://docs.stripe.com/webhooks/signature

## Distribuição

A divulgação pode ser automatizada nos canais Mastodon/Telegram conectados. Veja [configuração e atribuição](MARKETING.md). As publicações não garantem alcance ou demanda.
