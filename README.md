# HubLoan · Estação de agentes

Central de produção com execução real pela API da OpenAI. O visual de salas representa as etapas reais das missões, inspirado na central do vídeo de referência. Não há receitas ou atividades inventadas.

## Usar

Abra a central, vá em **Conectar IA**, informe uma chave da OpenAI e salve. A chave é necessária uma vez por espaço. A API tem cobrança separada do ChatGPT; configure saldo e limite de gastos na OpenAI. Geração de imagens pode exigir verificação da organização.

Escolha um exemplo ou escreva um briefing. **Criar e executar** enfileira a missão automaticamente:

- Texto/código: planejamento → produção → revisão pelo modelo → revisão humana.
- Imagem: planejamento → direção de arte → uma imagem PNG → revisão humana.

Veja **Detalhes** para acompanhar as etapas e baixar Markdown ou PNG. A aprovação registra sua revisão; não publica nada externamente. A IA não executa o código que escreve. Textos podem conter erros e precisam ser conferidos.

A conexão é compartilhada com outros dispositivos pelo **código de acesso**, disponível para download no painel. Guarde-o como uma senha: quem tiver esse código poderá acessar o espaço e usar a chave conectada. Sem ele não há recuperação do espaço. A chave do provedor fica criptografada com AES-256-GCM no banco; ela não é devolvida ao navegador.

## Disponível

- Interface responsiva em `/` e `/agentes`, com salas, agentes, fila, histórico e indicadores calculados.
- Funções de agente personalizáveis e pausa de novas tarefas.
- Produção de textos, código e imagens, sem respostas fixas ou simulação.
- Execução assíncrona, cancelamento, erros legíveis, tentativa manual e aprovação humana.
- PostgreSQL existente quando configurado; SQLite para desenvolvimento sem banco externo.
- Downloads das entregas e exportação do histórico sem chave de API.
- Exemplos de produtos digitais, thumbnails, conceitos de assets, blog e protótipos.

São funções de IA coordenadas em etapas, não trabalhadores independentes navegando na internet. Pesquisa web pode ser ativada nos projetos autônomos. Etsy e Fiverr não estão conectados. A loja própria integra publicação de todos os formatos, checkout Stripe e download protegido; o itch.io integra packs 2D/3D. Execução de código gerado continua indisponível. As alegações financeiras do vídeo não foram verificadas.

## Executar localmente

Requer Node.js 24. Instale e construa:

```bash
npm ci --prefix server
npm ci --prefix frontend
npm run build --prefix frontend
npm start --prefix server
```

Abra `http://localhost:5000`. Nenhuma configuração de banco é necessária localmente. Para desenvolvimento com recarga, execute também `npm run dev --prefix frontend`; o Vite encaminha a API para a porta 5000.

## Hospedagem e persistência

O Dockerfile da raiz constrói o frontend e inicia o servidor Node. A mesma hospedagem entrega a interface e a API. O frontend separado em Vercel também é suportado. Consulte [DEPLOYMENT.md](DEPLOYMENT.md).

As missões continuam com a aba fechada enquanto o servidor estiver ativo. Hospedagem gratuita pode dormir ou reiniciar: não há garantia de atuação 24 horas. Projetos autorizados retomam tarefas pendentes após reinício. A fila manual exige reabrir a central. Tarefas interrompidas exigem tentativa manual para evitar cobranças duplicadas. A chave fica desbloqueada em memória por até 24 horas desde o último acesso. Limite de cinco missões pendentes, 200 missões por espaço e 30 agentes. Os contadores registram chamadas concluídas; o painel da OpenAI é a referência de cobrança, inclusive em interrupções.

Com PostgreSQL os dados persistem em rede. SQLite exige disco persistente para sobreviver a redeploy na hospedagem; sem ele, use apenas desenvolvimento e exporte suas entregas.

## Verificar

```bash
npm test --prefix server
npm run build --prefix frontend
cd frontend && npx eslint src/features/agents src/app/App.tsx vite.config.ts
```

Os testes cobrem API, armazenamento, proteção de credenciais, isolamento entre espaços, cancelamento, falhas, imagens e formato da Responses API. Usam um provedor de teste; não consomem crédito nem substituem validação com uma chave real.

