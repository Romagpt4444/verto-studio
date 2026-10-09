// Магнитная кнопка: тянется к курсору до 8 px, пружина. Только мышь + анимации включены.
import { gsap } from 'gsap';
import { $$ } from './env';

export function initMagnetic() {
  const offs: Array<() => void> = [];
  $$<HTMLElement>('[data-magnetic]').forEach((el) => {
    // через CSS-свойство translate, чтобы не спорить с :active { transform: scale(.97) }
    const pos = { x: 0, y: 0 };
    const render = () => { el.style.translate = `${pos.x.toFixed(2)}px ${pos.y.toFixed(2)}px`; };
    const xTo = gsap.quickTo(pos, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)', onUpdate: render });
    const yTo = gsap.quickTo(pos, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)', onUpdate: render });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(gsap.utils.clamp(-8, 8, dx * 0.18));
      yTo(gsap.utils.clamp(-8, 8, dy * 0.3));
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    offs.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.killTweensOf(pos);
      el.style.translate = '';
    });
  });
  return () => offs.forEach((f) => f());
}
