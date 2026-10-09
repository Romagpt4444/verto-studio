// Звёзды: Points с мерцанием в шейдере; uFlow сдвигает их вниз («текут» при тяге).
import * as THREE from 'three';

export function createStars(count: number) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * 44;
    pos[i * 3 + 1] = (rnd() - 0.5) * 30;
    pos[i * 3 + 2] = -6 - rnd() * 30;
    seed[i] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uniforms = { uTime: { value: 0 }, uFlow: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uFlow; uniform float uPx;
      attribute float aSeed; varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uFlow * (0.6 + aSeed) + 15.0, 30.0) - 15.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 2.2) + aSeed * 40.0);
        vA = (0.2 + 0.4 * aSeed) * tw;
        gl_PointSize = (1.0 + aSeed * 1.8) * uPx * (22.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        gl_FragColor = vec4(0.933, 0.945, 0.965, vA * uOpacity * smoothstep(0.5, 0.1, d));
      }`,
  });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return { points, uniforms, dispose: () => { g.dispose(); m.dispose(); } };
}
