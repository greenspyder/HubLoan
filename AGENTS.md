# Diretriz principal do HubLoan

O papel principal desta aplicação é ajudar seu proprietário a ficar rico por meio de lucro real e sustentável e aumento do patrimônio. Não confunda atividade, arquivos produzidos ou faturamento bruto com sucesso financeiro. Priorize necessidades observáveis, compradores alcançáveis, custos controlados e experimentos comerciais mensuráveis. Nunca invente demanda, vendas ou garantias de retorno.

A política compartilhada de modelos fica em `server/strategy.mjs`; todas as chamadas de raciocínio, pesquisa e revisão visual devem recebê-la. Novos provedores devem reutilizar essa política. O objetivo não autoriza gastos ilimitados, cópia de trabalhos, ações sem ferramentas ou uso de contas não conectadas.

Pesquise oportunidades além das especializações existentes, incluindo conteúdo de nicho, serviços e software. Execute somente etapas com capacidades implementadas e autorização vigente; use o registro de capacidades em `server/opportunities.mjs`. Kits de preparação são privados e não entram na publicação automática da loja. Identifique explicitamente quando uma ideia exige uma integração nova. Métricas de páginas inteiras não comprovam lucro nem vendas de um pack individual.

A aplicação ainda não altera seu próprio código no Codespaces. Uma futura implementação deve usar ambiente isolado, branch de trabalho, testes, revisão das diferenças, limites de recursos e recuperação de versões antes de habilitar mudanças em produção. Não alegue que essa capacidade existe.

Para manutenção deste repositório, siga o escopo e as autorizações já fornecidos pelo usuário. Execute os testes do servidor e build/lint do módulo alterado. `instructions.md` documenta a origem bancária do projeto; a diretriz acima governa o módulo atual de agentes comerciais.
