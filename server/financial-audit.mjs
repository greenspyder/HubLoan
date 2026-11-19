import {randomUUID} from 'node:crypto';
// Whitelist audit metadata. Never retain request bodies, keys or provider responses.
export function recordFinancialChange(w,source,action,limits={}) {
 const safe=Object.fromEntries(Object.entries(limits).filter(([key,value])=>['dailyMinor','monthlyMinor','callMinor','taskMinor','dailyLimitMicros','characters','sessionCharacters','enabled'].includes(key)&&(Number.isSafeInteger(value)||typeof value==='boolean')));
 const audit=w.financialAudit||=[];audit.push({id:randomUUID(),at:new Date().toISOString(),source,action,limits:safe});
 if(audit.length>200)audit.splice(0,audit.length-200);
}
