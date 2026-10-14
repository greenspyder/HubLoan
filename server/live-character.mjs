import { AppError, text } from './domain.mjs';

export const characterOptions = {
  expressions: ['calm', 'happy', 'joy', 'curious', 'focused'],
  animations: ['idle', 'sway', 'bounce', 'wave', 'spin'],
  sounds: ['none', 'chime', 'sparkle', 'drum'],
  scenes: ['garden', 'cosmos', 'sunset'],
  events: ['greet', 'challenge', 'celebrate'],
};
export function defaultCharacter() {
  return { name: 'Lume', personality: 'Curioso, acolhedor e apaixonado por pequenas descobertas.', scene: 'garden',
    idlePhrase: 'Observando o jardim de estrelas…', voice: 'none', audio: { muted: false, volume: 0.25 },
    rules: {
      greet: { expression: 'happy', animation: 'wave', sound: 'chime', phrases: ['Olá, explorador! Este é um teste.'], durationMs: 6000 },
      challenge: { expression: 'curious', animation: 'sway', sound: 'drum', phrases: ['Desafio aceito: encontrar uma nova semente!'], durationMs: 6000 },
      celebrate: { expression: 'joy', animation: 'bounce', sound: 'sparkle', phrases: ['Uma pequena conquista merece uma grande dança!'], durationMs: 6000 },
    } };
}
function choice(value, options, label) {
  if (!options.includes(value)) throw new AppError(`${label} inválido.`);
  return value;
}
export function validateCharacter(input) {
  if (!input || typeof input !== 'object' || !input.audio || !input.rules) throw new AppError('Configuração de personagem incompleta.');
  if (input.voice !== 'none') throw new AppError('Síntese de voz ainda não suportada.');
  if (typeof input.audio.muted !== 'boolean' || !Number.isFinite(input.audio.volume) || input.audio.volume < 0 || input.audio.volume > 1) throw new AppError('Volume deve estar entre 0 e 1.');
  const rules = {};
  for (const event of characterOptions.events) {
    const rule = input.rules[event];
    if (!rule || !Array.isArray(rule.phrases) || rule.phrases.length < 1 || rule.phrases.length > 5) throw new AppError('Cada reação exige de uma a cinco frases.');
    if (!Number.isInteger(rule.durationMs) || rule.durationMs < 2000 || rule.durationMs > 10000) throw new AppError('Duração deve ficar entre 2 e 10 segundos.');
    rules[event] = { expression: choice(rule.expression, characterOptions.expressions, 'Expressão'), animation: choice(rule.animation, characterOptions.animations, 'Animação'), sound: choice(rule.sound, characterOptions.sounds, 'Som'), phrases: rule.phrases.map(s => text(s, 'Frase', 160)), durationMs: rule.durationMs };
  }
  return { name: text(input.name, 'Nome do personagem', 60), personality: text(input.personality, 'Personalidade', 500), scene: choice(input.scene, characterOptions.scenes, 'Cenário'), idlePhrase: text(input.idlePhrase, 'Frase de repouso', 160), voice: 'none', audio: { muted: input.audio.muted, volume: input.audio.volume }, rules };
}

// Local creative heuristics, explicitly not a model response. Never auto-apply.
export function creativeProposal(e) {
  const config = structuredClone(e.config || defaultCharacter());
  config.rules.celebrate.phrases = [...new Set([...config.rules.celebrate.phrases, 'Uma estrela para cada pequena conquista!', 'Vamos guardar essa alegria no jardim.'])].slice(0, 5);
  config.rules.celebrate.animation = 'wave';
  return { config, rationale: 'Alternar frases de comemoração e usar um aceno pode reduzir repetição. Teste a reação e observe o resultado antes de adotar.', source: 'LOCAL_RULES', aiUsed: false };
}
