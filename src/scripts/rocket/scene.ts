// Сцена ракеты VERTO-1: один WebGLRenderer, canvas позади контента.
// Состояние (RocketState) задаётся в пикселях экрана и градусах — его двигает хореография.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { createRocket, ROCKET_HEIGHT, type PartName } from './model';
import { createFlame } from './flame';
import { createStars } from './stars';
import { createGlow, createOrbits, createPad, createPlanet, createSteam, softTexture } from './fx';
import { createQuality } from './quality';

export interface RocketState {
  x: number; y: number; h: number; // центр и высота ракеты на экране, px
  yaw: number; pitch: number; roll: number; // градусы
  thrust: number; // 0..1
  opacity: number; // 0..1
  stars: number; // скорость «течения» звёзд
  orbits: number; // видимость линий орбит 0..1
  pad: number; // 0 — стол под ракетой, 1 — уехал вниз
  steam: number; // фоновый пар 0..1
  sep1: number; sep2: number; // отделение ступеней 0..1
  planet: number; planetX: number; planetY: number; planetR: number; // планета (px)
  sway: number; // покачивание на старте 0..1
  orbitK: number; orbitA: number; orbitRx: number; orbitRy: number; // полёт по орбите вокруг планеты (px)
}

export interface RocketScene {
  state: RocketState;
  warmup: () => void;
  highlight: (part: PartName | null) => void;
  setPointerTilt: (on: boolean) => void;
  renderOnce: () => void;
  /** Стабильный размер слоя ракеты (px): не меняется, когда на телефоне прячется адресная строка. */
  view: () => { w: number; h: number };
  canvas: HTMLCanvasElement;
  dispose: () => void;
}

