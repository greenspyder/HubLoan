import {AppError} from './domain.mjs';
// Preparation only: no credentials, paid requests or generation in the runtime.
export const musicProviders=Object.freeze({elevenlabs:'NOT_CONFIGURED',suno:'NOT_CONFIGURED',acestep:'NOT_CONFIGURED',manual:'MANUAL_IMPORT'});
export function prepareMusic(i){
 if(!Object.hasOwn(musicProviders,i.provider)||!['roses','common','special','top6','victory'].includes(i.category))throw new AppError('Provedor ou categoria inválidos.');
 const text=(key,max)=>{const v=i[key];if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x08\x0b-\x1f]/.test(v))throw new AppError(`Revise ${key}.`);return v.trim();};
 if(!Number.isInteger(i.seconds)||i.seconds<4||i.seconds>(i.category==='roses'?8:20))throw new AppError('Rosas: 4–8 segundos. Outras categorias: 4–20.');
 return {provider:i.provider,category:i.category,seconds:i.seconds,lyrics:text('lyrics',800),style:text('style',500),status:musicProviders[i.provider],costAuthorized:false,confirmedCostMinor:null,generated:false};
}
