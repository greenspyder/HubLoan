// Original editorial repertoire. Local selection only; never executes audience text.
export const lumeLines = {
 roses: [
  'Obrigada pela rosa! Vou guardar longe da curva... por causa dos espinhos.',
  'Uma rosa! Finalmente alguém percebeu que eu sou uma flor de cobra.',
  'Que delicadeza! Agora só falta descobrir como segurar sem ter mãos.',
  'Ganhei uma rosa. Já posso perder a rodada com elegância.',
 ],
 common: ['Obrigada pelo carinho! Meu jardim acaba de ganhar um motivo para dançar.', 'Que surpresa boa! Até a próxima curva ganhou um pouco de charme.'],
 special: [
  'Eu estava plena... agora estou oficialmente fazendo escândalo! Obrigada!',
  'Pausa para recuperar a pose. Mentira, eu nunca tive essa pose toda!',
  'Que surpresa! Até esqueci para que lado fica a próxima curva.',
 ],
 comment: [
  'Eu ouvi! Meu talento está carregando... a confiança veio pré-instalada.',
  'Pode rir comigo. Eu também estou descobrindo esse meu talento.',
  'Eu tenho um plano. Só estou esperando ele me contar qual é.',
 ],
 playing: [
  'Eu vi a pedra. Só achei que ela ia sair.',
  'Não foi falta de habilidade. Foi excesso de corpo.',
  'Minha estratégia é deixar a concorrência tão confusa quanto eu.',
 ],
 food: [
  'Mais uma maçã! Minha cintura está virando uma avenida.',
  'Eu disse que estava com fome. A prova está na barriga!',
  'Colheita feita. Agora preciso achar espaço para virar.',
 ],
 victory: [
  'Ganhei! Vou fingir que estava tudo no planejamento.',
  'Elegância na curva, maçã na barriga. Hoje eu vim pronta!',
  'Podem aplaudir. Se eu tivesse mãos, também estaria aplaudindo.',
 ],
 defeat: [
  'Hoje eu passei vergonha. Amanhã eu passo de fase.',
  'Perdi a rodada, mas a autoestima continua invicta.',
  'Essa curva não combinou comigo. Vou pedir uma segunda opinião.',
 ],
 tie: ['Empatamos! Duas cobras, a mesma fome.', 'Ninguém levou a melhor. Até a maçã ficou indecisa.'],
};
const cheekyLines = {
 roses: ['Trouxe flor ou veio me espetar? Esse cabinho está suspeito.', 'Rosa linda... mas esse cabinho espinhento exige cuidado.', 'Desse jeito vou precisar de um vaso... e de limites.'],
 food: ['Eu avisei que era pequena só no começo.', 'Comprida desse jeito e ainda querem que eu tenha jogo de cintura?'],
};
export function lumeLine(p, category, humor='playful', now=Date.now()) {
 const memory=p.lumeMemory||={count:0,recent:[],lastCheekyAt:null};
 const teasing=humor==='cheeky'&&cheekyLines[category]&&memory.count%4===3&&(memory.lastCheekyAt===null||now-memory.lastCheekyAt>=60000);
 const lines=teasing?cheekyLines[category]:(lumeLines[category]||lumeLines.comment);
 const available=lines.filter(line=>!memory.recent.includes(line));
 const text=(available.length?available:lines)[memory.count%(available.length||lines.length)];
 memory.count++;memory.recent=[...memory.recent,text].slice(-12);
 if(teasing)memory.lastCheekyAt=now;
 return text;
}
export function hostSegment(text, delivery='warm') {
 return {role:'host',voice:'host',text,delivery};
}
