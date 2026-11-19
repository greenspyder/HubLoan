# Auditoria anterior à implementação — 2.5.3

Base consultada via git fetch: master 0ab050fe8684f859f345e815fd24b194884820f9, merge PR #28 (2.5.2). Árvore idêntica ao head c4973fc anteriormente validado: CI 307 pass / 6 skip, Render /health e Vercel confirmados na entrega 2.5.2. Branch nova feat/astra-one-line-253 criada dessa master; nenhum trabalho pendente sobrescrito.

## Funcional e reutilizável
- Production Workspace: grids, URL de seleção, projeção de detalhes, revisão e armazém.
- Financial Control Center: orçamentos OpenAI/voz/mídia separados; autorização por versão do plano; CAS, auditoria e chaves criptografadas.
- Runner: checkpoints, leases, cancelamento, reconciliação Responses em background, operações incertas sem reenvio automático.
- OpenAI: text e pesquisa web via provider + política strategy + costProvider. Pesquisa existente não é feed TikTok; chamada paga sujeita ao orçamento.
- Commentary: plano validado, diagramas locais, imagens Higgsfield, motion 2D, narração ElevenLabs global aprovada, FFmpeg, MP4, revisão. 15–30s / 360×640 / 3–5 cenas. Não faz animação livre de atores, clipes premium ou mixagem musical nesse adaptador.
- Legacy: três formatos em lote obrigatório; renderers 3D e Motion Story especializados. Permanecerão compatíveis.

## Causas confirmadas no código
- server/creative-plan.mjs:15 mistura duração final, primeiro/último beat e presença de development na mensagem “Faltam começo, desenvolvimento ou conclusão.”. Exige literalmente hook/development/payoff, até para humor curto. O renderer não depende desses rótulos para executar ações.
- creative-campaign.mjs captura qualquer erro de validação e solicita outro lote completo, até CREATIVE_ATTEMPTS_EXHAUSTED. Não localiza o campo e perde propostas válidas na correção.
- AstraCampaigns.tsx inicia legacy por padrão, exige configuração de formato, desliga webResearch e oferece lote de três. O caminho commentary tem cinco premissas, prompt sempre de humor documental e nenhuma interpretação inicial/research.
- visual-commentary.mjs também impõe setup/escalation/payoff a todos os gêneros e escreve “ficção documental” em qualquer cena.

Não temos logs nem o JSON privado da campanha original Private Property. A condição de rejeição e o problema de contrato estão confirmados; o campo exato que veio naquela execução não pode ser afirmado.

## Limites encontrados
Não há feed TikTok conectado nem métricas externas novas. Higgsfield só tem adaptador de imagens. Voz commentary requer ElevenLabs aprovado; salvar chave não é verificar conexão. Diagramas não encenam atores ou um estádio realista. Não usar geração paga no desenvolvimento. Pesquisa real no runtime exige chave e autorização; testes de modelo serão controlados e identificados.

## Decisão de implementação
Reutilizar campanha/runner/checkpoints e autorização commentary, acrescentando interpretação, pesquisa contextual cacheada no workspace e planejamento de um ou mais vídeos explícitos. Reutilizar registry existente com disponibilidade filtrada. Validar gramáticas narrativas por formato; reparo limitado por campos, sem reescrever partes válidas. Interface de uma ideia e consentimento, avançado preservado. Não reconstruir motor de mídia, finanças ou credenciais.
