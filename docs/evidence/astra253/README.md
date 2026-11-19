# Astra One-Line Production 2.5.3

## Base e auditoria
[Auditoria anterior à implementação](AUDIT.md). Base master `0ab050fe8684f859f345e815fd24b194884820f9`, PR #28. A 2.5.2 estava integrada e publicada. A inspeção encontrou predominância verde no CSS existente; esta entrega usa superfície neutra no Creative Studio sem alterar as outras fábricas.

## Alterações efetivas
- Entrada principal em `/agentes/viral`: “O que vamos criar hoje?”, briefing até 4000 caracteres (incluindo 1–2 linhas), sugestões, consentimento explícito para modelo/pesquisa, acesso ao orçamento central e Modo Avançado. Nenhum seletor técnico obrigatório. Uma produção por padrão, quantidade interpretada pelo modelo (1–3) e confirmada no plano antes de gerar.
- `astra-one-line.mjs`: interpretação estruturada pelo modelo → pesquisa contextual quando necessária → três premissas internas e comparação qualitativa → seleção da quantidade solicitada → planos executáveis → autorização financeira existente. Nenhum roteiro predefinido no runtime. Idioma padrão PT-BR, tom respeita intenção; suspense não passa pelo prompt de comédia. Preserva identidade global aprovada.
- Capacidade deriva do registro existente e dos estados verificados de conexão, sem expor segredos. Higgsfield somente imagens; ElevenLabs somente perfil global aprovado conectado. Mídia local/externa conforme capacidades. Não confunde chave salva com verificada. Recursos usados ficam no plano e no relatório.
- Reutilizados runner, fila, leases, checkpoints, operações externas, controles de custo, snapshots, revisão, galeria e armazém. Campanhas legadas ainda fazem três produções; o novo modo não as migra silenciosamente.
- Autorização commentary aceita um lote explicitamente planejado de até três vídeos, mantendo reserva compartilhada, limite diário, versão de plano e fila. Sem orçamento/consentimento, nenhuma geração externa inicia. Estimativa de preço não fornecida permanece desconhecida; autorização não garante o preço final do provedor.
- Edição avançada preserva a gramática narrativa do plano. Detalhes de pesquisa/planos/snapshots só seguem na projeção do item selecionado. Falha por orçamento desativado agora tem código BUDGET_REQUIRED.

## Bloqueador narrativo
Causa confirmada: `creative-plan.mjs` juntava duração incorreta e exigência universal de `hook/development/payoff` numa única mensagem. Humor curto válido podia ser recusado por não ter literalmente `development`; o fluxo tentava regenerar o lote inteiro.

`narrative-validation.mjs` aplica contratos por gênero: tradicional, comédia, meme, montagem e comentário. Aceita termos como `situation/twist` e `premise/distortion/reaction`, mantendo ações, timeline, duração, fala e progressão visual validadas. Duração recebe erro próprio. Erros reparáveis identificam regra e campo. O modelo só pode devolver o valor daquele campo; o backend rejeita alterações fora dele. Uma tentativa localizada por plano, sem aumento do limite de tentativas. Partes válidas e respostas pagas ficam preservadas.

Regressão em `server/tests/astra253.test.mjs`: reproduz a condição exata e a mensagem anterior, repara apenas o beat intermediário de um plano de humor e demonstra aceitação. Também recusa timeline errada, ação desconhecida e patch fora do escopo. Não temos o JSON/log privado da campanha histórica; não afirmamos qual campo específico veio nela.

## Pesquisa e aprendizado
Pesquisa usa `budgeted.research` existente (OpenAI web_search, política strategy, no máximo uma busca). Fontes HTTPS citadas, data e incertezas registradas. Cache por workspace/query/model/idioma por seis horas, até vinte registros; sem fontes ou sem busca efetiva, estado UNVERIFIED_CONTEXT. Não há scraping TikTok, feed privado, métricas inventadas ou alegação de tendência comprovada. Erros de rede/cota/timeout propagam para recuperação, não para nova premissa. Interpretação, pesquisa e snapshot de capacidades são reutilizados ao retomar, evitando mudança de chave de checkpoint e novas chamadas inadvertidas.

Memória reaproveita contexto de rejeições e evidências de audiência existentes e inclui planos anteriores na decisão; não há treinamento estatístico novo. O contrato de métricas existente continua dependente de observações reais/autorizadas. Nenhuma publicação implementada ou iniciada.

