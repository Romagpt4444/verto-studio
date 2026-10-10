// Тексты «не на месте»: вылезают за свой блок или наезжают на другой текст. Нужен preview :4788.
const { chromium } = require('playwright');
const BASE = (process.env.QA_BASE || 'http://localhost:4788/').replace(/\/?$/, '/');
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const problems = [];
  for (const route of ['', 'en/']) for (const w of WIDTHS) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    await p.goto(BASE + route); await p.waitForTimeout(400);
    const res = await p.evaluate(() => {
      const out = [];
      const leaves = [...document.querySelectorAll('body *')].filter((el) => {
        if (el.closest('[aria-hidden="true"], .sr-only, .mobile-menu[hidden], .preloader, script, style, .marquee, .altimeter, .alt-mobile, .filter')) return false;
        if (el.closest('details:not([open]) .faq-a')) return false; // закрытый ответ FAQ не отрисован
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      });
      // только собственные текстовые узлы элемента (без вложенных .sr-only и т. п.)
      const textRects = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).flatMap((n) => { const r = document.createRange(); r.selectNodeContents(n); return [...r.getClientRects()]; }).filter((x) => x.width > 1 && x.height > 1);
      const name = (el) => `${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? '').toString().split(' ')[0]} «${el.textContent.trim().slice(0, 28)}»`;
      // 1) текст за пределами ближайшего блока с обрезкой / за краем экрана
      for (const el of leaves) {
        for (const r of textRects(el)) {
          if (r.right > innerWidth + 1 || r.left < -1) { out.push('за краем экрана: ' + name(el)); break; }
        }
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (/(hidden|clip)/.test(cs.overflowX + cs.overflowY) && !a.matches('.ch-mask, .w-mask, .works-viewport, .card-media, .marquee-zone, .filter')) {
            const box = a.getBoundingClientRect();
            if (textRects(el).some((r) => r.right > box.right + 1 || r.left < box.left - 1 || r.bottom > box.bottom + 1 || r.top < box.top - 1)) out.push('обрезан: ' + name(el));
            break;
          }
        }
      }
      // 2) наезд текста на текст
      const rects = leaves.map((el) => ({ el, rs: textRects(el) }));
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const A = rects[i], B = rects[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const hit = A.rs.some((a) => B.rs.some((b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 3 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3));
        if (hit) out.push(`наезд: ${name(A.el)} × ${name(B.el)}`);
      }
      return [...new Set(out)];
    });
    res.forEach((r) => problems.push(`${route || 'ru/'} ${w}px: ${r}`));
    await p.close();
  }
  await b.close();
  console.log(problems.length ? problems.join('\n') : 'TEXT_OK');
  process.exitCode = problems.length ? 1 : 0;
})();
