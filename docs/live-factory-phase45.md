# Live Factory 4.5 — revisão em andamento

Base remota auditada: `master` continua sendo a branch padrão; PR #17 mergeada em `codex/live-factory-director` (`74e21af`). A entrega 4.4 foi restaurada do bundle preservado (`09db279`). A branch local `codex/live-factory-character45` preserva ambas. O GitHub recusou criar a branch remota com HTTP 403; não existe PR 4.5 publicada por esta execução.

## Design original

Três propostas usam o mesmo factory 3D e renderer operacional, câmera, iluminação e material: Jade (equilíbrio entre largura e altura), Pearl (focinho largo e cabeça baixa), Ember (crânio alto e focinho estreito). Comparativo em `evidence/phase45/proposals.jpg`. Escolha: Jade, por equilibrar focinho legível, espaço dos olhos e silhueta menos pesada que Pearl e menos pontuda que Ember. Refinamento reduz focinho/olhos e elimina volumes excessivos das narinas. Não houve aprovação artística humana; as propostas ainda têm acabamento procedural. Não equivalem a modelagem de animação profissional aprovada.

O mesmo modelo atende arena e apresentadora: mandíbula articulada, boca volumétrica, língua, pálpebras, olhar, dez estados expressivos e movimento leve de focinho. Abertura acompanha envelope PCM; **não há visemas/fonemas**. Instrumental sem atividade vocal continua com boca sem animação de canto. Nenhum asset de terceiros adicionado.

## Preservação e refinamentos

Runtime, física, director, mixer, ranking, Kokoro, aprovação por hash e watchdog preservados. Corrigida repetição imediata quando uma categoria esgotava a memória de falas: seleção da frase menos recente, memória limitada a 12 itens. Geometria do corpo mantém buffers GPU quando a topologia não muda; crescimento real realoca. Não se alterou física nem FPS apenas em metadados.

## Auditoria dos 8 FPS

A captura 4.4 escolheu explicitamente perfil CPU de 8 FPS após falhas de watchdog em 15 e 10 FPS. Relatório anterior: 1.488 frames/186 s, 142 atrasados; roundtrip médio 74,55 ms, readback médio 47,89 ms (não significa apenas GPU: inclui sincronização da rasterização). FFmpeg pipe não isola custo H.264/AAC. Abaixo há resultados atuais separados. GPU dedicada e 720×1280/30 ainda exigem validação própria.

## Suno — consulta oficial em 23/10/2026

https://platform.suno.com/auth/login anuncia “Make music with the Suno API” e REST API. Não afirmar ausência absoluta de API oficial. Entretanto, documentação de endpoints, preços de API, limites e autenticação do operador não foram obtidos nesta execução. Não foi feito login, compra nem chamada de geração. Provedor permanece desativado; importação manual mantém licença, origem e aprovação por hash.

https://help.suno.com/en/articles/9601665 e https://help.suno.com/en/articles/2425729 descrevem direitos comerciais de músicas criadas em planos elegíveis, sem retroatividade automática. Verificar também https://suno.com/terms-of-service e permissões de download aplicáveis. Direitos de assinatura do produto não comprovam autorização de API. Não há canto IA novo nesta entrega.

## Limites de validação

A avaliação visual usa imagens extraídas e estudos renderizados. Não existe avaliação auditiva humana nesta execução; não declarar naturalidade de Kokoro aprovada. Brazilian Sunsets de Ketsa mantém autorização anterior e hash; não é funk original nem canto IA. Nenhuma API paga foi chamada. Requisitos/custos de CPU, memória e energia não são preço de serviço contratado.

## Instalação e operação

Reutiliza Node 24+, dependências do servidor, FFmpeg, Chromium headless e ambiente Kokoro documentado na 4.4. Pesos oficiais Kokoro-82M (~313 MiB), `pf_dora`, `pm_alex`, `pm_santa`; sem cobrança por reprodução. O ensaio usa software WebGL, orçamento de 8 CPUs e 8 GiB; não é benchmark de GPU dedicada. O processo Python observado usa aproximadamente 1,7 GiB; não tratar isso como consumo total da máquina.

Estudos: `node server/live-worker/character-review.mjs docs/evidence/phase45/refined`. Testes: `npm test --prefix server`; habilite Chromium/Piper via ambiente para os opcionais. Amostras: `node server/live-worker/voice-review.mjs DIRETORIO` com Kokoro configurado. Captura usa o teste RTMP operacional existente com `LIVE_ENTERTAINMENT_EVIDENCE=1`, `LIVE_REPERTOIRE_EVIDENCE_DIR` e `LIVE_APPROVED_AMBIENT_WAV` apontando para a faixa previamente autorizada. Nunca exige TikTok real ou revela stream key.

O painel administrativo continua com sua prévia simplificada; a gravação do worker é a evidência fiel do novo modelo, áudio e overlays. Não foi criado outro renderer de produção.
