// Точка входа. Лёгкие модули работают всегда; движение и 3D — только если анимации включены.
import { $, root, motionOn } from './env';
import { initMenu } from './menu';
import { initChrome } from './chrome';
import { initFilter } from './filter';
import { initBrief } from './brief';
import { initLang } from './lang';
import { initMotionToggle } from './motion-toggle';
import { runPreloader } from './preloader';
import { loadDeferredFonts } from './fonts';

loadDeferredFonts();

let menuOpen = false;
let motion: { destroy: () => void; lenis: { stop(): void; start(): void } } | null = null;
let refreshLayout: () => void = () => {};
let rocket: { destroy: () => void } | null = null;
let rocketLoading = false;

// 3D грузится после первой отрисовки и первого действия пользователя, только при включённой
// анимации, наличии WebGL и без режима экономии трафика.
function loadRocket(now = false) {
  if (rocket || rocketLoading || !motionOn()) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  rocketLoading = true;
  const go = async () => {
    try {
      const m = await import('./rocket/mount');
      if (!m.webglAvailable() || !motionOn()) return;
      const mounted = await m.mountRocket();
      if (!mounted) return;
      const ch = await import('./rocket/choreography');
      const stop = ch.initChoreography(mounted.scene);
      rocket = { destroy: () => { stop(); mounted.destroy(); } };
      if (!motionOn()) { rocket.destroy(); rocket = null; }
    } catch (e) {
      console.warn('[verto] 3D недоступно, остаётся постер', e);
    } finally {
      rocketLoading = false;
    }
  };
  // Сцена тяжёлая (компиляция шейдеров, ~150 КБ): запускаем при первом действии пользователя —
  // движение мыши, касание, колесо, клавиша, прокрутка. До этого виден постер (тот же ракурс).
  const events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'] as const;
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const trigger = () => {
    events.forEach((e) => removeEventListener(e, trigger));
    if (idle) idle(go, { timeout: 500 }); else setTimeout(go, 50);
  };
  if (now) { go(); return; }
  events.forEach((e) => addEventListener(e, trigger, { passive: true }));
}

const chrome = initChrome(() => menuOpen);
initMenu((open) => {
  menuOpen = open;
  if (open) motion?.lenis.stop(); else motion?.lenis.start();
});
initBrief();
initLang();
initFilter(() => { refreshLayout(); chrome.refresh(); });

// Кнопка-ракета: подсказка исчезает после первого нажатия; без WebGL — CSS-тряска постера.
// В режиме без анимации кнопка убирается из Tab-порядка и от скринридеров (нажимать нечего).
const warmBtn = $<HTMLButtonElement>('[data-warmup]');
warmBtn?.addEventListener('click', () => {
  $('[data-rocket-hint]')?.setAttribute('data-hidden', '');
  if (!root.classList.contains('webgl-ready') && motionOn()) {
    warmBtn.removeAttribute('data-warm');
    void warmBtn.offsetWidth;
    warmBtn.setAttribute('data-warm', '');
  }
});
const syncWarmBtn = () => {
  if (!warmBtn) return;
  const off = !motionOn();
  warmBtn.tabIndex = off ? -1 : 0;
  warmBtn.toggleAttribute('aria-hidden', off);
};
syncWarmBtn();

async function startMotion(withIntro: boolean, userAction = false) {
  const mod = await import('./scroll');
  if (!motionOn()) return;
  motion = mod.initMotion();
  refreshLayout = () => mod.ScrollTrigger.refresh();
  if (withIntro) mod.heroLetters();
  chrome.refresh();
  loadRocket(userAction);
}

function stopMotion() {
  rocket?.destroy();
  rocket = null;
  motion?.destroy();
  motion = null;
  refreshLayout = () => {};
  chrome.refresh();
}

initMotionToggle((on) => { syncWarmBtn(); if (on) startMotion(false, true); else stopMotion(); });

if (motionOn()) {
  const hadPreloader = root.classList.contains('preload');
  // начинаем грузить модуль движения параллельно с прелоадером
  const ready = import('./scroll');
  document.addEventListener('verto:reveal', () => { ready.then((m) => m.heroLetters()); }, { once: true });
  runPreloader().then(async () => {
    await ready;
    await startMotion(false);
  });
  void hadPreloader;
}

// Освобождаем GPU-ресурсы при окончательном уходе со страницы (не при попадании в bfcache)
addEventListener('pagehide', (e) => { if (!e.persisted) { rocket?.destroy(); rocket = null; } });
