# Astra Creative Director 2.0 — entrega funcional parcial

**Não declarar aceite completo.** Há três MP4s novos e fluxo funcional no frontend, mas o experimento executado usa planejamento local limitado e voz técnica. O caminho de modelo conectado foi implementado e testado com provedor controlado; não houve inferência criativa paga nem pesquisa externa real nesta sessão. Qualidade artística e regressões pré-existentes continuam pendentes.

## Auditoria e integração

[A auditoria inicial](audit.md) separa capacidades e integração. `master` contém #23/#24; #25 permanece aberta, e o merge histórico #26 foi na branch de #25. As mudanças desta etapa continuam exclusivamente em `codex/viral-audiovisual12`. Nenhuma PR, branch, publicação, merge ou deploy novo.

## Implementação

- `creative-director.mjs`: catálogo de cinco formatos em quatro categorias, fontes com proveniência, propostas estruturadas, versões e experimentos criativos persistidos no mesmo workspace SQLite/Postgres. Mantém snapshots de roteiro, fontes, voz e recursos; erros não se tornam artefatos.
- Dois modos explícitos: regras locais com repertório limitado; modelo conectado mediante consentimento, chave e orçamento existentes. O segundo usa o mesmo runner, costProvider, checkpoints e provider com a política global de `strategy.mjs`. Valida cinco propostas e três categorias atomicamente; JSON inválido falha sem importar propostas. Nenhum modelo foi chamado de verdade nesta demonstração.
- Fontes: temas, referências HTTPS com data, observações próprias e fixtures explícitas. URLs não são buscadas automaticamente: são referências fornecidas pelo operador, não fontes verificadas. Snapshots reais do módulo de audiência são consultados sem soma nem inferência causal. Sem conector de tendências ativo.
- Produção usa as missões e fila existentes, limite de cinco jobs, retomada/cancelamento/leases/checkpoints/Armazém. O novo adaptador `motion-story.mjs` produz animação vetorial original com voz local compartilhada, legendas e FFmpeg. Não há segundo sistema de TTS.
- `/agentes/viral` contém comparação de propostas, fontes, produção, progresso, prévia autenticada, aprovação/rejeição com versão, revisão de roteiro como nova proposta e notas qualitativas. Mantém Voice Studio e experiências de audiência.
- Pausa cancela produção e planejamento criativos. Publicação e agenda automática permanecem desabilitadas. A infraestrutura local tem custo desconhecido, nunca custo zero presumido.

## Cinco propostas executadas pelo planejador local

[Contrato completo e roteiros](proposals.json). São hipóteses sem métricas de tendência ou viralidade:

| Ideia | Categoria | Decisão técnica |
|---|---|---|
| O plano era não ter plano | Personagem | Produzir comédia: serenidade da Lume versus arena |
| Quem encontra a saída? | Gameplay | Produzir batalha com pergunta espacial e acontecimentos da simulação |
| A porta que esperava | Narrativa | Produzir microconto original: aproximação, resposta, revelação da luz |
| Quatro maneiras de entrar | Personagem | Apresentação disponível; não selecionada para esta demonstração |
| A escolha que muda o conto | Experimental | Bloqueada: depende de ramificação/interação ainda não implementadas |

O modo local não adapta livremente suas cenas a qualquer assunto: o tema é contexto editorial e o repertório é restrito. O modo conectado pode propor roteiros originais dentro dessas limitações, mas precisa de validação com modelo real. Não confundir essa limitação com inteligência geral de direção criativa concluída.

## Três vídeos novos

