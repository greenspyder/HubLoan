> Atualização: [conclusão incremental da PR #16](live-factory-phase42-completion.md).

# Live Factory 4.2 — repertório revisável e voz feminina

Entrega incremental sobre d88d26d (4.1), base `codex/live-factory-director`. Na auditoria master era 05634c6 (3.2); PRs #14/#15 estavam abertos. Runtime, Seed Snake, Three.js, director, mixer, Top 6, encoder, autorizações e watchdog existentes são preservados. Sem merge/deploy público, compras ou APIs pagas.

**Canto melódico IA permanece incompleto.** Implementada a alternativa de importar músicas originais previamente geradas e aprovadas. A evidência usa instrumentais CC0 criados especificamente como fixtures; não são canto nem geração de IA. Kokoro produz fala neural. Naturalidade e qualidade artística precisam de escuta humana: esta sessão não dispõe de audição do arquivo.

## Funcionalidades

- Catálogo persistente por workspace/experiência: rosas, comuns, especiais, Top 6, vitória e ambiente; máximo três faixas/categoria e 18 MB total.
- Importação WAV PCM mono 16-bit 24/48 kHz com validação estrita RIFF, duração e hash SHA-256. Rosas 4–8 s, demais jingles até 20 s, ambiente 4–60 s. Converter outros formatos localmente.
- Metadados de origem, criador, licença, direitos comerciais de live e custo conhecido/desconhecido. Declaração do operador exige revisão humana; não comprova direitos automaticamente.
- Pré-escuta autenticada, aprovação vinculada ao hash, remoção e silêncio emergencial no painel existente. Edição somente com experiência parada. Apenas aprovadas são transferidas ao worker com autorização temporária vigente.
- Arquivos armazenados em live_audio no SQLite/Postgres existente, por workspace. Sem URLs externas arbitrárias, scraping ou download DRM.
- Rotação 0/1 para duas variações; 0/1/0/1/0/2 para três. Cooldown configurável 10–120 s, intervalo global 8 s; especiais priorizados, fila limitada/expirável. Agrupamento não perde presentes do ranking. Histórico limitado a 40 seleções; plays efetivos registrados no worker.
- Mixer existente reproduz arquivos ambiente em loop/playlist, crossfade de 1 s e ducking suave. Jingle e fala compartilham fila serial, sem sobreposição; especial aguarda trecho atual. Limiter e efeitos preservados.
- RMS do PCM efetivamente tocado dirige performance musical/iluminação discreta; faixa instrumental é rotulada e não simula boca cantando. Não há lip-sync fonético, análise de batidas nem separação vocal.
- Câmera considera corpo/objetivo e profundidade na região segura 9:16. Preferência por ação visível pode reduzir tamanho do protagonista.
- Silêncio emergencial limpa filas; propagação pelo heartbeat de 2 s. Revogação, parada geral e limites de atraso permanecem.

## Operação e voz

Parar experiência → Áudio/Biblioteca → importar → pré-escutar → revisar direitos → aprovar hash → iniciar runtime e autorizar worker. O operador deve ouvir realmente antes de aprovar repertório em produção.

Kokoro 82M opcional: principal feminina pt-BR `pf_dora`, secundárias `pm_alex`/`pm_santa`. CPU, duas threads; modelo aproximadamente 328 MB. Instalar venv Python, PyTorch CPU oficial e `server/live-worker/requirements-kokoro.txt`; eSpeak NG é usado para fonetização e fallback, não para gerar a saída neural. Do repositório oficial hexgrad/Kokoro-82M baixar config.json, kokoro-v1_0.pth e as três vozes pf_dora.pt, pm_alex.pt e pm_santa.pt na raiz do diretório do modelo.

```sh
export HUBLOAN_KOKORO_MODEL=/caminho/modelo
export HUBLOAN_KOKORO_PYTHON=/caminho/venv/bin/python
node server/live-worker/worker.mjs --config worker.json --renderer three --voice kokoro --profile light --seconds 126 --output previa.mp4
# Destino RTMP já autorizado na configuração local chmod 600:
node server/live-worker/worker.mjs --config worker.json --renderer three --voice kokoro --profile light --seconds 126 --transmit
```

Bridge offline, cache existente, texto até 200 caracteres, áudio até 8 s e timeout 5 s. Falhas de síntese usam fallback local e são contabilizadas. Instalação/modelo ausentes exigem configuração prévia. Piper/eSpeak preservados; nenhuma migração automática de configurações antigas. Não há clonagem nem controle emocional neural específico.

## Escolhas pesquisadas

- [Kokoro](https://github.com/hexgrad/kokoro), [modelo](https://huggingface.co/hexgrad/Kokoro-82M): 82M, Apache-2.0 e pt-BR documentado; adapter implementado. Distribuição exige preservar licença/avisos. Não declarar superioridade perceptiva sem escuta.
- [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5): candidato a geração antecipada; não instalado/testado. Qualidade pt-BR, hardware e direitos/checkpoints ainda exigem validação.
- [Suno](https://suno.com/terms): direitos dependem dos termos/plano e conteúdo. Não contratado nem integrado; nenhum endpoint inventado. Importar somente arquivos com direitos revisados.

Não há geração nova por presente/live. Astra pode sugerir repertório futuramente; não recebeu autorização de gasto ou aprovação automática.

## Qualidade, custos e limites

Perfis existentes light 360×640/15, smooth 360×640/30 e hd 720×1280/30 preservados como opções condicionadas ao hardware. Perfil economy 216×384/4 fps adicionado para diagnóstico em CPU sem GPU; não atende à meta artística de fluidez. Tentativa anterior economy/6 fps excedeu atraso acumulado de 2 s após 151 frames e encerrou pelo watchdog. Limite de sessão permanece 30 min. Não extrapolar dois minutos de teste para operação prolongada.

Canvas administrativo continua simplificado; MP4 do próprio worker fornece prévia fiel. RTMP de receptor local não confirma live pública TikTok. Login Kit não autoriza LIVE/eventos; integração real de comentários/presentes permanece indisponível sem adapter/permissões verificados. Ranking da demo é SIMULATED_GIFT_QUANTITY, nunca receita.

Custo de API e geração dos instrumentais de teste: zero. Computador/energia/rede não precificados; estimativa local exige potência medida × tarifa. Sem assinatura/GPU obrigatória. Recursos medidos e validação estão no diretório evidence/phase42.

Comparado à 4.1: acrescenta voz feminina opcional, repertório persistente/aprovado, ambiente importado, rotação/agrupamento e performance por PCM real. Ainda pendentes: repertório cantado real, escuta/seleção artística, retenção real, HD validado em GPU, sessões longas, playlist reordenável e ganhos separados fala/canto. Fotos/ranking reaproveitados.

Limitações técnicas: seleção persistida não é confirmação de reprodução; não há exactly-once entre crash e replay. Crash entre blob e metadata pode deixar órfão privado. Worker baixa catálogo no início; alterações exigem parar/reiniciar. Aprovação/remoção/integridade e isolamento têm regressões automatizadas.

Validação concluída: 180/180 backend, 4/4 após ajuste final de câmera, build/lint aprovados e receptor RTMP com 126,037 s H.264/AAC. Evidência e avaliação crítica em [validation.md](evidence/phase42/validation.md). A entrega segue em rascunho: canto real, revisão auditiva e qualidade de movimento ainda pendentes.

Refinamento brasileiro: [propostas, operação e limites](live-factory-brazilian-sound.md). Evidências em `evidence/phase42-brazil/`.
