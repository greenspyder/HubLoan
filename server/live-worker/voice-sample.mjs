import {createNeuralSpeech} from './neural-speech.mjs';
import {voicePhrases,voiceProfile} from '../lume-voice.mjs';
export function pcmWav(pcm){const b=Buffer.alloc(44+pcm.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(pcm.length*2,40);for(let i=0;i<pcm.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),44+i*2);return b;}
let busy=false;
export async function voiceSample(profile,index=0){
 if(busy)throw Error('Laboratório ocupado; tente após a síntese atual');
 if(!Number.isInteger(index)||index<0||index>=voicePhrases.length)throw Error('Frase inválida');
 busy=true;let speech;try{speech=await createNeuralSpeech({engine:voiceProfile(profile).engine,profile:voiceProfile(profile),timeout:180000,initializationTimeout:60000,maxSeconds:20,fallback:async()=>{throw Error('Voz neural indisponível; configure os modelos locais')}});
 const pcm=await speech.synthesize(voicePhrases[index],'host',{delivery:['mysterious','playful','suspense','warm','surprised'][index]});return {wav:pcmWav(pcm),metrics:{...speech.metrics}};
 }finally{speech?.close();busy=false;}
}
