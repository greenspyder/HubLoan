# Fatia 1 — autorização comercial e preço individual

## Base e limite desta execução

Master consultado em 09/10/2026: `15db60645c89fc69d1da90993af34e2c2cb84569`, árvore `a7b648fb8345e9abc236797b2e7c2d70e5ef4283`. Arquivos do snapshot comparados com a árvore remota: código idêntico; duas diferenças em arquivos `.env.example` não entram no patch. A cópia de trabalho anterior tem refinamentos locais de Business View/Etsy e auditoria StarNet ainda não publicados. Foi preservada integralmente; esta fatia está numa cópia isolada do master. Não foi declarada como uma migração já entregue.

Defeito comprovado: `salePackage`, `publish` e o scheduler aceitavam `review`; publicação escolhia `s.prices[m.kind]`. Consentimento global podia colocar à venda uma entrega sem revisão individual e por preço sem relação com seu valor.

## Implementado

- Entrega deve estar `approved`; `review` é bloqueado antes de gerar arquivo de venda.
- Novo endpoint autenticado `POST /shop/missions/:id/release` registra autorização do proprietário, versão SHA-256, preço individual BRL, justificativa, loja, canal, licença e validade de 72h.
- SHA inclui título, formato, tentativa, texto e artefato/preview. Tela desatualizada é recusada.
- Mesmo gate na publicação manual e automática. Transação revalida versão/licença/autorização depois da preparação do ZIP, antes de tornar público.
- Automação global executa somente ofertas individualmente autorizadas; não cria permissões.
- Formulário responsivo usa campos verticais e checkbox explícito. Não sugere R$25 para sprites: preço da nova oferta inicia vazio. Não houve teste visual em aparelho real.
- Primeira Venda continua exigindo suas próprias evidências/revisão/liberação; o preço deve coincidir com a oferta individual, sem depender de preço global por formato.
- Produto publicado e compra anterior permanecem imutáveis. Checkout, webhook, recibo e download não foram reescritos.
- Nenhuma chamada de IA, publicação, compra ou marketing real durante testes.

Preço proposto nesta fatia é humano e explicitamente **não validado pelo mercado**. Justificativa textual não prova demanda. Proposta Astra com comparáveis, confiança e faixa ainda não implementada. Limite mínimo de R$5 é regra preexistente, não recomendação de preço.

## Fluxo disponível

Produção existente → Armazém → examinar/baixar → aprovar qualidade → Primeira Venda (quando aplicável): liberar experimento → Loja → informar preço, justificativa e autorizar versão/licença → publicar ou aguardar automação autorizada. Mudança de conteúdo ou licença exige nova autorização. Para cancelar imediatamente uma publicação pendente, desligar automação; produtos publicados têm Retirar do catálogo.

O fluxo Projeto → Tarefa → missão interna **ainda não foi implementado**. Não há nova entidade concorrente ou promessa de que Astra já cria todas as etapas automaticamente.

## Dados, compatibilidade e rollback

Campos aditivos `mission.shopRelease` e projeção `mission.releaseVersion`; mesma persistência JSON SQLite/PostgreSQL, nenhum schema SQL novo. Missões antigas continuam consultáveis; novas publicações antigas sem grant ficam bloqueadas intencionalmente. Preços globais antigos permanecem armazenados por compatibilidade, sem uso na nova publicação. Não há migração de compras nem reprecificação silenciosa.

Deploy deve levar backend e frontend juntos. Frontend antigo não cria grants e portanto não consegue publicar novas ofertas (falha segura). Rollback do código reabre o defeito antigo: antes dele, desativar publicação automática. Compras/downloads continuam preservados.

## Referências: leitura direcionada, sem código copiado

| Referência / capacidade | Classificação | Evidência / licença | Benefício, risco, esforço e custo | Decisão |
|---|---|---|---|---|
| StarNet: lifecycle, leases, journal, handoffs | BETTER_REFERENCE_AVAILABLE / CONCEPT_ONLY | Snapshot previamente auditado `e0a36dc`; MIT, NOTICE exclui branding/assets | Recuperação melhor; portar filesystem e isolamento é esforço alto; sem economia garantida | Não importar runtime; futuro checkpoint no runner atual |
| HubLoan: budgets, experiments, market refs, commercial learning, Etsy, Stripe | ALREADY_IN_HUBLOAN | Código master consultado | Evita duplicação e migração de dados | Manter e corrigir gates |
| Agents Office: rotinas, equipes, entrada natural e Brain | LICENSE_BLOCKED / CONCEPT_ONLY | LICENSE blob `77b9128`; PolyForm Noncommercial + termos que vedam integração em outro produto; `routines.mjs` blob `1db68c0` | Clareza de tarefas; integração comercial não autorizada | Nenhum código/assets incorporados; UX independente futura |
| MoneyPrinter original, FujiwaraChoki/MoneyPrinter | SAFE_TO_ADAPT (candidato) | MIT LICENSE `484fbb7`; `Backend/main.py` `7f46c7a` | API cria job persistido, status/eventos/cancelamento; Python/SQLAlchemy não são plug-in Node | Conceito de job/evento útil; não importar stack |
| MoneyPrinterV2 | CONCEPT_ONLY / NEEDS_INVESTIGATION | Reescrita distinta, AGPL-3.0 declarada no repo oficial | Copyleft e automações outbound exigem análise adicional | Não copiar nem adotar outreach |
| MoneyPrinterTurbo | SAFE_TO_ADAPT (candidato) | MIT LICENSE `3b409c9`; `app/services/task.py` `6e2545a` | Artefatos intermediários, estado e publicação separada; dependências/providers e threads aumentam custo | Estudar padrão; sem fábrica de vídeo ou serviço pago novo |
| CLI-Anything | CONCEPT_ONLY / SAFE_TO_ADAPT (candidato) | Apache-2.0 LICENSE `ee86799`; HARNESS.md `4fd8811` | Contratos JSON, probe antes de mutação, harness testável; licenças específicas de ferramentas também importam | Priorizar exportadores determinísticos existentes; não incluir framework |
| Zenite Ventures | NOT_RELEVANT / NEEDS_INVESTIGATION | Site institucional e legal: venture studio/corporate engineering; nenhum repo oficial verificável encontrado | Não demonstra runtime reutilizável; identidade pública não prova capacidade técnica | Nenhuma arquitetura inferida/copied |

