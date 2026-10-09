// Бегущая строка: постоянная скорость влево, ускорение от скорости скролла (до ×4),
// при скролле вверх — на секунду в обратную сторону, пауза при наведении.
import { gsap } from 'gsap';
import { $$, mq } from './env';

export function initMarquee(getVelocity: () => number) {
  const bands = $$<HTMLElement>('[data-marquee]');
  const states = bands.map((band) => {
    const track = band.querySelector<HTMLElement>('[data-marquee-track]')!;
    const dir = band.dataset.marqueeDir === '1' ? 1 : -1; // -1 влево, 1 вправо
    return { band, track, dir, x: 0, w: 0, paused: false };
  });
  const measure = () => states.forEach((s) => { s.w = s.track.scrollWidth / 2; });
  // вне экрана лента не двигается
  let onScreen = true;
  const zone = bands[0]?.closest<HTMLElement>('[data-marquee-zone]');
  const io = zone ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { rootMargin: '100px' }) : null;
  if (zone) io?.observe(zone);
  measure();

  const base = 60; // px/с
  let boost = 1;
  let flip = 1;
  let flipUntil = 0;
  const boostObj = { v: 1 };
  const setBoost = gsap.quickTo(boostObj, 'v', { duration: 0.8, ease: 'power3.out' });

  states.forEach((s) => {
    if (!mq.fine.matches) return;
    s.band.addEventListener('pointerenter', () => { s.paused = true; });
    s.band.addEventListener('pointerleave', () => { s.paused = false; });
  });

  const tick = (_t: number, dt: number) => {
    if (!onScreen) return;
    const v = getVelocity();
    setBoost(1 + Math.min(3, Math.abs(v) / 900));
    if (v < -120) flipUntil = performance.now() + 1000;
    flip = performance.now() < flipUntil ? -1 : 1;
    boost = boostObj.v;
    const step = (base * boost * dt) / 1000;
    states.forEach((s) => {
      if (s.paused || !s.w) return;
      s.x += step * s.dir * flip;
      s.x = gsap.utils.wrap(-s.w, 0, s.x);
      s.track.style.transform = `translate3d(${s.x}px,0,0)`;
    });
  };
  gsap.ticker.add(tick);
  addEventListener('resize', measure, { passive: true });
  document.fonts?.ready.then(measure);

  return () => {
    gsap.ticker.remove(tick);
    io?.disconnect();
    removeEventListener('resize', measure);
    states.forEach((s) => { s.track.style.transform = ''; });
  };
}
