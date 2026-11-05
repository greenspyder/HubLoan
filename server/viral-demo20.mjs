// Private offline review using measured Chatterbox takes; never alters active voice.
import {renderShort} from './viral-render.mjs';
import {archivedSpeech} from './live-worker/archived-speech.mjs';
import {decodeMusic} from './live-worker/repertoire.mjs';
import {voiceProfile,voicePhrases} from './lume-voice.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const [out,assets,only]=process.argv.slice(2);if(!out||!assets)throw Error('Uso: node server/viral-demo20.mjs saída arquivos [formato]');
await mkdir(out,{recursive:true});const records=JSON.parse(await readFile(join(assets,'measurements.json'),'utf8')),files=new Map();
for(const r of records.filter(r=>r.voice==='af_heart'))files.set(r.file,await readFile(join(assets,r.file)));
const meta=JSON.parse(await readFile(new URL('../docs/music/brazilian-sunsets.json',import.meta.url),'utf8')),track={...meta,id:'00000000-0000-4000-8000-000000000012',approved:meta.operatorApproval.approved};
const repertoire={assets:new Map([[track.id,decodeMusic(await readFile(join(assets,'brazilian-sunsets.wav')),track)]]),failures:0};
const cases=[{format:'comedy',seconds:18,indices:[1,0]},{format:'battle',seconds:25,indices:[0,2,1]},{format:'champion',seconds:20,indices:[3,0]}];
for(const c of cases.filter(c=>!only||c.format===only)){
 const profile=voiceProfile({candidateId:'chatterbox-heart'}),config={...c,lines:c.indices.map(i=>voicePhrases[i]),voiceProfile:profile,characters:['Lume','Faísca','Jade','Ember'],hypothesis:'Revisão audiovisual privada, falas criativas; voz provisória não aprovada.',audience:'Público brasileiro',music:{experienceId:'demo',trackId:track.id}};
 console.log('NEW RENDER, provisional Chatterbox Heart, verified archived takes',c.format);
 const result=await renderShort({config,repertoire,offlineVoice:archivedSpeech(profile,records,files)});
 result.report.voiceApproval='PROVISIONAL_NOT_APPROVED';result.report.audioPreparation='Previously synthesized WAVs verified by SHA-256; no inference during rendering';result.report.reviewOnly=true;
 for(const [ext,data] of [['mp4',Buffer.from(result.base64,'base64')],['png',Buffer.from(result.preview,'base64')],['json',JSON.stringify(result.report,null,2)],['srt',result.srt]])await writeFile(join(out,`${c.format}-voice20.${ext}`),data);
 console.log(c.format,result.report.wallMs,result.report.renderer.framingQuality,result.report.artisticEligibility);
}
