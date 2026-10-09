// Кнопка «Остановить анимацию» в подвале. Выбор запоминается (localStorage, с защитой).
import { $, root, store } from './env';

export function initMotionToggle(apply: (on: boolean) => void) {
  const btn = $<HTMLButtonElement>('[data-motion-toggle]');
  const label = $<HTMLElement>('[data-motion-label]');
  if (!btn) return;
  const sync = () => {
    const off = root.classList.contains('motion-off');
    btn.setAttribute('aria-pressed', String(off));
    if (label) label.textContent = (off ? btn.dataset.labelOn : btn.dataset.labelOff) ?? '';
  };
  btn.addEventListener('click', () => {
    const nowOff = !root.classList.contains('motion-off');
    store.set('verto-motion', nowOff ? 'off' : 'on');
    root.classList.toggle('motion-off', nowOff);
    sync();
    apply(!nowOff);
  });
  sync();
}
