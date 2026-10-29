# Voice Identity 2.0 — revisão pendente

Chatterbox Multilingual PT-BR executado localmente em CPU, com duas referências inteiramente sintéticas: Kokoro `af_heart` e `bf_emma`. São identidades de condicionamento diferentes no mesmo modelo; nenhuma é `pf_dora`, nenhuma imita uma pessoa real. O português é produzido pelo Chatterbox; as referências são em inglês, portanto sotaque e consistência precisam de avaliação auditiva. Não há candidata vencedora nem alteração automática da identidade aprovada.

Modelo oficial: https://huggingface.co/ResembleAI/Chatterbox-Multilingual-pt-br (MIT). Código: https://github.com/resemble-ai/chatterbox, commit 5de7a54aa4e5e2baadb0182dde554908b48b85c2. Referências: https://huggingface.co/hexgrad/Kokoro-82M (Apache-2.0). Revisões e hashes dos pesos em model-manifest.json; proveniência das referências em reference-provenance.json.

Instalação isolada: Python 3.12, torch/torchaudio 2.6.0 CPU; instalar requirements-chatterbox.txt. Configurar HUBLOAN_CHATTERBOX_PYTHON e HUBLOAN_CHATTERBOX_MODEL para diretório contendo os quatro pesos e references/af_heart.wav, references/bf_emma.wav. A presença dos arquivos no painel não significa inferência validada. Nenhum download é feito pelo worker.

Controles comprovados: exaggeration neural (0.20–0.60), cfg_weight 0.5, temperature 0.7, seed 42. Não há mapeamento fictício dos sete estados para emoções neurais. O roteiro continua responsável pela intenção. Amostras recebem apenas ganho constante para -23 LUFS, limitado por pico; sem pitch, reverb ou equalização para disfarçar timbre.

Primeira inferência desta execução: inicialização 17.83 s; fala A 86.49 s para 6.16 s de áudio; pico RSS 4,982,104,064 bytes. Sem GPU. Live não validada: worker mantém fallback técnico explícito para concessões live do Chatterbox. O processo residente serializa inferência; cancelamento mata o processo; não representa teste de live prolongada. Vídeos podem pré-sintetizar falas. Não declarar carisma com métricas.

Voice Studio reutilizado: mecanismo/identidade reais, presença local, licenças, controle suportado, escuta do perfil salvo antes da aprovação, revisionamento e isolamento existentes. Presets antigos são mantidos apenas para snapshots e retirados da lista de candidatas.

Amostras em geração e revisão cinematográfica ainda pendentes. Este checkpoint não conclui a missão. PR deve permanecer em rascunho, sem merge/deploy/publicação. A integração automática Vercel está desabilitada para esta branch.

## Retomada com arquivos preservados

As duas identidades possuem cinco WAVs e demonstrações contínuas de 30 segundos, já preservadas. Consulte comparison.md e measurements.json. Os novos renders reutilizam esses WAVs com texto/perfil/hash verificados, sem nova inferência e sem alterar a voz aprovada. Isso é pré-síntese offline, não evidência de latência live.

Setup reproduzível: instale requirements-chatterbox.txt em ambiente isolado com torch/torchaudio CPU 2.6.0 e execute `python server/live-worker/setup-voice20.py /diretorio/modelos`. O script confere hashes oficiais, gera referências sintéticas e registra sua proveniência; não aprova perfis. Configure `HUBLOAN_CHATTERBOX_MODEL=/diretorio/modelos/chatterbox` e `HUBLOAN_CHATTERBOX_PYTHON=/venv/bin/python`. A síntese do painel nunca substitui falhas por amostras de fallback.

Câmera: inspeção dos limites locais das malhas projetadas após deformação, nove raios sobre olhos/focinho, verificação de rivais próximas e seleção de planos alternativos. A cabeça recebe elevação visual uniforme de 0.42 unidade nos vídeos, sem mudança de física. Retrato secundário no topo, legendas abaixo do rosto. Continuidade limitada a 1.2 unidade por quadro entre cortes. A comédia mede o rosto da apresentadora, excluindo o pescoço da região facial. Os alertas remanescentes bloqueiam aprovação, mesmo com override humano; ausência de alertas não prova qualidade artística.

Regressão RTMP: a execução inicial falhou ao exigir duas partidas de 22 s em uma gravação de 42 s; o fixture foi aumentado para 52 s para não depender de colisões precoces. Isso não altera física nem duração das partidas do produto. Resultados finais serão registrados nos arquivos de evidência.
