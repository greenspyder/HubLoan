# Melhorias e autocodificação

O painel **Melhorias** diagnostica o espaço atual usando configurações, falhas, divulgação e pagamentos reais. Não usa estimativas de vendas ou lucros. Atlas faz diagnóstico determinístico; Orion planeja, Forge gera substituições e Sentinel realiza revisão textual em três chamadas separadas do modelo OpenAI escolhido. Esses são papéis do fluxo de engenharia, independentes dos agentes de produção.

## Ativar

1. Conecte OpenAI no seu espaço e limite gastos no provedor.
2. Em GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens, crie token com prazo curto para somente **greenspyder/HubLoan**. Conceda **Contents: Read and write**, **Pull requests: Read and write**, **Checks: Read-only**, **Actions: Read-only**. Metadata é automática. Não autorize administração, workflows ou Codespaces.
3. No painel Melhorias, conecte o token e autorize branches/PRs. O servidor precisa da chave persistente de criptografia já usada pelas integrações; sem ela a conexão é recusada. Token e autorização ficam criptografados. O token GitHub nunca vai ao modelo.
4. Salve limites de 1–3 propostas e 3–9 chamadas por autorização de até 72 horas. Desmarque seleção automática para escolher um cartão; marque para o servidor selecionar as melhorias predefinidas disponíveis. Cada tentativa reserva três chamadas, mesmo se falhar antes de usar todas. Não é teto financeiro. Não há repetição automática de tentativas cobradas.
5. Revise o PR rascunho e consulte **Agent checks / verify** para a versão exata. A revisão textual não substitui testes ou avaliação humana. No Codespaces, salve seu trabalho, execute `git fetch origin` e `git switch <branch informada no painel>` para inspecionar. A aplicação não executa esses comandos.

## Limites atuais

A lista de melhorias é predefinida, não um agente de engenharia aberto. Pode propor resumo de prontidão na central, resumo de limites em projetos autônomos e guia de início. Só os caminhos definidos em `server/engineering.mjs` podem mudar. Nenhuma alteração de servidor, autenticação, dependências, CI ou infraestrutura é permitida. Substituições devem corresponder exatamente à versão lida, ter tamanho limitado e passar pelos bloqueios estáticos e revisão textual. Esses bloqueios não são garantia de segurança; examine o diff.

O GitHub preserva a árvore base e cria branch `hubloan/ai-<UUID>` e PR **draft** sobre master. Se master mudar ou a branch já existir, o envio é interrompido. Nunca usa force push, merge, exclusão de branch ou execução de terminal. O CI somente informa resultado confirmado do workflow Agent checks, originado em GitHub Actions e no commit exato; ausência ou mudança do PR fica sem confirmação.

Timeout após envio pode deixar branch/PR existente. A tentativa fica **incerta**, pausa a seleção automática e impede renovação/reenvio. Confira o GitHub, marque a confirmação e encerre a tentativa sem reenvio. Só então renove limites para outras melhorias. Encerramento não comprova teste nem apaga operações externas. Pausar revoga a autorização mas não desfaz chamadas e branches já enviadas.

Jobs e credenciais persistem no mesmo armazenamento do espaço. Worker reiniciado detecta execução abandonada e não repete chamadas. Funciona somente enquanto o servidor está ativo; não há controle remoto nem manutenção de Codespaces ligado. GitHub Actions, APIs e hospedagem podem consumir suas próprias cotas. Nenhuma proposta real é criada até conectar suas próprias chaves e autorizar o fluxo.
