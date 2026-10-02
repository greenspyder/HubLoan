# Divulgação automática e atribuição

Em **Divulgação**, conecte um ou ambos os canais:

- **Mastodon:** conta em mastodon.social. Preferências → Desenvolvimento → Nova aplicação, escopos `read:accounts` e `write:statuses`. Copie o token de acesso para a interface. Outras instâncias ainda não são suportadas. Respeite as regras de divulgação comercial e conteúdo de IA da instância.
- **Telegram:** crie um bot em @BotFather (/newbot), adicione-o como administrador do seu canal com permissão de publicar, informe token e @nome ou ID -100… na interface. Conversas privadas e grupos não são destinos aceitos.

A conexão valida a identidade/permissões disponíveis e armazena o token com AES-GCM usando a chave persistente do servidor. A divulgação começa somente após você autorizar na interface, com loja aberta em modo Stripe **real**. A conta bancária, ativação Stripe e criação dos canais continuam sendo etapas humanas. Não compartilhe tokens no chat.

## Comportamento real

O servidor verifica a fila a cada 15 segundos. Produtos visíveis na loja, inclusive os existentes, entram em anúncios com título, descrição pública do formato, preço original, identificação de uso de IA e link para sua oferta. Packs privados, briefings e credenciais não entram nos anúncios. O formato é texto com link; não há geração de vídeo, DM, prospecção individual nem compra de publicidade. A preparação dos anúncios não faz chamadas adicionais à OpenAI.

Um anúncio por produto/canal durante toda sua existência. Intervalo global configurável entre 120 e 1.440 minutos; padrão 240. Limite de 1 a 20 tentativas por autorização; padrão 6. No máximo três tentativas por canal em qualquer janela de 24 horas, incluindo falhas. Cada autorização dura até 72 horas. Renovar uma autorização não apaga o histórico, não repete ofertas e não remove o limite diário. Limite operacional de 1.000 campanhas por espaço.

Conectar ou remover canais pausa os envios. Pausar divulgação ou ocultar produtos impede novos anúncios; anúncios já publicados não são apagados. Todos os canais conectados participam da fila. O limite é global, não por produto: alguns produtos/canais podem aguardar a próxima autorização. A fila não funciona enquanto a hospedagem estiver adormecida ou desligada; o plano gratuito do Render não oferece execução contínua garantida.

## Falhas e duplicação

Cada tentativa é gravada no banco antes de publicar. Trabalhadores concorrentes não enviam a mesma oferta. O Mastodon recebe `Idempotency-Key` por campanha; o Telegram não oferece chave equivalente neste método. Não há nova tentativa automática após falha ou resposta perdida, em nenhum canal: uma publicação pode ter ocorrido antes do timeout. A campanha fica “Conferir no canal”, a divulgação pausa e o proprietário deve conferir o canal, encerrar a tentativa e retomar os outros produtos. O produto dessa tentativa não é reenviado no mesmo canal.

Após reinício, tentativas pendentes por mais de 90 segundos tornam-se incertas, inclusive se a divulgação foi pausada. Assim a aplicação não inventa sucesso nem duplica publicação. O histórico preserva URLs somente quando a API confirma a publicação.

## Métricas e limites de atribuição

O link inclui IDs de produto e campanha. A página registra uma requisição de acesso anônima por código de sessão de navegador e dia UTC, com hashes no servidor. Sem IP, e-mail ou identidade do comprador nesse registro. Máximo 10.000 acessos deduplicados por campanha; o contador deixa de crescer ao atingir esse limite. Visitas podem incluir robôs, o proprietário e repetições em outras sessões; **não são pessoas únicas verificadas**. A política aparece no rodapé da loja. Ad blockers, armazenamento indisponível ou falhas de rede podem impedir registros; acessos não medem impressões de redes sociais.

O checkout atribui campanha somente quando ela existe no mesmo espaço e pertence ao mesmo produto. A atribuição é ao link usado para abrir o checkout, não prova causalidade e não acompanha uma pessoa entre aparelhos. IDs inválidos são ignorados e não impedem a compra. Pedidos reutilizados preservam a primeira atribuição. Pagamentos confirmados pelo servidor Stripe alimentam compras reais e faturamento bruto; reembolsos são apresentados separadamente. Modo teste não compõe faturamento real. Não se calcula lucro sem taxas, custos de API, impostos e trabalho.

As próximas análises de oportunidades recebem canais efetivamente conectados, campanhas e seus resultados. A IA é instruída a não interpretar atividade, acessos ou faturamento como lucro. Publicar não garante demanda: Telegram depende do público existente do canal; anúncios públicos no Mastodon dependem de interesse, descoberta e regras da instância. Sem público, a divulgação pode produzir zero vendas. Outras redes e marketplaces exigem integrações próprias e não estão conectados por serem mencionados no briefing.

## Referências das APIs

- https://docs.joinmastodon.org/methods/accounts/#verify_credentials
- https://docs.joinmastodon.org/methods/statuses/#create
- https://core.telegram.org/bots/api#getme
- https://core.telegram.org/bots/api#getchat
- https://core.telegram.org/bots/api#getchatmember
- https://core.telegram.org/bots/api#sendmessage

Os testes usam provedores simulados e HTTP local, incluindo confirmação autoritativa de pagamento, falhas, limites, retomada e isolamento. Não substituem o primeiro envio com contas conectadas reais; nenhum anúncio real foi enviado durante a implementação.
