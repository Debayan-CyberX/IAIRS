import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.IAIRS_TEST_URL||'http://127.0.0.1:5173';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:'test-results/cinematic-motion',size:{width:1280,height:854}}});
const page=await context.newPage(),errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const go=async value=>{
 await page.evaluate(value=>{const track=document.querySelector('.an-track'),step=parseFloat(document.querySelector('.anomaly-experience').style.getPropertyValue('--an-step'));scrollTo({top:track.getBoundingClientRect().top+scrollY+step*value,behavior:'instant'});},value);
 await page.waitForFunction(value=>Math.abs(Number(document.querySelector('.an-stage')?.dataset.progress)-value)<.003,value);
};
try{
 await page.goto(base);await page.locator('.an-stage[data-ready]').waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('.an-world')?.dataset.gpu));
 assert.equal(await page.locator('.an-art,img[src*="concept-"],video,audio').count(),0,'The narrative is procedural');
 assert.equal(await page.locator('.an-procedural-canvas').count(),1);assert.equal(await page.locator('.an-field').count(),1);
 await page.evaluate(()=>{window.originalSignalStage=document.querySelector('.an-procedural-canvas');});
 const ledger=await page.evaluate(()=>localStorage.getItem('iairs-simulation-v1'));
 for(const value of [0,.45,1,1.45,2,2.55,3,3.6,4,4.55,5]){
  await go(value);assert.ok(await page.evaluate(()=>window.originalSignalStage===document.querySelector('.an-procedural-canvas')));
  if(Number.isInteger(value))await page.screenshot({path:`test-results/procedural-act-${value}.png`});
 }
 if(await page.locator('.an-world').getAttribute('data-gpu')==='ready'){
  await go(1);const frame=await page.locator('.an-procedural-canvas').screenshot();await page.waitForTimeout(400);
  assert.notDeepEqual(await page.locator('.an-procedural-canvas').screenshot(),frame,'The liquid surface moves without a video, pointer, or scroll');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#app').dataset.motion==='off');
 await go(2);await page.waitForTimeout(100);const stable=await page.locator('.an-field').evaluate(e=>e.toDataURL());
 await go(4);await go(2);assert.equal(await page.locator('.an-field').evaluate(e=>e.toDataURL()),stable,'Reverse scroll returns every particle to its deterministic target');
 const still=await page.locator('.an-stage').getAttribute('data-render-time');await page.waitForTimeout(200);assert.equal(await page.locator('.an-stage').getAttribute('data-render-time'),still);
 await go(3);await page.locator('#an-failures').evaluate(e=>{e.value='20';e.dispatchEvent(new Event('input',{bubbles:true}));});await go(4);
 assert.equal(await page.locator('[data-an-branch].is-selected').getAttribute('data-an-branch'),'High');
 await go(0);assert.equal(await page.locator('[data-an-displacement]').getAttribute('scale'),'0');
 assert.equal(await page.evaluate(()=>localStorage.getItem('iairs-simulation-v1')),ledger);
 await go(5);await page.locator('.an-primary-cta').click();await page.locator('.command-layout').waitFor();
 assert.equal(await page.locator('.an-procedural-canvas,.an-field').count(),0);
 const fp=await context.newPage();fp.on('pageerror',e=>errors.push(e.message));await fp.goto(base+'/#system');
 await fp.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('.an-world')?.dataset.gpu));
 await fp.evaluate(()=>document.querySelector('.an-procedural-canvas')?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());
 await fp.waitForFunction(()=>document.querySelector('.an-world')?.dataset.gpu==='fallback');
 assert.equal(await fp.locator('.an-liquid-fallback').evaluate(e=>getComputedStyle(e).visibility),'visible');
 await fp.locator('.an-enter').click();await fp.locator('.command-layout').waitFor();await fp.close();
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await page.close();await page.video()?.saveAs('test-results/IAIRS-procedural-transitions.webm');
 console.log('PASS Persistent glyph-derived shader, continuous morph targets, live liquid, deterministic reverse scroll, policy selection, reduced motion, context loss, dataset preservation, and console handoff');
}finally{await context.close();await browser.close();}
