import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createApp} from './app.mjs';
import {createStore} from './store.mjs';
import {createProvider} from './provider.mjs';
import {resolve} from 'node:path';
const directory=resolve(process.env.HUBLOAN_UI_EVIDENCE||'docs/evidence/creative22');await mkdir(directory,{recursive:true});
const store=await createStore({file:':memory:'}),app=createApp({store,provider:createProvider(),staticDirectory:resolve('frontend/dist')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.HUBLOAN_CHROMIUM||'/usr/bin/chromium',headless:'shell',pipe:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1440,height:1100});await page.goto(`http://127.0.0.1:${app.server.address().port}/agentes/viral`);await page.waitForSelector('[aria-label="Solicitação da campanha"]');
 const click=async text=>page.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);if(!b||b.disabled)throw Error('Button unavailable: '+text);b.click();},text);
 const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
 assert.equal(await page.$eval('#studio-advanced',e=>e.open),false);assert.equal(await page.$eval('.cs-primary',e=>e.disabled),true);
 await page.screenshot({path:resolve(directory,'desktop-empty.webp'),fullPage:true,type:"webp",quality:65});await overflow();
 for(const width of [320,390,768]){await page.setViewport({width,height:844});await overflow();}
 await page.setViewport({width:390,height:844});await page.screenshot({path:resolve(directory,'mobile-empty.webp'),fullPage:true,type:"webp",quality:65});
 await page.click('a[href="#studio-advanced"]');assert.equal(await page.$eval('#studio-advanced',e=>e.open),true);
 await page.$eval('#studio-providers',e=>e.open=true);assert.ok(await page.$eval('#studio-providers',e=>e.textContent.includes('DISCONNECTED')));await overflow();await page.screenshot({path:resolve(directory,'mobile-providers.webp'),fullPage:true,type:'webp',quality:65});
 await page.$eval('#studio-manual',e=>e.open=true);await overflow();
 await page.screenshot({path:resolve(directory,'mobile-advanced.webp'),fullPage:true,type:"webp",quality:65});await page.$eval('#studio-advanced',e=>e.open=false);
 await page.type('[aria-label="Solicitação da campanha"]','Pesquise oportunidades criativas e produza três vídeos distintos para avaliação.');
 await page.evaluate(()=>document.querySelector('.cs-check input').click());await click('Iniciar campanha');await page.waitForSelector('[aria-label="Campanhas autônomas"] article');
 await click('Interromper');await page.waitForFunction(()=>document.querySelector('.cs-campaign-list').textContent.includes('Interrompida'));
 await click('Iniciar campanha');await page.waitForFunction(()=>document.querySelectorAll('.cs-campaign-list article').length===2);
 await app.runner.tick();await page.reload();await page.waitForFunction(()=>document.body.textContent.includes('MODEL_NOT_CONNECTED'));
 assert.ok(await page.$eval('.cs-campaign-list',e=>e.textContent.includes('Conecte o modelo da Astra')));
 await click('Retomar após corrigir');await app.runner.tick();await page.reload();await page.waitForFunction(()=>document.body.textContent.includes('MODEL_NOT_CONNECTED'));
 await overflow();await page.screenshot({path:resolve(directory,'mobile-real-failure.webp'),fullPage:true,type:"webp",quality:65});
 await page.setViewport({width:1440,height:1100});await overflow();await page.screenshot({path:resolve(directory,'desktop-real-failure.webp'),fullPage:true,type:"webp",quality:65});
 assert.equal(await page.$('.cs-gallery video'),null);assert.deepEqual(errors,[]);
 console.log('PASS: real frontend/API start, cancel, resume, missing-model error, history reload; no seeded campaigns or fake video results.');
 console.log('PASS: collapsed tools, advanced navigation, 320/390/768/1440px no overflow, zero page errors. Screenshots: '+directory);
}finally{await browser.close();await app.close();await store.close();}
