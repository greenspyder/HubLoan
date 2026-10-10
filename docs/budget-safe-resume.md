# Orçamento e retomada segura de produção

Esta fatia complementa a segurança de publicação já incorporada pelo PR #2 e inclui a correção preparada de consultas ociosas (`fe128ad`). Não modifica preços publicados, compras, consentimentos ou canais de venda.

## Comportamento implementado

- O runner verifica a exposição conservadora de todas as chamadas restantes da entrega antes de iniciar produção paga. A checagem por chamada continua sendo atômica no ledger existente; o preflight inicial não reserva toda a execução e chamadas concorrentes ainda podem bloquear uma etapa posterior.
- Bloqueios identificam dimensão (chamada/tarefa/dia/mês/experimento), exposição, limite, valor necessário e operação. A API devolve `budgetBlock`; missões mantêm esse diagnóstico e mensagem legível.
- Configurações rejeitam reservas individuais maiores que qualquer limite correspondente. Limites diários e mensais seguem UTC. Não há conversão automática de USD para BRL.
- O ledger distingue `pending`, `completed`, `uncertain` e `not_sent`, com `sentAt` e ID de tentativa quando a chamada pertence a uma missão. `sentAt` registra entrada no despacho ao provider, não confirmação de recebimento remoto. Falha anterior ao despacho não retém exposição. Chamadas enviadas e incertas mantêm reserva conservadora.
- `confirmedMinor` permanece nulo sem confirmação externa de custo em BRL. Nenhum valor de reserva ou estimativa USD vira receita, lucro ou gasto confirmado. Entradas antigas sem custo confirmado mantêm exposição conservadora. Estimativas de texto não incluem ferramentas, imagens ou câmbio.
- Retry conserva eventos, tokens, imagens, saída e artefato existentes, adicionando histórico de tentativa e um novo UUID de execução.
- Respostas de produção são persistidas por etapa, incluindo as imagens antes de normalização/atlas/ZIP. O contexto inicial é congelado para evitar repetir chamadas quando o segundo cérebro muda. Checkpoints usam hash de entrada e resultado; um checkpoint corrompido bloqueia a execução em vez de regenerar silenciosamente.
- A retomada reusa respostas concluídas em texto, imagem e visão. Atlas/ZIP são reconstruídos deterministicamente. Contadores e reservas não são duplicados por checkpoint ou cache de texto.
- Resultados que chegam após cancelamento são preservados, sem reativar a missão. Dados binários de checkpoints não são enviados em `/workspace`; a interface recebe apenas a contagem de etapas concluídas.
- Os limites de chamadas do projeto são incrementados após autorização orçamentária, imediatamente antes do despacho. Planejamento continua usando a arquitetura existente.

## Compatibilidade e limites

Campos novos são aditivos no JSON persistido; não é necessária migração SQL. Missões antigas sem checkpoints preservam os artefatos que já existirem, mas não é possível recuperar resultados que a implementação anterior nunca salvou.

Checkpoints cobrem a produção de missões. A pesquisa/coordenação do projeto não ganhou um segundo sistema de checkpoints nesta fatia. Qualidade visual estruturada, feedback humano e regeneração parcial intencional ficam para a próxima etapa. Uma imagem salva mas tecnicamente inválida não é regenerada só por clicar em retomar.

Uma interrupção entre resposta HTTP e gravação no banco ainda pode deixar cobrança incerta sem resposta recuperável; não se promete exactly-once em APIs externas. A reserva é mantida e o usuário decide se autoriza outra tentativa dentro dos limites. Checkpoints aumentam o tamanho persistido do workspace durante produção; mover binários para armazenamento separado pode ser necessário antes de escalar volume.

## Verificação

Testes usam providers simulados e SQLite, sem compras, publicação real ou chamadas pagas. Incluem: falha no quarto sprite com retomada após restart sem repetir os primeiros três, histórico/artefatos legados preservados, preflight sem envio, dimensões de bloqueio, reservas incertas, chamada não enviada, cancelamento com resposta tardia e integridade/privacidade de checkpoints.

Executar:

```
npm test --prefix server
npm run build --prefix frontend
cd frontend && npx eslint src/features/agents src/app/App.tsx vite.config.ts
```

Próxima fatia comercial: revisão iterativa do Armazém/Sentinel, seguida da simplificação Projeto → Tarefa → Missão. Não foram incorporados código externo, dependências ou serviços pagos novos.
