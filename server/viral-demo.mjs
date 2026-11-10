// Operational offline demo. No external publication or paid providers.
import {renderShort} from './viral-render.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const folder=process.argv[2];if(!folder)throw Error('Informe pasta de saída');await mkdir(folder,{recursive:true});
const common={hypothesis:'Edição e atuação podem melhorar compreensão; retenção não medida.',audience:'Público brasileiro',characters:['Lume','Faísca','Jade','Ember']};
for(const c of [
 {format:'comedy',seconds:15,lines:['Eu trouxe um plano infalível.','Primeiro: achar a maçã.','Segundo: fingir que sei frear.','A confiança veio sem manual!']},
 {format:'battle',seconds:25,lines:['Ember ficou sem saída.','Vamos ver como ela chegou ali.','Olha de novo: acabou o espaço.','Nem toda curva aceita desaforo.']},
 {format:'champion',seconds:16,lines:['Lume: pose de quem já ganhou.','Faísca: drama em forma de dragão.','Jade: curiosidade de gato.','Quem você levaria para a arena?']}
]){console.log('Rendering',c.format);const r=await renderShort({config:{...common,...c}});for(const [ext,data] of [['mp4',Buffer.from(r.base64,'base64')],['png',Buffer.from(r.preview,'base64')],['json',JSON.stringify(r.report,null,2)],['srt',r.srt]])await writeFile(`${folder}/${c.format}-11.${ext}`,data);console.log(c.format,r.report.wallMs,r.report.distinctFrames);}
