// Шрифты, которые не нужны для первой отрисовки: подключаем после неё через FontFace API
// (меньше запросов на критическом пути). Без JS вместо них — системные запасные шрифты.
const FACES: Array<[family: string, weight: string, url: string, range: string]> = [
  ['Unbounded', '600', '/fonts/unbounded-latin-600-normal.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['Unbounded', '600', '/fonts/unbounded-cyrillic-600-normal.woff2', 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'],
  ['JetBrains Mono', '500', '/fonts/jetbrains-mono-latin-500-normal.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['JetBrains Mono', '500', '/fonts/jetbrains-mono-cyrillic-500-normal.woff2', 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'],
];

export function loadDeferredFonts() {
  if (!('FontFace' in window)) return;
  const run = () => FACES.forEach(([family, weight, url, unicodeRange]) => {
    const face = new FontFace(family, `url(${url}) format('woff2')`, { weight, unicodeRange, display: 'swap' });
    document.fonts.add(face);
    face.load().catch(() => undefined);
  });
  if (document.readyState === 'complete') requestAnimationFrame(run);
  else addEventListener('load', () => requestAnimationFrame(run), { once: true });
}
