// RU ↔ EN: обычные ссылки, якорь текущего блока сохраняется.
import { $$ } from './env';

const SECTIONS = ['start', 'create', 'stack', 'works', 'launch', 'faq', 'contact'];

const currentSection = () => {
  let id = '';
  for (const s of SECTIONS) {
    const el = document.getElementById(s);
    if (el && el.getBoundingClientRect().top <= innerHeight * 0.4) id = s;
  }
  return id;
};

export function initLang() {
  $$<HTMLAnchorElement>('[data-lang-link]').forEach((a) => {
    a.addEventListener('click', () => {
      if (a.getAttribute('aria-current') === 'true') return;
      const id = currentSection();
      const url = new URL(a.href);
      url.hash = id && id !== 'start' ? id : '';
      a.href = url.toString();
    });
  });
}
