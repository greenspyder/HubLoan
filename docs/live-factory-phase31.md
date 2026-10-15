# Live Factory 3.1 — entrega incremental de áudio e comunidade

## Auditoria e escopo

Auditado em 15/10/2026: master `01902476ccc4b06159a7bae201a2a400830574ee`, merge do PR #11, sem alterações posteriores no início. PRs #9 e #10 incorporados. Foram inspecionados runtime, jogo, broadcast, worker/render, painel/estúdio/Canvas, serviços, store, rotas, testes, Astra, orçamento e TikTok. O único runtime, Seed Snake, encoder, grants temporários, watchdog, isolamento, dedup, OAuth e emergência foram preservados. Consulte [fase 3](live-factory-phase3.md) para operação e segurança do worker.

O PR #11 comprovou RTMP técnico, não eventos LIVE TikTok. Esta fase acrescenta apresentação ao mesmo fluxo: evento autenticado → decisão local persistida → segmentos de atuação → síntese assíncrona → mixer PCM → encoder existente. Nenhuma chamada generativa participa da física, renderização ou desta entrega.

## Funcionalidades verificadas

- Configuração persistente e versionada no painel existente: humor, voz secundária, frequência, trilha, estilo e ganhos. Personalidade/editor do Lume permanecem.
- TTS real local eSpeak NG em português brasileiro. Apresentador consistente; variantes secundárias alteram altura/velocidade da mesma voz sintetizada, não são atores neurais distintos.
- Comentário selecionado pelo operador é narrado e recebe resposta contextual determinística, com nome/rodada, variação, memória curta, cooldown e silêncio. Mensagens semelhantes são agrupadas.
- Música procedural original contínua: duas melodias alternadas com transição, estilos groove/calm, ducking durante fala e recuperação gradual. Não utiliza gravações comerciais.
- Mixer único mistura música, segmentos host/comment/chant, beat e efeitos existentes; limiter evita clipping, mantém relógio de vídeo e funciona em MP4/RTMP. Há ganhos de música, vozes e efeitos; controles individuais para sete canais ficam pendentes.
- Presentes de demonstração provocam versos falados sobre beat. **Nível 1 de musicalização; não canto melódico.** Letras/respostas são locais; níveis 2 (LLM) e 3 (síntese cantada) pendentes.
- Top 6 persistente por sessão/experiência/workspace, por quantidade simulada; desempate por chegada e ID. Reconexão preserva, nova sessão reinicia. Nunca indica receita. Eventos repetidos usam a deduplicação existente.
- Avatares animados no compositor Sharp/SVG, corpo/moldura/nome/posição e destaque do líder. Imagem autorizada por upload opcional, PNG/JPEG/WebP até 100 KB/1 MP, reprocessada 96×96 sem metadados, até 12 imagens/sessão. Sem fetch de URLs (sem SSRF); fallback genérico. A evidência usa retrato desenhado original, não foto real de espectador.
- Vínculo visual gratuito e explícito de participante a jogador: muda identificação, não física, chances ou regras. Participação competitiva mais elaborada pendente.

## Instalação e teste operacional

Além dos requisitos da fase 3, instale eSpeak NG da distribuição oficial (`sudo apt-get install espeak-ng` em Debian/Ubuntu). O executável deve estar no PATH; `HUBLOAN_TTS_BINARY` permite caminho local explícito. Referências: https://github.com/espeak-ng/espeak-ng e documentação `docs/languages/roa/pt.md`. Não há dependência npm nova ou serviço pago obrigatório.

1. Abra Live Factory e configure Seed Snake/Personagem com sessão parada.
2. Em Áudio, habilite atuação, escolha humor, timbre secundário, música/ganhos e salve.
3. Inicie runtime e worker conforme fase 3, primeiro em prévia MP4. O Canvas do painel não reproduz o mixer nem todos os avatares: a prévia audiovisual completa é o arquivo recebido/gravado pelo worker.
4. Em Comunidade, envie comentário, rosa e presente relevante. Todos estão marcados **simulação**. Espere o cooldown entre intervenções. Cadastre outros IDs para observar Top 6/ultrapassagem; carregue somente imagem autorizada. Reabra o painel para verificar persistência na mesma sessão.
5. Confira áudio/imagem; para RTMP gere autorização de envio e configure destino autorizado localmente. A autorização não inicia a transmissão sozinha. Emergência/revogação continuam disponíveis.

