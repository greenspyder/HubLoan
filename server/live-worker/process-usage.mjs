import {readFile} from 'node:fs/promises';
// Best-effort Linux RSS, including runtime children. Unknown remains null elsewhere.
export async function rssOf(pid){if(!Number.isSafeInteger(pid)||pid<1)return null;try{const s=await readFile(`/proc/${pid}/status`,'utf8');const k=Number(s.match(/^VmRSS:\s+(\d+)/m)?.[1]);return Number.isFinite(k)?k*1024:null;}catch{return null;}}
