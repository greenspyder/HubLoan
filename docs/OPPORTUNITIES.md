# Descoberta ampla e execução por capacidades

Novos projetos na interface **Autonomia** abrem com “Estratégias amplas: conteúdo, serviços, software e produtos”. O campo de texto investiga também estratégias como vídeos originais de nicho, roteiros e legendagem, serviços de conteúdo e utilitários. A pesquisa continua usando fontes reais fornecidas pela busca OpenAI, renovadas a cada ciclo. Resultados não são garantias; views ou cases de terceiros não demonstram lucro replicável.

Cada análise compara três estratégias com público, evidências, modelo de negócio, plataforma, pagador/caminho de monetização, custos de produção/API/distribuição/taxas, até três unidades de experimento e critério mensurável para continuar ou parar. Custos desconhecidos ficam explícitos; não há estimativa numérica inventada de lucro ou receita. Campos declarados pela IA não são resultados comerciais verificados.

## Execução e bloqueios

`server/opportunities.mjs` fornece capacidades reais sem credenciais. O servidor verifica o fluxo inteiro, independentemente de afirmações do modelo: vídeos requerem renderização e legendagem; TikTok/YouTube requerem publicação correspondente; serviços requerem atendimento/entrega; software requer implantação. Capacidades desconhecidas bloqueiam execução. Anúncios Mastodon/Telegram só distribuem produtos de uma loja real autorizada; não publicam vídeos nem operam serviços. itch.io exige formato e destino autorizado. Permissões expiradas, modo Stripe de teste e conexões apenas mencionadas no briefing não autorizam execução.

Entre hipóteses com evidência e pontuação suficientes, estratégias executáveis têm prioridade sobre preparação, mesmo quando esta recebe nota maior. Candidatos bloqueados permanecem visíveis com motivos. Sem candidato elegível, o projeto pausa antes de produzir. A análise exige o novo esquema no escopo amplo e rejeita resposta incompleta, fontes inventadas ou unidades fora de 1–3. Projetos existentes e clientes da API que não enviam `market.scope` permanecem em `products` para preservar contratos e permissões anteriores. A interface envia `scope:broad` em novos projetos por padrão.

“Executável” significa que as etapas de produção e publicação declaradas têm ferramentas e autorizações disponíveis no momento da análise. Não significa que o experimento terá vendas, alcance ou que sua medição será conclusiva. Limites de produtos/publicações e validade podem impedir etapas posteriores; trabalhadores revalidam autorização antes de cada ação.

## Preparação opcional

Se você marcar “Se faltarem integrações, autorizar preparar roteiros e materiais privados de teste em Markdown”, a IA poderá selecionar uma hipótese bloqueada para produzir somente materiais. Para vídeo: roteiro original, gancho, texto de legendas e instruções de edição; tempos sugeridos não são transcrição ou sincronização de um clipe. Para serviço: escopo e amostra. Para software: especificação e código não executado. Não baixa vídeos de terceiros, não edita no CapCut, não exporta MP4 e não publica no TikTok.

Essa entrega recebe `purpose:experiment-preparation`, aparece como kit privado, consome chamadas e conta no limite de entregas. O servidor impede sua publicação manual ou automática na loja; a fila automática ignora esses kits sem pausar a publicação de outros produtos. É necessário produzir um produto final separado para vendê-lo. Preparação não significa estratégia executada ou negócio validado.

Limites de chamadas, entregas, imagens e janela de 72 horas permanecem. A pesquisa ampla usa a consulta de texto já existente; quando o usuário desmarca texto, o escopo amplo ainda adiciona essa pesquisa. A análise ampla admite até 4.800 tokens de saída, comparada aos 2.600 do escopo anterior, portanto pode custar mais. O limite de chamadas não é limite financeiro exato; configure gastos no provedor. Falhas ou respostas truncadas pausam sem repetição automática.

## TikTok e CapCut

A integração de edição CapCut não existe neste projeto. A página comercial “AI Video Editor API” descreve um editor de navegador, sem oferecer ali contrato público de endpoints para esta integração; não deve ser tratada como implementação de API pronta.

A documentação oficial do TikTok restringe Direct Post de clientes não auditados a conteúdo privado, exige controle e consentimento do criador sobre o envio, prévia e configurações do post. Também exclui utilitários limitados a contas internas/equipe de seu uso pretendido. Não implementamos automação oculta de navegador para contornar essas regras. Uma integração futura precisará de um fluxo e uso compatíveis com a plataforma, auditoria e autorização aplicáveis; não basta adicionar uma chave.

Referências verificadas em 2 de outubro de 2026:
- https://developers.tiktok.com/docs/en/content-sharing-guidelines
- https://www.capcut.com/features/ai-video-editor-api

Os testes usam pesquisa e modelos simulados. Validam bloqueios, permissões, isolamento de materiais, escolha de hipótese executável e limites; não comprovam qualidade dos insights ou resultados financeiros com uma conta real.
