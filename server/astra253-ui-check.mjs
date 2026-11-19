// Real local browser test, controlled model responses only; no external generation.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createStore} from './store.mjs';
import {createApp} from './app.mjs';
import {workspaceId} from './domain.mjs';
const dir=resolve('docs/evidence/astra253/ui');await mkdir(dir,{recursive:true});
const store=await createStore({file:':memory:'}),app=createApp({store,provider:{},staticDirectory:resolve('frontend/dist')}),token='d'.repeat(64);
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const browser=await puppeteer.launch({executablePath:process.env.HUBLOAN_CHROMIUM,headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage']});
try{const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.evaluateOnNewDocument(t=>localStorage.setItem('hubloan.workspace.access.v2',t),token);const base=`http://127.0.0.1:${app.server.address().port}/agentes/viral?studio=create`;
 for(const width of [1440,390]){await p.setViewport({width,height:950});await p.goto(base);await p.waitForSelector('.astra-one-line');assert.equal(await p.$eval('#create-title',e=>e.textContent),'O que vamos criar hoje?');assert.equal(await p.$eval('.cs-settings',e=>e.open),false);assert.equal(await p.$eval('#studio-advanced',e=>e.open),false);await p.screenshot({path:resolve(dir,`one-line-${width}.webp`),type:'webp'});await (await p.$('.astra-one-line')).screenshot({path:resolve(dir,`composer-${width}.webp`),type:'webp'});
 await p.click('.astra-suggestions button');assert.match(await p.$eval('.cs-prompt textarea',e=>e.value),/capivaras/);assert.equal(await p.$eval('.cs-primary',e=>e.disabled),true);await p.click('.cs-check input');assert.equal(await p.$eval('.cs-primary',e=>e.disabled),false);
 await p.click('.cs-readiness a:nth-child(2)');await p.waitForSelector('dialog[open] #ai-costs');await p.screenshot({path:resolve(dir,`budget-${width}.webp`),type:'webp'});await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.match(await p.$eval('.cs-prompt textarea',e=>e.value),/capivaras/);
 await p.click('.astra-one-line .cs-secondary');assert.equal(await p.$eval('#studio-advanced',e=>e.open),true);await p.screenshot({path:resolve(dir,`advanced-${width}.webp`),type:'webp'});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 // The request is real local API; no runtime credential means a safe observable failure, no API charge.
 await p.goto(base);await p.waitForSelector('.astra-one-line');await p.type('.cs-prompt textarea','Uma história de suspense no metrô.');await p.click('.cs-check input');await p.click('.cs-primary');await p.waitForSelector('.cs-timeline');await p.waitForFunction(()=>document.querySelector('.cs-error')?.textContent.includes('MODEL_NOT_CONNECTED'));const w=(await store.read(workspaceId(token))).workspace;assert.equal(w.creativeCampaigns.length,1);assert.equal(w.creativeCampaigns[0].oneLine,true);assert.equal(w.creativeCampaigns[0].targetCount,1);assert.equal(w.creativeCampaigns[0].state,'Failed');await p.screenshot({path:resolve(dir,'safe-failure-mobile.webp'),type:'webp'});assert.deepEqual(errors,[]);await writeFile(resolve(dir,'result.json'),JSON.stringify({status:'PASS',viewports:[1440,390],checks:['one-line default','suggestion fills input','consent required','finance link preserves draft','advanced opens','no horizontal overflow','single campaign navigation','missing real key fails safely'],paidCalls:0},null,2));console.log('PASS desktop/mobile; one-line defaults; finance integration; advanced; real local failed campaign without key; no paid calls.');
}finally{await browser.close();await app.close();await store.close();}
