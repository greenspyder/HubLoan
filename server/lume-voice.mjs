// One workspace-scoped identity, shared by offline productions and new live grants.
// Labels describe direction, not emotional controls supplied by Kokoro.
export const voiceCandidates=[
 {id:'dora-current',name:'Dora atual',speed:.96},
 {id:'dora-calm',name:'Dora · direção contida',speed:.90},
 {id:'dora-flow',name:'Dora · direção conversacional',speed:1.02}
];
export const voicePhrases=[
 'Tem alguma coisa estranha acontecendo nessa arena... e eu acho que vocês ainda não perceberam.',
 'Ela tinha um plano perfeito. Infelizmente, esqueceu de avisar a própria cabeça.',
 'Espera... espera... não vira agora.',
 'Olha quem apareceu... estava esperando você chegar.',
 'Eu não acredito que ela conseguiu escapar dessa!'
];
export const voiceStates=['mysterious','playful','suspense','surprised','warm','celebration','calm'];
export function voiceProfile(input={}){
 const c=voiceCandidates.find(c=>c.id===(input.candidateId||'dora-current'));if(!c)throw Error('Candidata vocal inválida');
 const speed=input.speed??c.speed;if(!Number.isFinite(speed)||speed<.85||speed>1.1)throw Error('Ritmo vocal: 0,85–1,10');
 return {version:Number.isSafeInteger(input.version)&&input.version>0?input.version:1,candidateId:c.id,engine:'kokoro',model:'Kokoro-82M-v1.0',voice:'pf_dora',language:'pt-BR',speed,style:c.name,normalization:'existing-mixer-limiter',fallback:'espeak-technical-only',license:'Apache-2.0',source:'https://huggingface.co/hexgrad/Kokoro-82M',emotionControl:'text-and-speed-only'};
}
export function activeVoice(w){return voiceProfile(w.voiceStudio?.active);}
export function voiceStudioState(w){return {active:activeVoice(w),draft:w.voiceStudio?.draft||null,revision:w.voiceStudio?.revision||0,candidates:voiceCandidates,phrases:voicePhrases};}
export function voiceStudioAction(w,input){
 const state=w.voiceStudio||={active:voiceProfile(),revision:0};
 if(input.revision!==state.revision)throw Error('Perfil alterado; atualize a página');
 if(input.action==='save'){state.draft=voiceProfile({...input.profile,version:state.active.version+1});state.previewed=null;}
 else if(input.action==='approve'){
  if(!state.draft||input.listened!==true||state.previewed!==JSON.stringify(state.draft))throw Error('Ouça a candidata salva antes de aprovar');
  state.active=structuredClone(state.draft);state.draft=null;state.previewed=null;
 }else throw Error('Ação vocal inválida');
 state.revision++;return voiceStudioState(w);
}
export function directedSpeed(profile,state='warm'){
 const factors={mysterious:.97,playful:1.01,suspense:.96,surprised:1.05,warm:1,celebration:1.06,calm:.97,wry:1.01,excited:1.06};
 return Math.min(1.12,Math.max(.85,voiceProfile(profile).speed*(factors[state]||1)));
}
