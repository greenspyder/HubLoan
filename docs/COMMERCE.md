# Integração comercial itch.io

## O que está implementado

- Conexão com chave itch.io criptografada, consulta real do catálogo via `https://api.itch.io/profile/games`.
- Seleção de páginas públicas de assets da própria conta para packs 2D e mobília 3D.
- Envio de ZIP pelo butler oficial 15.31.0, instalado na imagem Docker com SHA256 fixo. A licença informada pelo vendedor é incluída no ZIP enviado.
- Canal exclusivo `pack-ID-DA-MISSAO` por pack; um reenvio explícito atualiza somente esse mesmo canal. Upload concluído não pode ser duplicado pela central.
- Publicação automática opcional, com limite de 1–20 tentativas, prazo de 72 horas, chave/grant criptografados e retomada após reinício do servidor.
- Totais de visitas, compras, downloads e receita por moeda retornados pela plataforma. Consulta a cada cinco minutos quando autorizada, além de botão manual. Os totais recentes da loja são incluídos como contexto na comparação de oportunidades.

## Configuração inicial pelo proprietário

1. Crie a conta no itch.io. Configure recebimento e requisitos de vendedor diretamente na plataforma.
2. Em Upload new project, escolha Game assets, escreva a apresentação da coleção, defina preço/licença e publique. Uma página de coleção pode receber vários packs; cada upload adiciona um arquivo/canal àquela página, não um anúncio independente com preço próprio. Use páginas separadas para coleções diferentes.
3. Gere uma chave em https://itch.io/user/settings/api-keys. Na central, em Loja e resultados reais, conecte a chave, selecione as páginas de destino, preencha licença e limite de tentativas e autorize uploads se desejar. A chave não deve ser enviada no chat.

Thumbnails não são publicadas nesta integração focada em assets de jogos. A API documentada do itch.io não cria/edita páginas, preços, capa ou descrição de anúncios. Esses itens são configurados na própria loja. A central gera prévia, README e rascunho de oferta no ZIP, que podem ajudar na preparação da página.

## Autonomia e limites

O upload poderá disponibilizar arquivos a compradores da coleção existente. A autorização automática abrange packs já produzidos em revisão e os próximos packs dos formatos com destino configurado. Deixe-a desligada para usar somente o botão de envio manual após sua revisão.

O relógio de 72 horas é renovado ao salvar a configuração comercial. O ciclo de produção possui seus próprios limites. Servidor adormecido não executa uploads nem consulta métricas; o trabalho autorizado retoma quando ele volta, se ainda estiver no prazo. Após uma falha de upload, a publicação automática é desligada e o resultado fica incerto, sem repetição automática. Confira o canal na loja antes de reenviar. Após interrupção do processo, um upload iniciado há mais de quatro minutos pode ser marcado como incerto na interface.

Desconectar suspende novas operações; uma operação externa já iniciada pode concluir. Reembolsos, saques, pagamentos e contato com compradores não são executados pela central. O checkout, entrega ao comprador e recebimento seguem as configurações da loja.

## Significado dos números

Visitas, compras e receita são totais históricos da página inteira e podem incluir vendas de arquivos anteriores. Não são automaticamente atribuídos a cada missão. Downloads não são vendas. Receita informada não é saldo disponível nem lucro após taxas, API, impostos e outros custos. Moedas não são somadas ou convertidas sem cotação. Campos ausentes são exibidos como não informados. Dados pessoais de compradores não são buscados nem persistidos.

## Verificação

Testes exercitam validação de destinos, isolamento de contas, criptografia da chave/grant, licença no upload, deduplicação, reserva de tentativas, falhas sem repetição, recuperação de interrupção e retomada das métricas após reinício. O butler oficial foi baixado e sua execução/versionamento verificados localmente; o Docker também verifica a versão no build. Build TypeScript/Vite e lint das telas de agentes passam.

Nenhuma conta de vendedor ou chave real itch.io foi fornecida nesta implementação. Os testes de integração usam um provedor simulado, sem anunciar produto, enviar arquivos a uma conta real ou registrar vendas reais. O primeiro upload autenticado continua dependendo da conexão do proprietário.

Fontes técnicas: https://itch.io/docs/api/serverside e https://itch.io/docs/butler/pushing.html.
