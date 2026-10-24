# PR #16 — conclusão incremental e limites

Auditado: master `05634c6`, head da PR `17a67cf`, base `codex/live-factory-director` em `d88d26d`. As fases 4.0/4.1 ainda são dependências da branch. Nenhum merge ou deploy de produção nesta entrega.

## Mudanças

Roteiro persistente por experiência: letra, estilo, categoria, duração e provedor pretendido. Salvar não autoriza gastos nem gera áudio. `live-music-providers.mjs` é preparação, não cliente HTTP. A UI mostra Não configurado e preserva a importação/aprovação por hash e limite de três faixas por categoria.

Trechos vocais podem ser marcados ao importar, como `1-3;4-6`. O mixer abre a boca somente em blocos de áudio inteiramente dentro de um intervalo revisado. Introdução instrumental, silêncio e faixas antigas sem intervalos mantêm a boca fechada. A amplitude real orienta movimentos e luz suaves. Não há separação de fontes, reconhecimento automático de canto ou lip-sync fonético. A marcação humana deve excluir partes instrumentais.

O renderer reutiliza buffer RGB e usa `Uint8Array.toBase64` quando disponível, preservando fallback. Métricas separam cena, submissão Three.js, captura, overlay, leitura de pixels, conversão, serialização, decodificação, mixagem PCM e pipes FFmpeg. Tempos de pipe incluem backpressure, não medem isoladamente H.264/AAC. Submissão WebGL não equivale a conclusão da GPU. Watchdog, autorização, isolamento, filas e emergência preservados.

## Canto real: pendente

Não existe provedor musical configurado ou orçamento autorizado nesta tarefa. As músicas da demonstração são instrumentais originais CC0 de teste. Não são canto por IA. O tipo de faixa é declarado pelo operador e não comprova procedência, licença ou qualidade.

Pesquisa oficial em 19/10/2026:

| Opção | Evidência pública | Custos e decisão |
|---|---|---|
| [ElevenLabs Music](https://elevenlabs.io/docs/api-reference/music/compose) | API oficial `POST /v1/music`, prompt ou composition plan, saída de áudio, duração solicitada a partir de 3 s. Solicitar vocal feminino pt-BR não garante resultado adequado. | [Preço publicado](https://elevenlabs.io/pricing/api): US$0,15/min. Estimativa proporcional de 6 s: US$0,015; 12 s: US$0,03, antes de impostos, mínimos, plano e tentativas. Custo real não incorrido. Geração e qualidade não testadas. |
| [Suno Platform](https://platform.suno.com/) | Portal oficial encaminha ao login; disponibilidade da API, contrato e endpoint para esta conta não verificados. | Preço e direitos desconhecidos. Nenhum wrapper não oficial, endpoint inventado ou contratação. |
| [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) | Projeto aberto com licença MIT anunciada, geração local e documentação de instalação. | Sem tarifa por chamada local, mas hardware/energia têm custo. Não instalado; hardware, canto feminino pt-BR e jingles curtos não validados neste ambiente sem GPU. |

[Termos ElevenLabs](https://elevenlabs.io/music-terms), atualizados em 09/10/2026: direitos dependem do plano e uso; há restrições a bibliotecas para terceiros e revenda do modelo, distintas do armazenamento interno. Verificar elegibilidade, download, sincronização audiovisual, jogo/live e eventuais condições específicas antes de contratar. Não imitar artistas, copiar letras ou tratar uma disponibilidade pública como licença universal. A comparação é técnica e não confirma autorização para esta conta.

A integração automática continua pendente. Deve reutilizar credenciais criptografadas e orçamento do HubLoan, vincular aprovação à solicitação exata e persistir resultados, sem retry cego de cobrança. Não há estado fictício Gerando/Conectado nesta entrega.

## Como produzir e importar canto

1. Selecione categoria/provedor e salve um roteiro original. Exemplo de rosa: “Uma rosa chegou, meu jardim acordou!”, voz feminina melódica pt-BR, refrão curto de seis segundos.
2. No site oficial escolhido, confira preço/plano, exportação e direitos comerciais para sua live e autorize o custo. Não ocorre cobrança no HubLoan nesta entrega.
3. Gere antecipadamente e escute. Só classifique como canto por IA se houver vocal melódico real. Rejeite instrumental/TTS, pronúncia ruim ou encerramento cortado.
4. Exporte preservando origem, identificador, modelo, data, licença e recibo. Converta localmente se necessário: `ffmpeg -i candidata.mp3 -ac 1 -ar 24000 -c:a pcm_s16le candidata.wav`. Rosas 4–8 s, outros jingles até 20 s. Edite musicalmente antes de converter, sem truncar frases.
5. Importe o WAV no catálogo existente, registre metadados/custo confirmado e intervalos vocais; pré-escute e aprove o hash. Não substitui automaticamente músicas aprovadas.
6. Inicie sessão e envie rosa simulada. O worker baixa/valida o catálogo e reproduz localmente; nenhuma geração por presente.

## Voz e validação

`server/scripts/live-voice-samples.mjs` produz seis WAVs com Kokoro `pf_dora`: saudação, jogo, rosa, especial, vitória, frustração. `samples.json` registra motor, tempos e fallback. Falas não são canto; emoção é intenção do texto, sem controle emocional neural específico. Aprovação auditiva humana permanece pendente. Não migramos de motor sem comparação perceptiva.

Resultados, vídeo e avaliação: `docs/evidence/phase42-completion/`. Evidência anterior preservada em `docs/evidence/phase42/`. O teste RTMP utiliza receptor FFmpeg independente em loopback, não TikTok. Não há público/presentes/receitas reais. Sem confirmação de live pública ou APIs autorizadas de eventos TikTok.

Reproduzir, após configurar Chrome/modelos conforme `live-factory-phase42.md`:

```sh
node --test --test-concurrency=1 server/tests/*.test.mjs
node server/scripts/live-voice-samples.mjs docs/evidence/phase42-completion/voice
LIVE_EVIDENCE_PROFILE=light LIVE_REPERTOIRE_EVIDENCE_DIR="$PWD/docs/evidence/phase42-completion" node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
npm run build --prefix frontend
```

Sem API paga utilizada. Energia/rede/hardware não precificados; não são custo zero. Ambiente de referência limitado a 8 CPUs/8 GiB, software WebGL. Meta 720×1280/30 ainda requer validação em hardware adequado. Dois minutos não comprovam estabilidade prolongada. Operador pode rever MP4 do mesmo pipeline; Canvas administrativo segue simplificado.
