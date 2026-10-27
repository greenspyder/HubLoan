# Viral Content Factory 1.2 — revisão audiovisual

Branch exclusiva `codex/viral-audiovisual12`, PR #26 sobre `codex/viral-director11` (#25). Sem merge, deploy, postagem ou API paga.

## Auditoria e implementação

A 1.1 já fornece simulação gravada, highlights explicáveis, timeline, replay, câmera lenta, legendas, renderizador Three.js, mixer PCM e revisão no Armazém. A 1.2 reutiliza esses contratos. O problema de voz era a ausência dos pesos/runtime Kokoro no ambiente offline: sem `HUBLOAN_KOKORO_MODEL`, o exportador escolhia eSpeak. Agora o padrão é neural obrigatório, com falha explícita se indisponível. O modo técnico continua disponível e seu fallback impede aprovação artística no backend, inclusive com override.

O rosto existente ganhou focinhos deformados por espécie, volumes de suporte dos olhos, orelhas triangulares extrudadas, focinho longo de crocodilo, focinho afilado de raposa, dentes e chifres, materiais menos brilhantes e respiração discreta. A cabeça visual foi reduzida para 1,08 da escala base e é ajustável entre 0,95 e 1,15, sem alterar hitboxes. O formato comedy usa a própria apresentadora em primeiro plano, com pescoço/corpo curvado. A atuação permanece por envelope PCM e poses; não há visemas ou alinhamento fonético.

As 72 partículas reutilizam uma geometria, preservando o limite de recursos do teste WebGL. Não há outro renderer, mixer ou runtime. Watchdog e isolamento foram preservados. Controles de voz, escala visual, efeitos e alertas de aprovação estão na rota Viral existente. A faixa selecionada é a mesma biblioteca aprovada; créditos e licença acompanham a exportação.

## Preparar voz e reproduzir

Requisitos: Node 24, FFmpeg com libass, Chromium, Python 3.12. No ambiente testado, Kokoro 0.9.4 e PyTorch 2.14.1+cpu. Instalação explícita, fora de uma transmissão:

```sh
python3 -m venv .venv-kokoro
.venv-kokoro/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv-kokoro/bin/pip install kokoro==0.9.4
python3 scripts/prepare-kokoro.py /caminho/modelos/kokoro
export HUBLOAN_KOKORO_MODEL=/caminho/modelos/kokoro
export HUBLOAN_KOKORO_PYTHON=/caminho/.venv-kokoro/bin/python
export HUBLOAN_CHROMIUM=/caminho/chrome-headless-shell
npm ci --prefix server
node server/viral-demo12.mjs /caminho/saida /caminho/brazilian-sunsets.wav
```

O instalador verifica SHA-256 e tamanho dos arquivos oficiais listados em `docs/evidence/viral12/kokoro-assets.json`. Aproximadamente 329 MB de pesos e 1,5 GB de ambiente Python. Sem GPU obrigatória para TTS. Em contêiner de teste isolado utilizamos `HUBLOAN_SOFTWARE_GL=1` e `HUBLOAN_UNSANDBOXED_RENDERER=1`; não desabilite sandbox em hospedagem pública. O download não acontece automaticamente na live.

A música de demonstração é **Brazilian Sunsets — Ketsa**, instrumental, CC BY 4.0, aprovada pelo operador anteriormente; hash e autorização em `docs/music/brazilian-sunsets.json`. Não é música nova, funk gerado, canto IA ou repertório completo por clima. Para a aplicação, importe/aprove no workspace e selecione a faixa no estúdio. Não há custos de API; energia/hardware têm custo desconhecido, não zero.

## Critérios e limites

- Implementado: geometria facial diferenciada, apresentação comedy, controles limitados, exigência neural e bloqueio backend, créditos musicais, otimização de geometria.
- Testado: suíte backend, frontend build/lint, WebGL real com integridade do jogo, limites de geometria, boca PCM e limpeza. Evidências desta execução em `docs/evidence/viral12`.
- A gravação usa 360×640 e 15 FPS de mídia offline. Tempo de produção não é FPS ao vivo. Não foi validado 720p/30 nem uma nova transmissão RTMP nesta entrega.
- Física e sobrevivência não foram alteradas. Não há nova garantia de redução de eliminações.
- Pendentes: aprovação artística humana, avaliação auditiva, refinamento adicional de oclusões/close-ups, catálogo por clima completo, visemas, canto IA e acabamento de animação profissional.
- Não há métricas reais de audiência, retenção, viralidade ou receita. Manter PR em rascunho até a revisão dos três MP4s.

Uma limpeza automática removeu arquivos locais da execução anterior. Os números anteriores não são tratados como evidência atual; os vídeos foram regenerados e os relatórios anexados correspondem aos novos arquivos.
