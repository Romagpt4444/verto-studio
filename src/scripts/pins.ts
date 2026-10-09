// Пины: стек («ступени») и горизонтальная лента коллекции. Только десктоп и только с анимацией.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$ } from './env';

const PARTS = ['capsule', 'stage3', 'stage2', 'stage1', 'engine'] as const;
export type StagePart = (typeof PARTS)[number];

/** Вызывается внутри gsap.context из initMotion — откатывается вместе с ним. */
export function initPins() {
  const mm = gsap.matchMedia();

  // ── Стек: закреплён на ~180 % высоты экрана, активна одна строка ──
  mm.add('(min-width: 1024px) and (min-height: 640px)', () => {
    const section = $<HTMLElement>('#stack');
    const stages = $<HTMLElement>('[data-stages]');
    const rows = $$<HTMLElement>('[data-stage]');
    if (!section || !stages || !rows.length) return;
    let current = -1;
    const setActive = (i: number) => {
      if (i === current) return;
      current = i;
      if (i < 0) stages.removeAttribute('data-active'); else stages.setAttribute('data-active', '');
      rows.forEach((r, j) => r.toggleAttribute('data-active', j === i));
      document.dispatchEvent(new CustomEvent('verto:stage', { detail: { part: i >= 0 ? PARTS[i] : null } }));
    };
    const st = ScrollTrigger.create({
      id: 'stack-pin',
      trigger: section,
      start: 'top top',
      end: '+=180%',
      pin: true,
      anticipatePin: 1,
      onUpdate: (self) => setActive(Math.min(rows.length - 1, Math.floor(self.progress * rows.length * 0.999))),
      onLeave: () => setActive(-1),
      onLeaveBack: () => setActive(-1),
      onEnter: (self) => setActive(Math.min(rows.length - 1, Math.floor(self.progress * rows.length))),
      onEnterBack: (self) => setActive(Math.min(rows.length - 1, Math.floor(self.progress * rows.length * 0.999))),
    });
    return () => { st.kill(); setActive(-1); };
  });

  // ── Коллекция: горизонтальная лента при вертикальной прокрутке ──
  mm.add('(min-width: 1024px) and (min-height: 720px)', () => {
    const works = $<HTMLElement>('#works');
    const track = $<HTMLElement>('[data-works-track]');
    const index = $<HTMLElement>('[data-works-index]');
    const bar = $<HTMLElement>('[data-works-progress]');
    if (!works || !track) return;
    works.setAttribute('data-horizontal', '');
    const cards = () => $$<HTMLElement>('[data-card]:not([hidden])', track);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.set($$('[data-card]', track), { opacity: 1, y: 0 });

    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        id: 'works-pin',
        trigger: works,
        start: 'top top',
        end: () => `+=${dist()}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const list = cards();
          const i = Math.min(list.length, Math.round(self.progress * (list.length - 1)) + 1);
          if (index) index.textContent = String(i).padStart(2, '0');
          bar?.style.setProperty('--wp', self.progress.toFixed(3));
        },
      },
    });

    // первая карточка «раскрывается» из уменьшенной при входе в блок
    const first = track.querySelector<HTMLElement>('[data-card]');
    const grow = first
      ? gsap.fromTo(first, { scale: 0.86, transformOrigin: '0% 50%' }, { scale: 1, ease: 'none', scrollTrigger: { trigger: works, start: 'top 85%', end: 'top top', scrub: true } })
      : null;

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      grow?.scrollTrigger?.kill();
      grow?.kill();
      gsap.set(track, { clearProps: 'transform' });
      if (first) gsap.set(first, { clearProps: 'transform' });
      works.removeAttribute('data-horizontal');
    };
  });

  return mm;
}
