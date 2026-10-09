// Хореография ракеты по прокрутке (ТЗ 9.3).
// Один мастер-таймлайн: его «время» = позиция прокрутки в px, плавное догоняние ≈ scrub: 1.
// Участки привязаны к реальным позициям блоков (пересчитываются на каждом refresh ScrollTrigger).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { RocketScene, RocketState } from './scene';
import { heroRect } from './mount';
import type { StagePart } from '../pins';

const docTop = (sel: string) => {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return 0;
  // если блок закреплён (pin-spacer), берём позицию обёртки
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  return box.getBoundingClientRect().top + scrollY;
};
const docBottom = (sel: string) => {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return 0;
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const r = box.getBoundingClientRect();
  return r.bottom + scrollY;
};

export function initChoreography(scene: RocketScene) {
  const s = scene.state;
  const planetArc = document.querySelector<HTMLElement>('[data-planet]');
  let master = gsap.timeline({ paused: true });
  const follow = { t: 0 };
  const timeTo = gsap.quickTo(follow, 't', { duration: 1, ease: 'power3.out', onUpdate: () => master.time(Math.min(master.duration(), follow.t)) });

  const build = () => {
    const vw = innerWidth;
    const vh = innerHeight;
    const desktop = vw >= 1024;
    const max = ScrollTrigger.maxScroll(window);
    const at = (px: number) => Math.max(0, Math.min(max, px));

    // ключевые позиции прокрутки
    const pCreate = at(docTop('#create') - vh * 0.55);
    const pMarq = at(docTop('[data-marquee-zone]') - vh * 0.7);
    const pMarqEnd = at(docBottom('[data-marquee-zone]') - vh * 0.25);
    const stackST = ScrollTrigger.getById('stack-pin');
    const pStack = stackST ? stackST.start : at(docTop('#stack') - vh * 0.4);
    const pStackEnd = stackST ? stackST.end : at(docTop('#stack') + vh * 0.2);
    const pWorks = at(docTop('#works') - vh * 0.6);
    const pLaunch = at(docTop('#launch') - vh * 0.7);
    const pFaq = at(docTop('#faq') - vh * 0.5);
    const pContact = at(docTop('#contact') - vh * 0.75);
    const pOrbitEnd = max;

    // ключевые состояния
    const hero = heroRect();
    const START: Partial<RocketState> = {
      x: hero.x, y: hero.y, h: hero.h, yaw: 0, pitch: 0, roll: 0, thrust: 0, opacity: 1, stars: 0, orbits: 1,
      pad: 0, steam: 1, sway: 1, sep1: 0, sep2: 0, planet: 0,
    };
    const side = desktop
      ? { x: vw * 0.73, y: vh * 0.52, h: vh * 0.72, opacity: 1 }
      : { x: vw * 0.5, y: vh * 0.5, h: vh * 0.7, opacity: 0.35 };
    const stackPos = desktop
      ? { x: vw * 0.8, y: vh * 0.54, h: vh * 0.74, opacity: 1 }
      : { x: vw * 0.62, y: vh * 0.5, h: vh * 0.66, opacity: 0.3 };
    const far = desktop
      ? { x: vw * 0.88, y: vh * 0.17, h: vh * 0.17, opacity: 0.5 }
      : { x: vw * 0.84, y: vh * 0.2, h: vh * 0.2, opacity: 0.45 };
    const planet = desktop
      ? { planetX: vw * 0.76, planetY: vh * 0.5, planetR: vh * 0.075 }
      : { planetX: vw * 0.5, planetY: vh * 0.3, planetR: vh * 0.05 };

    master.kill();
    master = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    master.set(s, START, 0);

    // 1. Взлёт: тяга 0→1, стол уезжает вниз, звёзды «текут», ракета уходит на позицию «бортом»
    const d1 = Math.max(1, pCreate);
    master.to(s, { thrust: 1, pad: 1, steam: 0, sway: 0, stars: 1, duration: d1 * 0.7, ease: 'power1.in' }, 0);
    if (desktop) {
      master.to(s, { ...side, duration: d1, ease: 'power1.inOut' }, 0)
        .to(s, { roll: -6, duration: d1 * 0.5, ease: 'sine.inOut' }, d1 * 0.2);
    } else {
      // на телефоне ракета над текстом: сначала уходит вверх и становится фоном, потом занимает место
      master.to(s, { y: hero.y - vh * 0.22, opacity: side.opacity, duration: d1 * 0.45, ease: 'power2.in' }, 0)
        .to(s, { x: side.x, y: side.y, h: side.h, duration: d1 * 0.55, ease: 'power1.inOut' }, d1 * 0.45);
    }

    // 2. Что создаём: поворот на 90° бортом (видна надпись VERTO-1), тяга 0.4
    const d2 = Math.max(1, pMarq - pCreate);
    master.to(s, { yaw: -90, roll: -10, pitch: 0, thrust: 0.4, stars: 0.4, duration: Math.min(d2, vh * 0.6), ease: 'power2.inOut' }, pCreate);

    // 3. Бегущая строка: пролёт по диагонали сквозь ленту
    const d3 = Math.max(1, pMarqEnd - pMarq);
    master.to(s, { x: desktop ? vw * 0.18 : vw * 0.3, y: vh * 0.38, roll: 38, yaw: -40, thrust: 0.85, stars: 1.6, duration: d3, ease: 'power1.inOut' }, pMarq);

    // 4. Стек: ракета справа, подсветка частей (по событию), в конце отделяется нижняя ступень
    const toStack = Math.max(1, pStack - pMarqEnd);
    master.to(s, { ...stackPos, roll: 0, yaw: -24, pitch: 4, thrust: 0.4, stars: 0.5, duration: toStack, ease: 'power2.inOut' }, pMarqEnd);
    const stackLen = Math.max(1, pStackEnd - pStack);
    if (desktop) {
      // строка 05 — двигатель: полная тяга, затем отделение stage1
      master.to(s, { thrust: 1, stars: 1.2, duration: stackLen * 0.12 }, pStack + stackLen * 0.78)
        .to(s, { sep1: 1, duration: stackLen * 0.22, ease: 'power1.in' }, pStack + stackLen * 0.9)
        .to(s, { thrust: 0.5, duration: stackLen * 0.1 }, pStack + stackLen * 0.95);
    } else {
      master.to(s, { sep1: 1, thrust: 0.9, duration: vh * 0.5, ease: 'power1.in' }, pStack);
    }

    // 5. Коллекция: на дальний план, 35 % и полупрозрачная, звёзды медленнее
    const toWorks = Math.max(1, pWorks - Math.max(pStackEnd, pStack + 1));
    master.to(s, { ...far, yaw: -15, pitch: 0, roll: 8, thrust: 0.3, stars: 0.25, orbits: 0.6, duration: Math.min(toWorks + vh * 0.4, vh), ease: 'power2.inOut' }, Math.max(pStackEnd, pWorks - vh * 0.2));

    // 6. Как работаем: отделяется stage2, ракета горизонтально, внизу дуга планеты
    const dL = Math.max(1, Math.min(pFaq, pContact) - pLaunch);
    master.to(s, { x: desktop ? vw * 0.66 : vw * 0.55, y: vh * 0.24, h: desktop ? vh * 0.42 : vh * 0.32, opacity: desktop ? 0.95 : 0.4, roll: -90, yaw: 0, thrust: 0.6, stars: 0.8, orbits: 0.4, duration: dL * 0.6, ease: 'power2.inOut' }, pLaunch)
      .to(s, { sep2: 1, duration: dL * 0.35, ease: 'power1.in' }, pLaunch + dL * 0.35);
    if (planetArc) {
      master.fromTo(planetArc, { opacity: 0, yPercent: 8 }, { opacity: 1, yPercent: 0, duration: dL * 0.6, ease: 'power2.out' }, pLaunch)
        .to(planetArc, { opacity: 0, duration: vh * 0.4 }, pContact);
    }

    // 7. Контакты: виток по орбите вокруг маленькой планеты с кольцом, тяга 0.2
    const dC = Math.max(1, pOrbitEnd - pContact);
    const dIn = Math.min(dC * 0.4, vh * 0.5);
    master.to(s, {
      ...planet, planet: 1, thrust: 0.2, stars: 0.3, orbits: 0, pitch: 0, yaw: 0,
      opacity: desktop ? 1 : 0.55, h: desktop ? vh * 0.3 : vh * 0.18,
      orbitRx: desktop ? vw * 0.15 : vw * 0.34, orbitRy: desktop ? vh * 0.13 : vh * 0.06,
      orbitK: 1, duration: dIn, ease: 'power2.out',
    }, pContact)
      .fromTo(s, { orbitA: -Math.PI * 0.85 }, { orbitA: Math.PI * 1.15, duration: dC, ease: 'none', immediateRender: false }, pContact);

    // длительность таймлайна = вся прокрутка
    master.set({}, {}, max);
    master.time(Math.min(max, scrollY));
    follow.t = scrollY;
  };

  build();
  const onRefresh = () => build();
  ScrollTrigger.addEventListener('refresh', onRefresh);
  const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => timeTo(self.scroll()) });

  // подсветка частей ракеты по активной строке стека
  const onStage = (e: Event) => scene.highlight((e as CustomEvent<{ part: StagePart | null }>).detail.part);
  document.addEventListener('verto:stage', onStage);

  // ScrollTrigger.refresh() после появления 3D: в стеке меняется ширина строк
  ScrollTrigger.refresh();

  return () => {
    ScrollTrigger.removeEventListener('refresh', onRefresh);
    document.removeEventListener('verto:stage', onStage);
    st.kill();
    master.kill();
    if (planetArc) gsap.set(planetArc, { clearProps: 'opacity,transform' });
  };
}
