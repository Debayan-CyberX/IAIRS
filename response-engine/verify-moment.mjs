import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:[]});
const base=process.env.IAIRS_TEST_URL||'http://127.0.0.1:5173';
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#home');await page.waitForFunction(()=>document.querySelector('.world-stage')?.dataset.ready==='true'&&Number(document.querySelector('.world-stage').dataset.sceneTime)>.3);
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.world-canvas')).opacity)>.99);
 const scene=()=>page.locator('.world-stage');const go=async(id,index)=>{await page.evaluate(id=>document.querySelector('#app').experienceScrollTo(document.getElementById(id)),id);await page.waitForFunction(index=>Math.abs(Number(document.querySelector('.world-stage').dataset.progress)-index)<.025,index);};
 await page.screenshot({path:'test-results/moment-final-hero.png'});const camera=Number(await scene().getAttribute('data-camera-z'));
 await page.mouse.move(700,700);await page.mouse.wheel(0,700);await page.waitForTimeout(1400);const phase=Number(await scene().getAttribute('data-progress'));assert.ok(phase>.3&&phase<1,'Wheel scrolling advances the actual camera path');assert.ok(Number(await scene().getAttribute('data-camera-z'))<camera);assert.equal(await page.locator('.world-canvas').count(),1);
 await go('detection',2);assert.ok(Number(await scene().getAttribute('data-camera-z'))<3,'The camera enters the lens');
 const hold=page.locator('[data-hold-inspect]');await hold.hover({position:{x:360,y:100}});await page.mouse.down();await page.waitForFunction(()=>document.querySelector('.world-stage').dataset.inspection==='1');assert.equal(await page.locator('.inspection-event').count(),3);assert.ok((await page.locator('#detection-evidence').textContent()).includes('Failure 20 / threshold'));await page.screenshot({path:'test-results/moment-final-inspection.png'});await page.mouse.up();await page.waitForFunction(()=>document.querySelector('.world-stage').dataset.inspection==='0');
 await hold.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.world-stage').dataset.inspection==='1');await page.keyboard.press('Enter');
 await go('workflow',3);assert.equal(await page.locator('#app').evaluate(el=>el.style.getPropertyValue('--paper')),'1');assert.equal(await scene().getAttribute('data-risk-trace'),'36,30,9,9');await page.screenshot({path:'test-results/moment-final-risk.png'});
 const range=page.locator('#signal-frequency');await range.focus();await range.press('Home');await page.waitForFunction(()=>document.querySelector('.world-stage').dataset.riskTrace==='0,0,0,0');await go('containment',4);assert.equal(Number(await scene().getAttribute('data-iris-closure')),0);
 await go('workflow',3);await range.evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}));});await go('containment',4);assert.equal(Number(await scene().getAttribute('data-iris-closure')),.6);
 await go('workflow',3);await range.evaluate(el=>{el.value='40';el.dispatchEvent(new Event('input',{bubbles:true}));});await go('containment',4);assert.equal(Number(await scene().getAttribute('data-iris-closure')),1);await page.screenshot({path:'test-results/moment-final-response.png'});
 await go('console-preview',5);await page.screenshot({path:'test-results/moment-final-case.png'});assert.deepEqual(errors,[]);await page.close();
 console.log('PASS Scroll-controlled approach and lens entry, pointer and keyboard inspection, data-linked risk rings and containment aperture');
 for(const [width,height]of [[390,844],[390,667],[1000,470]]){
  const phone=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});phone.on('pageerror',e=>errors.push(e.message));await phone.goto(base+'/#home');await phone.waitForFunction(()=>document.querySelector('.world-stage')?.dataset.ready==='true');await phone.evaluate(()=>document.fonts.ready);
  for(const id of ['home','system','detection','workflow','containment','console-preview']){
   await phone.evaluate(id=>document.querySelector('#app').experienceScrollTo(document.getElementById(id)),id);await phone.waitForTimeout(80);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,id+' fits viewport');
   const selector=id==='home'?'.hero-actions':'#'+id+' .story-caption';const box=await phone.locator(selector).boundingBox();assert.ok(box.y>=65&&box.y+box.height<=height-35,JSON.stringify({id,width,height,box}));
   if(width===390&&height===844&&['home','workflow','console-preview'].includes(id))await phone.screenshot({path:'test-results/moment-final-phone-'+id+'.png'});
  }await phone.close();
 }assert.deepEqual(errors,[]);console.log('PASS Compact desktop and both phone heights keep the narrative and controls visible; no runtime errors');
}finally{await browser.close();}
