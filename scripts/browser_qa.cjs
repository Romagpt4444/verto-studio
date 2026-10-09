// Браузерные проверки собранного сайта (Playwright + установленный Chrome).
// Нужен запущенный `npm run preview -- --port 4788` (или QA_BASE).
//   node scripts/browser_qa.cjs                 — все проверки
//   node scripts/browser_qa.cjs --only=filter   — одна (labels, contacts, filter, menu, stickers,
//                                                reduced, fallbacks, motiontoggle, console, overflow, screens)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.QA_BASE || 'http://localhost:4788/').replace(/\/?$/, '/');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const t = {
  ru: JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/ru.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/en.json'), 'utf8')),
};
const WIDTHS = [320, 375, 390, 430, 768, 1280, 1440, 1920];
const LEGACY = ['cases/the-weshalka.html', 'cases/master-tyres.html', 'cases/lead-desk.html', 'lead-agent.html', 'privacy.html', 'terms.html', 'personal-data-consent.html', 'projects/morrow-coffee/', 'projects/otklik/', 'projects/noir-golf/', '404.html'];

let browser;
const fail = (msg) => { throw new Error(msg); };
const ok = (cond, msg) => { if (!cond) fail(msg); };
const page = async (opts = {}) => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opts });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push('JS: ' + e.message));
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) p.errors.push(`${m.type()}: ${m.text()}`); });
  return p;
};
const settle = (p, ms = 2600) => p.waitForTimeout(ms);

