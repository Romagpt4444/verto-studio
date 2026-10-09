// Фильтр работ: aria-pressed, aria-live, «таблетка» переезжает через clip-path.
import { $, $$ } from './env';

export function initFilter(onChange?: () => void) {
  const group = $<HTMLElement>('[data-filter-group]');
  if (!group) return;
  const tabs = $$<HTMLButtonElement>('[data-filter]', group);
  const cards = $$<HTMLElement>('[data-card]').filter((c) => c.dataset.kind !== 'invite');
  const live = $<HTMLElement>('[data-works-live]');
  const total = $<HTMLElement>('[data-works-total]');

  // «Таблетка» под активной вкладкой: ширина ставится сразу, переезд — transform (ТЗ 10.2)
  const placePill = () => {
    const active = tabs.find((t) => t.getAttribute('aria-pressed') === 'true');
    if (!active) return;
    group.style.setProperty('--pill-x', `${active.offsetLeft}px`);
    group.style.setProperty('--pill-w', `${active.offsetWidth}px`);
    group.style.setProperty('--pill-t', `${active.offsetTop}px`);
    group.style.setProperty('--pill-h', `${active.offsetHeight}px`);
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
  addEventListener('resize', placePill, { passive: true });
  document.fonts?.ready.then(placePill);
  placePill();
  group.dataset.pillReady = '';
}