O código .NET e do antigo simulador de crédito permanece no repositório como legado. O runtime publicado agora é a central Node; as rotas antigas de crédito não estão expostas.

## Projetos autônomos e robôs

A estação agora possui um coordenador Orion e robôs em pixel art que percorrem os corredores quando a etapa real da tarefa muda. Clique em um robô para ver a atividade. **Testar movimento** é uma prévia visual claramente identificada, sem chamadas de IA, custos ou alterações das missões.

Em **Autonomia**, defina um objetivo, o tipo de produção, o número máximo de entregas (1–20) e o intervalo mínimo (1–1.440 minutos). Autorize o projeto para que o coordenador crie os briefings, distribua tarefas, produza e revise os textos sem depender de um clique por missão. As entregas continuam disponíveis para revisão humana; essa revisão não bloqueia a produção das próximas tarefas. Um projeto ativo por espaço. A janela de execução termina após 72 horas e pode ser retomada explicitamente se ainda houver entregas restantes.

Pesquisa na web é opcional e usa uma chamada real com ferramenta hospedada da OpenAI antes do primeiro planejamento. Referências recebidas da ferramenta aparecem no registro do projeto. A pesquisa tem cobrança adicional e não comprova vendas, demanda ou receitas de terceiros. Os conceitos devem ser originais; o coordenador não replica produtos de concorrentes.

Cada entrega acrescenta uma chamada do coordenador às etapas de produção. O limite é de quantidade e duração, **não um teto financeiro exato**: limite os gastos na conta da API. Falhas pausam a coordenação sem nova tentativa automática. Pausar o projeto impede novas tarefas; cancele missões já iniciadas na lista de missões.

Projetos autorizados usam um código de acesso encapsulado e criptografado no banco para retomar a fila após reinício, sem manter o navegador aberto. Essa autorização existe somente enquanto houver projeto ativo. A chave do servidor vem de `AGENT_ENCRYPTION_KEY` ou de uma derivação HKDF com separação de domínio da senha PostgreSQL já configurada. Em SQLite, uma chave local é gerada no diretório de dados e deve ser preservada junto com o banco. Rotacionar a chave do servidor exige renovar a autorização dos projetos pela interface. Hospedagem que dorme ainda interrompe o trabalho: não há garantia de disponibilidade 24 horas.


## Descoberta automática de oportunidades

Autonomia abre no modo **Descobrir oportunidades e escolher automaticamente**. Nome e objetivo comercial são opcionais nesse modo: informe mercado/idioma, canais que você pode utilizar, restrições e limites. Imagens exigem permissão separada. Projetos antigos continuam no modo objetivo.

Antes de cada entrega, o coordenador consulta a web (até três operações por pesquisa), guarda relatório, horário da consulta e URLs retornadas pela ferramenta, e compara de três a cinco hipóteses. Cinco notas de 0 a 5 geram pontuação determinística: demanda 25%, competição favorável 15%, viabilidade de produção 25%, distribuição 15%, evidência 20%. Essa pontuação é uma estimativa de atratividade, **não retorno financeiro esperado nem garantia de lucro**. Preços anunciados não são vendas; o horário da consulta não comprova a atualidade de cada fonte.

A seleção exige evidência >=2, produção >=3, distribuição >=2 e total >=50, fontes de pelo menos dois hosts, busca efetivamente executada e citações restritas às URLs retornadas. Nenhum candidato elegível, evidência insuficiente, resposta inválida ou truncada pausa o ciclo antes de produzir. Produtos com o mesmo título/público já encaminhados para produção não são repetidos. A oportunidade escolhida alimenta automaticamente a missão de produção e o teste comercial proposto.

Um ciclo completo de descoberta e entrega utiliza seis chamadas de API, além da cobrança das operações de busca. O limite de chamadas (1 a 200) é reservado de forma persistente **antes** de enviar cada chamada, incluindo falhas e novas tentativas; não é um limite em dólares ou reais. Uma nova entrega só começa se houver saldo operacional suficiente para todo o ciclo. O limite de entregas e a janela de 72 horas permanecem.

