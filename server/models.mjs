// Official standard text prices checked 2026-10-04, USD / 1M tokens.
export const modelCatalog = [
 {id:'gpt-4.1-mini',input:0.4,cached:0.1,output:1.6,role:'worker'},
 {id:'gpt-4.1',input:2,cached:0.5,output:8,role:'decision'},
 {id:'gpt-5.6-luna',input:0.2,cached:0.02,output:1.2,role:'worker'},
 {id:'gpt-6-astra',input:10,cached:1,output:50,role:'decision'},
];
export function selectedModel(w,agentId,kind) {
 if(kind==='image')return w.settings?.imageModel;
 // Existing workspaces retain their low-cost behavior until an explicit validated selection.
 return agentId==='coordinator' ? w.settings?.decisionModel || 'gpt-4.1-mini' : w.settings?.workerModel || 'gpt-4.1-mini';
}
export function estimatedTextUsd(model,usage) {
 const p=modelCatalog.find(p=>p.id===model);
 if(!p||!Number.isSafeInteger(usage?.input_tokens)||!Number.isSafeInteger(usage?.output_tokens))return null;
 const input=usage.input_tokens,output=usage.output_tokens,cached=Math.min(input,usage.input_tokens_details?.cached_tokens||0);
 if(input<0||output<0||cached<0||input>272000)return null;
 return ((input-cached)*p.input+cached*p.cached+output*p.output)/1000000;
}
