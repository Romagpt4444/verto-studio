// ТЗ 10.2: нет `transition: all`, `scale(0)` на входе, `ease-in` на интерфейсе,
// анимаций width/height/top/left/margin/padding. Проверяет src/ и public/404.html.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => {
  const p = join(d, f);
  if (statSync(p).isDirectory()) walk(p);
  else if (/\.(css|ts|astro)$/.test(f)) files.push(p);
});
walk('src');
files.push('public/404.html');

const rules = [
  ['transition: all', /transition(?:-property)?\s*:\s*all\b/],
  ['scale(0)', /scale\(\s*0\s*\)|scale:\s*0[\s,;}]/],
  ['ease-in на интерфейсе', /(?:transition|animation)[^;{}]*\bease-in\b(?!-out)/],
  ['transition по размеру/позиции', /transition(?:-property)?\s*:[^;{}]*\b(?:width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*)\b\s+\d/],
  ['GSAP-анимация размера/позиции', /gsap\.(?:to|from|fromTo)\([^)]*\{[^}]*\b(?:width|height|top|left|marginTop|paddingTop)\s*:/],
];
const keyframeLayout = /@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g;

let bad = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const [name, re] of rules) {
    const lines = src.split('\n');
    lines.forEach((line, i) => { if (re.test(line)) { console.error(`${f}:${i + 1} ${name}: ${line.trim()}`); bad++; } });
  }
  for (const kf of src.match(keyframeLayout) ?? []) {
    if (/\{[^}]*\b(?:width|height|top|left|margin|padding)\s*:/.test(kf.slice(kf.indexOf('{') + 1))) {
      console.error(`${f}: @keyframes анимирует размер/позицию: ${kf.slice(0, 60)}`);
      bad++;
    }
  }
}
// контрольный пример: проверка действительно ловит нарушение
if (!rules[0][1].test('transition: all 200ms') || !rules[1][1].test('transform: scale(0)')) {
  console.error('правила не срабатывают на контрольном примере');
  process.exit(2);
}
if (bad) { console.error(`MOTION_RULES_FAIL (${bad})`); process.exit(1); }
console.log(`MOTION_RULES_OK (${files.length} файлов)`);
