# Voice Identity 2.0 — PR #26

## Status real

Duas candidatas reais foram inferidas: Chatterbox Multilingual PT-BR condicionado por Heart e Emma inteiramente sintéticas. Cinco WAVs por identidade, com as mesmas frases, e duas demos contínuas de 30 segundos. Nenhuma é pf_dora. Nenhuma foi declarada vencedora. A identidade global aprovada permanece inalterada. [Comparação, arquivos e métricas](comparison.md).

Três MP4s novos, de 18 / 25 / 20 segundos, usam Heart provisória e reutilizam os WAVs medidos, com texto/perfil/SHA-256 verificados. São novas renderizações, não vídeos antigos renomeados. O relatório distingue reaproveitamento de tomadas neurais de nova inferência (`synthesisCalls: 0`). Os roteiros são de revisão com as frases do laboratório; títulos identificam os personagens. Os arquivos aprovados anteriormente não foram sobrescritos.

**A missão audiovisual ainda não está integralmente concluída:** a batalha conserva enquadramentos de costas/laterais, sobreposições e transições problemáticas. O relatório registra 54 quadros não frontais, 8 com oclusão amostrada, 5 saltos de câmera e 1 confronto próximo fora do quadro; categorias podem coincidir. Sua aprovação permanece bloqueada. Comédia e Champion não apresentam alertas geométricos nos renders finais, mas isso não prova qualidade artística. A inspeção de quadros ainda mostra fundo competitivo e proximidade entre personagens.

## Implementação

- Voice Studio existente: duas referências reais, modelo instalado/indisponível, licença, intensidade neural suportada, perfil de teste e escuta antes de aprovação. Presets antigos da Dora preservados para snapshots, retirados das candidatas novas.
- Perfil global por workspace, autenticação, revisão concorrente e snapshots mantidos. Novas produções e concessões live compartilham a identidade; não há segundo sistema de voz por fábrica.
- Chatterbox residente e serial, um pedido por vez, cancelamento mata o processo, fallback explícito. O laboratório falha sem gerar amostra de fallback. Controles: exaggeration 0.35 (interface permite 0.20–0.60), cfg 0.5, temperature 0.7, seed 42. Estados editoriais não são apresentados como emoções neurais garantidas.
- Cache offline de tomadas já medidas verifica perfil, texto, hash, duração e proveniência. Não é cache de uma live testada. Mixer, ducking, limite de pico, música autorizada e sincronização por envelope PCM existentes foram reutilizados.
- Câmera mede caixas locais das malhas após deformação e nove raios sobre olhos/focinho; busca planos alternativos, verifica rivais próximas, limita deslocamentos entre cortes e reavalia enquadramento. Cabeças têm elevação visual uniforme de 0.70 unidade nos vídeos; a física não mudou. Champion usa pose de olhar para a câmera nas apresentações.
- Comédia mede o rosto da apresentadora, excluindo pescoço; rosto elevado no quadro e legendas abaixo. Retrato secundário foi para o topo. Todos os personagens e quatro cenas foram mantidos.
- Alertas geométricos ou cobertura incompleta bloqueiam aprovação mesmo com override. Arquivos de revisão continuam exportáveis, identificados como provisórios.

## Validação executada

