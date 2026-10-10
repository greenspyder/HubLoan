# Revisão iterativa do Armazém

Em Detalhes: Aprovar, Rejeitar com feedback ou solicitar ajustes em objetos selecionados de um pack de quatro sprites. Ajustes regeneram esses objetos e refazem a revisão visual, sob os limites existentes. Não autorizam publicação.

O servidor valida estado, versão e integridade dos checkpoints. Preserva briefing/especificação, reutiliza os objetos não selecionados, acrescenta feedback aos prompts selecionados e reconstrói atlas, manifesto, cena e ZIP. A nova entrega retorna à revisão humana. Se falhar, Retomar etapas pendentes reutiliza os ajustes já concluídos.

Versões anteriores (artefato, texto e checkpoints) permanecem privadas em `mission.revisions`. Metadados permitem baixar ZIPs anteriores pelo endpoint autenticado `GET /missions/:id/artifact?version=:revisionId`. `mission.reviews` conserva decisões e feedback. Ledger e contadores cumulativos não são zerados. Dados antigos continuam compatíveis; packs sem quatro checkpoints íntegros não iniciam ajuste parcial.

Rejeição bloqueia aprovação/publicação da entrega atual e mantém arquivos. Aprovação de qualidade continua separada da autorização comercial de versão, preço e canal. Produtos já publicados/comprados não são alterados.

## Limitações

- Ajuste parcial apenas para sprites com checkpoints completos. Texto, thumbnail e 3D aceitam rejeição com feedback, sem regeneração automática nesta fatia.
- Feedback compartilhado entre objetos selecionados; ajustes distintos podem ser feitos em revisões sucessivas.
- Sentinel ainda fornece avaliação textual. Decisões estruturadas APPROVE / REGENERATE_PARTIAL / REJECT são a próxima prioridade.
- Revisão humana necessária para perspectiva, originalidade e valor comercial.
- Versões aumentam armazenamento. Retenção futura deve preservar trabalho pago e referências de compras.

## Verificação

Providers simulados: correção de um sprite, preservação byte a byte dos outros três, atlas reconstruído, falha de revisão e retomada sem regenerar imagem, segunda revisão, custos, rejeição, legado e versão obsoleta. Sem chamadas pagas ou publicação real.
