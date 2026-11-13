export const creativeFormats = Object.freeze([
 {id:'comedy',category:'character',name:'Humor de personagem',pipeline:'short',implemented:true,dependencies:['Chromium/WebGL','FFmpeg','Perfil vocal global disponível'],limitations:['Encenação editorial sobre simulação; não reproduz pedidos arbitrários de atuação.']},
 {id:'battle',category:'gameplay',name:'Confronto com contexto',pipeline:'short',implemented:true,dependencies:['Chromium/WebGL','FFmpeg','Perfil vocal global disponível'],limitations:['Eventos selecionados da simulação real; nunca prometer um vencedor no roteiro.']},
 {id:'champion',category:'character',name:'Apresentação de elenco',pipeline:'short',implemented:true,dependencies:['Chromium/WebGL','FFmpeg','Perfil vocal global disponível'],limitations:['Modelos existentes e poses procedurais; revisão visual obrigatória.']},
 {id:'mystery',category:'storytelling',name:'Microconto de luz e sombra',pipeline:'motion-story',implemented:true,dependencies:['FFmpeg','sharp','Perfil vocal global disponível'],limitations:['Animação vetorial original: porta, viajante e sinal; não gera qualquer cenário solicitado.']},
 {id:'hybrid',category:'experimental',name:'Enigma interativo híbrido',pipeline:null,implemented:false,dependencies:['Editor de ramificações','Interação autorizada'],limitations:['Proposta somente; não renderizável nesta versão.']}
]);

// One capability registry: the manual studio exposes only executable adapters.
export const manualFormats = Object.freeze([
 ...creativeFormats.filter(f=>f.pipeline==='short').map(f=>({...f,name:({comedy:'Lume Comedy 3D',battle:'Snake Battles',champion:'Choose Your Champion'})[f.id],adapter:'short',snake:true})),
 ...[
  ['absurd-documentary','Documentário absurdo','Contraste ficcional entre narração séria e banalidade; preparação, escalada e anticlímax.'],
  ['visual-commentary','Visual Commentary','Explicação visual clara, diagramas e comentários sincronizados.'],
  ['microstory','Microconto cinematográfico 2D','Atmosfera, descoberta e conclusão em imagens com movimento 2D.'],
  ['free-narrative','Vídeo narrativo livre 2D','Respeite o roteiro e as escolhas explícitas do usuário.'],
  ['montage','Montagem audiovisual 2D','Progressão de imagens e movimentos; sem prometer ações 3D ou clipes gerados.']
 ].map(([id,name,direction])=>({id,name,direction,implemented:true,adapter:'visual-commentary',snake:false,dependencies:['FFmpeg','sharp'],limitations:['15–30 segundos, 3–5 cenas, 360×640, cortes e movimento 2D.','Diagramas locais ou imagens Higgsfield; sem importação de clipes ou trilha neste adaptador.','Narração ElevenLabs exige perfil global aprovado e autorização; ausência de voz deve ser explícita.']}))
]);
export function manualFormat(id){return manualFormats.find(f=>f.id===id);}