Na análise de cada oportunidade, **Registrar resultados do teste comercial** recebe visitas, vendas, receita e custos em BRL, com período/referência obrigatória. Resultados são declarados pelo usuário, não verificados por integração. O cálculo líquido é receita menos custos informados e não apuração contábil. O histórico de experimentos de todos os projetos do espaço é fornecido às próximas análises. Sem feedback, o coordenador não presume vendas nem fracasso.

A loja própria publica todos os formatos com preços configurados pelo proprietário, checkout Stripe e downloads após confirmação de pagamento. O itch.io recebe packs nos destinos autorizados. A divulgação automática integra Mastodon (mastodon.social) e canais Telegram após conexão e autorização. Canais apenas escritos no briefing não conectam contas. Não há execução de código gerado nem garantia de vendas.

### Produção especializada

Thumbnails 16:9, packs 2D transparentes e mobília 3D procedural agora têm pesquisa própria, arquivos ZIP para download e verificações técnicas. Veja [formatos, limites e validação](docs/SPECIALIZATIONS.md).

### Loja itch.io

Conecte sua conta na central para enviar packs 2D/3D a páginas de assets já existentes e acompanhar métricas reais. [Configuração inicial e limites da integração](docs/COMMERCE.md). A publicação automática precisa de autorização explícita na interface; não cria páginas nem altera preços.

### Loja automática para todos os formatos

Em **Loja e vendas → Sua loja automática**, conecte a Stripe e autorize o registro automático do webhook. Defina nome, contato público, licença, preços por formato e limite de produtos. Autorize abrir a loja e publicar entregas concluídas, inclusive as existentes. A criação das páginas, o checkout e a entrega do ZIP são integrados. [Configuração e limites](docs/STOREFRONT.md). A loja não traz compradores automaticamente.

### Divulgação automática

Em **Divulgação**, conecte Mastodon ou seu canal Telegram e autorize a fila por até 72 horas. Produtos da loja real geram anúncios com links rastreáveis, frequência limitada e resultados de compras confirmadas fornecidos às análises das IAs. [Configuração, limites e métricas](docs/MARKETING.md). Falhas de confirmação pausam envios; não há garantia de alcance ou vendas.

### Estratégias além de produtos

Novos projetos abrem em descoberta ampla: conteúdo de nicho, serviços, software e produtos. Cada hipótese apresenta caminho de receita, custos conhecidos/desconhecidos, teste pequeno e ferramentas necessárias. A aplicação calcula os bloqueios pelas integrações reais, prioriza hipóteses executáveis e não transforma um roteiro em vídeo publicado. Opcionalmente autorize kits privados de preparação, fora da loja. [Comportamento e limitações](docs/OPPORTUNITIES.md). Projetos existentes mantêm seu escopo.

### Melhorias e propostas de código
O painel **Melhorias** reúne diagnósticos comerciais e permite autorizar Orion, Forge e Sentinel a criar uma branch e um PR rascunho no próprio HubLoan. Escopo inicial restrito à interface/documentação, com limite de três chamadas por proposta, revisão textual separada do CI e merge/deploy somente após aprovação específica sua da versão, com testes e arquivos revalidados. Não executa terminal no Codespaces. Veja [configuração e limites](docs/ENGINEERING.md).

### Experimentos e resultado financeiro

O painel **Experimentos** salva uma hipótese, público, canal, orçamento em BRL, prazo e metas de vendas retidas/resultado, sem consumir API ou publicar. Entregas podem ser vinculadas uma vez a um teste, inclusive depois do planejamento, antes do prazo acabar. Kits privados ficam excluídos.

O servidor soma apenas pagamentos Stripe reais confirmados dos produtos vinculados, pagos dentro da janela do teste. Exclui compras de teste, outras moedas e vendas anteriores. Reembolsos posteriores continuam abatidos; valores contestados/revogados ficam retidos do resultado. Dados dos compradores não são expostos no painel.

API, taxas, impostos, divulgação, trabalho, hospedagem e outros são custos declarados pelo proprietário, em centavos de reais. Recarga da API não equivale a consumo; custos compartilhados precisam de rateio informado. Estornos preservam o histórico. O resultado só é exibido como completo após revisão explícita dos custos; novas vendas, reembolsos, produção ou lançamentos invalidam a revisão. Mesmo completo, depende dos valores declarados e não é apuração contábil.

