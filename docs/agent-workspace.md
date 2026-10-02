# Arquitetura da estação

React/Vite consulta uma API Node pelo mesmo domínio ou `VITE_API_BASE_URL`. Cada navegador gera 256 bits aleatórios para seu código de acesso. O hash identifica o espaço; o código, apresentado como bearer token, criptografa/descriptografa a chave OpenAI no servidor. Não se trata de login por e-mail: backup do código é responsabilidade do usuário.

`server/domain.mjs` valida entidades e transições. `store.mjs` persiste JSON com revisão e compare-and-swap, no SQLite ou PostgreSQL. `runner.mjs` consome a fila e salva cada etapa. `provider.mjs` é o adaptador real da Responses API e Images API. `app.mjs` expõe apenas a API de agentes, protege artefatos e serve a SPA.

Estados: rascunho → fila → executando → revisão humana → aprovado. Erros e cancelamentos permitem nova tentativa explícita. O worker nunca publica ou executa código produzido. Pausar agente impede novas execuções; para parar uma execução existente, use cancelar. Contadores de tokens são cumulativos nas tentativas; chamadas sem resposta completa podem não entrar no contador, embora sejam cobradas pelo provedor.

A estação mostra salas de planejamento, produção, revisão e entrega a partir do estado e da fase real. Não cria missões, pessoas, ganhos, pesquisa externa ou progresso artificial para animar a interface. A inspiração do vídeo está nos casos de uso e no painel de operações, não na promessa de faturamento.

A fila desbloqueada vive em memória por até 24 horas desde a última visita. Reinício exige nova visita para desbloquear com o código do navegador. Uma execução com lease vencido falha e requer tentativa manual. Persistência PostgreSQL sobrevive a reinícios; SQLite requer disco durável em produção. O teste automatizado usa um provedor injetado; geração real exige uma chave com saldo e acesso ao modelo.

## Coordenador e mapa

`autonomy.mjs` define projetos, limites, grants, validação dos briefings JSON e reconciliação. `runner.mjs` alterna a criação da próxima tarefa com o processamento de missões. A escolha usa o objetivo, referências opcionais e resumos das entregas anteriores. A pesquisa usa `web_search` na Responses API com fonte real retornada por anotações; conteúdo externo é tratado como dados, não instruções.

Projetos param em falhas, cancelamentos, limite de quantidade ou janela de 72 horas. Não há aprovação humana obrigatória entre entregas, mas não existe publicação automática. O grant criptografado permite reabrir a chave do provedor no servidor durante um projeto autorizado. Os retornos públicos nunca incluem o grant ou a chave. Pausa/conclusão revoga o grant; disconnect também cancela a coordenação e as missões pendentes.

`StationMap.tsx` mostra os agentes cadastrados e a função Orion. As posições são derivadas das fases; a Web Animations API percorre corredores entre as salas. Movimento decorativo não marca entregas como prontas nem produz tokens. Uma prévia opcional é explicitamente rotulada e independente dos dados reais. Motion reduzido desativa a animação.
