// Скриншоты фазы: node scripts/screens.cjs <phase> [base] [routes-json] [--full]
// Пример: node scripts/screens.cjs 2 http://localhost:4788/ '["","en/"]' --full
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const phase = process.argv[2] || 'x';
const base = process.argv[3] || 'http://localhost:4788/';
const routes = JSON.parse(process.argv[4] || '["","en/"]');
const full = process.argv.includes('--full');
const reduced = process.argv.includes('--reduced');
const out = path.join(__dirname, '..', 'docs', 'screens', `phase-${phase}`);
fs.mkdirSync(out, { recursive: true });
const sizes = [[375, 667], [768, 1024], [1440, 900]];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const errors = [];
  for (const route of routes) {
    for (const [w, h] of sizes) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      page.on('pageerror', (e) => errors.push(`${route}@${w} JS: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${route}@${w} ${m.type()}: ${m.text()}`); });
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(2600);
      const name = `${(route.replace(/\W+/g, '-') || 'ru').replace(/-$/, '')}-${w}${reduced ? '-reduced' : ''}.png`;
      await page.screenshot({ path: path.join(out, name), fullPage: full });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (sw > 0) errors.push(`${route}@${w} horizontal overflow ${sw}px`);
      await page.close();
    }
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'SCREENS_OK');
  console.log('saved to', out);
})();
