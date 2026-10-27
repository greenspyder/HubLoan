# Voice Studio — refinamento da PR #26

## Identidade compartilhada

O Voice Studio está na rota existente `/agentes/viral`. O perfil é global dentro do workspace: novas produções offline e novas autorizações de worker usam a mesma identidade. Não há nova fábrica nem outro sintetizador. O perfil é copiado para a produção/autorização; alterações posteriores não modificam vídeos existentes ou sessões já autorizadas.

Fluxo: salvar candidata → gerar amostra local → escutar → marcar aprovação → aprovar perfil. O backend exige amostra gerada para o mesmo rascunho, confirmação explícita e revisão concorrente correta. Nenhuma voz foi aprovada pelo implementador. As demonstrações usam `dora-calm` **provisória**, não vencedora.

Há uma única voz feminina brasileira no catálogo Kokoro consultado: `pf_dora`. As três candidatas entregues são direções de ritmo (.96, .90 e 1.02), não três vozes diferentes. Os estados mysterious/playful/suspense/surprised/warm/celebration/calm aplicam multiplicadores limitados de velocidade e direção textual. **Não há controle emocional neural, clonagem vocal ou visemas fonéticos.** Boca continua baseada no envelope real do mixer.

## Alternativas e limites

| Motor | Evidência disponível | Limitação desta entrega |
|---|---|---|
| Kokoro 82M v1.0, pf_dora | 15 WAVs locais, cinco frases idênticas por direção; modelo Apache-2.0 | Timbre único; naturalidade e intenção dependem da escuta do operador |
| Piper pt_BR Faber medium | Adaptador existente; model card informa pt_BR, 22.05 kHz e dataset CC0 | Não é candidata feminina comprovada; não substituído nem apresentado como superior |
| Chatterbox Multilingual pt-br | Modelo oficial pt-BR, licença MIT; documentação apresenta síntese expressiva | Não instalado/medido aqui; referência feminina autorizada e recursos precisam ser avaliados antes de integração |

Fontes: [Kokoro voices](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), [Piper Faber](https://huggingface.co/rhasspy/piper-voices/blob/main/pt/pt_BR/faber/medium/MODEL_CARD), [Chatterbox pt-br](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-pt-br). Licença do modelo não equivale a consentimento para imitar terceiros. Não há API paga ou custo de geração contratado. CPU/energia são custos locais não monetizados.

## Instalação e reprodução

Usar a instalação Kokoro descrita em `viral-content-phase12.md`, incluindo `scripts/prepare-kokoro.py`, ambiente Python e variáveis `HUBLOAN_KOKORO_MODEL` e `HUBLOAN_KOKORO_PYTHON`.

```
node server/voice-lab.mjs /diretorio/amostras
node server/viral-demo12.mjs /diretorio/videos /faixa-aprovada/brazilian-sunsets.wav
```

O laboratório mantém um processo neural por candidata, recusa fallback e exporta cada frase separadamente. Seu relatório registra CPU, memória total do host (não RSS), duração e tempo de síntese. Tempo de síntese não inclui inicialização do modelo e não representa latência de live.

O endpoint autenticado de amostras permite apenas as cinco frases fixas, uma síntese concorrente por processo, timeout e limite de duração já existente. Sem pesos locais, a comparação falha explicitamente. O worker de live preserva fallback técnico quando o perfil global neural não está instalado e registra `GLOBAL_NEURAL_MODEL_UNAVAILABLE`. Uma escolha neural explícita na CLI ainda exige instalação. O modo artístico offline recusa fallback.

## Enquadramento

O rig existente passa a projetar um envelope conservador com largura/profundidade do rosto, em vez de apenas dois pontos verticais. Mantém correção de distância, probes de corpos e limites seguros. Front corrige acompanhamento que fique atrás de uma curva; apresentações usam mais planos Front e deixam o plano Action para conclusão.

`renderer.framingQuality` registra quadros examinados/corrigidos e alertas: FACE_CROPPED, SUBJECT_SMALL, POSSIBLE_BODY_OCCLUSION e CAPTION_SAFE_AREA. É uma aproximação geométrica, não avaliação artística: não mede visibilidade de cada pixel, olhar frontal perfeito, inteligibilidade de uma disputa ou todas as sobreposições de legendas. As verificações existentes de arquivo, áudio e fallback continuam obrigatórias. Alertas residuais exigem revisão humana; não são silenciosamente classificados como qualidade aprovada.

Não houve alteração de hitboxes, regras competitivas, isolamento, watchdog ou limites de autorização. Ainda falta validação perceptiva da identidade vocal e de sessões neurais ao vivo prolongadas. Não declarar 720p/30 ou qualidade artística aprovada com base nestes testes offline.
