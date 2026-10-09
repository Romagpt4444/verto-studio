// Мелкие эффекты: пятно света на карточках (Spotlight) и блик по «VERTO STUDIO».
import { gsap } from 'gsap';
import { $, $$, mq } from './env';

export function initSpotlight() {
  if (!mq.fine.matches) return () => {};
  const offs: Array<() => void> = [];
  $$<HTMLElement>('.card-inner').forEach((card) => {
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    card.addEventListener('pointermove', move);
    offs.push(() => card.removeEventListener('pointermove', move));
  });
  return () => offs.forEach((f) => f());
}

/** Блик пробегает по буквам: при первом показе и при наведении, не чаще раза в 8 с. */
export function initShimmer(firstShowDelay = 1.4) {
  const title = $<HTMLElement>('[data-hero-title]');
  const chars = $$<HTMLElement>('[data-hero-title] .ch');
  if (!title || !chars.length) return () => {};
  let last = -Infinity;
  const run = (delay = 0) => {
    const now = performance.now();
    if (now - last < 8000) return;
    last = now;
    gsap.timeline({ delay })
      .to(chars, {
        // тёплый «блик» без свечения: drop-shadow обрезается масками букв (заметно в Safari)
        filter: 'sepia(1) saturate(3) hue-rotate(-28deg)',
        duration: 0.22,
        ease: 'power2.out',
        stagger: 0.035,
      })
      .to(chars, { filter: 'sepia(0) saturate(1) hue-rotate(0deg)', duration: 0.45, ease: 'power2.out', stagger: 0.035 }, 0.22);
  };
  run(firstShowDelay);
  const enter = () => run(0);
  if (mq.fine.matches) title.addEventListener('pointerenter', enter);
  return () => {
    title.removeEventListener('pointerenter', enter);
    gsap.killTweensOf(chars);
    gsap.set(chars, { clearProps: 'filter' });
  };
}
