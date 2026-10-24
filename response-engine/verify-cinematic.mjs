import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.IAIRS_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960},recordVideo:{dir:'test-results/cinematic-motion',size:{width:1280,height:854}}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const ready=async()=>{await page.locator('.an-world[data-world="artwork"]').waitFor();await page.evaluate(()=>Promise.all([...document.querySelectorAll('.an-art img')].map(i=>i.decode())));await page.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('.an-world')?.dataset.gpu));};
const go=async i=>{await page.evaluate(i=>document.querySelector('#app').experienceScrollTo(document.querySelector(`[data-act-anchor="${i}"]`)),i);await page.waitForFunction(i=>Math.abs(Number(document.querySelector('.an-stage').dataset.progress)-i)<.01,i);};
try{
 await page.goto(base+'/#home');await ready();
 assert.ok(await page.evaluate(()=>document.fonts.load('80px "Cormorant Garamond"').then(f=>f.length>0)));
 assert.equal(await page.locator('.an-world canvas:not(.an-artwork-canvas)').count(),0,'The reference artwork is animated through a screen shader');
 assert.equal(await page.locator('.an-art img').count(),4);
 assert.ok(await page.locator('.an-art img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth>=1600&&i.naturalHeight>=900)));
 const ledger=await page.evaluate(()=>localStorage.getItem('iairs-simulation-v1'));
 for(const i of [0,1,2,3,4,5]){await go(i);assert.equal(await page.locator('[data-scene]:not([inert])').count(),1);}
 if(await page.locator('.an-world').getAttribute('data-gpu')==='ready'){
  await go(1);const frame=await page.locator('.an-artwork-canvas').screenshot();await page.waitForTimeout(450);assert.notDeepEqual(await page.locator('.an-artwork-canvas').screenshot(),frame,'Material pixels move without pointer or scroll input');
 }
 await go(3);const frame=await page.locator('.an-art-metal img').evaluate(e=>getComputedStyle(e).transform);await page.mouse.move(1350,200);await page.waitForTimeout(250);assert.notEqual(await page.locator('.an-art-metal img').evaluate(e=>getComputedStyle(e).transform),frame);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#app').dataset.motion==='off');
 assert.equal(await page.locator('.an-art-metal img').evaluate(e=>getComputedStyle(e).transform),'none');
 await page.locator('#an-failures').evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('[data-an-score]').innerText(),'70');
 assert.equal(await page.evaluate(()=>localStorage.getItem('iairs-simulation-v1')),ledger);
 await page.locator('.an-enter').click();await page.locator('.command-layout').waitFor();assert.equal(await page.locator('.an-art').count(),0);
 const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=function(){return null;};});
 const fp=await fallback.newPage();fp.on('pageerror',e=>errors.push(e.message));await fp.goto(base+'/#workflow');
 await fp.waitForFunction(()=>document.querySelector('.an-stage')?.dataset.fallback==='true');assert.equal(await fp.locator('[data-an-score]').innerText(),'84');
 assert.equal(await fp.locator('.an-art img').count(),4);assert.equal(await fp.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await fp.locator('.an-enter').click();await fp.locator('.command-layout').waitFor();await fallback.close();
 assert.deepEqual(errors,[]);await page.close();await page.video()?.saveAs('test-results/IAIRS-live-transitions.webm');console.log('PASS Reference artworks, live shader pixels, chapter transformations, parallax, reduced motion, Canvas-free fallback, unchanged evidence, and console handoff; browser recording saved');
}finally{await browser.close();}
