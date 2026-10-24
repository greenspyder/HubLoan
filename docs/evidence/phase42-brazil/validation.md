# Revisão incremental brasileira — 20/10/2026

Base `db62581`; implementação `9b3dabd`, PR #16 permanece em rascunho, base `codex/live-factory-director`. Sem merge, deploy de produção ou chamadas pagas.

## Implementação

Três propostas A/B/C no painel existente, roteiros persistentes, seleção da trilha ambiente aprovada, prioridade e fade para especiais, descarte de falas antigas, métricas de média/p95/máxima em janela de 256 itens, enquadramento incluindo cantos da arena e Top 6 em duas linhas. Preserva limite de três faixas, aprovação por hash, isolamento, mixer e worker.

As propostas são planos, não áudio gerado. C é preferida para avaliação, sem aprovação automática. Não foi fornecida uma faixa cantada autorizada nem executada geração paga. A identidade musical final e canto real permanecem pendentes.

## Evidência e comparação

A última gravação concluída continua em `../phase42-completion/performance-received.mp4` (126,037 s, 360×640/15 FPS, H.264/AAC). Refere-se ao código `3aa6c08`, **não comprova as novas mudanças**. Seu relatório registra 14,998 FPS efetivos, 13 frames atrasados, atraso máximo do laço 440,667 ms e latência máxima de áudio 12.597 ms.

Não foi concluída uma nova gravação de 120 s com Kokoro nesta revisão. Uma tentativa terminou antes da preparação do modelo; a repetição foi interrompida pela reinicialização do ambiente. Não há novas métricas ponta a ponta, nem evidência de redução real da latência para menos de 2 s. O teste determinístico de faixa pré-carregada verifica a política de fila, não substitui benchmark audiovisual.

Não houve nova inspeção visual/auditiva do resultado final. As seis amostras Kokoro anteriores estão em `../phase42-completion/voice/` para avaliação humana. A naturalidade e o repertório não estão artisticamente aprovados. A alteração de câmera tem cobertura WebGL, mas ainda exige inspeção de uma gravação completa.

## Validação desta execução

Build frontend aprovado, com aviso de bundle maior que 500 kB. Lint dos três arquivos frontend alterados aprovado. Lint geral: 11 erros e 2 avisos em arquivos fora desta alteração; não foram corrigidas funcionalidades comerciais não relacionadas. Logs incluem nomes e regras, sem omissão.

Suíte backend: 185/187 aprovados; dois testes de mídia falharam no ambiente compartilhado (encoder/limite de atraso de 2 s). O watchdog foi preservado. Repetição direcionada registrada em `media-retest.log`; resultado abaixo.

## Limites e custos

Software WebGL; 720×1280/30 FPS, GPU, sessões prolongadas e estabilidade sob carga não validados. Readback continua gargalo; nenhuma melhoria de desempenho não medida é alegada. Custos de energia/hardware/rede desconhecidos. Gasto de API nesta atualização: nenhum. Estimativas de geração e fontes estão em `../../live-factory-brazilian-sound.md`.

TikTok LIVE/events continuam sem validação oficial. Presentes e participantes dos testes são simulados. Receptor local não é transmissão pública confirmada. Para revisão artística final: importar faixas originais autorizadas/cantadas, ouvir/aprovar, validar nova captura e latência no hardware operacional. A missão artística completa não está concluída.

Repetição direcionada: **6/8 aprovados, 2 falhas RTMP persistentes**. O receptor básico registrou atraso máximo de 2.039,7 ms antes do encerramento seguro. Não é possível aprovar estabilidade desta revisão neste ambiente. Os testes WebGL e de repertório passaram na suíte geral; falha de mídia não foi mascarada com redução de requisitos.
