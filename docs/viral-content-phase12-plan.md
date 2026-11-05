# Viral Content Factory 1.2 — Direção audiovisual e game feel

> **Status:** especificação de implementação, ainda não implementada. PR empilhada sobre `codex/viral-director11` (#25). Não aprovar nem integrar sem código, testes e vídeos novos.

## Objetivo
Transformar as demonstrações da 1.1 em vídeos curtos visual e sonoramente atraentes, com personagens carismáticos, gameplay legível e edição hipnotizante sem recorrer a estímulos excessivos. Reutilizar Seed Snake, renderer Three/WebGL, Creative Director, TTS, mixer, editor Viral e Astra. Não criar motor paralelo.

## 1. Identidade visual e proporções
- Redesenhar cabeça, focinho, olhos, pálpebras, boca, bochechas e sobrancelhas com malhas e rig expressivos, proporções coerentes e silhuetas distintas para cobra, dragão, gato, crocodilo e raposa. Não apenas trocar cores.
- Corrigir a desproporção cabeça/corpo: tamanho visual ajustável independente de colisão física; hitbox justa e estável. Preservar colisão real e telemetria de sobrevivência.
- Corpo com curvas contínuas, tapering, animação de locomoção, cauda, materiais/iluminação/sombras agradáveis. Evitar aspecto plástico genérico e interseções visíveis.
- Diferenciar Lume e Faísca por personalidade, pose e animação; manter legibilidade em tela pequena.
- Fazer testes de enquadramento frontal, lateral e superior, oclusão, personagens cortados e legibilidade dos seis competidores.

## 2. Gameplay e câmera
- Tornar partidas mais compreensíveis e interessantes: progressão de tensão, trajetórias legíveis, objetivos claros, colisões justas, menor eliminação precoce e maior variedade de eventos. Não roteirizar resultados fingindo que são simulação espontânea.
- Melhorar direção de câmera com tracking frontal de rosto, planos de ação, visão tática contextual, foco nos rivais e transições suaves. Garantir cabeça/olhos visíveis e evitar cortes abruptos sem intenção.
- Highlight detection deve selecionar eventos com contexto e consequência; usar replay marcado e câmera lenta apenas quando ajudam.
- Proporção 9:16, safe areas TikTok, composição limpa e sem HUD de debug.

## 3. Voz, áudio e música
- Investigar por que as demos #25 usaram eSpeak; provisionar pesos Kokoro/Piper autorizados e verificáveis no worker de renderização, com licença e configuração documentadas. Não baixar pesos de fontes desconhecidas nem fazer chamadas pagas.
- Selecionar voz feminina PT-BR natural para Lume, com direção de entonação, pausas, humor e timing; fallback eSpeak deve ser visível e BLOQUEAR aprovação artística/publicação, mas não testes técnicos.
- Registrar engine/modelo/voz efetivos em cada MP4; testes de fallback, pronúncia e sincronização labial; distinguir envelope de amplitude de visemas reais.
- Trilha autorizada escolhida por clima (comédia, suspense, disputa, celebração), SFX sincronizados, ducking, transições e loudness consistente. Sem música comercial sem licença, sem silêncio acidental, clipping ou mascaramento de voz.
- Revisão humana com escuta real, não somente probe AAC.

## 4. Direção e edição
- Começar cada vídeo com gancho visual e sonoro nos 1–2 segundos iniciais; variar planos, ritmo e pausas; payoff claro; evitar gameplay contínuo com legenda por cima.
- Expressões faciais e animação corporal vinculadas a emoções e eventos reais; biblioteca de beats cômicos contextualizados, sem frases repetitivas.
- Adicionar no editor Viral controles de voz, trilha, intensidade visual, proporções artísticas, preview e revisão; persistir versão aprovada e não sobrescrever versões anteriores.
- Avaliação objetiva de oclusão, enquadramento, legendas, áudio, codec, frames distintos, sincronização, FPS e tempo de render; avaliação artística humana separada de métricas técnicas.

## 5. Aceite e evidência obrigatória
1. Gerar **três MP4s NOVOS** (Lume Comedy, Snake Battles, Choose Your Champion), com som completo, legendas e atuação, comparáveis lado a lado com a 1.1.
2. Registrar engine TTS real, voz, licença/trilha, duração, resolução, FPS efetivo, hashes, timeline, eventos de origem, screenshots de rostos em movimento, métricas de oclusão e mixagem.
3. Testar regressão da Live Factory, fairness/hitboxes, watchdog, isolamento/autorização e pipeline de exportação; build e lint.
4. Revisão perceptiva audiovisual dos três vídeos pelo operador, explicitamente pendente até acontecer. Não alegar 'hipnotizante', viralidade, 720p30 ou aprovação artística como comprovados.
5. Manter PR em rascunho; sem merge, deploy, publicação TikTok ou API paga sem aprovação.

## Ordem sugerida
P0: voz neural real + trilha/SFX e relatório; P1: remodelagem facial e proporções/oclusão; P2: gameplay/câmera/game feel; P3: edição refinada e três vídeos de aceite.

## Observações
A #25 continua em rascunho. Esta branch depende dela e não deve mirar master até #25 ser integrada. O conteúdo inicial desta PR é apenas a especificação; a implementação e os testes devem ser adicionados antes da revisão final.
