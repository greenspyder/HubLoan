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

Um worker executa as etapas em sequência, com no máximo cinco missões pendentes por espaço. Cancelamento interrompe a conexão local; chamadas já enviadas podem ser cobradas. Não há tentativas automáticas após interrupção. Serviços gratuitos podem dormir, portanto não há atuação contínua garantida. Após reinício, reabra o app; após uma interrupção longa, aguarde o prazo de dez minutos ou use cancelar antes de tentar novamente.
