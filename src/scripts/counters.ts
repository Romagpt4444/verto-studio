// Счётчики 0 → число за 900 мс, один раз при появлении.
import { gsap } from 'gsap';

export function countUp(el: HTMLElement, duration = 0.9) {
  const to = Number(el.dataset.count ?? el.textContent ?? 0);
  const suffix = el.dataset.suffix ?? '';
  const obj = { v: 0 };
  el.textContent = `0${suffix}`;
  return gsap.to(obj, {
    v: to,
    duration,
    ease: 'expo.out',
    onUpdate: () => { el.textContent = `${Math.round(obj.v)}${suffix}`; },
  });
}
