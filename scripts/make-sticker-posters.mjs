// Первый кадр анимированных WebP Noto → статичный 192 px (для reduced motion и без JS).
// node scripts/make-sticker-posters.mjs <папка-с-512.webp>
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2];
for (const f of readdirSync(src).filter((x) => x.endsWith('.webp'))) {
  const out = `public/stickers/${f.replace('.webp', '-192.webp')}`;
  const meta = await sharp(join(src, f)).metadata();
  let page = 0;
  // если первый кадр пустой (объект «въезжает»), берём кадр на 40 % анимации
  const first = await sharp(join(src, f), { page: 0 }).resize(192, 192).webp().toBuffer();
  if (first.length < 2000) page = Math.floor((meta.pages ?? 1) * 0.4);
  const info = await sharp(join(src, f), { page }).resize(192, 192).webp({ quality: 80, alphaQuality: 90 }).toFile(out);
  console.log(out, info.size);
}
