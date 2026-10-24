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
 contest: [
  'A maçã virou imóvel disputado. Faísca já quer a escritura.',
  'Duas candidatas, uma vaga no almoço. Que comece a entrevista.',
  'Faísca veio pelo mesmo caminho. Isso é fome ou perseguição?',

  'Duas cobras e uma maçã. Isso vai virar reunião de condomínio.',
  'Ela quer a minha maçã! Faísca, amizade tem limite.',
  'A concorrência chegou. Vou caprichar no rebolado da curva.',
 ],
 risk: [
  'Passei tão perto da pedra que quase trocamos telefone.',
  'Essa curva devia vir com aviso e seguro.',
  'O corpo foi. A dignidade ainda está fazendo a curva.',

  'Essa pedra passou perto! Meu coração fez uma curva antes de mim.',
  'Desviei! Foi habilidade... com uma pitada de desespero.',
  'Licença, pedrinha. Hoje eu estou comprida demais para discutir.',
 ],
 pursuit: [
  'Estou de olho naquela maçã. O resto de mim chega depois.',
  'Jantar à vista! Hoje o delivery sou eu.',
  'Vou pela sombra. Fome com estratégia, meu bem.',

  'Achei a maçã. Agora falta convencer o resto de mim a acompanhar.',
  'Olha o meu jantar ali! Vou chegar fazendo curva e charme.',
  'A maçã está me dando bola. Ou eu estou com muita fome.',
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
  'Mais comprida. Agora manobrar exige reunião.',
  'Eu como uma maçã e ganho três problemas de estacionamento.',
  'A fruta era pequena. A consequência ficou longa.',

  'Mais uma maçã! Minha cintura está virando uma avenida.',
  'Eu disse que estava com fome. A prova está na barriga!',
  'Colheita feita. Agora preciso achar espaço para virar.',
 ],
 victory: [
  'Faísca, guarda essa maçã na memória. Na barriga ficou comigo.',
  'Hoje eu deslizei no jardim e no ego da concorrência.',
  'Ganhei sem levantar um dedo. Facilita não ter nenhum.',

  'Ganhei! Vou fingir que estava tudo no planejamento.',
  'Elegância na curva, maçã na barriga. Hoje eu vim pronta!',
  'Podem aplaudir. Se eu tivesse mãos, também estaria aplaudindo.',
 ],
 defeat: [
  'Faísca ganhou. Eu ofereci entretenimento. São carreiras diferentes.',
  'Essa derrota foi uma escolha artística muito questionável.',
  'Meu plano era perfeito antes de encontrar a realidade.',

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
 // Exhausted categories use least-recently-spoken, not global modulo (which can repeat immediately).
 const pool=available.length?available:[...lines].sort((a,b)=>memory.recent.lastIndexOf(a)-memory.recent.lastIndexOf(b));
 const text=available.length?pool[memory.count%pool.length]:pool[0];
 memory.count++;memory.recent=[...memory.recent,text].slice(-12);
 if(teasing)memory.lastCheekyAt=now;
 return text;
}
export function hostSegment(text, delivery='warm') {
 return {role:'host',voice:'host',text,delivery};
}

// Offline preparation set, bounded and independent of audience text.
export function warmupSegments(){return [...lumeLines.roses.map(t=>hostSegment(t,'wry')),...lumeLines.special.map(t=>hostSegment(t,'excited'))];}
