// 1) Наборы ключей src/i18n/ru.json и en.json совпадают.
// 2) В компонентах нет «зашитых» русских строк вне i18n (комментарии не считаются).
import { readFileSync, readdirSync } from 'node:fs';

const load = (l) => JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8'));
const keys = (v, p = '') =>
  v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => [p + k, ...keys(x, `${p}${k}.`)])
    : [];
const ru = new Set(keys(load('ru')));
const en = new Set(keys(load('en')));
const onlyRu = [...ru].filter((k) => !en.has(k));
const onlyEn = [...en].filter((k) => !ru.has(k));
let bad = false;
if (onlyRu.length || onlyEn.length) {
  console.error('I18N_MISMATCH', { onlyRu, onlyEn });
  bad = true;
}

const dir = new URL('../src/components/', import.meta.url);
for (const f of readdirSync(dir).filter((x) => x.endsWith('.astro'))) {
  const src = readFileSync(new URL(f, dir), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const hits = src.match(/[А-Яа-яЁё][А-Яа-яЁё\s,.!?—-]*/g);
  if (hits) {
    console.error(`HARDCODED_TEXT ${f}:`, hits.slice(0, 3));
    bad = true;
  }
}
if (bad) process.exit(1);
console.log(`I18N_OK (${ru.size} keys, components clean)`);