Ausência/falha do TTS resulta em legenda temporária e música contínua; não existe segunda voz de fallback. Timeout de síntese 3 s, áudio por segmento até 8 s, cache PCM de 16 MB, 12 segmentos/minuto, fila limitada e preparação serial. Pausa cancela apresentação pendente. Gerações lentas/expiradas são descartadas. O filtro de texto é conservador e não é moderação completa: nesta etapa apenas testes escolhidos pelo operador são aceitos, não narração pública irrestrita.

## Segurança, custos e limites externos

O adaptador de público real rejeita ingestão e informa NOT_SUPPORTED. Login Kit/Content Posting não foram tratados como autorização para comentários/presentes/fotos LIVE. Faltam acesso oficial autorizado, contrato verificável de eventos/identidade/valores, credenciais correspondentes e validação real. Não foram criados endpoints, scraping ou bibliotecas não oficiais. Fotos públicas automáticas também ficam pendentes. Referências oficiais consultadas: https://developers.tiktok.com/doc/ e https://developers.tiktok.com/docs/en/our-guidelines-developer-guidelines.

IA: zero chamadas e custo de API zero nesta implementação; `aiMode` aceita apenas off. Astra mantém recursos existentes; direção generativa, improvisação de letras e relatório criativo automático ficam pendentes, exigindo integração com orçamento existente. Nenhuma nova infraestrutura paga. Energia, internet e hospedagem são custos desconhecidos; CPU/RSS/bytes e latência são medidos pelo worker, não convertidos em receita ou despesa inventada.

Mantidos 360×640/15 fps e limite 30 min. Não houve validação prolongada nem autorização renovável automática. 720×1280/30 fps, sessões maiores, recuperação automática de rede e canto melódico precisam de etapas próprias. Hospedado exige processo persistente Node/Sharp/FFmpeg/eSpeak e CPU/RAM limitados; frontend estático não basta. Modo local evita GPU/hospedagem obrigatória. Não declarar produção ou TikTok público confirmado.

## Evidência e validação

163 testes de servidor passaram, sem falha ou skip, incluindo 5 novos testes agregados. Build frontend e ESLint do módulo/agente/App/Vite passaram; permanece aviso de bundle maior que 500 KB. Cobertura nova: ranking/desempates/ultrapassagem/dedup/isolamento, entradas, persistência SQLite, fotos/consentimento/formato/tamanho, animação, ducking/recuperação/limiter/cache/falha de síntese/pausa, vozes reais e RTMP integrado. Suíte anterior preserva grants, emergência, watchdog e falha do encoder. Não afirmar cobertura exaustiva dos 18 itens nem validação manual completa da interface.

[Vídeo recebido](live-factory-evidence/performance-received.mp4) · [frame](live-factory-evidence/performance-frame.png) · [relatório](live-factory-evidence/performance-report.json)

Receptor FFmpeg independente recebeu 42,026 s, 630 frames, H.264/AAC, 4.100.458 bytes. Decodificação integral aprovada; correlação PCM misturado vs AAC recebido 0,996565. Tocaram 1 comentário, 3 respostas e 2 versos; seis participantes de teste, avatar e cinco rodadas. Zero falhas TTS/chamadas IA. RSS do worker ~178 MB, CPU renderer ~8,37 s, maior latência de reprodução ~1,06 s; não incluem CPU do encoder nem medem tráfego de rede real. São medidas de uma execução, não garantias.

Reprodução (eSpeak NG/FFmpeg necessários; sua ausência pula testes audiovisuais e não satisfaz o aceite):

```sh
npm test --prefix server
npm run build --prefix frontend
(cd frontend && npx eslint src/features/agents src/app/App.tsx vite.config.ts)
LIVE_EVIDENCE_DIR=/caminho/evidencia node --test server/tests/live-performance.test.mjs
```

A evidência é remux do receptor RTMP, não saída direta do renderer. Confirma transmissão técnica controlada com áudio/vídeo; público TikTok permanece UNCONFIRMED. Próxima etapa: ensaio humano prolongado de qualidade/latência, adaptação oficial autorizada de eventos e depois criatividade LLM com orçamento explícito. Sem merge/deploy de produção nesta entrega.
