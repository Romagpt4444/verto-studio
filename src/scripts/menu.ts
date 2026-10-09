// Мобильное меню: полноэкранное, ловушка фокуса, Escape, inert на остальной странице.
import { $, $$, mq, root } from './env';

export function initMenu(onToggle?: (open: boolean) => void) {
  const toggle = $<HTMLButtonElement>('[data-menu-toggle]');
  const menu = $<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;
  let open = false;
  const outside = () => $$<HTMLElement>('.skip-link, main, .site-footer, .altimeter, .alt-mobile, .site-header .brand, .site-header .header-lang, .site-header .header-cta');

  const set = (next: boolean, restoreFocus = true) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', (open ? toggle.dataset.labelClose : toggle.dataset.labelOpen) ?? '');
    root.classList.toggle('menu-open', open);
    outside().forEach((el) => { el.inert = open; });
    if (open) {
      menu.hidden = false;
      menu.dataset.state = 'open';
      requestAnimationFrame(() => $<HTMLElement>('a', menu)?.focus({ preventScroll: true }));
    } else {
      menu.dataset.state = 'closed';
      menu.hidden = true;
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
    onToggle?.(open);
  };

  toggle.addEventListener('click', () => set(!open));
  $$('[data-menu-link]', menu).forEach((a) => a.addEventListener('click', () => set(false, false)));
  mq.desktop.addEventListener('change', () => set(false, false));
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); set(false); return; }
    if (e.key !== 'Tab') return;
    // порядок в DOM: кнопка-бургер (в шапке) → пункты меню
    const items = [toggle, ...$$<HTMLElement>('a, button', menu)].filter((el) => el.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
