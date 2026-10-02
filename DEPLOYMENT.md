# Publicação da central

O runtime ativo usa Node.js 24 e o Dockerfile da raiz. Esse Dockerfile constrói o frontend e entrega interface + API no mesmo serviço. Os projetos .NET antigos permanecem como legado.

## Render existente

Use o repositório existente, contexto na raiz e `Dockerfile` na raiz. O servidor respeita `PORT` e oferece `/health`. Se o serviço já tinha Neon, mantenha `DATABASE_URL` ou `ConnectionStrings__DefaultConnection`: ambos são lidos automaticamente. Formatos aceitos: URI PostgreSQL e conexão .NET `Host=…;Username=…;Password=…;Database=…;SSL Mode=Require`.

Uma tabela nova `agent_workspaces` é criada automaticamente. Nenhuma tabela do módulo de crédito é alterada. Se uma conexão PostgreSQL configurada falhar, o serviço falha explicitamente; não migra silenciosamente para um banco vazio.

Sem conexão de banco, usa SQLite em `/app/data/agents.sqlite`. Esse modo precisa de disco persistente em produção. Em serviço efêmero, os dados podem desaparecer no redeploy. A conexão Neon existente é a opção indicada.

`FRONTEND_ORIGIN` adiciona uma origem permitida. A origem Vercel já conhecida `https://hub-loan.vercel.app` também está permitida. A interface no próprio serviço não precisa de CORS ou de variáveis Vite.

## Vercel existente

Projeto na pasta `frontend`, instalação `npm ci`, build `npm run build`, saída `dist`. `frontend/vercel.json` encaminha `/api/agents/*` ao backend existente `https://hubloan.onrender.com` e mantém rotas da SPA.

Se já existe `VITE_API_BASE_URL=https://hubloan.onrender.com/api`, pode mantê-la. Se não existe, o proxy de mesma origem é usado. As URLs são os alvos anteriores deste repositório; este documento não afirma que o deploy foi concluído.

## Ativar a IA

Na interface, conecte uma chave da OpenAI. Não coloque chave em `VITE_*`, arquivos do repo, URL ou conversa. Ela é validada no provedor e armazenada criptografada. Não exige variável de ambiente do provedor no servidor. O código de acesso gerado pelo navegador é o segredo necessário para desbloquear o espaço; baixe o backup pelo painel.

Chamadas podem gerar custos. Conectar valida o acesso ao modelo de texto, mas saldo disponível e autorização de imagem só são confirmados em uma geração real. O app registra falhas de autorização, saldo, limite e conexão sem expor a chave.

## Limites operacionais

Um worker executa as etapas em sequência, com no máximo cinco missões pendentes por espaço. Cancelamento interrompe a conexão local; chamadas já enviadas podem ser cobradas. Não há tentativas automáticas após interrupção. Serviços gratuitos podem dormir, portanto não há atuação contínua garantida. Após reinício, projetos autorizados retomam a fila; para a fila manual, reabra o app; após uma interrupção longa, aguarde o prazo de dez minutos ou use cancelar antes de tentar novamente.

## Autonomia persistente

O servidor descobre projetos ativos no banco e retoma tarefas pendentes após reinício. A autorização do navegador é armazenada encapsulada com AES-GCM e uma chave de servidor. Preferencialmente configure `AGENT_ENCRYPTION_KEY` com um segredo aleatório de pelo menos 32 bytes; sem variável nova, a senha da conexão PostgreSQL existente alimenta uma derivação HKDF com domínio exclusivo. A senha precisa ter ao menos 12 caracteres. A API informa `autonomy.durable` para a interface. Se não houver segredo estável suficiente, a ativação autônoma é bloqueada explicitamente.

No desenvolvimento SQLite, `autonomy.key` é gerada automaticamente com permissão 0600 no diretório do banco. Preserve ambos no volume persistente. Não faça commit da chave ou do banco. Alterar o segredo do servidor pausa projetos cuja autorização anterior não pode ser aberta; o usuário precisa retomar pela interface.

Não execute múltiplas réplicas para aumentar o paralelismo sem um scheduler distribuído dedicado. As revisões de banco protegem os claims de tarefas e projetos, mas esta versão foi projetada para um worker por serviço. A descoberta percorre páginas de espaços ativos e a fila alterna entre usuários.


## Descoberta automática de oportunidades

Autonomia abre no modo **Descobrir oportunidades e escolher automaticamente**. Nome e objetivo comercial são opcionais nesse modo: informe mercado/idioma, canais que você pode utilizar, restrições e limites. Imagens exigem permissão separada. Projetos antigos continuam no modo objetivo.

Antes de cada entrega, o coordenador consulta a web (até três operações por pesquisa), guarda relatório, horário da consulta e URLs retornadas pela ferramenta, e compara de três a cinco hipóteses. Cinco notas de 0 a 5 geram pontuação determinística: demanda 25%, competição favorável 15%, viabilidade de produção 25%, distribuição 15%, evidência 20%. Essa pontuação é uma estimativa de atratividade, **não retorno financeiro esperado nem garantia de lucro**. Preços anunciados não são vendas; o horário da consulta não comprova a atualidade de cada fonte.

A seleção exige evidência >=2, produção >=3, distribuição >=2 e total >=50, fontes de pelo menos dois hosts, busca efetivamente executada e citações restritas às URLs retornadas. Nenhum candidato elegível, evidência insuficiente, resposta inválida ou truncada pausa o ciclo antes de produzir. Produtos com o mesmo título/público já encaminhados para produção não são repetidos. A oportunidade escolhida alimenta automaticamente a missão de produção e o teste comercial proposto.

Um ciclo completo de descoberta e entrega utiliza seis chamadas de API, além da cobrança das operações de busca. O limite de chamadas (1 a 200) é reservado de forma persistente **antes** de enviar cada chamada, incluindo falhas e novas tentativas; não é um limite em dólares ou reais. Uma nova entrega só começa se houver saldo operacional suficiente para todo o ciclo. O limite de entregas e a janela de 72 horas permanecem.

Na análise de cada oportunidade, **Registrar resultados do teste comercial** recebe visitas, vendas, receita e custos em BRL, com período/referência obrigatória. Resultados são declarados pelo usuário, não verificados por integração. O cálculo líquido é receita menos custos informados e não apuração contábil. O histórico de experimentos de todos os projetos do espaço é fornecido às próximas análises. Sem feedback, o coordenador não presume vendas nem fracasso.

Publicação, tráfego, checkout, métricas de lojas e execução de código continuam sem integração. Canais em texto são restrições de planejamento, não conexões de contas. A IA prepara produto/oferta/teste; o usuário publica e informa resultados. A arquitetura não representa um negócio comercial totalmente autônomo antes dessas integrações.
