// OG-картинки 1200×630 (RU и EN): ракета + «VERTO STUDIO». node scripts/make-og.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pub = (p) => 'file://' + path.join(root, 'public', p);
const t = {
  ru: JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/ru.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/en.json'), 'utf8')),
};

const html = (lang) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:800;src:url(${pub('fonts/unbounded-latin-800-normal.woff2')})}
@font-face{font-family:Golos;font-weight:400;src:url(${pub('fonts/golos-text-latin-400-normal.woff2')})}
@font-face{font-family:Golos;font-weight:400;src:url(${pub('fonts/golos-text-cyrillic-400-normal.woff2')});unicode-range:U+0400-045F}
@font-face{font-family:Mono;font-weight:500;src:url(${pub('fonts/jetbrains-mono-latin-500-normal.woff2')})}
@font-face{font-family:Mono;font-weight:500;src:url(${pub('fonts/jetbrains-mono-cyrillic-500-normal.woff2')});unicode-range:U+0400-045F}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;color:#EEF1F6;font-family:Golos,sans-serif;
background:radial-gradient(90% 80% at 85% 10%,#121A2B,transparent 60%),linear-gradient(#05070D,#020306);position:relative}
.stars{position:absolute;inset:0;opacity:.6;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff8,transparent 60%),radial-gradient(1px 1px at 42% 64%,#fff8,transparent 60%),radial-gradient(1.5px 1.5px at 58% 22%,#fff6,transparent 60%),radial-gradient(1px 1px at 86% 78%,#fff7,transparent 60%),radial-gradient(1px 1px at 24% 88%,#fff5,transparent 60%),radial-gradient(1.5px 1.5px at 70% 46%,#fff5,transparent 60%);background-size:300px 300px}
.planet{position:absolute;left:-10%;right:-10%;bottom:-1120px;height:1200px;border-radius:50%;background:radial-gradient(closest-side,#0A0F1C 90%,#121A2B 97%,rgba(255,107,44,.6) 99.4%,transparent 100%)}
.rocket{position:absolute;right:70px;top:-8px;height:640px}
.copy{position:absolute;left:72px;top:150px}
h1{font-family:Unbounded;font-weight:800;font-size:132px;line-height:.9;letter-spacing:-.035em}
h1 span{display:block}h1 span+span{padding-left:84px}
p{margin-top:34px;font-size:34px;color:#A6AFC0;max-width:620px;line-height:1.25}
.tag{position:absolute;left:72px;top:72px;font-family:Mono;font-size:20px;letter-spacing:.08em;color:#FF6B2C;text-transform:uppercase}
.mark{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#FF6B2C;vertical-align:middle;margin-right:14px}
</style></head><body><div class="stars"></div><div class="planet"></div>
<img class="rocket" src="${pub('rocket/poster-hero.webp')}">
<div class="tag"><span class="mark"><svg width="26" height="26" viewBox="0 0 32 32"><path d="M6 7 L16 26 L26 7" fill="none" stroke="#05070D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>vertostudio.ru</div>
<div class="copy"><h1><span>VERTO</span><span>STUDIO</span></h1><p>${t[lang].footer.tagline}</p></div>
</body></html>`;

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  fs.mkdirSync(path.join(root, 'public/og'), { recursive: true });
  for (const lang of ['ru', 'en']) {
    const file = path.join(require('os').tmpdir(), `verto-og-${lang}.html`);
    fs.writeFileSync(file, html(lang));
    const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
    await p.goto('file://' + file);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const out = path.join(root, `public/og/og-${lang}.jpg`);
    await p.screenshot({ path: out, type: 'jpeg', quality: 86 });
    console.log(out, fs.statSync(out).size);
    fs.unlinkSync(file);
  }
  await b.close();
})();
