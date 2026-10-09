// Общие флаги окружения.
export const root = document.documentElement;
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

export const mq = {
  reduced: matchMedia('(prefers-reduced-motion: reduce)'),
  desktop: matchMedia('(min-width: 1024px)'),
  fine: matchMedia('(hover: hover) and (pointer: fine)'),
};

export const motionOn = () => !root.classList.contains('motion-off');

export const store = {
  get(k: string, s: Storage = localStorage) {
    try { return s.getItem(k); } catch { return null; }
  },
  set(k: string, v: string, s: Storage = localStorage) {
    try { s.setItem(k, v); } catch { /* приватный режим: просто не запоминаем */ }
  },
};

export const headerOffset = () => ($('[data-header]')?.offsetHeight ?? 64) + 8;