| Vídeo | Arquivo | Duração | Renderização |
|---|---|---:|---:|
| Comédia — O plano era não ter plano | [MP4](https://chatgpt.com/library?file_id=libfile_174704d33a608191844e51a84c44b98f&account_id=personal) | 18 s | 50,708 s |
| Batalha — Quem encontra a saída? | [MP4](https://chatgpt.com/library?file_id=libfile_798f4c5c5b1c819181179dbbec3fa157&account_id=personal) | 25 s | 107,441 s |
| Mistério — A porta que esperava | [MP4](https://chatgpt.com/library?file_id=libfile_dd5a6c35a6b4819199e447790c93ad6f&account_id=personal) | 18 s | 3,114 s |

Todos H.264/AAC, 360×640, 15 FPS. Hashes completos e níveis de áudio em [av-validation.json](av-validation.json). [Registro de experimentos](experiments.json). A renderização de mistério foi determinística entre tentativas; não é arquivo antigo de uma entrega anterior.

Folhas de contato: [comédia](https://chatgpt.com/library?file_id=libfile_037fa96a0a0c81918dae59e6b9ba3c07&account_id=personal), [batalha](https://chatgpt.com/library?file_id=libfile_ec6e3c91eb8081919365ee9391eed13a&account_id=personal), [mistério](https://chatgpt.com/library?file_id=libfile_7c9235999e0c819180c0c3fbd6876922&account_id=personal).

## Qualidade e falhas observadas

- Primeiras tentativas comedy/20s e battle/24s falharam no planejamento contínuo de câmera (quadros 148 e 353). Nenhum MP4 foi exposto como concluído. O catálogo foi ajustado às durações 18s/25s suportadas por esses planos; novas produções completas passaram. Logs originais preservados.
- Inspeção visual de seis quadros por vídeo (tempos no JSON): comédia alterna atuação e gameplay, mas fundo compete com Lume; batalha ainda tem corpos sobrepostos e cabeça secundária sob legendas por volta de 15s; microconto tem três movimentos narrativos legíveis, estética vetorial simples e resolução luminosa, sem arena. Zero alertas do renderer não aprova os problemas perceptivos da batalha.
- Narração **eSpeak de teste**, sem disfarçar fallback, sem alterar voz global e sem reutilizar falas Chatterbox antigas. Não houve escuta humana para aprovar timbre. Perfil neural global indisponível no ambiente; os botões de aprovação bloqueiam fallback.
- Sem trilha importada. Geometria e roteiro originais; nenhuma gravação de terceiros/clonagem. Uso das dependências de código sujeito às licenças já presentes no projeto. O relatório identifica engine real e snapshot global solicitado separadamente.
- RMS global aproximado −30,66/−31,41/−26,49 dBFS (inclui silêncios); picos abaixo de 0,6. Não equivale a medição LUFS nem validação perceptiva de mixagem. Legendas seguem duração PCM; sem alinhamento fonético.

## Testes

- Nove testes novos: contratos, categorias, fontes/fixtures, isolamento, concorrência, snapshots, falha/pausa, bloqueio de formato, importação atômica do modelo e chamada orquestrada com orçamento/provedor controlado. [Log](targeted.txt).
- Frontend real em Chromium: criação e persistência de cinco propostas; formato indisponível bloqueado; um dos MP4s novos obtido pela rota autenticada e decodificado no painel. [Log](frontend-smoke.txt).
- WebGL: quatro passaram, um teste neural ignorado por falta do modelo. [Log](webgl.txt).
- Build passou; lint dos arquivos frontend alterados passou. Lint global: 11 erros/2 avisos em arquivos anteriores, sem alterações nesta etapa.
- Suíte completa: **250 passaram, 3 falharam, 8 ignorados (261 testes)**. [Log completo](backend.txt) e [validação final](validation.json). Três falhas de `voice20.test.mjs` reproduzidas no commit inicial c226b4e em cópia isolada, sem criar branch. São duas expectativas de raycast não calculado por rejeição antecipada e o limite antigo de 200 vistas versus implementação atual com até 400. Não foram apagadas nem classificadas como aprovadas.

## Reproduzir e revisar

1. Instalar dependências existentes de server/frontend, FFmpeg, Chromium e um TTS local. Configurar as mesmas variáveis do renderer já documentadas no projeto. Sem modelos neurais, selecionar explicitamente modo técnico.
2. Abrir `/agentes/viral`, registrar contexto/fontes e solicitar ideias locais. Para modelo real, conectar chave e orçamento na configuração existente e marcar autorização no painel. Falhas mantêm a missão e o erro; um novo pedido de planejamento permite corrigir uma resposta inválida sem aceitar JSON parcial.
3. Produzir uma proposta suportada. Acompanhar fila, assistir, registrar notas e revisar a versão. Revisão de roteiro cria nova proposta, nunca altera produção aprovada.
4. Demonstração reproduzível: `node server/creative-demo.mjs /diretorio/novo`. Persiste os experimentos e usa o runner real; exporta MP4s e relatórios. Não liga RTMP nem publicação. Não reusar o diretório para afirmar nova renderização: checkpoints são preservados.
5. `node server/creative-ui-smoke.mjs /diretorio/novo/demo.sqlite` testa reprodução no frontend sem distribuir o conteúdo.

## Pendências de aceite e próxima etapa

Ainda não há aceite integral: inferência criativa com modelo real e pesquisa autorizada não foram exercitadas; a qualidade de voz e batalha precisa melhorar; testes antigos e lint global permanecem vermelhos. O novo formato é limitado a um vocabulário visual de porta/viajante/luz, não um renderizador geral de histórias. Memória de rejeições é literal e limitada; não comprova aprendizado estatístico nem detecta toda paráfrase repetida.

Antes de publicar: instalar/validar o perfil neural escolhido pelo usuário; revisar os três vídeos; resolver as falhas de baseline; testar geração conectada com limites de custo; incorporar conector de fontes autorizadas. Para TikTok oficial, etapa separada: verificar elegibilidade e autorização da aplicação, consentimento e escopos adequados, credenciais protegidas, idempotência, acompanhamento de status e métricas, política de revisão por versão, fila de publicação separada, orçamento e parada de emergência. Nenhum desses itens autoriza envio agora. Agendamento e histórico automático de publicações não estão implementados nesta etapa; os registros manuais existentes permanecem disponíveis.
