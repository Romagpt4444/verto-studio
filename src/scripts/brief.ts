// «Быстрый старт»: выбор темы подставляет текст в ссылку Telegram (?text=…). Ничего не отправляет.
import { $, $$ } from './env';

export function initBrief() {
  const link = $<HTMLAnchorElement>('[data-brief-link]');
  const chips = $$<HTMLButtonElement>('[data-brief]');
  if (!link || !chips.length) return;
  const base = link.dataset.briefBase ?? link.href;
  const tpl = link.dataset.briefTemplate ?? '{choice}';
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const on = chip.getAttribute('aria-pressed') !== 'true';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(on && c === chip)));
    link.href = on ? `${base}?text=${encodeURIComponent(tpl.replace('{choice}', chip.dataset.brief ?? ''))}` : base;
  }));
}