const checks = {
  async labels() {
    for (const lang of ['ru', 'en']) {
      const p = await page({ reducedMotion: 'reduce' });
      await p.goto(BASE + (lang === 'en' ? 'en/' : ''));
      const labels = await p.$$eval('[data-card]:not([data-kind="invite"]) .card-type', (els) => els.map((e) => ({ text: e.textContent.trim(), visible: !!(e.offsetWidth && e.offsetHeight) })));
      const allowed = Object.values(t[lang].works.types);
      ok(labels.length === 11, `${lang}: карточек ${labels.length}, ожидалось 11`);
      ok(labels.every((l) => l.visible && allowed.includes(l.text)), `${lang}: метки типа не видны или не из i18n`);
      await p.close();
    }
    return 'LABELS_OK';
  },

  async contacts() {
    for (const lang of ['ru', 'en']) {
      const p = await page({ reducedMotion: 'reduce' });
      await p.goto(BASE + (lang === 'en' ? 'en/' : ''));
      const c = t[lang].contacts;
      for (const [sel, href] of [['.hero-actions .btn-primary', c.telegram], ['.hero-secondary a >> nth=0', c.whatsapp], ['.hero-secondary a >> nth=1', c.instagram], ['.hero-secondary a >> nth=2', c.channel]]) {
        ok((await p.getAttribute(sel, 'href')) === href, `${lang}: ${sel} → ${href}`);
      }
      const cards = await p.$$eval('.contact-card', (els) => els.map((e) => e.getAttribute('href')));
      ok(JSON.stringify(cards) === JSON.stringify([c.whatsapp, c.instagram, c.channel]), `${lang}: карточки контактов ${cards}`);
      ok((await p.textContent('.contact-cards')).includes('+7 993 535-86-96'), `${lang}: нет номера WhatsApp`);
      const notes = await p.$$eval('.meta-note', (els) => els.map((e) => e.textContent));
      ok(notes.length >= 2 && notes.every((n) => n.includes('Meta')), `${lang}: нет сноски про Meta`);
      const p2 = await page();
      await p2.goto(BASE + (lang === 'en' ? 'en/' : '')); await settle(p2);
      await p2.evaluate(() => document.querySelector('.brief').scrollIntoView({ block: 'center' })); await settle(p2, 900);
      const opt = t[lang].contact.briefOptions[1];
      await p2.click(`[data-brief="${opt}"]`);
      const href = await p2.getAttribute('[data-brief-link]', 'href');
      const expect = c.telegram + '?text=' + encodeURIComponent(t[lang].contact.briefMessage.replace('{choice}', opt));
      ok(href === expect, `${lang}: бриф: ${href}`);
      await p.close(); await p2.close();
    }
    return 'CONTACTS_OK';
  },

  async filter() {
    for (const [lang, opts] of [['ru', { reducedMotion: 'reduce' }], ['en', {}], ['ru', { viewport: { width: 390, height: 844 } }]]) {
      const p = await page(opts);
      await p.goto(BASE + (lang === 'en' ? 'en/' : '')); await settle(p, opts.reducedMotion ? 300 : 2600);
      for (const [f, n] of [['case', 2], ['product', 3], ['concept', 6], ['all', 11]]) {
        await p.evaluate((f) => document.querySelector(`[data-filter="${f}"]`).click(), f);
        await p.waitForTimeout(120);
        const count = await p.$$eval('[data-card]:not([hidden]):not([data-kind="invite"])', (e) => e.length);
        const live = await p.textContent('[data-works-live]');
        const pressed = await p.getAttribute(`[data-filter="${f}"]`, 'aria-pressed');
        ok(count === n && live.includes(String(n)) && pressed === 'true', `${lang}: фильтр ${f}: ${count} / «${live}» / ${pressed}`);
      }
      await p.close();
    }
    return 'FILTER_OK';
  },

  async menu() {
    const p = await page({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE); await settle(p);
    await p.click('[data-menu-toggle]'); await p.waitForTimeout(250);
    ok((await p.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true', 'меню не открылось');
    ok(await p.evaluate(() => document.querySelector('main').inert), 'main не inert при открытом меню');
    for (let i = 0; i < 9; i++) await p.keyboard.press('Tab');
    ok(await p.evaluate(() => !!document.activeElement.closest('[data-menu], [data-menu-toggle]')), 'фокус вышел из меню');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok((await p.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'false', 'Escape не закрыл меню');
    ok(await p.evaluate(() => document.activeElement.matches('[data-menu-toggle]')), 'фокус не вернулся на кнопку меню');
    await p.click('[data-menu-toggle]'); await p.waitForTimeout(250);
    await p.click('[data-menu] .mobile-links a[href="#contact"]'); await p.waitForTimeout(1800);
    ok((await p.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'false', 'ссылка не закрыла меню');
    ok(await p.evaluate(() => Math.abs(document.getElementById('contact').getBoundingClientRect().top) < 140), 'ссылка меню не прокрутила к #contact');
    ok(p.errors.length === 0, p.errors.join(' | '));
    await p.close();
    return 'MENU_OK';
  },

  async stickers() {
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const p = await page({ viewport: vp });
      await p.goto(BASE); await settle(p, 3500);
      const total = await p.evaluate(() => document.documentElement.scrollHeight);
      let maxLive = 0; let sawLive = false;
      for (let y = 0; y < total; y += vp.height * 0.8) {
        await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(700);
        const live = await p.$$eval('.sticker-slot[data-live]', (e) => e.length);
        maxLive = Math.max(maxLive, live); if (live) sawLive = true;
        const offscreen = await p.$$eval('.sticker-slot[data-live]', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth; }).length);
        ok(offscreen === 0, `${vp.width}: играет стикер вне экрана (y=${y})`);
      }
      ok(sawLive, `${vp.width}: ни один стикер не заиграл`);
      ok(maxLive <= 4, `${vp.width}: одновременно играло ${maxLive}`);
      await p.close();
    }
    return 'STICKERS_OK';
  },

  async reduced() {
    const p = await page({ reducedMotion: 'reduce' });
    await p.goto(BASE); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({
      cls: document.documentElement.className,
      preloader: !!document.querySelector('.preloader') && getComputedStyle(document.querySelector('.preloader')).display !== 'none',
      canvas: !!document.querySelector('[data-rocket-layer] canvas'),
      pins: document.querySelectorAll('.pin-spacer').length,
      poster: getComputedStyle(document.querySelector('.rocket-poster')).opacity,
      horizontal: document.getElementById('works').hasAttribute('data-horizontal'),
    }));
    ok(r.cls.includes('motion-off') && !r.cls.includes('lenis') && !r.cls.includes('preload'), `классы: ${r.cls}`);
    ok(!r.preloader && !r.canvas && r.pins === 0 && !r.horizontal && r.poster === '1', JSON.stringify(r));
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(300);
    const hidden = await p.$$eval('main h2, main p, .card, .tag, .fact, .step, .faq-item', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1' || getComputedStyle(e).visibility === 'hidden').length);
    ok(hidden === 0, `скрытых элементов: ${hidden}`);
    await p.close();
    return 'REDUCED_OK';
  },

  async fallbacks() {
    // без WebGL
    const nogl = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
    const p = await nogl.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE); await p.waitForTimeout(4000);
    const r = await p.evaluate(() => ({ canvas: !!document.querySelector('[data-rocket-layer] canvas'), poster: getComputedStyle(document.querySelector('.rocket-poster')).opacity, img: document.querySelector('.rocket-poster img').complete && document.querySelector('.rocket-poster img').naturalWidth > 0 }));
    ok(!r.canvas && r.poster === '1' && r.img && errs.length === 0, `без WebGL: ${JSON.stringify(r)} ${errs.join('|')}`);
    await nogl.close();
    // без JS
    for (const lang of ['ru', 'en']) {
      const q = await page({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      await q.goto(BASE + (lang === 'en' ? 'en/' : ''));
      const s = await q.evaluate(() => ({
        h1: document.querySelector('h1 .sr-only').textContent.trim(),
        cards: document.querySelectorAll('[data-card]').length,
        tg: document.querySelectorAll('a[href^="https://t.me/Verto_Studio"]').length,
        preloader: getComputedStyle(document.querySelector('.preloader')).display,
        hiddenText: [...document.querySelectorAll('main *')].filter((e) => e.children.length === 0 && e.textContent.trim() && (getComputedStyle(e).opacity === '0' || getComputedStyle(e).visibility === 'hidden')).length,
      }));
      ok(s.h1 === 'VERTO STUDIO' && s.cards === 12 && s.tg >= 3 && s.preloader === 'none' && s.hiddenText === 0, `без JS (${lang}): ${JSON.stringify(s)}`);
      await q.close();
    }
    return 'FALLBACKS_OK';
  },

  async motiontoggle() {
    const p = await page();
    await p.goto(BASE); await settle(p, 3500);
    const click = async () => { await p.evaluate(() => document.querySelector('[data-motion-toggle]').click()); await p.waitForTimeout(500); };
    await click();
    let s = await p.evaluate(() => ({ off: document.documentElement.classList.contains('motion-off'), lenis: document.documentElement.classList.contains('lenis'), canvas: !!document.querySelector('[data-rocket-layer] canvas'), pressed: document.querySelector('[data-motion-toggle]').getAttribute('aria-pressed'), label: document.querySelector('[data-motion-label]').textContent }));
    ok(s.off && !s.lenis && !s.canvas && s.pressed === 'true' && s.label === t.ru.footer.motionOn, `выключение: ${JSON.stringify(s)}`);
    await p.reload(); await p.waitForTimeout(800);
    ok(await p.evaluate(() => document.documentElement.classList.contains('motion-off')), 'выбор не запомнился');
    await click(); await p.waitForTimeout(2500);
    s = await p.evaluate(() => ({ off: document.documentElement.classList.contains('motion-off'), lenis: document.documentElement.classList.contains('lenis'), canvas: !!document.querySelector('[data-rocket-layer] canvas') }));
    ok(!s.off && s.lenis && s.canvas, `включение: ${JSON.stringify(s)}`);
    ok(p.errors.length === 0, p.errors.join(' | '));
    await p.close();
    return 'MOTIONTOGGLE_OK';
  },

  async console() {
    const problems = [];
    const csp = [];
    for (const route of ['', 'en/', ...LEGACY]) {
      const p = await page();
      await p.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error('CSP ' + e.violatedDirective + ' ' + e.blockedURI)));
      await p.goto(BASE + route); await settle(p, route === '' || route === 'en/' ? 3000 : 800);
      if (route === '' || route === 'en/') {
        const h = await p.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < h; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(250); }
        await p.waitForTimeout(800);
      }
      const errs = p.errors.filter((e) => !(route === '404.html' && /404/.test(e)));
      if (errs.length) problems.push(`${route || '/'}: ${errs.join(' | ')}`);
      if (errs.some((e) => e.includes('CSP') || e.includes('Content Security Policy'))) csp.push(route);
      await p.close();
    }
    ok(problems.length === 0, problems.join('\n'));
    return 'CONSOLE_OK';
  },

  async firstscreen() {
    const bad = [];
    for (const [w, h] of [[375, 667], [390, 844], [768, 1024], [1440, 900], [1920, 1080]]) for (const route of ['', 'en/']) for (const reduced of [false, true]) {
      const p = await page({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await p.goto(BASE + route); await settle(p, reduced ? 300 : 2800);
      const r = await p.evaluate(() => {
        const sel = { title: '.hero-title', quote: '.hero-quote blockquote', author: '.hero-quote figcaption', offer: '.hero-offer', cta: '.hero-actions .btn-primary', contacts: '.hero-secondary' };
        const out = {};
        for (const [k, q] of Object.entries(sel)) { const b = document.querySelector(q).getBoundingClientRect(); out[k] = b.top >= 0 && b.bottom <= innerHeight + 0.5 && b.left >= 0 && b.right <= innerWidth + 0.5; }
        return out;
      });
      const miss = Object.entries(r).filter(([, v]) => !v).map(([k]) => k);
      if (miss.length) bad.push(`${route || '/'} ${w}×${h} ${reduced ? 'reduced' : 'motion'}: не видно ${miss.join(', ')}`);
      await p.close();
    }
    ok(bad.length === 0, bad.join('\n'));
    return 'FIRSTSCREEN_OK';
  },

  async overflow() {
    const bad = [];
    for (const motion of [true, false]) for (const route of ['', 'en/']) for (const w of WIDTHS) {
      const p = await page({ viewport: { width: w, height: 900 }, reducedMotion: motion ? 'no-preference' : 'reduce' });
      await p.goto(BASE + route); await settle(p, motion ? 2600 : 300);
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 900) {
        await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(motion ? 120 : 20);
        const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (o > 0) { bad.push(`${route || '/'} ${w}px ${motion ? 'motion' : 'reduced'} y=${y}: +${o}px`); break; }
      }
      await p.close();
    }
    ok(bad.length === 0, bad.join('\n'));
    return 'OVERFLOW_OK';
  },

  async screens() {
    const out = path.join(__dirname, '../docs/screens/phase-7');
    fs.mkdirSync(out, { recursive: true });
    for (const route of ['', 'en/']) for (const w of WIDTHS) {
      const p = await page({ viewport: { width: w, height: w < 768 ? 844 : 900 }, reducedMotion: 'reduce' });
      await p.goto(BASE + route); await p.waitForTimeout(500);
      await p.evaluate(async () => { for (const img of document.images) { img.loading = 'eager'; } await new Promise((r) => setTimeout(r, 600)); });
      await p.screenshot({ path: path.join(out, `${route ? 'en' : 'ru'}-${w}-full.png`), fullPage: true });
      await p.close();
      const q = await page({ viewport: { width: w, height: w < 768 ? 844 : 900 } });
      await q.goto(BASE + route); await settle(q, 4200);
      await q.screenshot({ path: path.join(out, `${route ? 'en' : 'ru'}-${w}-hero.png`) });
      await q.close();
    }
    return 'SCREENS_OK';
  },
};

(async () => {
  browser = await chromium.launch({ channel: 'chrome' });
  const names = only ? only.split(',') : Object.keys(checks);
  let failed = 0;
  for (const name of names) {
    if (!checks[name]) { console.error('нет проверки', name); failed++; continue; }
    try { console.log(await checks[name]()); }
    catch (e) { failed++; console.error(`${name.toUpperCase()}_FAIL: ${e.message}`); }
  }
  await browser.close();
  process.exitCode = failed ? 1 : 0;
})();
