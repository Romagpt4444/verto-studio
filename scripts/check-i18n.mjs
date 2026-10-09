// Сверяет наборы ключей src/i18n/ru.json и en.json. При расхождении — код выхода 1.
import { readFileSync } from 'node:fs';

const load = (l) => JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url), 'utf8'));
const keys = (v, p = '') =>
  v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => [p + k, ...keys(x, `${p}${k}.`)])
    : [];
const ru = new Set(keys(load('ru')));
const en = new Set(keys(load('en')));
const onlyRu = [...ru].filter((k) => !en.has(k));
const onlyEn = [...en].filter((k) => !ru.has(k));
if (onlyRu.length || onlyEn.length) {
  console.error('I18N_MISMATCH', { onlyRu, onlyEn });
  process.exit(1);
}
console.log(`I18N_OK (${ru.size} keys)`);
