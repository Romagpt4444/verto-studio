// Система движения: Lenis + ScrollTrigger, появления блоков, заголовки, паспорт,
// счётчики, ступени, траектория, бегущая строка, магнитные кнопки.
// Возвращает функцию полной очистки (кнопка «Остановить анимацию»).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { $, $$, mq } from './env';
import { initMarquee } from './marquee';
import { countUp } from './counters';
import { initMagnetic } from './magnetic';
import { initPins } from './pins';
import { initStickers } from './stickers';
import { initShimmer, initSpotlight } from './polish';

gsap.registerPlugin(ScrollTrigger);
// Телефон: появление/скрытие адресной строки не должно пересчитывать все триггеры (рывки)
ScrollTrigger.config({ ignoreMobileResize: true });

export const EASE = 'expo.out'; // ближайшая к cubic-bezier(0.23, 1, 0.32, 1)

export interface MotionApi {
  lenis: Lenis;
  destroy: () => void;
}

/** Разбивает заголовок на слова под маской (для «выезда» лесенкой). Текст для скринридеров не меняется. */
function splitWords(el: HTMLElement) {
  if (el.dataset.splitDone) return $$<HTMLElement>('.w', el);
  const walk = (node: Node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const parts = (n.textContent ?? '').split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.append(p); return; }
          const mask = document.createElement('span');
          mask.className = 'w-mask';
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = p;
          mask.append(w);
          frag.append(mask);
        });
        n.replaceWith(frag);
      } else if (n instanceof HTMLElement && !n.classList.contains('sticker-slot')) {
        walk(n);
      }
    });
  };
  walk(el);
  el.dataset.splitDone = '1';
  return $$<HTMLElement>('.w', el);
}

