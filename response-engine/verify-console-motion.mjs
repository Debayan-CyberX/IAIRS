import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.IAIRS_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/#console/overview');await page.locator('.command-layout').waitFor();
 await page.waitForFunction(()=>Number(document.querySelector('.command-globe-live')?.dataset.sceneTime)>.2);
 assert.equal(await page.locator('.dashboard-landscape img').getAttribute('src'),'/assets/dashboard-environment-v2.png');
 await page.locator('[data-command-view="3d"]').click();await page.waitForFunction(()=>Number(document.querySelector('[data-live-scene="globe"]')?.dataset.sceneTime)>.2);
 await page.goto(base+'/#console/settings');await page.locator('[data-action="motion"][role="switch"]').click();
 await page.goto(base+'/#home');await page.waitForFunction(()=>document.querySelector('#app')?.dataset.motion==='off');
 const still=await page.locator('.an-stage').getAttribute('data-render-time');await page.waitForTimeout(250);assert.equal(await page.locator('.an-stage').getAttribute('data-render-time'),still);
 await page.goto(base+'/#console/settings');await page.locator('[data-action="motion"][role="switch"]').click();
 await page.goto(base+'/#console-preview');await page.waitForFunction(()=>document.querySelector('.anomaly-experience')?.dataset.act==='5');
 await page.locator('.an-primary-cta').click();await page.locator('.command-layout').waitFor();await page.waitForTimeout(700);
 assert.equal(await page.locator('.an-field').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS Existing live and 3D console visuals, motion preferences, animated console handoff, and landing cleanup');
}finally{await browser.close();}