- Suite backend com WebGL real: 232 aprovados, 1 Piper opcional pulado, zero falhas (`backend-final20.txt`). Inclui regressões da Live Factory, RTMP, mixer, isolamento, snapshots e fallback.
- Complementares finais: 9 aprovados (`targeted-final20.txt`), incluindo cache adulterado, identidade errada, duração incompatível, oclusão real, indisponibilidade, concorrência e cancelamento. O teste de concorrência usa fixture de protocolo, não benchmark de múltiplas inferências do modelo.
- WebGL direcionado: 11 aprovados, 1 Piper pulado. Smoke frontend: identidades, rascunho persistido, voz ativa preservada, indisponibilidade e aprovação bloqueada sem escuta.
- Build e lint dos módulos frontend alterados passaram. Lint global conserva 11 erros e 2 avisos fora desses módulos; build avisa sobre bundle grande.
- Execução inicial backend: 226 aprovados, 1 falha, 2 pulados. O teste RTMP exigia duas partidas de 22 s em 42 s. Fixture ampliado para 52 s, sem mudar partidas/física do produto; repetição direcionada passou 5/5, e suite final passou.
- MP4s: H.264/AAC, 360×640, 15 FPS, decodificação integral aprovada; 270 / 375 / 300 quadros distintos. SHA diferente dos três vídeos anteriores. Correlação entre áudio AAC decodificado e WAV neural esperado >0.94, com busca temporal limitada ao intervalo PCM registrado. Isso valida presença/sincronização aproximada, não naturalidade ou alinhamento fonético. Dados em `validation.json`.

## Modelos, licença e limitações

Modelo oficial [Chatterbox PT-BR](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-pt-br), licença MIT, checkpoint brasileiro V3. Código oficial commit `5de7a54aa4e5e2baadb0182dde554908b48b85c2`. Pesos e hashes em model-manifest.json. [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0, fornece somente as duas referências sintéticas inglesas; proveniência em reference-provenance.json. Nenhuma pessoa real foi imitada. Verificar sotaque e identidade por escuta.

Duas identidades foram efetivamente testadas; uma terceira não foi medida nesta entrega. Piper continua suportado, sem assumir que Faber seja voz feminina ou superior. [Catálogo Piper](https://huggingface.co/rhasspy/piper-voices/blob/main/voices.json) exige verificação de licença por modelo. [XTTS-v2/CPML](https://huggingface.co/coqui/XTTS-v2/blob/v2.0.2/LICENSE.txt) limita o uso padrão ao não comercial; não foi integrado para a operação comercial. Não houve API paga ou contratação.

CPU AMD EPYC 9V74, 2 threads de inferência: inicialização 17.83 s, síntese 42.68–86.49 s por fala, pico RSS 4.98 GB. GPU/VRAM não medidas. O modelo foi mantido carregado nas dez solicitações sequenciais. Não houve escuta perceptiva pelo agente ou teste neural de live prolongada. As demos concatenam as cinco tomadas com pausas e completam 30 s com silêncio; não são inferência única de 30 s.

Live: não habilitar esse desempenho CPU como resposta imediata. As concessões live usam fallback técnico identificado enquanto `liveValidated: false`. Preservar modelo residente, cache e síntese antecipada é a estratégia offline implementada; GPU, latência de ponta a ponta, fila de eventos e recuperação prolongada ainda precisam de benchmark real antes de habilitar live neural. Aprovar timbre não aprova latência.

## Instalar e escolher

Ambiente isolado Python 3.12; torch/torchaudio 2.6.0 CPU; instalar `server/live-worker/requirements-chatterbox.txt`. Executar `python server/live-worker/setup-voice20.py /diretorio/modelos` para baixar pesos oficiais com conferência de hash e gerar referências sintéticas. O bootstrap foi verificado sintaticamente; a inferência real documentada foi preparada na execução original. Não foi repetido o download completo de modelos na retomada.

Configurar `HUBLOAN_CHATTERBOX_MODEL=/diretorio/modelos/chatterbox` e `HUBLOAN_CHATTERBOX_PYTHON=/venv/bin/python`. O worker não baixa modelos. No frontend `/agentes/viral`: Voice Studio → selecionar Heart ou Emma → ajustar intensidade suportada → salvar teste → ouvir candidata salva até o fim → confirmar escuta → aprovar. Compare antes com a voz ativa. Somente o proprietário escolhe a definitiva.

PR em rascunho. Sem merge, deploy ou publicação. A integração Vercel foi desabilitada para esta branch. Música preservada: Brazilian Sunsets — Ketsa, CC BY 4.0, com hash e autorização existentes.
