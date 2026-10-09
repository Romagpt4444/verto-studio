// Шапка (прячется при скролле вниз) и шкала высоты. Работает и без анимаций.
import { $, $$, root } from './env';

export function initChrome(getMenuOpen: () => boolean) {
  const header = $<HTMLElement>('[data-header]');
  const alt = $<HTMLElement>('[data-altimeter]');
  const fills = $$<HTMLElement>('[data-alt-fill]');
  const kms = $$<HTMLElement>('[data-alt-km]');
  const ticks = $$<HTMLElement>('[data-alt-tick]');
  const contact = $<HTMLElement>('#contact');
  const maxKm = 400;
  let lastY = scrollY;
  let ticking = false;
  let positions: number[] = [];

  const measure = () => {
    const max = Math.max(1, root.scrollHeight - innerHeight);
    positions = ticks.map((li) => {
      const sec = document.getElementById(li.dataset.altTick ?? '');
      const p = sec ? Math.min(1, Math.max(0, (sec.getBoundingClientRect().top + scrollY - innerHeight * 0.3) / max)) : 0;
      li.style.setProperty('--pos', p.toFixed(4));
      return p;
    });
  };

  const update = () => {
    ticking = false;
    const y = scrollY;
    const max = Math.max(1, root.scrollHeight - innerHeight);
    const p = Math.min(1, Math.max(0, y / max));
    if (header) {
      header.dataset.scrolled = y > 12 ? '1' : '0';
      const down = y > lastY + 2;
      const up = y < lastY - 2;
      if (getMenuOpen() || y < 120) header.dataset.hidden = '0';
      else if (down) header.dataset.hidden = '1';
      else if (up) header.dataset.hidden = '0';
    }
    lastY = y;
    const inOrbit = !!contact && contact.getBoundingClientRect().top < innerHeight * 0.5;
    const km = inOrbit ? maxKm : Math.round(p * maxKm);
    fills.forEach((f) => f.style.setProperty('--alt-p', p.toFixed(4)));
    const label = String(km).padStart(3, '0');
    kms.forEach((k, i) => { k.textContent = i === 0 ? label : String(km); });
    if (alt) alt.toggleAttribute('data-orbit', inOrbit);
    ticks.forEach((li, i) => li.toggleAttribute('data-passed', p + 0.002 >= positions[i]));
  };

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
  addEventListener('load', () => { measure(); update(); });
  document.fonts?.ready.then(() => { measure(); update(); });
  measure();
  update();
  return { refresh: () => { measure(); update(); } };
}
