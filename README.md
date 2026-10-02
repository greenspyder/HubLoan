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

São funções de IA coordenadas em etapas, não trabalhadores independentes navegando na internet. Pesquisa web pode ser ativada nos projetos autônomos. Etsy, Fiverr, pagamentos, vendas, publicação e execução de código **não estão conectados**. Um conceito de assets é uma imagem única, não um pacote de sprites. As alegações financeiras do vídeo não foram verificadas.

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
