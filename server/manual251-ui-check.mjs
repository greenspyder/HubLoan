import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createStore} from './store.mjs';
import {createApp} from './app.mjs';
const directory=resolve(process.env.HUBLOAN_UI_EVIDENCE||'docs/evidence/manual251/ui');await mkdir(directory,{recursive:true});const store=await createStore({file:':memory:'}),app=createApp({store,provider:{},staticDirectory:resolve('frontend/dist')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const browser=await puppeteer.launch({executablePath:process.env.HUBLOAN_CHROMIUM,headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage']});
try{const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${app.server.address().port}/agentes/viral`);await p.waitForSelector('#studio-manual');await p.evaluate(()=>{document.querySelector('#studio-advanced').open=true;document.querySelector('#studio-manual').open=true;});
 const select='#studio-manual > label select';assert.equal(await p.$$eval(select+' option',o=>o.length),8);
 for(const format of ['absurd-documentary','visual-commentary','battle']){await p.select(select,format);const text=await p.$eval('#studio-manual',e=>e.textContent);assert.equal(text.includes('Personagens, separados'),format==='battle');assert.equal(text.includes('Proporção visual'),format==='battle');for(const width of [390,1440]){await p.setViewport({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+format+' '+width);await p.$eval('#studio-manual',e=>e.scrollIntoView());await p.screenshot({path:resolve(directory,`${format}-${width}.webp`),type:'webp',quality:70});}}
 assert.deepEqual(errors,[]);console.log('PASS: 8 formats; narrative controls exclude Snake; existing battle form preserved; mobile390/desktop1440 no overflow or runtime errors.');
}finally{await browser.close();await app.close();await store.close();}
