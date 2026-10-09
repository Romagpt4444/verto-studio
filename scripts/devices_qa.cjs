// Смоук-проверка в движках мобильных браузеров: WebKit (как Safari iOS) и Chrome Android (эмуляция).
// Скриншоты: docs/screens/phase-7/device-*.png. Нужен preview на :4788.
const { webkit, chromium, devices } = require('playwright');
const path = require('path');
const BASE = (process.env.QA_BASE || 'http://localhost:4788/').replace(/\/?$/, '/');
const out = path.join(__dirname, '../docs/screens/phase-7');

(async () => {
  let failed = 0;
  for (const [name, type, device, launch] of [
    ['ios-safari', webkit, devices['iPhone 14'], process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {}],
    ['android-chrome', chromium, devices['Pixel 7'], { channel: 'chrome' }],
  ]) {
    const b = await type.launch(launch);
    const ctx = await b.newContext({ ...device });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    for (const route of ['', 'en/']) {
      await p.goto(BASE + route); await p.waitForTimeout(3200);
      await p.screenshot({ path: path.join(out, `device-${name}-${route ? 'en' : 'ru'}-hero.png`) });
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(160); }
      await p.waitForTimeout(800);
      const st = await p.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        webgl: document.documentElement.classList.contains('webgl-ready'),
        cards: document.querySelectorAll('[data-card]').length,
      }));
      await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await p.waitForTimeout(1500);
      await p.screenshot({ path: path.join(out, `device-${name}-${route ? 'en' : 'ru'}-contact.png`) });
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
      await p.tap('[data-menu-toggle]'); await p.waitForTimeout(400);
      const menuOpen = await p.getAttribute('[data-menu-toggle]', 'aria-expanded');
      await p.screenshot({ path: path.join(out, `device-${name}-${route ? 'en' : 'ru'}-menu.png`) });
      await p.tap('[data-menu-toggle]'); await p.waitForTimeout(300);
      const okRun = st.overflow <= 0 && st.cards === 12 && menuOpen === 'true';
      console.log(`${name} ${route || '/'}: ${JSON.stringify({ ...st, menuOpen })} ${okRun ? 'OK' : 'FAIL'}`);
      if (!okRun) failed++;
    }
    if (errs.length) { console.log(`${name}: ошибки: ${errs.join(' | ')}`); failed++; }
    await b.close();
  }
  console.log(failed ? `DEVICES_FAIL (${failed})` : 'DEVICES_OK');
  process.exitCode = failed ? 1 : 0;
})();
