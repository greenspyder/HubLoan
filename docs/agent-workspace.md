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


## Descoberta automática de oportunidades

Autonomia abre no modo **Descobrir oportunidades e escolher automaticamente**. Nome e objetivo comercial são opcionais nesse modo: informe mercado/idioma, canais que você pode utilizar, restrições e limites. Imagens exigem permissão separada. Projetos antigos continuam no modo objetivo.

Antes de cada entrega, o coordenador consulta a web (até três operações por pesquisa), guarda relatório, horário da consulta e URLs retornadas pela ferramenta, e compara de três a cinco hipóteses. Cinco notas de 0 a 5 geram pontuação determinística: demanda 25%, competição favorável 15%, viabilidade de produção 25%, distribuição 15%, evidência 20%. Essa pontuação é uma estimativa de atratividade, **não retorno financeiro esperado nem garantia de lucro**. Preços anunciados não são vendas; o horário da consulta não comprova a atualidade de cada fonte.

A seleção exige evidência >=2, produção >=3, distribuição >=2 e total >=50, fontes de pelo menos dois hosts, busca efetivamente executada e citações restritas às URLs retornadas. Nenhum candidato elegível, evidência insuficiente, resposta inválida ou truncada pausa o ciclo antes de produzir. Produtos com o mesmo título/público já encaminhados para produção não são repetidos. A oportunidade escolhida alimenta automaticamente a missão de produção e o teste comercial proposto.

Um ciclo completo de descoberta e entrega utiliza seis chamadas de API, além da cobrança das operações de busca. O limite de chamadas (1 a 200) é reservado de forma persistente **antes** de enviar cada chamada, incluindo falhas e novas tentativas; não é um limite em dólares ou reais. Uma nova entrega só começa se houver saldo operacional suficiente para todo o ciclo. O limite de entregas e a janela de 72 horas permanecem.

Na análise de cada oportunidade, **Registrar resultados do teste comercial** recebe visitas, vendas, receita e custos em BRL, com período/referência obrigatória. Resultados são declarados pelo usuário, não verificados por integração. O cálculo líquido é receita menos custos informados e não apuração contábil. O histórico de experimentos de todos os projetos do espaço é fornecido às próximas análises. Sem feedback, o coordenador não presume vendas nem fracasso.

Publicação, tráfego, checkout, métricas de lojas e execução de código continuam sem integração. Canais em texto são restrições de planejamento, não conexões de contas. A IA prepara produto/oferta/teste; o usuário publica e informa resultados. A arquitetura não representa um negócio comercial totalmente autônomo antes dessas integrações.
