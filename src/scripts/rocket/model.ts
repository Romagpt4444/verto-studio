// Ракета VERTO-1: процедурная модель (LatheGeometry + Extrude), ступени — отдельные группы.
// Единицы: высота корпуса 6.25. Ось Y — вверх, иллюминатор смотрит в +Z, надпись — в +X.
import * as THREE from 'three';
import { nameTexture, panelTexture, windowTexture } from './textures';

export const ROCKET_HEIGHT = 6.25;
export const ROCKET_PIVOT = 3.0; // центр вращения по высоте
const R = 0.5;

export type PartName = 'capsule' | 'stage3' | 'stage2' | 'stage1' | 'engine';

export interface RocketModel {
  root: THREE.Group;
  parts: Record<'capsule' | 'stage3' | 'stage2' | 'stage1', THREE.Group>;
  nozzles: Record<'stage1' | 'stage2' | 'stage3', THREE.Object3D>;
  highlights: Record<PartName, THREE.Mesh>;
  /** Нижняя точка (y в координатах root) текущей нижней ступени: туда крепится пламя. */
  baseY: Record<'stage1' | 'stage2' | 'stage3', number>;
  dispose: () => void;
}

export function createRocket(opts: { segments: number }): RocketModel {
  const seg = opts.segments;
  const disposables: Array<{ dispose: () => void }> = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  const panelMats = [6, 4, 3].map((rows, i) => keep(new THREE.MeshStandardMaterial({
    map: keep(panelTexture(rows, i + 3)),
    color: 0xffffff,
    metalness: 0.6,
    roughness: 0.35,
    envMapIntensity: 0.9,
  })));
  const ringMat = keep(new THREE.MeshStandardMaterial({ color: 0xff6b2c, metalness: 0.25, roughness: 0.42 }));
  const finMat = keep(new THREE.MeshStandardMaterial({ color: 0x1c2740, metalness: 0.45, roughness: 0.5 }));
  const darkMat = keep(new THREE.MeshStandardMaterial({ color: 0x2a3654, metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide }));
  const capMat = keep(new THREE.MeshStandardMaterial({ color: 0x121a2b, metalness: 0.5, roughness: 0.6 }));
  const glowMat = keep(new THREE.MeshBasicMaterial({ color: 0xff6b2c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));

  const lathe = (pts: Array<[number, number]>, mat: THREE.Material) => {
    const g = keep(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg));
    return new THREE.Mesh(g, mat);
  };
  const cap = (r: number, y: number, up: boolean) => {
    const g = keep(new THREE.CircleGeometry(r, seg));
    const m = new THREE.Mesh(g, capMat);
    m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
    m.position.y = y;
    return m;
  };
  const ring = (y: number, h = 0.07, r = R + 0.012) => {
    const m = new THREE.Mesh(keep(new THREE.CylinderGeometry(r, r, h, seg, 1, true)), ringMat);
    m.position.y = y;
    return m;
  };
  const nozzle = (y: number, scale: number) => {
    const n = lathe([[0.16 * scale, y], [0.2 * scale, y - 0.08 * scale], [0.3 * scale, y - 0.26 * scale], [0.34 * scale, y - 0.34 * scale]], darkMat);
    return n;
  };
  // Подсветка части: тонкое оранжевое кольцо вокруг корпуса (аддитивное свечение)
  const highlight = (y: number, r = R + 0.16) => {
    const mat = glowMat.clone();
    disposables.push(mat);
    const m = new THREE.Mesh(keep(new THREE.TorusGeometry(r, 0.02, 8, 72)), mat);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    m.renderOrder = 2;
    return m;
  };

  // ── Ступень 1 (низ): юбка, корпус, 4 стабилизатора, двигатель ──
  const stage1 = new THREE.Group(); stage1.name = 'stage1';
  stage1.add(lathe([[R + 0.03, 0.34], [R + 0.01, 0.42], [R, 0.5], [R, 2.2]], panelMats[0]));
  stage1.add(cap(R + 0.03, 0.34, false), cap(R, 2.2, true));
  stage1.add(ring(1.62, 0.12, R + 0.008));
  const nozzle1 = nozzle(0.34, 1); stage1.add(nozzle1);
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0.36); finShape.lineTo(0, 1.25); finShape.lineTo(0.48, 0.62); finShape.lineTo(0.5, 0.12); finShape.lineTo(0.44, 0.06); finShape.lineTo(0, 0.36);
  const finGeo = keep(new THREE.ExtrudeGeometry(finShape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4 }));
  finGeo.translate(0, 0, -0.0225);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(finGeo, finMat);
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    f.position.set(Math.cos(a) * (R - 0.01), 0, Math.sin(a) * (R - 0.01));
    f.rotation.y = -a;
    stage1.add(f);
  }

  // ── Ступень 2: корпус + надпись VERTO-1 сбоку (+X) ──
  const stage2 = new THREE.Group(); stage2.name = 'stage2';
  stage2.add(lathe([[R, 2.2], [R, 3.6]], panelMats[1]));
  stage2.add(ring(2.24), cap(R, 2.2, false), cap(R, 3.6, true));
  const nozzle2 = nozzle(2.2, 0.75); stage2.add(nozzle2);
  const nameMat = keep(new THREE.MeshStandardMaterial({ map: keep(nameTexture('VERTO-1')), transparent: true, metalness: 0.2, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  const nameGeo = keep(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 1.22, 24, 1, true, Math.PI / 2 - 0.42, 0.84));
  const name = new THREE.Mesh(nameGeo, nameMat);
  name.position.y = 2.9;
  stage2.add(name);

  // ── Ступень 3: лёгкое сужение к капсуле ──
  const stage3 = new THREE.Group(); stage3.name = 'stage3';
  stage3.add(lathe([[R, 3.6], [0.49, 4.2], [0.48, 4.6]], panelMats[2]));
  stage3.add(ring(3.64), cap(R, 3.6, false), cap(0.48, 4.6, true));
  const nozzle3 = nozzle(3.6, 0.65); stage3.add(nozzle3);

  // ── Капсула: оживальный обтекатель, иллюминатор с V ──
  const capsule = new THREE.Group(); capsule.name = 'capsule';
  const nosePts: Array<[number, number]> = [];
  const N = 28;
  const noseR = (t: number) => 0.48 * Math.pow(Math.cos((t * Math.PI) / 2), 0.72);
  for (let i = 0; i <= N; i++) { const t = i / N; nosePts.push([Math.max(0.0001, noseR(t)), 4.6 + 1.65 * t]); }
  capsule.add(lathe(nosePts, panelMats[2]));
  capsule.add(ring(4.64), cap(0.48, 4.6, false));
  // иллюминатор по нормали к поверхности
  const wy = 5.05; const wt = (wy - 4.6) / 1.65;
  const wr = noseR(wt);
  const slope = (noseR(wt - 0.01) - noseR(wt + 0.01)) / (0.02 * 1.65);
  const win = new THREE.Group();
  const glass = new THREE.Mesh(keep(new THREE.CircleGeometry(0.15, 40)), keep(new THREE.MeshBasicMaterial({ map: keep(windowTexture()) })));
  const frame = new THREE.Mesh(keep(new THREE.TorusGeometry(0.155, 0.022, 10, 40)), ringMat);
  glass.position.z = 0.006;
  win.add(glass, frame);
  win.position.set(0, wy, wr + 0.004);
  win.rotation.x = -Math.atan(slope);
  capsule.add(win);

  const root = new THREE.Group();
  root.add(stage1, stage2, stage3, capsule);
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  const highlights: RocketModel['highlights'] = {
    capsule: highlight(5.15, 0.6),
    stage3: highlight(4.1),
    stage2: highlight(2.9),
    stage1: highlight(1.25),
    engine: highlight(0.12, 0.5),
  };
  capsule.add(highlights.capsule); stage3.add(highlights.stage3); stage2.add(highlights.stage2); stage1.add(highlights.stage1); stage1.add(highlights.engine);
  Object.values(highlights).forEach((h) => { h.visible = false; });

  return {
    root,
    parts: { capsule, stage3, stage2, stage1 },
    nozzles: { stage1: nozzle1, stage2: nozzle2, stage3: nozzle3 },
    highlights,
    baseY: { stage1: 0.0, stage2: 2.2 - 0.26, stage3: 3.6 - 0.22 },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
