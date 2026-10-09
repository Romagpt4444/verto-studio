// Хореография ракеты по прокрутке (ТЗ 9.3). Фаза 4: только старт в hero.
import type { RocketScene } from './scene';
import { heroRect } from './mount';

export function initChoreography(scene: RocketScene) {
  const place = () => {
    const r = heroRect();
    Object.assign(scene.state, { x: r.x, y: r.y - scrollY, h: r.h });
  };
  place();
  const onScroll = () => { scene.state.y = heroRect().y - scrollY; };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', place, { passive: true });
  return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', place); };
}
