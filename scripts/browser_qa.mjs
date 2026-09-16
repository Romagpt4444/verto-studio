import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base=process.env.QA_URL || 'http://localhost:8123';
const out=process.env.QA_OUT || '../qa-screens';
fs.mkdirSync(out,{recursive:true});
const sizes=[[320,568],[375,667],[390,844],[430,932],[768,1024],[1366,768],[1440,900],[1920,1080]];
const report=[];
for(const [engine,name] of [[chromium,'chromium'],[webkit,'webkit']]){
  const browser=await engine.launch({headless:true});
  for(const [width,height] of sizes){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:width<700?1:1.5});
    const issues=[];
    page.on('pageerror',e=>issues.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')issues.push(`console: ${m.text()}`)});
    page.on('requestfailed',r=>issues.push(`request: ${r.url()} ${r.failure()?.errorText}`));
    await page.goto(base+'/',{waitUntil:'networkidle'});
    await page.locator('[data-scene-loading]').waitFor({state:'detached',timeout:10000}).catch(()=>issues.push('loading did not finish'));
    const first=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length,canvas:!!document.querySelector('canvas'),fallback:document.body.classList.contains('scene-fallback')}));
    if(first.overflow)issues.push('horizontal overflow');if(first.broken)issues.push(`${first.broken} broken images`);if(!first.canvas||first.fallback)issues.push('WebGL fallback activated');
    if(width===390||width===1440){
      await page.screenshot({path:path.join(out,`${name}-${width}-hero.png`)});
      await page.locator('#orbit-title').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await page.screenshot({path:path.join(out,`${name}-${width}-space.png`)});
      await page.locator('#work').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const work=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--flight-progress').trim());
      await page.screenshot({path:path.join(out,`${name}-${width}-portfolio.png`)});
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const bottom=Number(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--flight-progress')));
      await page.locator('#top').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const back=Number(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--flight-progress')));
      if(bottom<.85||back>.05)issues.push(`scroll timeline did not reverse: ${bottom}/${back}`);
      report.push({engine:name,width,height,work,bottom,back,issues});
    } else report.push({engine:name,width,height,issues});
    await page.close();
  }
  const page=await browser.newPage();
  for(const route of ['/services.html','/projects.html','/lead-agent.html','/cases/master-tyres.html','/privacy.html','/personal-data-consent.html','/terms.html','/404.html']){
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
    report.push({engine:name,route,status:response.status(),title:await page.title()});
  }
  await page.close();
  const reduced=await browser.newPage({reducedMotion:'reduce'});
  await reduced.goto(base+'/',{waitUntil:'networkidle'});
  report.push({engine:name,reducedMotion:await reduced.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),loadingGone:await reduced.locator('[data-scene-loading]').count()===0});
  await reduced.close();
  const fallback=await browser.newPage();
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2'||kind==='experimental-webgl')return null;return original.call(this,kind,...args)}});
  await fallback.goto(base+'/',{waitUntil:'networkidle'});
  report.push({engine:name,fallback:await fallback.evaluate(()=>document.body.classList.contains('scene-fallback')),content:await fallback.locator('h1').isVisible()});
  await fallback.close();
  await browser.close();
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.some(r=>r.issues?.length||r.status>=400||r.reducedMotion===false||r.loadingGone===false||r.fallback===false||r.content===false))process.exitCode=1;
