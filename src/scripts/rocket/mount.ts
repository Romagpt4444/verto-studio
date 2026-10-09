// Подключение 3D-ракеты: создаёт сцену, ставит её на место постера, связывает с кнопкой «прогрев».
import { $, mq, root } from '../env';
import { createRocketScene, type RocketScene } from './scene';

export interface MountedRocket { scene: RocketScene; destroy: () => void }

/** Прямоугольник ракеты в hero при нулевой прокрутке (в координатах экрана). */
export function heroRect() {
  const hit = $<HTMLElement>('[data-rocket-anchor="start"] .rocket-hit');
  if (!hit) return { x: innerWidth * 0.75, y: innerHeight * 0.5, h: innerHeight * 0.6 };
  const r = hit.getBoundingClientRect();
  const top = r.top + scrollY;
  // ракета + стол занимают ~ 0.86 высоты; центр чуть выше, чтобы стол поместился
  return { x: r.left + r.width / 2, y: top + r.height * 0.47, h: r.height * 0.8 };
}

export async function mountRocket(): Promise<MountedRocket | null> {
  const layer = $<HTMLElement>('[data-rocket-layer]');
  if (!layer) return null;
  const scene = await createRocketScene(layer, { mobile: !mq.desktop.matches });
  root.classList.add('webgl-ready');
  scene.setPointerTilt(mq.fine.matches && mq.desktop.matches);

  // только в режиме разработки: доступ к сцене для снятия постера и проверок ракурсов
  if (import.meta.env.DEV) (window as unknown as { __rocket: RocketScene }).__rocket = scene;

  const btn = $<HTMLButtonElement>('[data-warmup]');
  const onWarm = () => scene.warmup();
  btn?.addEventListener('click', onWarm);

  return {
    scene,
    destroy() {
      btn?.removeEventListener('click', onWarm);
      root.classList.remove('webgl-ready');
      scene.dispose();
    },
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
