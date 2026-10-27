// Local operator-authorized fixture. Music bytes must match the existing approved hash.
import {renderShort} from './viral-render.mjs';
import {decodeMusic} from './live-worker/repertoire.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const [out,musicPath,only]=process.argv.slice(2);if(!out||!musicPath)throw Error('Uso: node server/viral-demo12.mjs saída faixa.wav [formato]');
await mkdir(out,{recursive:true});const meta=JSON.parse(await readFile(new URL('../docs/music/brazilian-sunsets.json',import.meta.url),'utf8'));
const track={...meta,id:'00000000-0000-4000-8000-000000000012',approved:meta.operatorApproval.approved};
const repertoire={assets:new Map([[track.id,decodeMusic(await readFile(musicPath),track)]]),failures:0};
const cases=[{format:'comedy',seconds:18,lines:['Hoje eu vim plena. Elegante.','A maçã me olhou primeiro!','Eu não perdi o controle.','Foi a curva que se emocionou.']},{format:'battle',seconds:25,lines:['Ember ficou sem saída.','Vamos ver como ela chegou ali.','Agora em câmera lenta: acabou o espaço.','Nem toda curva aceita desaforo.']},{format:'champion',seconds:20,lines:['Lume: confiança de quem já ganhou.','Faísca: drama em forma de dragão.','Jade: curiosidade de gato.','Qual personalidade combina com você?']}];
for(const c of cases.filter(c=>!only||c.format===only)){
 const config={...c,characters:['Lume','Faísca','Jade','Ember'],hypothesis:'Revisão audiovisual; retenção não medida.',audience:'Público brasileiro',music:{experienceId:'demo',trackId:track.id}};
 console.log('Rendering',c.format);const result=await renderShort({config,repertoire});
 for(const [ext,data] of [['mp4',Buffer.from(result.base64,'base64')],['png',Buffer.from(result.preview,'base64')],['json',JSON.stringify(result.report,null,2)],['srt',result.srt]])await writeFile(`${out}/${c.format}-12.${ext}`,data);
 console.log(c.format,result.report.wallMs,result.report.voice,result.report.artisticEligibility);
}