Orçamento e prazo são instrumentos de acompanhamento: recomendações não bloqueiam cobranças nem pausam projetos/anúncios. Use os limites de chamadas e controles de pausa existentes. Encerrar a janela impede incluir pagamentos futuros no teste, mas não despublica produtos. Atingir o critério de um teste não garante retorno futuro.

### Evidências para os próximos ciclos e painel Astra

Pesquisa, comparação e coordenação recebem `commercialLearning`: até dez experimentos recentes e dez campanhas, com pagamentos Stripe confirmados separados de custos declarados e visitas não verificadas. Resultados incompletos não comprovam sucesso ou fracasso; sem distribuição, zero vendas não invalida a hipótese. O resumo não duplica receitas de campanhas e experimentos e não inclui notas de custo, credenciais ou dados dos compradores. Não muda os limites autorizados nem adiciona chamadas de modelo. É contexto para decisões futuras, não treinamento do modelo ou garantia de melhoria.

Novas decisões guardam o resumo observado e o modelo utilizado. O painel **Astra** mostra escolha, motivo, incertezas, alternativas, próximo teste e fontes reais; decisões antigas indicam dados não registrados. Abrir o painel não gasta API. Os robôs têm ferramentas por função e animações de trabalho vinculadas à execução; movimentação decorativa permanece na prévia identificada.

Vídeos continuam bloqueados: MP4, legendas sincronizadas, CapCut e publicação TikTok/YouTube não estão implementados. O painel lista o caminho de integração, OAuth, consentimento e possíveis auditorias oficiais, sem tratar roteiros privados como vídeos publicados.

### Segundo cérebro / Projeto

O painel **Segundo cérebro** usa o vault público `greenspyder/Projeto`, com Markdown e wikilinks compatíveis com Obsidian. Três referências iniciais ficam disponíveis sem API. O botão Atualizar importa até 20 referências (12 KB por arquivo, contexto limitado). Pesquisas e decisões são transformadas automaticamente em hipóteses com data, incertezas, teste e URLs registradas. Pesquisa/coordenação/produção consultam até seis notas relevantes por termos e data; sem treinamento e sem nova chamada de IA. Notas nunca concedem permissões. Dados de mercado antigos precisam de nova pesquisa.

Token GitHub separado somente para Projeto, Contents Read/write, criptografado com a chave do servidor; consentimento específico para repositório público. Conectar inicializa somente três notas ausentes. Nunca sobrescreve referências ou notas existentes. Depois grava apenas `Cerebro/IA/Pesquisas/<id>.md`, uma nota por ciclo ativo, até 30 tentativas (incluindo reserva das três iniciais) em 72 horas. Erros pausam; reconexão exige verificar o GitHub. Remover conexão mantém memória e arquivos. Acesso local da aplicação não concede permissão GitHub ao servidor.

Resultados/custos ficam privados no servidor e no backup JSON, usados pelo resumo comercial existente. Não são enviados ao vault público. Exportação JSON preserva arquivos Markdown e resumo privado; não é ZIP de vault. Não adicione dados confidenciais aos briefings autorizados para publicação.

### Política de validação comercial

As seis orientações em `VALIDATION_PRIORITIES` são incluídas em todas as chamadas reais de pesquisa, raciocínio e revisão visual pelo provedor compartilhado: pedidos públicos reais, oferta/amostra pequena, revisão humana, custos por entrega, critérios de parar/continuar e recompra com evidências. O painel Autonomia mostra a mesma política recebida do servidor; referências iniciais do segundo cérebro também a incluem. Novos experimentos devem propor público/escopo/preço/prazo, qualidade e custos desconhecidos. Estas são instruções, não controles financeiros adicionais, revisão humana automática ou integração de serviços. Não ampliam autorizações, geração de imagens, limites, prospecção privada, cobrança ou publicação.

### Modo primeira venda

Em **Experimentos**, ative “validação antes de produzir” num plano aberto sem entregas. Registre pedido/problema com URL e data, oferta/preço/prazo e critérios; crie um único rascunho e execute explicitamente em Missões. A amostra exige revisão humana e liberação vinculadas à versão antes de publicar na loja própria. O preço deve coincidir com a oferta; publicação no itch.io fica bloqueada para esse modo. Gate vale tanto para API manual quanto para worker automático. Outros projetos mantêm as autorizações existentes.

