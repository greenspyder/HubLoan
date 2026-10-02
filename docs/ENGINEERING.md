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

O GitHub preserva a árvore base e cria branch `hubloan/ai-<UUID>` e PR **draft** sobre master. Se master mudar ou a branch já existir, o envio é interrompido. Nunca usa force push, exclusão de branch ou execução de terminal. Merge é permitido somente após aprovação específica do proprietário no painel. O CI somente informa resultado confirmado do workflow Agent checks, originado em GitHub Actions e no commit exato; ausência ou mudança do PR fica sem confirmação.

Timeout após envio pode deixar branch/PR existente. A tentativa fica **incerta**, pausa a seleção automática e impede renovação/reenvio. Confira o GitHub, marque a confirmação e encerre a tentativa sem reenvio. Só então renove limites para outras melhorias. Encerramento não comprova teste nem apaga operações externas. Pausar revoga a autorização mas não desfaz chamadas e branches já enviadas.

Jobs e credenciais persistem no mesmo armazenamento do espaço. Worker reiniciado detecta execução abandonada e não repete chamadas. Funciona somente enquanto o servidor está ativo; não há controle remoto nem manutenção de Codespaces ligado. GitHub Actions, APIs e hospedagem podem consumir suas próprias cotas. Nenhuma proposta real é criada até conectar suas próprias chaves e autorizar o fluxo.

## Aprovar merge e acionar deploy

Depois de revisar o diff e consultar os testes CI, marque **Revisei as alterações desta versão e autorizo o merge em master e o deploy em produção** e clique **Aprovar esta versão e publicar**. A aprovação vale exclusivamente para os SHAs de head/base mostrados; a IA e o worker não podem aprovar outras propostas. Não exige novas permissões no token existente.

O servidor relê o PR, exige origem/destino HubLoan/master, CI aprovado do commit exato, mergeabilidade confirmada e master ainda na base lida. Compara todos os arquivos e conteúdos com as alterações registradas; mudanças extras, renomes e exclusões bloqueiam a integração. Converte draft em ready com GraphQL, revalida e solicita squash merge pela REST com SHA obrigatório. Respeita as proteções do GitHub, sem bypass. Há uma janela entre verificação e merge; proteções de branch e CI estrito no GitHub são as garantias para pushes concorrentes.

O merge em master aciona o deploy automático pelas integrações existentes Vercel/Render; não instala ou configura hospedagem nem usa deploy hooks arbitrários. **Consultar merge e deploy** confirma o PR e o commit integrado e consulta o status Vercel desse commit. Backend permanece sem confirmação: sucesso do frontend não atesta Render nem funcionamento completo em produção. Falha de deploy não provoca rollback automático.

O registro de aprovação é persistido antes de converter/mesclar e a operação externa ocorre uma única vez. Timeout, reinício ou resposta ambígua bloqueiam novo envio. Consulte o GitHub e o botão de confirmação, que só faz leituras. Pausar ou desconectar impede novos envios, mas não desfaz merge/deploy já iniciado. É possível consultar um registro de integração em andamento após reinício, sem repetir a operação.