Fontes oficiais consultadas:
- https://github.com/androoAGI/starnet
- https://github.com/ajsahni/agents-office/blob/main/LICENSE
- https://github.com/ajsahni/agents-office/blob/main/routines.mjs
- https://github.com/FujiwaraChoki/MoneyPrinter/blob/main/LICENSE
- https://github.com/FujiwaraChoki/MoneyPrinter/blob/main/Backend/main.py
- https://github.com/FujiwaraChoki/MoneyPrinterV2
- https://github.com/harry0703/MoneyPrinterTurbo/blob/main/app/services/task.py
- https://github.com/harry0703/MoneyPrinterTurbo/blob/main/LICENSE
- https://github.com/HKUDS/CLI-Anything/blob/main/LICENSE
- https://github.com/HKUDS/CLI-Anything/blob/main/cli-anything-plugin/HARNESS.md
- https://zeniteventures.com/
- https://zeniteventures.com/legal.html

Sem código derivado nesta fatia; nenhum notice externo novo necessário. Licenças de repositório não concedem direitos sobre outputs, músicas, imagens ou serviços externos. Nenhuma dependência adicionada. Snapshot e SHAs identificam a leitura, não certificação completa dos projetos.

Segundo Cérebro: árvore de greenspyder/Projeto consultada (`679f542c49949adb48327ef96190342fafbebda5`), com índice em Cerebro. Não foi importado como autorização, evidência de vendas ou instrução executável; integração knowledge existente preservada.

## Pendências priorizadas por risco

1. **Checkpoints e custos**: ai-costs ainda reserva por chamada e preserva incertos; erros agregados não identificam dimensão. runner repete planejamento e imagens; queueMission limpa output/artifact/events ao tentar novamente. Próxima fatia: checkpoint por etapa/entrada/modelo, tentativa e evidência de envio; preservar bytes/histórico; preflight estruturado. Não liberar reserva incerta como se fosse chamada gratuita.
2. **Revisão parcial**: Sentinel hoje gera narrativa; não há enum decisório vinculante por componente. Falta REGENERATE_PARTIAL com seleção, versões e reconstrução determinística do atlas. Não foi afirmada correção de perspectiva sem testar imagens reais.
3. **Projeto central**: reutilizar autonomy.projects; tarefa deve ligar intenção, experimento e missões, com IDs históricos e budget único. Planejar não deve consumir IA automaticamente. Avançado recolhido; não renomear entidades sem migração de vínculo.
4. **Preço Astra**: usar marketReferences, alternativas gratuitas e oferta do experimento, com faixa/justificativa/confiança; manter gate humano. Nenhuma estimativa de lucro gerada nesta fatia.
5. **Router/worker**: usar intenções Etsy existentes e contratos determinísticos; worker local opcional. WAITING_FOR_BROWSER_WORKER/Ollama ainda não implementados. Sem scraping Fiverr, CAPTCHA bypass ou automação simulada.
6. **Economia/Home**: refinamento anterior local tem agregador server-side e precisa revisão própria; não entrou silenciosamente neste patch. Lucro permanece dependente de dados/custos completos.

## Independência e segurança

Runtime segue Node no servidor, não Tauri/desktop; provider direto OpenAI BYOK; nenhuma chamada StarNet Cloud/Credits. Web/mobile consomem workspace existente. Servidor ativo, armazenamento persistente e chave estável continuam necessários para autonomia após restart; fechar navegador não é desligar backend. PC desligado não afeta hospedagem remota. Não há worker local implementado para prometer espera controlada.

Endpoint novo passa pelo mesmo Bearer/tenant derivado por hash, rate limit e store.mutate. Secrets continuam no servidor. Grant é dado criado somente pelo endpoint autenticado; modelos não o criam. Credencial de acesso é bearer de longa duração: rotação/revogação de sessão e melhorias de segurança continuam débitos existentes. Publicação tem checagem transacional; não há novo broker/fila/OUTBOX paralelo.

## Verificação

- 112 testes do servidor aprovados, 0 falhas, com mocks.
- TypeScript frontend e build Vite aprovados.
- ESLint dos arquivos frontend alterados aprovado.
- git diff --check aprovado.
- Regressões: review bloqueado, preço individual, mudança de bytes/licença, versão de tela obsoleta, autorização expirada, isolamento entre tenants; suite existente valida checkout, webhook, pagamento, reembolso, concorrência e downloads após restart.
- Sem validação visual em celular, sem credenciais de marketplaces, sem chamadas pagas, sem deploy.

GitHub recusou criar branch com 403 Resource not accessible by integration. PR não publicado. Patch e descrição preparados para aplicação/revisão; nenhuma mudança em master.