O checklist mostra o que falta comprovar. Interesse, rejeição e silêncio ficam como relatos privados do proprietário; nunca aumentam receita. Relatos entram no contexto comercial dos próximos ciclos. Recomendação de repetir exige qualidade, pagamentos retidos, custos revisados e resultado positivo; não cria projetos nem aumenta limites. Encerrar o teste não remove ofertas já publicadas. Auditoria e limites em `docs/FIRST-SALE-AUDIT.md`.

### Fábricas por atividade

O painel **Fábricas** organiza produtos editoriais, thumbnails, assets 2D, mobília procedural 3D e ilustrações. Cada unidade possui responsabilidade, público, canal pretendido, tarefas e projetos vinculados. Essas definições entram no contexto real de coordenação, produção e revisão; o formato determina o pipeline implementado. Missões anteriores e descobertas amplas são agrupadas pela especialidade do formato. Kits privados de preparação ficam fora desses produtos.

É possível cadastrar até vinte fábricas e preparar projetos pausados para uma unidade específica. Criar uma fábrica não executa chamadas nem conecta canais. O cadastro de vídeos, serviços e software registra futuras atividades, com execução bloqueada até implementar as integrações ausentes. Hipóteses pesquisadas com capacidades pendentes podem preencher um novo cadastro.

Astra e os agentes são compartilhados, com um projeto autônomo ativo por vez e os limites existentes de chamadas, orçamento, duração, revisão e publicação. As salas da estação representam etapas compartilhadas; as fábricas representam atividades comerciais. O movimento dos robôs de cada fábrica depende de missões em execução.

As reservas de API são agrupadas por missões e projetos explicitamente vinculados; não equivalem a faturas. Receitas e custos declarados vêm de experimentos exclusivos da fábrica. Testes mistos ou com entregas repetidas entre experimentos ficam fora, e resultado financeiro permanece “A apurar” sem revisão completa de custos ou quando existem testes mistos. Custos da descoberta ampla não são rateados. Não se presume lucro, demanda ou execução externa.

### Navegação e divulgação

A central agora tem rotas próprias em `/agentes/inicio`, `/agentes/base`, `/agentes/producao`, `/agentes/armazem`, `/agentes/vendas`, `/agentes/divulgacao`, `/agentes/conexoes` e `/agentes/avancado`. Links antigos com âncoras continuam direcionando à tela correspondente. O menu Conexões mostra credenciais salvas, autorizações e último erro; credencial salva não comprova disponibilidade futura do provedor. As confirmações e erros das ações ficam visíveis em uma mensagem fixa. Configurações detalhadas ficam recolhidas.

O mapa 2D incorpora todas as fábricas cadastradas, o laboratório, Astra, revisão e armazém. Clique no nome da fábrica para ver sua função e preparar um projeto; o armazém abre os arquivos. Robôs acompanham tarefas reais, com demonstração identificada separadamente. Não há rendimentos fictícios ou upgrades pagos de jogo.

Divulgação automática: Mastodon, Telegram e Bluesky. Bluesky usa uma senha de aplicativo (sem mensagens privadas), identificador público e conta hospedada pelo Bluesky; PDS externos não são aceitos. Conectar não publica: a autorização, a loja real, o limite e a validade existentes continuam necessários. Identidade e URI são conferidas antes de confirmar envio; falha incerta pausa sem repetição. Referência de protocolo: https://docs.bsky.app/docs/tutorials/creating-a-post e https://docs.bsky.app/blog/create-post . A integração é testada com respostas controladas, sem publicação em conta real durante desenvolvimento.

WhatsApp, LinkedIn, Reddit, Instagram e TikTok têm preparação manual de texto e link rastreável por produto/canal. Não há envio automático, contato privado nem criação de vídeos nesses canais. Preparar não conta como publicar nem aumenta receita. Visitas e pagamentos podem ser atribuídos ao link, mas não comprovam que a postagem foi feita naquele canal. Campanhas manuais não consomem a autorização de anúncios automáticos.
