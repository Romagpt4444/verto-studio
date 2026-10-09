// Прелоадер «Заправка»: только первый заход за сессию, 0.9–2.2 с, уход через clip-path от центра.
import { $, root, store } from './env';

// Заполнение 0.6–1.5 с + уход 0.7 с: всего не дольше ~2.2 с и не быстрее 0.9 с.
const MIN_FILL = 600;
const MAX_FILL = 1500;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export function runPreloader(): Promise<boolean> {
  const el = $<HTMLElement>('[data-preloader]');
  if (!el || !root.classList.contains('preload')) return Promise.resolve(false);
  // если CSS-страховка уже спрятала оверлей, не мешаем
  if (getComputedStyle(el).visibility === 'hidden') { finish(el); return Promise.resolve(false); }

  const rocket = $<SVGElement>('.pre-rocket', el);
  const pct = $<HTMLElement>('[data-pre-pct]', el);
  el.style.animation = 'none';
  const t0 = performance.now();
  let readyAt = document.readyState === 'complete' ? 0 : -1;
  if (readyAt < 0) addEventListener('load', () => { readyAt = performance.now() - t0; }, { once: true });

  return new Promise((resolve) => {
    let shown = 0;
    const frame = (now: number) => {
      const t = now - t0;
      const dur = readyAt >= 0 ? Math.min(MAX_FILL, Math.max(MIN_FILL, readyAt + 300)) : MAX_FILL;
      shown = Math.max(shown, easeOut(Math.min(1, t / dur)));
      rocket?.style.setProperty('--fuel', shown.toFixed(3));
      if (pct) pct.textContent = String(Math.round(shown * 100));
      if (shown >= 1) {
        leave(el).then(() => resolve(true));
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function leave(el: HTMLElement) {
  const rocket = $<SVGElement>('.pre-rocket', el);
  document.dispatchEvent(new CustomEvent('verto:reveal'));
  const a1 = rocket?.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-60vh)', opacity: 0 }],
    { duration: 650, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' },
  );
  const a2 = el.animate(
    [{ clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(50% 0% 50% 0%)' }],
    { duration: 700, delay: 120, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
  );
  return Promise.all([a1?.finished, a2.finished]).catch(() => undefined).then(() => finish(el));
}

function finish(el: HTMLElement) {
  store.set('verto-fueled', '1', sessionStorage);
  root.classList.remove('preload');
  el.remove();
}
