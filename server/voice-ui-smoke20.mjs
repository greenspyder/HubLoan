import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createStore} from './store.mjs';
import {createApp} from './app.mjs';
const dir=await mkdtemp(join(tmpdir(),'voice-ui-')),store=await createStore({file:join(dir,'state.sqlite')}),app=createApp({store,provider:{},staticDirectory:resolve('frontend/dist')}),token='a'.repeat(64);
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
const response=await fetch(base+'/api/agents/voice-studio',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'save',revision:0,profile:{candidateId:'chatterbox-emma'}})});assert.equal(response.status,200);
const browser=await puppeteer.launch({executablePath:process.env.HUBLOAN_CHROMIUM,headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage();await page.evaluateOnNewDocument(t=>localStorage.setItem('hubloan.workspace.access.v2',t),token);await page.goto(base+'/agentes/viral');
 await page.waitForFunction(()=>[...document.querySelectorAll('summary')].some(e=>e.textContent.includes('Voice Studio')));
 const state=await page.evaluate(()=>{const p=[...document.querySelectorAll('details')].find(e=>e.textContent.includes('Voice Studio'));return {selected:p.querySelector('select').value,options:[...p.querySelector('select').options].map(o=>o.value),approve:[...p.querySelectorAll('button')].find(e=>e.textContent==='Aprovar como voz global').disabled,text:p.textContent};});
 assert.equal(state.selected,'chatterbox-emma');assert.equal(state.approve,true);assert.ok(state.options.includes('chatterbox-heart'));assert.ok(!state.options.includes('dora-calm'));assert.ok(state.text.includes('pf_dora'));assert.ok(state.text.includes('Modelo indisponível'));assert.ok(state.text.includes('Live neural não validada'));
 console.log('PASS: real identities listed, persisted draft, active Dora unchanged, missing models explicit, approval disabled without listening. No model inference in this UI smoke test.');
}finally{await browser.close();await app.close();await store.close();await rm(dir,{recursive:true,force:true});}
