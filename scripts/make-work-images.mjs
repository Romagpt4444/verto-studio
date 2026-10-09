// Готовит превью работ 16:10 в WebP 640 и 1280: public/works/<id>-<w>.webp
// Запуск: node scripts/make-work-images.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const A = 'public/assets/';
const src = {
  weshalka: [A + 'the-weshalka/hero.webp', 'north'],
  'master-tyres': [A + 'master-tires/hero.png', 'centre'],
  'lead-agent': ['scripts/src-art/lead-agent-cover.svg', 'centre'],
  'lead-desk': [A + 'lead-desk/og-card.png', 'centre'],
  otklik: [A + 'portfolio/otklik-preview.svg', 'centre'],
  morrow: [A + 'portfolio/morrow-preview-v2.jpg', 'centre'],
  apex: [A + 'portfolio/apex-preview-v2.jpg', 'centre'],
  forma: [A + 'portfolio/forma-preview-v2.jpg', 'centre'],
  auren: [A + 'portfolio/auren-dental-preview-v2.jpg', 'centre'],
  nord: [A + 'portfolio/nord-cabin-preview.jpg', 'centre'],
  noir: [A + 'portfolio/noir-golf-preview.jpg', 'centre'],
};
mkdirSync('public/works', { recursive: true });
for (const [id, [file, position]] of Object.entries(src)) {
  for (const w of [640, 1280]) {
    const info = await sharp(file, { density: 144 })
      .resize({ width: w, height: Math.round((w * 10) / 16), fit: 'cover', position })
      .webp({ quality: w === 640 ? 70 : 72, effort: 6 })
      .toFile(`public/works/${id}-${w}.webp`);
    console.log(id, w, info.size);
  }
}
