# Orçamento de IA

Todas as chamadas de texto, pesquisa, visão e imagem da produção, coordenação e engenharia passam pela reserva atômica no workspace. Espaços existentes e novos começam com chamadas bloqueadas até o proprietário ativar o orçamento. A validação da chave (GET de modelos) continua disponível.

Limites diários, mensais (UTC), por tarefa e por chamada usam centavos BRL e reservas declaradas por modalidade. Reservas são persistidas antes do envio; chamadas falhas, interrompidas ou incertas não devolvem saldo automaticamente. Concorrência usa o controle de revisão do store. Esses limites bloqueiam chamadas por reserva, não garantem teto financeiro da fatura: as reservas precisam cobrir o preço, câmbio, tokens, ferramentas e imagens. Configure também limites no provedor. Não apresentamos reservas como custos faturados ou lucro.

Texto, pesquisa e revisão visual usam GPT-4.1 mini, inclusive quando a conexão seleciona outro modelo. Não há escalonamento automático para modelo caro. Imagem preserva o modelo configurado. Cache privado por workspace de até 50 respostas completas de texto, validade 24h, identidade do prompt/modelo/instruções exatos; pesquisa e imagem não usam cache. Contexto de conhecimento já é seletivo.

O painel mostra reservas por agente, modelo e tarefa e tokens retornados. Receita e resultado financeiro continuam nos experimentos com dados Stripe e custos declarados. Não se calcula ROI causal por agente nem custo faturado por tokens: faltam tabela de preços verificada, câmbio e reconciliação com a fatura. Esses valores não podem ser inventados. Nenhum novo consentimento de publicação ou merge é concedido.
