// axe-core (WCAG 2.1 A/AA) по главной RU/EN и старым страницам. Нужен preview на :4788.
const { chromium } = require('playwright');
const fs = require('fs');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = (process.env.QA_BASE || 'http://localhost:4788/').replace(/\/?$/, '/');

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  let total = 0;
  for (const [route, vp, reduced] of [['', 1440, false], ['en/', 1440, false], ['', 390, false], ['', 1440, true], ['en/', 390, true]]) {
    const ctx = await b.newContext({ bypassCSP: true, viewport: { width: vp, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    await p.goto(BASE + route); await p.waitForTimeout(reduced ? 500 : 3000);
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1200);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
    await p.evaluate(axeSource);
    const res = await p.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    const v = res.violations.filter((x) => ['serious', 'critical', 'moderate'].includes(x.impact));
    total += v.length;
    console.log(`${route || '/'} ${vp}px ${reduced ? 'reduced' : 'motion'}: нарушений ${v.length}${v.length ? ' — ' + v.map((x) => `${x.id}(${x.impact}) ×${x.nodes.length}: ${x.nodes[0].target.join(' ')}`).join('; ') : ''}`);
    await ctx.close();
  }
  await b.close();
  console.log(total ? `AXE_FAIL (${total})` : 'AXE_OK');
  process.exitCode = total ? 1 : 0;
})();
