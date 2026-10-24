import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {makeJourney} from './src/journey-data.js';
const base=process.env.IAIRS_TEST_URL||'http://127.0.0.1:5173';
await mkdir('test-results',{recursive:true});
assert.equal(makeJourney(10).incident,null);
assert.equal(makeJourney(20).incident.risk,70);
assert.equal(makeJourney(20).incident.action,'Simulated IP block');
assert.equal(makeJourney(40).incident.risk,84);
assert.equal(makeJourney(80).incident.risk,84);
console.log('PASS Shared rule engine handles below-threshold, high, and critical signals');
const browser=await chromium.launch({args:process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:[]}),errors=[];
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const go=async hash=>{await page.goto(base+'/#'+hash);await page.waitForFunction(()=>document.querySelector('#app')?.dataset.motion!==undefined);};
const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('iairs-simulation-v1')));
try{
  await go('home');
  await page.waitForFunction(()=>document.querySelector('.world-stage')?.dataset.ready==='true'||document.querySelector('.world-stage')?.dataset.fallback==='true');
  await page.screenshot({path:'test-results/experience-final-hero.png'});
  const initial=await ledger();
  assert.equal(await page.locator('.world-chapter').count(),6);
  assert.equal(await page.locator('[data-sound-toggle]').getAttribute('aria-pressed'),'false');
  await go('workflow');
  const range=page.locator('#signal-frequency');await range.focus();await range.press('Home');
  assert.equal(await page.locator('[data-journey-score]').textContent(),'—');
  assert.equal(await page.locator('[data-journey-action]').first().textContent(),'Continue observing');
  for(let i=0;i<10;i++)await range.press('ArrowRight');
  assert.equal(await page.locator('[data-journey-score]').textContent(),'70');
  assert.equal(await page.locator('[data-journey-action]').first().textContent(),'Simulated IP block');
  await range.evaluate(el=>{el.value='40';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.locator('[data-journey-score]').textContent(),'84');
  assert.deepEqual(await ledger(),initial,'Preview interactions must not write incident records');
  await page.screenshot({path:'test-results/experience-decision.png',fullPage:false});
  console.log('PASS Keyboard risk control updates score and policy without recording preview events');
  await go('console-preview');
  await page.screenshot({path:'test-results/experience-final-evidence.png'});
  await page.locator('[data-handoff-tab="decision"]').click();
  assert.ok((await page.locator('#handoff-panel').textContent()).includes('36 + 30 + 9 + 9 = 84'));
  await page.locator('[data-handoff-tab="decision"]').press('ArrowRight');
  assert.equal(await page.locator('[data-handoff-tab="audit"]').getAttribute('aria-selected'),'true');
  assert.ok((await page.locator('#handoff-panel').textContent()).includes('Risk 84/100'));
  await page.locator('[data-handoff-tab="evidence"]').click();
  const source=await page.locator('[data-signal-source]').textContent();
  await page.locator('[data-open-journey]').click();await page.locator('.incident-summary-panel').waitFor();
  const recorded=await ledger(),incident=recorded.incidents[0];
  assert.equal(recorded.incidents.length,initial.incidents.length+1);
  assert.equal(recorded.runs.length,initial.runs.length+1);
  assert.equal(recorded.eventsProcessed,initial.eventsProcessed+40);
  assert.equal(incident.risk,84);assert.equal(incident.source,source);assert.equal(incident.eventCount,40);assert.equal(incident.origin,'landing');
  assert.equal(await page.locator('.world-canvas').count(),0);
  const downloadEvent=page.waitForEvent('download');await page.locator('.page-actions [data-action="report"]').click();
  const download=await downloadEvent;await download.saveAs('test-results/journey-report.html');
  assert.ok((await readFile('test-results/journey-report.html','utf8')).includes('local landing-page simulation'));
  await page.reload();await page.locator('.incident-summary-panel').waitFor();assert.equal((await ledger()).incidents[0].id,incident.id);
  console.log('PASS The same signal is recorded once, opens its incident, persists, and exports the correct report');
  const normal=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  await normal.goto(base+'/#workflow');await normal.waitForFunction(()=>document.querySelector('#app')?.dataset.motion==='off');
  const start=await normal.evaluate(()=>JSON.parse(localStorage.getItem('iairs-simulation-v1')));
  await normal.locator('#signal-frequency').focus();await normal.keyboard.press('Home');
  await normal.goto(base+'/#console-preview');await normal.locator('[data-open-journey]').click();await normal.locator('.command-layout').waitFor();
  const end=await normal.evaluate(()=>JSON.parse(localStorage.getItem('iairs-simulation-v1')));
  assert.equal(end.incidents.length,start.incidents.length);assert.equal(end.runs.length,start.runs.length+1);assert.equal(end.eventsProcessed,start.eventsProcessed+10);
  await normal.close();
  console.log('PASS Below-threshold run records observation without creating or containing an incident');
  for(const [width,height] of [[1536,864],[1366,768],[1280,650],[1000,470],[390,844],[390,667]]){
    const mobile=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto(base+'/#home');await mobile.locator('.hero-actions').waitFor();
    const actions=await mobile.locator('.hero-actions').boundingBox();assert.ok(actions.y+actions.height<=height,'Hero controls fit '+width+'x'+height);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(width===390&&height===844){
      await mobile.waitForFunction(()=>document.querySelector('.world-stage')?.dataset.ready==='true'||document.querySelector('.world-stage')?.dataset.fallback==='true');await mobile.screenshot({path:'test-results/experience-final-mobile.png'});
      await mobile.waitForFunction(()=>document.querySelector('#app')?.dataset.motion==='off');
      for(const id of ['system','detection','workflow','containment','console-preview']){await mobile.goto(base+'/#'+id);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,id);}
      await mobile.goto(base+'/#home');await mobile.locator('[data-action="menu"]').click();assert.equal(await mobile.locator('[data-action="menu"]').getAttribute('aria-expanded'),'true');
      await mobile.locator('.site-header nav a[href="#workflow"]').click();await mobile.waitForURL('**/#workflow');assert.equal(await mobile.locator('[data-action="menu"]').getAttribute('aria-expanded'),'false');
    }
    await mobile.close();
  }
  console.log('PASS All six hero viewports, mobile chapter layouts, and accessible mobile navigation');
  assert.deepEqual(errors,[]);console.log('PASS No browser runtime errors');
}finally{await browser.close();}

