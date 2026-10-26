// Serializable into Chromium. Every supported RGB frame has a multiple-of-three length.
export function encodePixels(bytes){
 if(typeof bytes.toBase64==='function')return bytes.toBase64();
 if(bytes.length%3)throw Error('RGB frame length must be divisible by three');
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',out=new Uint8Array(bytes.length/3*4);
 for(let i=0,j=0;i<bytes.length;i+=3){const value=bytes[i]*65536+bytes[i+1]*256+bytes[i+2];out[j++]=alphabet.charCodeAt(value>>>18);out[j++]=alphabet.charCodeAt((value>>>12)&63);out[j++]=alphabet.charCodeAt((value>>>6)&63);out[j++]=alphabet.charCodeAt(value&63);}
 return new TextDecoder().decode(out);
}
