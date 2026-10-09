// Контраст отрисованных пар «текст / фон» (WCAG 2.1): обычный текст ≥ 4.5, крупный ≥ 3.
// Нужен запущенный preview (QA_BASE, по умолчанию http://localhost:4788/). Режим без анимации — стабильные цвета.
import { chromium } from 'playwright';

const BASE = (process.env.QA_BASE || 'http://localhost:4788/').replace(/\/?$/, '/');
const browser = await chromium.launch({ channel: 'chrome' });
let fails = 0;
let total = 0;
const report = [];
for (const route of ['', 'en/']) for (const width of [390, 1440]) {
  const p = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(BASE + route);
  await p.waitForTimeout(400);
  const res = await p.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
    const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    const lum = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const PAGE = { r: 5, g: 7, b: 13, a: 1 };
    const bgOf = (el) => {
      const layers = [];
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
        if (getComputedStyle(e).backgroundImage.includes('url(')) return null; // текст на картинке — пропускаем
      }
      return layers.reverse().reduce((acc, l) => over(l, acc), PAGE);
    };
    const out = [];
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!node.textContent.trim() || !el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('[aria-hidden="true"], .sr-only, script, style, noscript, .preloader, .mobile-menu[hidden]')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || !el.getClientRects().length) continue;
      if (cs.webkitTextFillColor && cs.webkitTextFillColor.includes('rgba(0, 0, 0, 0)')) continue;
      let fg = parse(cs.color); if (!fg) continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
      if (op < 0.05) continue; // невидимые подсказки (появляются при наведении на фоне --bg-raised)
      // фон, нарисованный соседним слоем: «таблетка» активного фильтра
      const pillHost = el.closest('.filter-tab[aria-pressed="true"]');
      const pill = pillHost?.parentElement?.querySelector('[data-filter-pill]');
      const pillBg = pill && getComputedStyle(pill).display !== 'none' ? parse(getComputedStyle(pill).backgroundColor) : null;
      const bg = pillBg ?? bgOf(el); if (!bg) continue;
      fg = over({ ...fg, a: fg.a * op }, bg);
      const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const r = ratio(fg, bg);
      out.push({ text: node.textContent.trim().slice(0, 40), cls: el.className?.baseVal ?? el.className, r: Math.round(r * 100) / 100, need: large ? 3 : 4.5 });
    }
    return out;
  });
  for (const x of res) {
    total++;
    if (x.r < x.need) { fails++; report.push(`${route || 'ru'} ${width}: ${x.r} < ${x.need} «${x.text}» .${x.cls}`); }
  }
  const min = res.reduce((m, x) => (x.r < m.r ? x : m), { r: 99 });
  console.log(`${route || 'ru'} ${width}px: пар ${res.length}, минимальная ${min.r} («${min.text}»)`);
  await p.close();
}
await browser.close();
if (fails) { console.error(report.slice(0, 30).join('\n')); console.error(`CONTRAST_FAIL (${fails} из ${total})`); process.exit(1); }
console.log(`CONTRAST_OK (${total} пар)`);
