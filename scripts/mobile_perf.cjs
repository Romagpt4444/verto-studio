// Замер плавности на телефоне: Pixel 7, CPU ×4 медленнее, прокрутка «пальцем» (scrollBy каждый кадр).
// node scripts/mobile_perf.cjs [--disable=stickers,rocket,blur] [--toggle=3]
const { chromium, devices } = require('playwright');
const BASE = (process.env.QA_BASE || 'http://localhost:4788/').replace(/\/?$/, '/');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const disable = arg('disable').split(',').filter(Boolean);
const toggles = Number(arg('toggle') || 0);
const cpu = Number(arg('cpu') || 4);

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(2500);
  await p.touchscreen.tap(200, 700); await p.waitForTimeout(2500); // первое касание → 3D
  if (disable.includes('blur')) await p.addStyleTag({ content: '.site-header::before{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' });
  if (disable.includes('stickers')) await p.addStyleTag({ content: '.sticker-slot{display:none!important}' });
  if (disable.includes('rocket')) await p.addStyleTag({ content: '[data-rocket-layer]{display:none!important}' });
  for (let i = 0; i < toggles; i++) {
    await p.evaluate(() => document.querySelector('[data-motion-toggle]').click()); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('[data-motion-toggle]').click()); await p.waitForTimeout(1500);
  }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const r = await p.evaluate(async () => {
    const frames = []; const long = [];
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(e.duration)));
    po.observe({ type: 'longtask', buffered: false });
    const max = document.documentElement.scrollHeight - innerHeight;
    let last = performance.now();
    await new Promise((res) => {
      const step = (t) => { frames.push(t - last); last = t; if (scrollY >= max - 2) return res(); scrollBy(0, 22); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    po.disconnect();
    const f = frames.slice(3).sort((a, b) => a - b);
    const avg = f.reduce((s, x) => s + x, 0) / f.length;
    return { frames: f.length, avgFps: Math.round(1000 / avg), p50: Math.round(f[f.length >> 1]), p95: Math.round(f[Math.floor(f.length * 0.95)]), over50: f.filter((x) => x > 50).length, longTasks: long.length, longMs: Math.round(long.reduce((s, x) => s + x, 0)), webgl: document.documentElement.classList.contains('webgl-ready'), contexts: document.querySelectorAll('canvas').length };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(JSON.stringify({ disable, toggles, cpu, ...r, errors: errs.length }));
  await b.close();
})();
