# Auditoria inicial — Creative Director 2.0

Estado consultado em 2026-11-08, antes de implementar. Base de trabalho c226b4ef8d61676fecc17670792053a2493dbbb1, branch codex/viral-audiovisual12, árvore limpa após recuperar a versão remota. Nenhuma branch nova.

A branch padrão é **master**, não main; master está em ce8a392e21a85c782ddafa0d5859b9790d7ec978 (merge #22). Consulta da API GitHub: #23 mesclada em master (cf5dee0); #24 mesclada na branch codex/viral-content1 (a499afa); #25 ainda aberta e em rascunho, base master, head 18e8541; #26 mesclada em codex/viral-director11 em 18e8541, head histórico 13dc155. Verificação por git merge-base --is-ancestor confirma #23 em master. O título do último merge #22 não descreve toda a ancestralidade. Não inferir integração apenas pelo título do commit ou pelo status da PR. c226b4e é posterior ao merge histórico #26.

| Capacidade | Estado constatado no código/evidências | Reutilização |
|---|---|---|
| Produção offline 3D comedy/battle/champion | Implementada, testes e MP4s anteriores em docs/evidence/viral13; revisão artística ainda pendente | viral-render, viral-director, scene3d, camera-rig |
| Voz global, Kokoro/Chatterbox, mixer | Implementados/testados em etapas anteriores; instalação dos modelos depende do ambiente. Voz definitiva não aprovada | lume-voice, neural-speech, mixer |
| Fila, cancelamento, checkpoints, Armazém | Implementados no runner/domain/store, com SQLite/Postgres e isolamento por token | Mesmas missões e artefatos, sem segunda fila |
| Experimentos de audiência e distribuição assistida #24 | Implementados: custos, hipóteses, snapshots manuais, kit com revisão de versão; sem publicação automática | experiments, viral-distribution, learning |
| Astra comercial e memória | Implementadas: autonomy, opportunities, learning, knowledge; regras de negócio compartilhadas via provider/strategy | Reutilizar dados existentes; não confundir inferência com métricas |
| Vídeo genérico | FFmpeg/sharp funcional, cenas estáticas sem áudio; não atende sozinho a narrativa audiovisual animada | mediaCommand e dependências de exportação |
| Frontend /agentes/viral | Roteiro manual, Voice Studio, prévia, audiência e link ao Armazém | Acrescentar direção criativa no painel existente |
| Tendências reais | Pesquisador público via provider autorizado em outros fluxos; não há conector gratuito TikTok de tendências | Importação explícita com proveniência; nenhum scraping |
| Registro multiformato criativo | Apenas shortFormats fixos; falta contrato de categoria, dependências e capacidade | Estender catálogo, preservar formatos existentes |
| Ideia → experimento → produção | Não existe orquestração criativa dedicada | Vincular propostas às missões já existentes |
| História animada de mistério | Inexistente | Novo adaptador de animação original usando FFmpeg/sharp e voz compartilhada |
| Publicação autônoma e agenda editorial | Não implementadas; TikTok/live não equivale a Content Posting API autorizada | Contrato futuro desabilitado, sem envio |

Testes históricos não equivalem a testes desta alteração. Executar regressões nesta etapa. Dependências presentes: Node, sharp, FFmpeg, Chromium/SwiftShader em instalação local. Sem GPU identificada; nenhuma chamada paga autorizada por esta etapa. Instalação TTS neural não presumida. O planejador local deve ser identificado como baseado em regras, não como inferência neural ou pesquisa de tendências.

Ancestralidade verificada: #23 e head de #24 são ancestrais de master (exit 0). Heads #25/#26 e c226b4e não são (exit 1). Portanto master contém 1.0 e distribuição assistida; direção 1.1 e melhorias posteriores permanecem fora de master.
