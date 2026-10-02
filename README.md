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
