import {existsSync} from 'node:fs';
import {join} from 'node:path';
// One workspace-scoped identity, shared by offline productions and new live grants.
// Labels describe direction, not emotional controls supplied by Kokoro.
export const voiceCandidates=[
 {id:'dora-current',name:'Dora · referência anterior',speed:.96,engine:'kokoro',referenceOnly:true},
 {id:'chatterbox-heart',name:'Chatterbox PT-BR · Heart sintética',speed:1,engine:'chatterbox',reference:'af_heart'},
 {id:'chatterbox-emma',name:'Chatterbox PT-BR · Emma sintética',speed:1,engine:'chatterbox',reference:'bf_emma'},
 {id:'dora-calm',name:'Dora · legado contido',speed:.90,legacy:true},
 {id:'dora-flow',name:'Dora · legado conversacional',speed:1.02,legacy:true}
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
 if(c.engine==='chatterbox'){
 const exaggeration=input.exaggeration??.35;if(!Number.isFinite(exaggeration)||exaggeration<.2||exaggeration>.6)throw Error('Expressividade: 0,20–0,60');
 return {version:Number.isSafeInteger(input.version)&&input.version>0?input.version:1,candidateId:c.id,engine:'chatterbox',model:'Chatterbox-Multilingual-pt-br',voice:c.reference,reference:c.reference,language:'pt-BR',speed:1,exaggeration,style:c.name,normalization:'existing-mixer-limiter',fallback:'espeak-technical-only',license:'MIT; synthetic reference Apache-2.0',source:'https://huggingface.co/ResembleAI/Chatterbox-Multilingual-pt-br',emotionControl:'neural-exaggeration-not-emotion-labels',liveValidated:false};
 }
 const speed=input.speed??c.speed;if(!Number.isFinite(speed)||speed<.85||speed>1.1)throw Error('Ritmo vocal: 0,85–1,10');
 return {version:Number.isSafeInteger(input.version)&&input.version>0?input.version:1,candidateId:c.id,engine:'kokoro',model:'Kokoro-82M-v1.0',voice:'pf_dora',language:'pt-BR',speed,style:c.name,normalization:'existing-mixer-limiter',fallback:'espeak-technical-only',license:'Apache-2.0',source:'https://huggingface.co/hexgrad/Kokoro-82M',emotionControl:'text-and-speed-only'};
}
export function activeVoice(w){return voiceProfile(w.voiceStudio?.active);}
export function voiceStudioState(w){return {active:activeVoice(w),draft:w.voiceStudio?.draft||null,revision:w.voiceStudio?.revision||0,candidates:voiceCandidates.filter(c=>!c.legacy).map(c=>({...c,engine:c.engine||'kokoro',installed:voiceInstalled(c.id),license:voiceProfile({candidateId:c.id}).license})),phrases:voicePhrases};}
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

export function voiceInstalled(candidateId){
 const p=voiceProfile({candidateId}),root=process.env[`HUBLOAN_${p.engine.toUpperCase()}_MODEL`];
 const files=p.engine==='chatterbox'?['t3_pt_br.safetensors','s3gen_v3.pt','ve.pt','grapheme_mtl_merged_expanded_v1.json',`references/${p.reference}.wav`]:['config.json','kokoro-v1_0.pth','pf_dora.pt','pm_alex.pt','pm_santa.pt'];
 return Boolean(root&&files.every(f=>existsSync(join(root,f))));
}
