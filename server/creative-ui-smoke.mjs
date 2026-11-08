import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {createStore} from './store.mjs';
import {createApp} from './app.mjs';
import {resolve} from 'node:path';
const store=await createStore({file:':memory:'}),app=createApp({store,provider:{},staticDirectory:resolve('frontend/dist')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.HUBLOAN_CHROMIUM,headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${app.server.address().port}/agentes/viral`);await page.waitForSelector('section[aria-label="Direção criativa da Astra"]');
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Solicitar ideias').click());
 await page.waitForFunction(()=>document.querySelectorAll('section[aria-label="Direção criativa da Astra"] article').length===5);
 const result=await page.evaluate(()=>{const root=document.querySelector('section[aria-label="Direção criativa da Astra"]');return {count:root.querySelectorAll('article').length,text:root.textContent,blocked:[...root.querySelectorAll('button')].find(b=>b.textContent==='Depende de implementação')?.disabled};});
 assert.equal(result.count,5);assert.equal(result.blocked,true);assert.ok(result.text.includes('CREATIVE_HYPOTHESIS'));assert.ok(result.text.includes('baseado em regras'));
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('section[aria-label="Direção criativa da Astra"] article').length===5);
 console.log('PASS: existing /agentes/viral creates and reloads five persisted proposals, labels evidence and local generator, blocks unsupported production.');
}finally{await browser.close();await app.close();await store.close();}