export async function createRocketScene(container: HTMLElement, opts: { mobile: boolean }): Promise<RocketScene> {
  // шрифт для надписей на борту: латиница и кириллица (пояс услуг на русском)
  await document.fonts?.load('800 64px Unbounded', 'VERTO САЙТЫ').catch(() => undefined);

  const mobile = opts.mobile;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // На телефоне холст на весь экран — основная нагрузка на видеочип; 1.25 — резко и без просадок
  const maxDpr = mobile ? 1.25 : 1.75;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxDpr));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 400ms cubic-bezier(0.23, 1, 0.32, 1)';
  container.append(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 20);
  const visH = 2 * 20 * Math.tan(THREE.MathUtils.degToRad(15)); // высота видимой плоскости z=0

  // Свет: холодный ключевой сверху-слева, контровой оранжевый снизу (от пламени), слабый Hemisphere
  const key = new THREE.DirectionalLight(0xdbe6ff, 2.1);
  key.position.set(-6, 9, 7);
  const hemi = new THREE.HemisphereLight(0x9fb3d9, 0x05070d, 0.35);
  scene.add(key, hemi);

  const softTex = softTexture();
  const rocket = createRocket({
    segments: mobile ? 40 : 64,
    name: container.dataset.rocketName || 'VERTO-1',
    title: container.dataset.rocketTitle || 'VERTO STUDIO',
    band: (container.dataset.rocketBand || '').split('|').filter(Boolean),
  });
  const flame = createFlame();
  const glow = createGlow(softTex);
  const steam = createSteam(mobile ? 20 : 34, softTex);
  const orbits = createOrbits();
  const pad = createPad(mobile ? 32 : 56);
  const planet = createPlanet(mobile ? 32 : 48);
  const stars = createStars(mobile ? 600 : 1500);
  const flameLight = new THREE.PointLight(0xff6b2c, 0, 14, 1.6);

  // rig: позиция и масштаб на экране; tilt: повороты, тряска; model: смещение к центру
  const rig = new THREE.Group();
  const tilt = new THREE.Group();
  const model = new THREE.Group();
  model.position.y = -ROCKET_HEIGHT / 2;
  model.add(rocket.root);
  tilt.add(model);
  rig.add(tilt, orbits.group);
  const ground = new THREE.Group(); // стол и пар не наклоняются вместе с ракетой
  ground.position.y = -ROCKET_HEIGHT / 2;
  ground.add(pad.group, steam.group);
  rig.add(ground);
  const flameHolder = new THREE.Group();
  flameHolder.add(flame.group, glow.sprite, flameLight);
  glow.sprite.position.y = -0.5;
  flameLight.position.y = -0.6;
  rocket.root.add(flameHolder);
  scene.add(stars.points, rig, planet.group);

  // «Уход в фон» без настоящей прозрачности: материалы непрозрачные, а итоговый цвет пикселя
  // смешивается с цветом фона страницы (uFade: 1 — ракета как есть, 0 — растворилась в фоне).
  // Так сквозь корпус не просвечивают внутренние детали, и нет сортировки прозрачных объектов.
  const fadeOf = new Map<THREE.Material, { value: number }>();
  const addFade = (m: THREE.Material) => {
    const u = { value: 1 };
    fadeOf.set(m, u);
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uFade = u;
      shader.uniforms.uFadeColor = { value: new THREE.Vector3(5 / 255, 7 / 255, 13 / 255) };
      shader.fragmentShader = 'uniform float uFade;\nuniform vec3 uFadeColor;\n' + shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\n\tgl_FragColor.rgb = mix(uFadeColor, gl_FragColor.rgb, uFade);',
      );
    };
    m.customProgramCacheKey = () => 'verto-fade';
  };

  // Материалы по ступеням (для затемнения ракеты и «угасания» отделённых ступеней)
  const stageMats = new Map<THREE.Object3D, THREE.Material[]>();
  const allMats: THREE.Material[] = [];
  (['stage1', 'stage2', 'stage3', 'capsule'] as const).forEach((k) => {
    const list: THREE.Material[] = [];
    rocket.parts[k].traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || rocket.highlights[k as PartName] === m || m === rocket.highlights.engine) return;
      const cloned = (m.material as THREE.Material).clone();
      m.material = cloned;
      addFade(cloned);
      list.push(cloned);
      allMats.push(cloned);
    });
    stageMats.set(rocket.parts[k], list);
  });
  [...pad.group.children].forEach((o) => { const m = (o as THREE.Mesh).material as THREE.Material; if (m) { addFade(m); allMats.push(m); } });

  const state: RocketState = {
    x: innerWidth * 0.75, y: innerHeight * 0.5, h: innerHeight * 0.6,
    yaw: 0, pitch: 0, roll: 0, thrust: 0, opacity: 1, stars: 0, orbits: 1, pad: 0, steam: 1,
    sep1: 0, sep2: 0, planet: 0, planetX: innerWidth * 0.7, planetY: innerHeight * 0.55, planetR: 120, sway: 1,
    orbitK: 0, orbitA: 0, orbitRx: 200, orbitRy: 80,
  };

  // Прогрев, мышь, подсветка
  const fx = { shake: 0, thrust: 0, burst: 0, flash: 0 };
  let warmTl: gsap.core.Timeline | null = null;
  const warmup = () => {
    warmTl?.kill();
    warmTl = gsap.timeline()
      .to(fx, { shake: 1, duration: 0.12, ease: 'power2.out' }, 0)
      .to(fx, { shake: 0, duration: 1.08, ease: 'power2.out' }, 0.12)
      .to(fx, { thrust: 0.8, duration: 0.3, ease: 'power3.out' }, 0)
      .to(fx, { thrust: 0.2, duration: 0.5, ease: 'power2.inOut' }, 0.3)
      .to(fx, { thrust: 0, duration: 0.4, ease: 'power2.out' }, 0.8)
      .to(fx, { flash: 1, duration: 0.1, ease: 'power2.out' }, 0.05)
      .to(fx, { flash: 0, duration: 0.6, ease: 'power2.out' }, 0.15)
      .to(fx, { burst: 1, duration: 0.25, ease: 'power2.out' }, 0.05)
      .to(fx, { burst: 0, duration: 1.4, ease: 'power2.out' }, 0.3);
  };

  const mouse = { yaw: 0, pitch: 0 };
  const yawTo = gsap.quickTo(mouse, 'yaw', { duration: 0.9, ease: 'power3.out' });
  const pitchTo = gsap.quickTo(mouse, 'pitch', { duration: 0.9, ease: 'power3.out' });
  let tiltOn = false;
  const onPointer = (e: PointerEvent) => {
    if (!tiltOn || e.pointerType !== 'mouse') return;
    const dx = (e.clientX - state.x) / innerWidth;
    const dy = (e.clientY - state.y) / innerHeight;
    yawTo(gsap.utils.clamp(-6, 6, dx * 14));
    pitchTo(gsap.utils.clamp(-6, 6, dy * 10));
  };
  addEventListener('pointermove', onPointer, { passive: true });
  const setPointerTilt = (on: boolean) => { tiltOn = on; if (!on) { yawTo(0); pitchTo(0); } };

  const PARTS: PartName[] = ['capsule', 'stage3', 'stage2', 'stage1', 'engine'];
  // GSAP добавляет к объекту служебное поле _gsap, поэтому перебираем фиксированный список
  const hl: Record<PartName, number> = { capsule: 0, stage3: 0, stage2: 0, stage1: 0, engine: 0 };
  const highlight = (part: PartName | null) => {
    PARTS.forEach((k) => gsap.to(hl, { [k]: k === part ? 1 : 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' }));
  };

  // Размер. Слой ракеты высотой 100lvh: когда на телефоне прячется адресная строка, его размер
  // не меняется, и ракета не прыгает. Пересчёт — только если размер слоя реально изменился.
  let W = container.clientWidth || innerWidth;
  let H = container.clientHeight || innerHeight;
  let k = visH / H; // мир на пиксель
  let sizedW = 0, sizedH = 0;
  const resize = () => {
    W = container.clientWidth || innerWidth;
    H = container.clientHeight || innerHeight;
    if (W === sizedW && H === sizedH) return;
    sizedW = W; sizedH = H;
    const w = W, h = H;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    k = visH / h;
    stars.uniforms.uPx.value = renderer.getPixelRatio() * (h / 900);
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  const quality = createQuality(() => {
    renderer.setPixelRatio(1);
    sizedW = 0;
    resize();
    steam.group.visible = false;
    stars.points.geometry.setDrawRange(0, Math.floor((mobile ? 600 : 1500) * 0.5));
    glow.sprite.visible = false;
  });

  // Кадр
  let time = 0;
  let lastOpacity = -1;
  const deg = THREE.MathUtils.degToRad;
  const applyOpacity = (o: number) => {
    if (Math.abs(o - lastOpacity) < 0.002) return;
    lastOpacity = o;
    allMats.forEach((m) => { const u = fadeOf.get(m); if (u) u.value = o * (m.userData.stageFade ?? 1); });
  };
  const sepApply = (part: THREE.Group, p: number, dir: number) => {
    part.position.set(dir * 0.6 * p, -6 * p * p, 0);
    part.rotation.set(deg(28) * p, 0, deg(-40) * p * dir);
    part.visible = p < 0.999;
    const fade = 1 - Math.min(1, Math.max(0, (p - 0.35) / 0.6));
    (stageMats.get(part) ?? []).forEach((m) => {
      m.userData.stageFade = fade;
      const u = fadeOf.get(m); if (u) u.value = state.opacity * fade;
    });
  };

  const frame = (_t: number, dtMs: number) => {
    const dt = Math.min(0.05, dtMs / 1000);
    time += dt;
    quality.sample(dtMs);
    const s = state;

    // орбита: смешиваем позицию и крен с точкой на эллипсе вокруг планеты
    let sx = s.x, sy = s.y, roll = s.roll, orbitZ = 0;
    if (s.orbitK > 0.001) {
      const px = s.planetX + Math.cos(s.orbitA) * s.orbitRx;
      const py = s.planetY + Math.sin(s.orbitA) * s.orbitRy;
      const ang = (Math.atan2(Math.cos(s.orbitA) * s.orbitRy, -Math.sin(s.orbitA) * s.orbitRx) * 180) / Math.PI;
      sx += (px - sx) * s.orbitK;
      sy += (py - sy) * s.orbitK;
      roll += (-90 - ang - roll) * s.orbitK;
      orbitZ = Math.sin(s.orbitA) * 2.5 * s.orbitK; // за планетой — дальше, перед ней — ближе
    }
    // экран → мир
    rig.position.set((sx - W / 2) * k, -(sy - H / 2) * k, orbitZ);
    rig.scale.setScalar(Math.max(0.0001, (s.h * k) / ROCKET_HEIGHT));

    const shake = fx.shake * 0.06 * Math.sin(time * Math.PI * 2 * 6);
    const thrust = Math.min(1, s.thrust + fx.thrust);
    const rumble = thrust * 0.012 * Math.sin(time * 71);
    const sway = s.sway * deg(0.5) * Math.sin(time * 0.9);
    tilt.rotation.set(deg(s.pitch + mouse.pitch) + rumble, deg(s.yaw + mouse.yaw), deg(roll) + sway + shake);
    tilt.position.x = shake * 0.5;

    // ступени и точка крепления пламени
    sepApply(rocket.parts.stage1, s.sep1, -1);
    sepApply(rocket.parts.stage2, s.sep2, 1);
    const baseY = s.sep2 > 0.02 ? rocket.baseY.stage3 : s.sep1 > 0.02 ? rocket.baseY.stage2 : rocket.baseY.stage1;
    const fScale = s.sep2 > 0.02 ? 0.65 : s.sep1 > 0.02 ? 0.75 : 1;
    flameHolder.position.y = baseY;
    flameHolder.scale.setScalar(fScale);

    // бегущая строка услуг на поясе и свечение сопла рабочей ступени
    rocket.band.offset.x = (rocket.band.offset.x + dt * 0.022) % 1;
    const activeNozzle = s.sep2 > 0.02 ? rocket.nozzles.stage3 : s.sep1 > 0.02 ? rocket.nozzles.stage2 : rocket.nozzles.stage1;
    (Object.values(rocket.nozzles) as THREE.Mesh[]).forEach((n) => {
      const m = n.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = n === activeNozzle ? thrust * 1.1 : 0;
    });
    flame.uniforms.uTime.value = time;
    flame.uniforms.uThrust.value = thrust;
    flame.uniforms.uOpacity.value = s.opacity;
    flame.group.visible = thrust > 0.01;
    glow.material.opacity = Math.min(1, thrust * 0.9 + fx.flash * 0.6) * s.opacity;
    glow.sprite.scale.setScalar(1.6 + thrust * 1.8);
    flameLight.intensity = (thrust * 26 + fx.flash * 30) * (s.h * k / ROCKET_HEIGHT);

    // стол, пар, орбиты, звёзды, планета
    ground.position.y = -ROCKET_HEIGHT / 2 - s.pad * s.pad * 9;
    ground.visible = s.pad < 0.98;
    steam.update(dt, s.steam * (1 - s.pad), fx.burst);
    orbits.group.rotation.y += dt * 0.12;
    orbits.setOpacity(s.orbits * s.opacity);
    stars.uniforms.uTime.value = time;
    stars.uniforms.uFlow.value += dt * s.stars * 6;
    planet.setOpacity(s.planet);
    if (s.planet > 0.01) {
      planet.group.position.set((s.planetX - W / 2) * k, -(s.planetY - H / 2) * k, -2);
      planet.group.scale.setScalar(s.planetR * k);
      planet.group.rotation.y += dt * 0.08;
    }

    PARTS.forEach((p) => {
      const m = rocket.highlights[p];
      const v = hl[p] * s.opacity;
      m.visible = v > 0.01;
      (m.material as THREE.MeshBasicMaterial).opacity = v * (0.75 + 0.25 * Math.sin(time * 5));
      m.rotation.z = time * 0.6;
    });

    applyOpacity(s.opacity);
    rig.visible = s.opacity > 0.01;
    renderer.render(scene, camera);
  };

  gsap.ticker.add(frame);
  const renderOnce = () => frame(0, 16);
  renderOnce();
  requestAnimationFrame(() => { canvas.style.opacity = '1'; });

  const dispose = () => {
    gsap.ticker.remove(frame);
    warmTl?.kill();
    removeEventListener('resize', resize);
    removeEventListener('pointermove', onPointer);
    rocket.dispose(); flame.dispose(); glow.dispose(); steam.dispose(); orbits.dispose(); pad.dispose(); planet.dispose(); stars.dispose();
    allMats.forEach((m) => m.dispose());
    softTex.dispose(); env.dispose(); pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };

  return { state, warmup, highlight, setPointerTilt, renderOnce, view: () => ({ w: W, h: H }), canvas, dispose };
}
