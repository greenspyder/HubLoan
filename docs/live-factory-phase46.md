# Live Factory 4.6 — Cinematic Snake

## Base e auditoria

Implementação sobre `4fbea3b`, merge da PR #18 em `codex/live-factory-director`. A `master` auditada permanece em `05634c6` (fase 3.2). A PR #19 aponta para master conforme solicitado e inclui as dependências 4.0–4.5; comparar com `4fbea3b` para revisar somente 4.6. Nenhum merge/deploy automático.

O vídeo 4.5 de 186 segundos foi recuperado e inspecionado por quadros: arena quase fixa/distante, rostos pequenos e apresentadora permanente no rodapé. SHA-256 de referência: `ca455da5b4e5f3a3c329f4be0043af86a29763c8e8588a7c14508b0002618351`. O enquadramento anterior exigia que toda a arena coubesse em cada quadro, anulando aproximações.

## Câmera e direção

`createDirector` continua sendo o único diretor. Interpreta os mesmos eventos reais e acrescenta enquadramentos/protagonista. `camera-rig.mjs` é componente de apresentação serializado dentro da mesma página Three.js isolada; não avança simulação nem chama IA.

- **Follow:** atrás/acima da cabeça, orientação amortecida, alvo próximo no quadro e parte do corpo visível.
- **Front:** à frente do rosto, com deslocamento lateral, para alimentação, comentários e celebrações.
- **Action:** lateral, para momentos de risco e proximidade contínua de obstáculos.
- **Tactical:** início de rodada, disputa e recuperação de alvo.
- Permanência mínima de 5 segundos entre escolhas normais. Perda de alvo e nova rodada podem restaurar a visão tática imediatamente. Prioridades e cooldowns anteriores preservados; seleção do protagonista por evento ou líder vivo, com desempate determinístico.
- Posição/orientação com amortecimento exponencial; reinicialização em nova rodada/alvo evita atravessar a arena inteira. Proteção de cabeça/objetivo local em close-up; somente a tática exige arena completa. Ajuste de distância limitado e fallback tático.
- Câmera fica acima das bordas/rochas atuais. Não é um sistema genérico de colisões para futuros obstáculos altos ou cenários arbitrários.

## Personagens e recursos

Lume conserva Jade; Faísca usa a silhueta Ember do mesmo factory, além da cor própria. Pálpebras menos pesadas, reflexos controlados, língua articulada e olhar relativo à orientação da cobra. Corpo contínuo acompanha o histórico real, com cauda afilada, relevo sutil de escamas original e marcas corporais instanciadas. Buffers GPU são reutilizados enquanto a topologia não muda; a construção das curvas ainda aloca geometria temporária na CPU.

A apresentadora aparece durante fala, performance e destaque da comunidade, deixando o jogo ocupar a tela no silêncio. Top 6, fotos autorizadas, mixer, biblioteca, Kokoro, watchdog, heartbeat, emergência, isolamento e autorização temporária preservados. Não existe outro runtime, encoder, mixer ou personagem paralelo.

Boca por envelope PCM, sem visemas. Instrumental não anima canto labial. Não há canto IA novo. Brazilian Sunsets, Ketsa, CC BY 4.0, conserva a autorização e hash anteriores; jingles de teste e espectadores da demonstração são explicitamente simulados.

## Reprodução

Node 24+, FFmpeg, Chromium headless e Kokoro local conforme fases 4.4/4.5. Defina `HUBLOAN_CHROMIUM`, `HUBLOAN_KOKORO_PYTHON`, `HUBLOAN_KOKORO_MODEL`. A evidência usa `HUBLOAN_SOFTWARE_GL=1`; no contêiner foi necessário `HUBLOAN_UNSANDBOXED_RENDERER=1`. Use isolamento apropriado e não desative o sandbox em uma máquina que não exija isso.

```sh
npm ci --prefix server
npm ci --prefix frontend
npm test --prefix server
npm run build --prefix frontend
(cd frontend && npx eslint src/features/agents src/shared)
node server/live-worker/camera-review.mjs docs/evidence/phase46
mkdir -p /tmp/live46
LIVE_ENTERTAINMENT_EVIDENCE=1 \
LIVE_REPERTOIRE_EVIDENCE_DIR=/tmp/live46 \
LIVE_EVIDENCE_PROFILE=light \
LIVE_APPROVED_AMBIENT_WAV=/caminho/brazilian-sunsets.wav \
node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
```

O teste verifica o hash autorizado da música, importa/aprova apenas no workspace isolado e recebe RTMP em FFmpeg independente. Não exige TikTok real. A gravação do worker é a referência fiel; a prévia Canvas administrativa continua simplificada.

## Custos, validação e limites

Nenhuma API paga. Software WebGL, contêiner limitado a 8 CPUs/8 GiB; consumo de energia/hardware não precificado. Perfis 720p/30 e 360p/30 continuam disponíveis, mas não estão validados por esta entrega. Não há confirmação pública nem acesso a eventos oficiais do TikTok.

Código recuperado após reinicialização foi testado novamente. A evidência anterior perdida não é usada como prova desta revisão. Resultados atuais, comparação com 4.5 e inspeção visual em `evidence/phase46/README.md`. Revisão artística e auditiva humana pendentes; não equiparar testes aprovados a qualidade de animação profissional.
