// Offline samples use the same adapter as the encoder. No paid API.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createNeuralSpeech} from './neural-speech.mjs';
export const reviewLines=[
 ['saudacao','warm','Chega mais! Eu sou a Lume. Aqui a gente faz curva, faz charme e às vezes faz vergonha.'],
 ['jogo','wry','Duas cobras e uma maçã. Isso vai virar reunião de condomínio.'],
 ['rosa','wry','Uma rosa! Finalmente alguém percebeu que eu sou uma flor de cobra.'],
 ['especial','excited','Que surpresa! Até esqueci para que lado fica a próxima curva.'],
 ['vitoria','excited','Ganhei! Vou fingir que estava tudo no planejamento.'],
 ['derrota','wry','Perdi a rodada, mas a autoestima continua invicta.'],
 ['controle-suave','warm','Eu tenho um plano. Só estou esperando ele me contar qual é.'],
 ['controle-ironico','wry','Eu tenho um plano. Só estou esperando ele me contar qual é.'],
 ['controle-animado','excited','Eu tenho um plano. Só estou esperando ele me contar qual é.'],
];
function wav(pcm){const b=Buffer.alloc(44+pcm.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(pcm.length*2,40);pcm.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));return b;}
export async function voiceReview(directory){await mkdir(directory,{recursive:true});const voice=await createNeuralSpeech({engine:'kokoro'}),samples=[];
 try{for(const [name,delivery,text] of reviewLines){const at=performance.now(),before=voice.metrics.neural,pcm=await voice.synthesize(text,'host',{delivery}),bytes=wav(pcm);await writeFile(resolve(directory,name+'.wav'),bytes);samples.push({name,delivery,text,seconds:pcm.length/48000,synthesisMs:performance.now()-at,neural:voice.metrics.neural>before,sha256:createHash('sha256').update(bytes).digest('hex')});}await writeFile(resolve(directory,'samples.json'),JSON.stringify({samples,metrics:voice.metrics,humanListeningApproved:false,note:'Delivery adjusts speed/punctuation; no learned emotion control or singing.'},null,2));}finally{voice.close();}return samples;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(!process.argv[2])throw Error('Informe diretório de saída');await voiceReview(resolve(process.argv[2]));}
