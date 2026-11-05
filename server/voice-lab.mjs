import {mkdir,writeFile} from 'node:fs/promises';
import {cpus,totalmem} from 'node:os';
import {voiceCandidates,voiceProfile,voicePhrases} from './lume-voice.mjs';
import {createNeuralSpeech} from './live-worker/neural-speech.mjs';
import {pcmWav} from './live-worker/voice-sample.mjs';
const out=process.argv[2];if(!out)throw Error('Informe diretório de saída');await mkdir(out,{recursive:true});
const rows=[];for(const candidate of voiceCandidates){const profile=voiceProfile({candidateId:candidate.id}),speech=await createNeuralSpeech({engine:'kokoro',profile,timeout:20000,fallback:async()=>{throw Error('Fallback proibido no laboratório')}});
try{for(let i=0;i<voicePhrases.length;i++){const started=performance.now(),state=['mysterious','playful','suspense','warm','surprised'][i],pcm=await speech.synthesize(voicePhrases[i],'host',{delivery:state});const filename=`${candidate.id}-${'ABCDE'[i]}.wav`;await writeFile(`${out}/${filename}`,pcmWav(pcm));rows.push({filename,profile,text:voicePhrases[i],state,seconds:pcm.length/48000,synthesisMs:performance.now()-started,hardware:{cpu:cpus()[0]?.model,cores:cpus().length,ram:totalmem()},metrics:{...speech.metrics},listened:false});}}
finally{speech.close();}}
await writeFile(`${out}/voice-lab.json`,JSON.stringify(rows,null,2));console.log(rows.map(r=>({file:r.filename,seconds:r.seconds,ms:r.synthesisMs})));
