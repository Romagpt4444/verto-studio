// Пар у стартового стола, свечение пламени, орбиты, стартовый стол, планета с кольцом.
import * as THREE from 'three';
import { softTexture } from './textures';

export function createSteam(count: number, tex: THREE.Texture) {
  const group = new THREE.Group();
  const parts = Array.from({ length: count }, (_, i) => {
    const m = new THREE.SpriteMaterial({ map: tex, color: 0xcfd6e2, transparent: true, opacity: 0, depthWrite: false });
    const sp = new THREE.Sprite(m);
    group.add(sp);
    const a = (i / count) * Math.PI * 2;
    return { sp, m, a, life: Math.random(), speed: 0.25 + Math.random() * 0.35, burst: 0 };
  });
  /** level: 0..1 фоновое парение; burst — всплеск при прогреве */
  const update = (dt: number, level: number, burstAmt: number) => {
    parts.forEach((p) => {
      p.life += dt * p.speed * (0.4 + burstAmt * 1.6);
      if (p.life > 1) { p.life -= 1; p.a = Math.random() * Math.PI * 2; }
      const L = p.life;
      const r = 0.35 + L * (1.1 + burstAmt * 1.6);
      p.sp.position.set(Math.cos(p.a) * r, 0.05 + L * 0.35, Math.sin(p.a) * r * 0.5);
      const sc = 0.4 + L * (1.2 + burstAmt);
      p.sp.scale.set(sc, sc, 1);
      p.m.opacity = Math.sin(L * Math.PI) * (0.1 * level + 0.35 * burstAmt);
    });
  };
  return { group, update, dispose: () => parts.forEach((p) => p.m.dispose()) };
}

export function createGlow(tex: THREE.Texture) {
  const m = new THREE.SpriteMaterial({ map: tex, color: 0xff7a3d, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const sp = new THREE.Sprite(m);
  sp.scale.set(2.4, 2.4, 1);
  return { sprite: sp, material: m, dispose: () => m.dispose() };
}

export function createOrbits() {
  const group = new THREE.Group();
  const mats: THREE.LineBasicMaterial[] = [];
  const specs = [
    { rx: 1.7, ry: 1.7, tilt: 0.22, y: 1.3, op: 0.34 },
    { rx: 2.3, ry: 2.3, tilt: -0.16, y: -0.2, op: 0.24 },
    { rx: 2.9, ry: 2.9, tilt: 0.1, y: -1.5, op: 0.15 },
  ];
  const lines = specs.map((sp) => {
    const curve = new THREE.EllipseCurve(0, 0, sp.rx, sp.ry, 0, Math.PI * 2, false, 0);
    const pts = curve.getPoints(120).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: 0xeef1f6, transparent: true, opacity: sp.op, depthWrite: false });
    mats.push(m);
    const l = new THREE.LineLoop(g, m);
    l.rotation.set(0.3, 0, sp.tilt); // кольца видны чуть сверху, как эллипсы
    l.position.y = sp.y;
    l.userData.baseOpacity = sp.op;
    group.add(l);
    return l;
  });
  const setOpacity = (k: number) => lines.forEach((l) => { (l.material as THREE.LineBasicMaterial).opacity = l.userData.baseOpacity * k; l.visible = k > 0.01; });
  return { group, lines, setOpacity, dispose: () => { lines.forEach((l) => l.geometry.dispose()); mats.forEach((m) => m.dispose()); } };
}

export function createPad(seg: number) {
  const group = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color: 0x1c2740, metalness: 0.6, roughness: 0.45 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xff6b2c, metalness: 0.3, roughness: 0.5 });
  const leg = new THREE.MeshStandardMaterial({ color: 0x121a2b, metalness: 0.5, roughness: 0.6 });
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.02, 0.14, seg), top);
  deck.position.y = -0.08;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.022, 8, seg), edge);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.0;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.17, seg), new THREE.MeshBasicMaterial({ color: 0x05070d }));
  hole.position.y = -0.075;
  group.add(deck, rim, hole);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), leg);
    l.position.set(Math.cos(a) * 0.74, -0.35, Math.sin(a) * 0.74);
    group.add(l);
  }
  const dispose = () => group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  return { group, dispose };
}

export function createPlanet(seg: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, seg, Math.round(seg / 2)),
    new THREE.MeshStandardMaterial({ color: 0x1c2740, metalness: 0.1, roughness: 0.85, emissive: 0x2a1408, emissiveIntensity: 0.4 }),
  );
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff8a55, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.62, seg * 2), ringMat);
  ring.rotation.x = -Math.PI / 2 + 0.35;
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.72, 1.76, seg * 2), ringMat.clone());
  (ring2.material as THREE.MeshBasicMaterial).opacity = 0.3;
  ring2.rotation.copy(ring.rotation);
  group.add(body, ring, ring2);
  const setOpacity = (k: number) => {
    group.visible = k > 0.01;
    (body.material as THREE.MeshStandardMaterial).opacity = k;
    (body.material as THREE.MeshStandardMaterial).transparent = k < 0.99;
    ringMat.opacity = 0.55 * k;
    (ring2.material as THREE.MeshBasicMaterial).opacity = 0.3 * k;
  };
  const dispose = () => group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  return { group, setOpacity, dispose };
}

export { softTexture };
