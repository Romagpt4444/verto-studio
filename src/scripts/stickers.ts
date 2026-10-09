// Анимированные стикеры Noto: Lottie грузится, когда стикер в 200 px от экрана,
// играет только видимый, одновременно не больше 4. Наведение на карточку — проигрыш заново + подпрыгивание.
import type { AnimationItem } from 'lottie-web';
import { $$, mq } from './env';

const MAX_PLAYING = 4;
type Lottie = typeof import('lottie-web/build/player/lottie_light').default;

export function initStickers() {
  const slots = $$<HTMLElement>('.sticker-slot[data-sticker]');
  if (!slots.length || !('IntersectionObserver' in window)) return () => {};
  let lottie: Lottie | null = null;
  let loading: Promise<Lottie> | null = null;
  const anims = new Map<HTMLElement, AnimationItem>();
  const ratio = new Map<HTMLElement, number>();
  const offs: Array<() => void> = [];
  let destroyed = false;

  const getLottie = () => (loading ??= import('lottie-web/build/player/lottie_light').then((m) => (lottie = m.default)));

  const schedule = () => {
    // играют максимум 4 самых видимых
    const ranked = [...ratio.entries()].filter(([, r]) => r > 0).sort((a, b) => b[1] - a[1]).slice(0, MAX_PLAYING).map(([el]) => el);
    // играющий стикер показываем векторным, на паузе — статичный кадр (первый кадр анимации бывает пустым)
    anims.forEach((a, el) => {
      const ready = el.dataset.ready === '1';
      if (ranked.includes(el)) {
        if (a.isPaused) a.play();
        if (ready) el.setAttribute('data-live', '');
      } else {
        if (!a.isPaused) a.pause();
        el.removeAttribute('data-live');
      }
    });
  };

  const load = async (slot: HTMLElement) => {
    if (anims.has(slot) || slot.dataset.loading) return;
    slot.dataset.loading = '1';
    const l = await getLottie();
    if (destroyed) return;
    const box = document.createElement('div');
    box.className = 'lottie';
    slot.append(box);
    const anim = l.loadAnimation({
      container: box,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: `/stickers/${slot.dataset.sticker}.json`,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
    });
    anim.addEventListener('DOMLoaded', () => { slot.dataset.ready = '1'; schedule(); });
    anim.addEventListener('data_failed', () => { box.remove(); });
    anims.set(slot, anim);
  };

  const near = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) load(e.target as HTMLElement); }), { rootMargin: '200px' });
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((e) => ratio.set(e.target as HTMLElement, e.isIntersecting ? e.intersectionRatio : 0));
    schedule();
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  slots.forEach((s) => { near.observe(s); seen.observe(s); });

  // Наведение на карточку: стикер проигрывается заново и подпрыгивает
  if (mq.fine.matches) {
    $$<HTMLElement>('[data-card]').forEach((card) => {
      const slot = card.querySelector<HTMLElement>('.sticker-slot');
      if (!slot) return;
      const enter = () => {
        anims.get(slot)?.goToAndPlay(0, true);
        slot.removeAttribute('data-bounce');
        void slot.offsetWidth;
        slot.setAttribute('data-bounce', '');
      };
      card.addEventListener('pointerenter', enter);
      offs.push(() => card.removeEventListener('pointerenter', enter));
    });
  }

  if (import.meta.env.DEV) (window as unknown as { __stickers: typeof anims }).__stickers = anims;

  const onVis = () => { if (document.hidden) anims.forEach((a) => a.pause()); else schedule(); };
  document.addEventListener('visibilitychange', onVis);

  return () => {
    destroyed = true;
    near.disconnect();
    seen.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    offs.forEach((f) => f());
    anims.forEach((a, slot) => { a.destroy(); slot.querySelector('.lottie')?.remove(); slot.removeAttribute('data-live'); delete slot.dataset.loading; delete slot.dataset.ready; });
    anims.clear();
    void lottie;
  };
}

/** Для проверок: сколько стикеров сейчас играет. */
export const playingCount = () => document.querySelectorAll('.sticker-slot[data-live]').length;