## Validação executada
- Suíte backend: **327 testes, 318 aprovados, 9 skips opcionais, zero falhas** (`backend-tests.txt`). Inclui regressões existentes de voz, finanças, isolamento, recuperação, cancelamento, concorrência e renderer.
- Novos testes: **14 aprovados** (`astra-tests.txt`). Quatro briefings A–D, intenção/idioma/quantidade, fontes/cache/expiração/isolamento, premissas, reparo localizado, orçamento, timeout e resultado desconhecido após reinício.
- Build frontend: aprovado (`build.txt`). Lint do módulo de agentes: aprovado (`module-lint.txt`). Lint global: **11 erros e 2 avisos preexistentes**, fora do escopo; registrados em `global-lint.txt`, já documentados na 2.5.2. Aviso de bundle >500KB permanece.
- Navegador Chromium local desktop 1440 e mobile 390: formulário principal, sugestão, consentimento, central financeira preservando briefing, avançado, navegação para campanha individual, erro real por ausência de chave e sem overflow horizontal. `ui/result.json` e screenshots. Regressão da 2.5.2: grids, paginação, seleção, filtros, preview individual, orçamento, Escape e proteção de chaves aprovados com fixtures locais.

## Evidências: distinguir planejamento, execução e arte
- `ui/`: screenshots reais da aplicação local; dados sintéticos identificados, sem conta ou campanha fictícia em produção.
- `workspace-regression/`: aplicação local com fixtures da regressão da 2.5.2, não dados reais de produção.
- `controlled-local-composition.mp4`: **MP4 novo produzido pelo runner e FFmpeg reais**, 15s / 360×640 / 9:16, diagramas com movimento, sem narração. O modelo de planejamento foi simulado para teste. **Não comprova criatividade autônoma de um modelo real, qualidade de humor ou integração paga.**
- `controlled-local-run.json`: IDs, eventos, plano, relatório e hash do arquivo. O teste chegou a ReadyForReview, nunca aprovação artística automática.
- Teste de interrupção: interpretação/pesquisa concluídas não repetidas; resultado externo desconhecido bloqueou retomada sem autorização. Após consentimento explícito exclusivamente no teste, apenas o planejamento pendente foi enviado.

## Limitações reais
- Não foram usadas credenciais privadas nem consumidos créditos para geração/pesquisa real nesta entrega. Pesquisa via API, interpretação de referências culturais reais e qualidade das falas/visuais finais precisam de validação com conta e orçamento autorizados. Fixtures não são apresentadas como prova de tendências ou criatividade.
- O adaptador de composição existente é 2D em 360×640, 15–30 segundos e 3–5 cenas. Não gera atuação livre, lipsync, clipes Higgsfield, música ou efeitos sonoros nesse fluxo. A Astra deve declarar adaptações. Diagramas abstratos não equivalem à encenação de Neymar ou do meme; cenas premium precisam de conexão e consentimento. Formatos 3D antigos continuam no modo avançado, não são escolhidos automaticamente pelo novo planner.
- Narração nesse adaptador segue ElevenLabs PT-BR global aprovado. Sem ele, plano deve declarar silêncio; nenhum fallback disfarçado. Outros idiomas podem ser planejados como texto, mas a narração remota atual permanece PT-BR. Não houve troca de voz oficial.
- Reparo localizado abrange regras narrativas, duração agregada e progressão visual; JSON inválido/ações incompatíveis não são reescritos ilimitadamente: falham com resultado preservado e pedido de novo plano.
- Lote múltiplo pode ser revisado/autorizado, mas edição individual de cenas do lote ainda não é suportada; bloqueio explícito evita sobrescrever planos.
- Comparação criativa é julgamento do modelo; não garante piada boa, originalidade absoluta, retenção ou viralidade. Revisão humana continua obrigatória.

## Uso
1. Abra o Creative Studio e escreva uma ideia. Autorize planejamento/pesquisa nos limites da Central financeira.
2. Acompanhe a campanha selecionada; veja adaptação, fontes e plano. A edição avançada está disponível para um plano.
3. Consulte estimativas e autorize aquele plano na Central financeira. Mesmo sem API paga de mídia, a produção local requer confirmar o plano.
4. Revise o MP4 na galeria. Nada é publicado nas redes automaticamente.

Merge, SHA e deploy são registrados na PR após CI e verificação da publicação. Nenhum gasto de geração foi realizado.
