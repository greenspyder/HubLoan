# Rádio local — continuação após a PR #16

Base: merge `0489e6b` em `codex/live-factory-director`; a PR #16 não foi incorporada diretamente à master. Continuação sem merge/deploy.

## Implementação incremental

O mixer e o catálogo existentes agora aceitam faixas ambiente completas de 4–240 segundos. Acima de 60 segundos, o arquivo deve ser WAV PCM16 mono 24 kHz; jingles continuam limitados a 20 segundos e rosas a 4–8 segundos. Máximo de três faixas por categoria, 40 MB de arquivos e 720 segundos por experiência. O limite de duração restringe o PCM decodificado a aproximadamente 138,24 MB, além dos buffers temporários, renderer e TTS.

A rádio é uma playlist local: principal primeiro, demais faixas aprovadas, loop, crossfade de um segundo e ducking pelo mixer existente. Não há conexão a emissoras externas, geração de áudio por presente ou chamadas pagas. A telemetria registra a faixa ambiente e transições. O worker continua validando hash, tamanho, duração, aprovação e autorização, com download sequencial e timeout de 15 segundos por arquivo. Watchdog, filas e parada de emergência não foram removidos.

## Música candidata e aprovação

`Brazilian Sunsets`, de Ketsa: https://freemusicarchive.org/music/Ketsa/cc-by-free-to-use-for-anything/brazilian-sunsets/

Candidata instrumental de 3min32s, identificada pela fonte como CC BY 4.0. Crédito e licença devem acompanhar usos e distribuições; registrar a conversão para PCM mono. É música de terceiro, não funk produzido pelo HubLoan nem canto por IA. Está preparada para escuta, não importada/aprovada no workspace operacional. A confirmação “Ouvi a faixa” deve ser feita por quem efetivamente a ouviu. A preferência por uma rádio brasileira não transforma um repertório comercial qualquer em música livre.

## Pendências artísticas

A voz Kokoro pf_dora, amostras e humor contextual estão preservados do merge. A naturalidade exige avaliação auditiva humana. A integração de geração musical continua preparatória: sem credencial e orçamento autorizados, não houve geração paga nem canto melódico novo. Importação manual de vocal autorizado, revisão de trechos vocais e aprovação por hash continuam disponíveis. Não atribuir qualidade artística a fixtures instrumentais dos testes.

## Evidência desta continuação

Os resultados e limitações da nova captura serão registrados em `docs/evidence/radio/`. Não confundir evidência técnica com validação de TikTok público ou aprovação humana do repertório.
