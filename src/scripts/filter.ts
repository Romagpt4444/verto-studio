// Фильтр работ: aria-pressed, aria-live, «таблетка» переезжает через clip-path.
import { $, $$ } from './env';

export function initFilter(onChange?: () => void) {
  const group = $<HTMLElement>('[data-filter-group]');
  if (!group) return;
  const tabs = $$<HTMLButtonElement>('[data-filter]', group);
  const cards = $$<HTMLElement>('[data-card]').filter((c) => c.dataset.kind !== 'invite');
  const live = $<HTMLElement>('[data-works-live]');
  const total = $<HTMLElement>('[data-works-total]');

  const placePill = () => {
    const active = tabs.find((t) => t.getAttribute('aria-pressed') === 'true');
    if (!active) return;
    const g = group.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    const inset = 4;
    group.style.setProperty('--pill-t', `${a.top - g.top - inset}px`);
    group.style.setProperty('--pill-l', `${a.left - g.left - inset + group.scrollLeft}px`);
    group.style.setProperty('--pill-r', `${g.right - a.right - inset - group.scrollLeft}px`);
    group.style.setProperty('--pill-b', `${g.bottom - a.bottom - inset}px`);
  };

  const apply = (kind: string) => {
    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.filter === kind)));
    let n = 0;
    cards.forEach((c) => {
      const show = kind === 'all' || c.dataset.kind === kind;
      c.hidden = !show;
      if (show) n++;
    });
    if (live) live.textContent = (live.dataset.template ?? '{n}').replace('{n}', String(n));
    if (total) total.textContent = String(n + 1).padStart(2, '0');
    placePill();
    onChange?.();
  };

  tabs.forEach((t) => t.addEventListener('click', () => {
    apply(t.dataset.filter ?? 'all');
    t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }));
  group.addEventListener('scroll', placePill, { passive: true });
  addEventListener('resize', placePill, { passive: true });
  document.fonts?.ready.then(placePill);
  placePill();
  group.dataset.pillReady = '';
}
