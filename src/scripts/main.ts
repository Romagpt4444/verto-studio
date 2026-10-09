// Точка входа. Лёгкие модули работают всегда; движение и 3D — только если анимации включены.
import { $, root, motionOn } from './env';
import { initMenu } from './menu';
import { initChrome } from './chrome';
import { initFilter } from './filter';
import { initBrief } from './brief';
import { initLang } from './lang';
import { initMotionToggle } from './motion-toggle';
import { runPreloader } from './preloader';

let menuOpen = false;
let motion: { destroy: () => void; lenis: { stop(): void; start(): void } } | null = null;
let refreshLayout: () => void = () => {};

const chrome = initChrome(() => menuOpen);
initMenu((open) => {
  menuOpen = open;
  if (open) motion?.lenis.stop(); else motion?.lenis.start();
});
initBrief();
initLang();
initFilter(() => { refreshLayout(); chrome.refresh(); });

// Подсказка у ракеты исчезает после первого нажатия
$('[data-warmup]')?.addEventListener('click', () => $('[data-rocket-hint]')?.setAttribute('data-hidden', ''), { once: true });

async function startMotion(withIntro: boolean) {
  const mod = await import('./scroll');
  if (!motionOn()) return;
  motion = mod.initMotion();
  refreshLayout = () => mod.ScrollTrigger.refresh();
  if (withIntro) mod.heroLetters();
  chrome.refresh();
}

function stopMotion() {
  motion?.destroy();
  motion = null;
  refreshLayout = () => {};
  chrome.refresh();
}

initMotionToggle((on) => { if (on) startMotion(false); else stopMotion(); });

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
