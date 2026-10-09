// Снимает постер ракеты из живой сцены (нужен запущенный `npm run dev` на :4321).
// node scripts/make-rocket-poster.cjs → public/rocket/poster-hero.webp
const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs');

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  // Снимаем в том же окне и ракурсе, что и hero на десктопе, затем вырезаем область постера.
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:4321/');
  await p.waitForFunction(() => window.__rocket, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  const { dataUrl, box } = await p.evaluate(() => {
    const r = window.__rocket;
    r.setPointerTilt(false);
    Object.assign(r.state, { yaw: 0, pitch: 0, roll: 0, thrust: 0, sway: 0, orbits: 0, steam: 0, pad: 0, stars: 0, opacity: 1 });
    const img = document.querySelector('.rocket-poster img').getBoundingClientRect();
    r.renderOnce();
    return { dataUrl: r.canvas.toDataURL('image/png'), box: { left: img.left, top: img.top, width: img.width, height: img.height } };
  });
  await b.close();
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const meta = await sharp(png).metadata();
  const sx = meta.width / 1440;
  fs.mkdirSync('public/rocket', { recursive: true });
  const base = sharp(png)
    .extract({ left: Math.round(box.left * sx), top: Math.round(box.top * sx), width: Math.round(box.width * sx), height: Math.round(box.height * sx) })
    .resize({ width: 450, height: 900, fit: 'fill' });
  const w = await base.clone().webp({ quality: 78, alphaQuality: 80, effort: 6 }).toFile('public/rocket/poster-hero.webp');
  console.log('box', box, 'webp', w.size);
})();
