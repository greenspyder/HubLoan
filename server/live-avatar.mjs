import sharp from 'sharp';
import { AppError } from './domain.mjs';
// Operator-authorized bytes only. Never performs URL fetches (no SSRF/redirect/DNS surface).
export async function normalizeAvatar(input){
 if(input.authorized!==true||typeof input.image!=='string'||input.image.length>140000||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.image))throw new AppError('Envie foto autorizada PNG/JPEG/WebP de até 100 KB. URLs não são aceitas.');
 try{const bytes=Buffer.from(input.image,'base64'),s=sharp(bytes,{limitInputPixels:1048576}),meta=await s.metadata();if(!['png','jpeg','webp'].includes(meta.format)||(meta.pages||1)!==1)throw Error();return (await s.rotate().resize(96,96,{fit:'cover'}).png().toBuffer()).toString('base64');}catch{throw new AppError('Foto inválida, animada ou grande demais.');}
}
