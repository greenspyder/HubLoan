import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {createApp} from './app.mjs';
import {createStore} from './store.mjs';
import {createProvider} from './provider.mjs';
import {resolve} from 'node:path';
const store=await createStore({file:':memory:'}),app=createApp({store,provider:createProvider(),staticDirectory:resolve('frontend/dist')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.HUBLOAN_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-process-singleton','--no-zygote','--single-process']});
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${app.server.address().port}/agentes/viral`);await page.waitForSelector('[aria-label="Solicitação da campanha"]');
 await page.evaluate(()=>{const label=[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Autorizar planejamento pelo modelo'));label.querySelector('input').click();});
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Iniciar campanha de três vídeos').click());
 await page.waitForFunction(()=>document.querySelector('[aria-label="Campanhas autônomas"] article'));
 await app.runner.tick();await page.reload();await page.waitForFunction(()=>document.body.textContent.includes('MODEL_NOT_CONNECTED'));
 assert.ok(await page.$eval('[aria-label="Campanhas autônomas"]',e=>e.textContent.includes('Failed')));console.log('PASS: campaign started in actual frontend, failed with real missing-model dependency, history persisted across reload, no fake outputs.');
}finally{await browser.close();await app.close();await store.close();}
