// Пламя двигателя: два конуса с шейдером шума (оранжевый → белый в центре), аддитивное смешивание.
import * as THREE from 'three';

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uThrust;
  varying float vT;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // uv.y: 0 у сопла (основание конуса), 1 на хвосте (вершина)
    float t = uv.y;
    vT = t;
    float len = mix(0.25, 1.0, uThrust);
    p.y *= len;
    float wob = sin(uTime * 38.0 + t * 9.0) * 0.035 + sin(uTime * 23.0 + t * 15.0 + p.x * 4.0) * 0.025;
    p.x += wob * t * uThrust;
    p.z += wob * 0.7 * t * uThrust;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform float uTime;
  uniform float uThrust;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform float uCore;
  uniform float uOpacity;
  varying float vT;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    float n = noise(vec2(vUv.x * 8.0, vT * 6.0 - uTime * 9.0));
    float n2 = noise(vec2(vUv.x * 16.0 + 3.0, vT * 12.0 - uTime * 14.0));
    float tail = smoothstep(1.0, 0.15, vT + (n - 0.5) * 0.35);
    float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
    vec3 col = mix(uColA, uColB, smoothstep(0.55, 0.0, vT) * uCore);
    float a = tail * (0.55 + 0.45 * n2) * uThrust;
    gl_FragColor = vec4(col, a * mix(0.85, 1.0, edge) * uOpacity);
  }
`;

export function createFlame() {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uThrust: { value: 0 },
    uOpacity: { value: 1 },
  };
  const make = (radius: number, height: number, colA: number, colB: number, core: number) => {
    const g = new THREE.ConeGeometry(radius, height, 28, 12, true);
    g.rotateX(Math.PI); // вершина вниз
    g.translate(0, -height / 2, 0); // основание (сопло) на y=0, хвост на y=-height
    const m = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uColA: { value: new THREE.Color(colA) }, uColB: { value: new THREE.Color(colB) }, uCore: { value: core } },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    // общие uniform-объекты: время и тяга одни на оба конуса
    m.uniforms.uTime = uniforms.uTime;
    m.uniforms.uThrust = uniforms.uThrust;
    m.uniforms.uOpacity = uniforms.uOpacity;
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    return mesh;
  };
  // ConeGeometry после поворота: основание у y=0 (сопло), вершина на y=-height
  const outer = make(0.32, 2.2, 0xff6b2c, 0xffb38f, 0.7);
  const inner = make(0.16, 1.3, 0xffb38f, 0xffffff, 1.0);
  group.add(outer, inner);
  return {
    group,
    uniforms,
    dispose: () => [outer, inner].forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }),
  };
}
