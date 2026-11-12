# Creative Studio 2.2 — revisão de UX

## Auditoria

Base funcional dace964, incluindo correções 36bb5e3 (cópia local equivalente 4a0831c). O remoto master está em 4f3c871, merge da PR #27. A branch codex/viral-audiovisual12 havia sido removida no remoto. Não foi modificado master, feito merge, aberto PR ou acionado deploy. A configuração Vercel desabilita deploy desta branch. A consulta somente leitura ao /health do backend retornou status ok e PostgreSQL; esse endpoint não informa o SHA implantado, portanto não comprova qual versão está em produção.

Problemas observados: controles sem classes no CreativeDirector e Voice Studio, formulário manual concorrendo com campanhas, duplicação do título, logs expostos, lista de produções que excluía microcontos. Reutilizados tokens --aw-green/line/muted, componentes VoiceStudio, AudienceExperiments, CreativeDirector e DeliveryReview, além de todas as APIs existentes. Nenhuma mudança no backend de orquestração.

## Arquivos e decisões

- ViralContentPanel.tsx: compõe quatro áreas, ferramentas recolhidas, exportação, formulário manual preservado, edição abre o formulário.
- AstraCampaigns.tsx: solicitação, autorização explícita, estados reais, timeline por eventos, indicadores sem prometer renderer disponível, erros e links corretivos. Usa o mesmo endpoint de campanhas; nenhuma fila duplicada.
- StudioProductions.tsx: galeria inclui microcontos e gameplay, MP4 autenticado sob demanda, capa real somente quando fornecida, revisão via API existente, retomada de produções autônomas direcionada à campanha. Sem preview fabricado.
- CreativeDirector.tsx: preserva conceitos, fontes, revisões, notas e planejamento manual; remove apenas a apresentação duplicada das campanhas.
- creative-studio.css: estilos locais, tema escuro/lima, controles >=44px, foco, estados disabled, grades responsivas e logs recolhidos.
- AgentWorkspacePage.tsx: remove título redundante somente na rota viral. Exportação permanece no Studio.
- server/creative-campaign-ui-check.mjs: teste de navegador com API real e workspace efêmero, sem sementes, mocks ou campanhas decorativas.

## Validação

Backend: 258 passaram, 8 ignorados, zero falhas (backend.txt). Build passou (build.txt). Lint dos cinco componentes/página alterados passou (lint.txt). Lint global: 11 erros e 2 avisos fora desta alteração (lint-global.txt); não declarado limpo.

Chrome Headless Shell: início, cancelamento, retomada, falha real MODEL_NOT_CONNECTED, persistência após reload, ferramentas recolhidas e navegação avançada. Sem overflow horizontal em 320/390/768/1440 px; nenhum erro JavaScript de página (ui.txt). Capturas reais de workspace vazio e das duas execuções de teste: uma cancelada, outra interrompida por ausência de modelo. Não representam campanhas concluídas ou conteúdo de produção.

Capturas: desktop-empty.webp, mobile-empty.webp, mobile-advanced.webp, desktop-real-failure.webp e mobile-real-failure.webp. Inspeção visual realizada em desktop, mobile e falha contextual. Etapas não alcançadas usam círculo vazio; etapas registradas usam marca distinta, sem porcentagens inventadas.

## Limitações

Não houve modelo conectado, síntese neural, MP4 novo ou publicação. Reprodução e aprovação de MP4 real não foram exercitadas neste workspace vazio; usam as APIs de artefato/revisão existentes, com validações do servidor preservadas. O teste não aprova qualidade audiovisual. Não há endpoint de prontidão do renderer: o indicador informa verificação na execução. Arquivos locais de voz não garantem inferência funcional. A navegação global do HubLoan foi preservada e ainda ocupa espaço no topo mobile. Revisão humana da experiência final permanece necessária.
