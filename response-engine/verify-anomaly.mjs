import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {makeJourney} from './src/journey-data.js';
const base=process.env.IAIRS_TEST_URL||'http://127.0.0.1:5173';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch(),errors=[],failedRequests=[];
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failedRequests.push(r.url()+' '+r.status());});};
const ids=['home','system','detection','workflow','containment','console-preview'];
const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});watch(page);
const ready=async p=>{await p.locator('.an-stage[data-ready]').waitFor();await p.evaluate(()=>document.fonts.ready);};
const go=async(p,id)=>{await p.goto(base+'/#'+id);await ready(p);await p.waitForFunction(i=>document.querySelector('.anomaly-experience')?.dataset.act===String(i),ids.indexOf(id));};
const ledger=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('iairs-simulation-v1')));
try{
 assert.equal(makeJourney(10).incident,null);assert.equal(makeJourney(20).incident.risk,70);assert.equal(makeJourney(40).incident.risk,84);
 await go(page,'home');const initial=await ledger(page);
 assert.equal(await page.locator('[data-scene]').count(),6);assert.equal(await page.getByRole('heading',{name:'Everything is under control.',exact:true}).count(),1);
 assert.equal(await page.locator('.an-field').count(),1);assert.equal(await page.locator('audio,video').count(),0);
 await page.locator('[data-an-about]').click();await page.locator('#modal[open]').waitFor();assert.ok((await page.locator('#modal').innerText()).includes('educational cybersecurity simulation'));await page.keyboard.press('Escape');
 for(const id of ids){await go(page,id);assert.equal(await page.locator('[data-an-chapter][aria-current="step"]').getAttribute('data-an-chapter'),String(ids.indexOf(id)));assert.equal(await page.locator('[data-scene]:not([inert])').count(),1);await page.screenshot({path:`test-results/anomaly-${id}-desktop.png`});}
 console.log('PASS Six deep-linked acts, accessible scene isolation, chapters, and About disclosure');
 await go(page,'detection');await page.locator('.an-node-inspect').click();await page.locator('#an-node-details').waitFor({state:'visible'});
 assert.ok((await page.locator('#an-node-details').innerText()).includes('≥ 20 failures within 60 seconds'));
 assert.equal(await page.locator('[data-an-source]').innerText(),makeJourney(40).events[0].source);await page.keyboard.press('Escape');assert.equal(await page.locator('.an-node-inspect').getAttribute('aria-expanded'),'false');
 await go(page,'workflow');const range=page.locator('#an-failures');await range.focus();await range.press('Home');assert.equal(await page.locator('[data-an-score]').innerText(),'—');
 for(let i=0;i<10;i++)await range.press('ArrowRight');assert.equal(await page.locator('[data-an-score]').innerText(),'70');assert.equal(await page.locator('[data-an-action]').textContent(),'Simulated IP block');
 await page.locator('[data-an-chapter="4"]').click();assert.equal(await page.locator('[data-an-branch].is-selected').getAttribute('data-an-branch'),'High');
 await page.locator('[data-an-chapter="3"]').click();await range.evaluate(el=>{el.value='40';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('[data-an-score]').innerText(),'84');assert.equal(await page.locator('[data-an-equation]').innerText(),'36 + 30 + 9 + 9 = 84');
 await go(page,'containment');assert.equal(await page.locator('[data-an-branch].is-selected').getAttribute('data-an-branch'),'Critical');assert.equal(await page.locator('[data-an-action]').innerText(),'Simulated host isolation');
 assert.deepEqual(await ledger(page),initial,'Exploring the illustrative case must not write to the console dataset');
 console.log('PASS Keyboard risk exploration, verified factors, correct response branch, and unchanged console data');

 const animated=await browser.newPage({viewport:{width:1440,height:900}});watch(animated);await go(animated,'home');
 const scroll=async i=>{await animated.evaluate(i=>document.querySelector('#app').experienceScrollTo(document.querySelector(`[data-act-anchor="${i}"]`)),i);await animated.waitForFunction(i=>Math.abs(Number(document.querySelector('.an-stage').dataset.progress)-i)<.005,i);};
 await animated.mouse.wheel(0,500);await animated.waitForFunction(()=>Number(document.querySelector('.an-stage')?.dataset.progress)>.2);
 const displaced=await animated.locator('.an-control .an-slice-1').first().evaluate(e=>getComputedStyle(e).transform);assert.notEqual(displaced,'matrix(1, 0, 0, 1, 0, 0)');
 await animated.screenshot({path:'test-results/anomaly-fracture-in-motion.png'});
 await scroll(2);await animated.waitForTimeout(350);const frame=await animated.locator('.an-field').screenshot();await animated.waitForTimeout(350);assert.notDeepEqual(await animated.locator('.an-field').screenshot(),frame,'Procedural field is alive');
 await scroll(5);await scroll(0);await animated.waitForTimeout(700);
 const assembled=await animated.locator('.an-control .an-slice-1').first().evaluate(e=>new DOMMatrix(getComputedStyle(e).transform));assert.ok(Math.abs(assembled.m41)<1,'Reverse scroll restores type alignment');
 await animated.evaluate(()=>scrollTo({top:999999,behavior:'instant'}));await animated.waitForFunction(()=>document.querySelector('.anomaly-experience')?.dataset.act==='5');
 await animated.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await animated.waitForFunction(()=>document.querySelector('.anomaly-experience')?.dataset.act==='0');
 await animated.setViewportSize({width:1280,height:720});await animated.waitForTimeout(250);await scroll(3);assert.equal(await animated.locator('[data-an-score]').innerText(),'84');
 await animated.emulateMedia({reducedMotion:'reduce'});await animated.waitForTimeout(250);assert.equal(await animated.locator('#app').getAttribute('data-motion'),'off');
 const still=await animated.locator('.an-stage').getAttribute('data-render-time');await animated.waitForTimeout(250);assert.equal(await animated.locator('.an-stage').getAttribute('data-render-time'),still);
 await scroll(5);await animated.locator('.an-primary-cta').click();await animated.locator('.command-layout').waitFor();assert.equal(await animated.locator('.an-stage,.an-field').count(),0);
 assert.equal(await animated.locator('.dashboard-landscape img').getAttribute('src'),'/assets/dashboard-environment-v2.png');await animated.close();
 console.log('PASS Native wheel input, live procedural drawing, reverse reassembly, fast scroll, resize, motion changes, cleanup, and console handoff');

 for(const [width,height] of [[1920,1080],[1366,768],[1280,650],[1000,470],[768,1024],[390,844],[390,667],[360,740]]){
  const phone=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});watch(phone);
  for(const id of ids){
   await go(phone,id);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${id} overflow at ${width}×${height}`);
   const controls=id==='home'?'.an-scroll':id==='detection'?'.an-node-inspect':id==='workflow'?'#an-failures':id==='console-preview'?'.an-primary-cta':null;
   if(controls){const box=await phone.locator(controls).boundingBox();assert.ok(box&&box.y>76&&box.y+box.height<height-56,`${id} controls fit ${width}×${height}: ${JSON.stringify(box)}`);}
   if(width===390&&height===844)await phone.screenshot({path:`test-results/anomaly-${id}-mobile.png`});
  }
  await phone.close();
 }
 console.log('PASS All six acts across eight desktop, tablet, compact, and phone viewports');

 const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});watch(touch);await go(touch,'home');
 await touch.locator('[data-an-chapter="2"]').tap();await touch.waitForFunction(()=>document.querySelector('.anomaly-experience')?.dataset.act==='2');await touch.locator('.an-node-inspect').tap();assert.equal(await touch.locator('.an-node-inspect').getAttribute('aria-expanded'),'true');await touch.close();
 const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=function(){return null;};});
 const fp=await fallback.newPage();watch(fp);await go(fp,'workflow');assert.equal(await fp.locator('.an-stage').getAttribute('data-fallback'),'true');
 await fp.locator('#an-failures').evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await fp.locator('[data-an-score]').innerText(),'70');await fp.locator('.an-enter').click();await fp.locator('.command-layout').waitFor();await fallback.close();
 await page.goto(base+'/#console/overview');await page.locator('.command-layout').waitFor();assert.deepEqual(await ledger(page),initial);
 assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
 console.log('PASS Touch navigation, Canvas-unavailable fallback, no incidental records, no missing resources, no browser errors');
}finally{await browser.close();}