export function initMotion(): MotionApi {
  const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Якорные ссылки — плавно через Lenis, с учётом шапки
  const onAnchor = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"], a[href*="/#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    const isTop = target.id === 'start' || target.id === 'content';
    // отступ под шапку Lenis берёт из scroll-padding-top у <html>
    lenis.scrollTo(isTop ? 0 : target, { duration: isTop ? 2.2 : 1.4 });
    history.replaceState(null, '', isTop ? location.pathname : url.hash);
    if (target.id !== 'start') target.setAttribute('tabindex', '-1');
    setTimeout(() => target.focus({ preventScroll: true }), isTop ? 2200 : 1400);
  };
  document.addEventListener('click', onAnchor);

  let pinsMM: gsap.MatchMedia | null = null;
  const ctx = gsap.context(() => {
    // ── Пины (стек, коллекция) создаём первыми: они добавляют высоту странице ──
    pinsMM = initPins();

    // ── Заголовки блоков: слова из-под маски ──
    $$<HTMLElement>('[data-split]').forEach((h) => {
      const words = splitWords(h);
      gsap.fromTo(words, { yPercent: 110 }, {
        yPercent: 0,
        duration: 0.9,
        ease: EASE,
        stagger: 0.06,
        scrollTrigger: { trigger: h, start: 'top 85%', once: true },
      });
    });

    // ── Общие появления: подъём + проявление, лесенкой ──
    const reveal = (targets: HTMLElement[], vars: gsap.TweenVars = {}) => {
      if (!targets.length) return;
      gsap.set(targets, { opacity: 0, y: 24 });
      ScrollTrigger.batch(targets, {
        start: 'top 88%',
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.07, overwrite: true, ...vars }),
      });
    };
    reveal($$('.stack-sub, .works-sub, .works-head .filter, .contact-text, .brief, .contact-main > .btn, .contact-cards li, .faq-item, .footer-grid > *'));
    reveal($$('.step'));

    // ── Бортовой паспорт: панель раскрывается сверху вниз, строки лесенкой, проценты считают ──
    const passport = $<HTMLElement>('[data-passport]');
    if (passport) {
      const rows = $$<HTMLElement>('[data-passport-row]', passport);
      const values = $$<HTMLElement>('.passport-value', passport);
      const tl = gsap.timeline({ scrollTrigger: { trigger: passport, start: 'top 80%', once: true } });
      tl.fromTo(passport, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: EASE })
        .fromTo($$('.passport-head > *', passport), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: EASE, stagger: 0.06 }, 0.15)
        .fromTo(rows, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: EASE, stagger: 0.06 }, 0.3)
        .add(() => values.forEach((v) => countUp(v)), 0.35)
        .fromTo('.passport-foot', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.7);
    }

    // ── Ступени стека: строки по очереди, теги лесенкой (≤ 12 анимированных на строку) ──
    $$<HTMLElement>('[data-stage]').forEach((stage) => {
      const tags = $$<HTMLElement>('.tag', stage);
      const tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 85%', once: true } });
      tl.fromTo(stage.querySelector('.stage-id'), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.7, ease: EASE })
        .fromTo(tags.slice(0, 12), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE, stagger: 0.02 }, 0.1);
      if (tags.length > 12) tl.fromTo(tags.slice(12), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: EASE }, 0.3);
    });

    // ── Карточки работ (обычная сетка; горизонтальная лента — в хореографии) ──
    const cards = $$<HTMLElement>('[data-card]');
    if (!document.getElementById('works')?.hasAttribute('data-horizontal')) gsap.set(cards, { opacity: 0, y: 24 });
    ScrollTrigger.batch(cards, {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.08, overwrite: true }),
    });

    // ── Траектория «Как проходит запуск»: линия рисуется скроллом, ракета-иконка едет ──
    const line = $<SVGPathElement>('[data-trajectory-line]');
    const craft = $<HTMLElement>('[data-trajectory-craft]');
    const traj = $<HTMLElement>('[data-trajectory]');
    if (line && traj && mq.desktop.matches) {
      const svg = line.ownerSVGElement!;
      const total = line.getTotalLength();
      const place = (p: number) => {
        line.style.setProperty('--draw', String(1 - p));
        if (!craft) return;
        const pt = line.getPointAtLength(total * p);
        const ahead = line.getPointAtLength(Math.min(total, total * p + 2));
        const box = svg.getBoundingClientRect();
        const sx = box.width / svg.viewBox.baseVal.width;
        const sy = box.height / svg.viewBox.baseVal.height;
        const ang = (Math.atan2((ahead.y - pt.y) * sy, (ahead.x - pt.x) * sx) * 180) / Math.PI;
        craft.style.opacity = p > 0.002 ? '1' : '0';
        craft.style.transform = `translate(${pt.x * sx}px, ${pt.y * sy}px) translate(-50%, -50%) rotate(${ang + 45}deg)`;
      };
      place(0);
      ScrollTrigger.create({
        trigger: traj,
        start: 'top 75%',
        end: 'bottom 60%',
        scrub: 0.6,
        onUpdate: (self) => place(self.progress),
      });
      $$<HTMLElement>('[data-step]').forEach((step, i, all) => {
        ScrollTrigger.create({
          trigger: traj,
          start: () => `top+=${(i / all.length) * traj.offsetHeight * 0.5} 75%`,
          onEnter: () => step.setAttribute('data-lit', ''),
          onLeaveBack: () => step.removeAttribute('data-lit'),
        });
      });
    }

    // ── Подсказка у кнопки «Листайте» исчезает при первом скролле ──
    gsap.to('.scroll-cue', { opacity: 0, ease: 'none', scrollTrigger: { start: 0, end: 200, scrub: true } });
  });

  const stopMarquee = initMarquee(() => lenis.velocity * 60);
  // стикеры — после первой отрисовки, в простое (lottie ~47 КБ не нужен до взаимодействия)
  // и только после первого действия пользователя (как и 3D): до этого видны статичные кадры
  let stopStickers: () => void = () => {};
  let stickersOn = true;
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const startStickers = () => { if (stickersOn) stopStickers = initStickers(); };
  const userEvents = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'] as const;
  const onUser = () => {
    userEvents.forEach((e) => removeEventListener(e, onUser));
    if (idle) idle(startStickers, { timeout: 1500 }); else setTimeout(startStickers, 300);
  };
  userEvents.forEach((e) => addEventListener(e, onUser, { passive: true }));
  const stopSpot = initSpotlight();
  const stopShimmer = initShimmer();
  const stopMagnetic = mq.fine.matches ? initMagnetic() : () => {};

  // Пересчёт после загрузки шрифтов и картинок
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  return {
    lenis,
    destroy() {
      document.removeEventListener('click', onAnchor);
      stopMarquee();
      stopMagnetic();
      stickersOn = false;
      userEvents.forEach((e) => removeEventListener(e, onUser));
      stopStickers();
      stopSpot();
      stopShimmer();
      pinsMM?.revert();
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
    },
  };
}

/** Буквы «VERTO STUDIO» выезжают снизу из-под маски по одной. */
export function heroLetters() {
  const chars = $$<HTMLElement>('[data-hero-title] .ch');
  gsap.set(chars, { y: 0, yPercent: 115 });
  return gsap.to(chars, { yPercent: 0, duration: 0.6, ease: EASE, stagger: 0.04, delay: 0.15 });
}

export { gsap, ScrollTrigger };
