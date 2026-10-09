// Частота кадров при прокрутке всей страницы колесом (Lenis + ScrollTrigger + 3D). Нужен preview :4788.
// FPS_HEADED=1 — в видимом окне Chrome (реальный GPU, ближе к MacBook).
const { chromium } = require('playwright');
const BASE = (process.env.QA_BASE || 'http://localhost:4788/').replace(/\/?$/, '/');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: !process.env.FPS_HEADED, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE); await p.waitForTimeout(2500);
  await p.mouse.move(700, 400); await p.waitForTimeout(2000); // запуск 3D
  await p.evaluate(() => { window.__frames = []; let last = performance.now(); const loop = (t) => { window.__frames.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 120) { await p.mouse.wheel(0, 120); await p.waitForTimeout(16); }
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { window.__stop = true; const f = window.__frames.slice(5); const avg = f.reduce((a, b) => a + b, 0) / f.length; const sorted = [...f].sort((a, b) => a - b); return { frames: f.length, avgFps: Math.round(1000 / avg), p95ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]), long: f.filter((x) => x > 50).length, webgl: document.documentElement.classList.contains('webgl-ready') }; });
  console.log(JSON.stringify(r));
  console.log(r.avgFps >= 55 ? 'FPS_OK' : 'FPS_LOW');
  await b.close();
})();
