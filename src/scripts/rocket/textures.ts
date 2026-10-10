// Процедурные canvas-текстуры: панели обшивки, надпись VERTO-1, логотип V, мягкие частицы.
import * as THREE from 'three';

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
};

const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
};

/** Светлый матовый металл со швами панелей и редкими заклёпками. rows — горизонтальных швов на секцию. */
export function panelTexture(rows: number, seed = 1) {
  const [c, g] = canvas(1024, 512);
  const grad = g.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#d3d9e3');
  grad.addColorStop(0.5, '#dde2ea');
  grad.addColorStop(1, '#d3d9e3');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  let s = seed * 9301;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // лёгкая неоднородность панелей
  const cols = 8;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '40,52,80'},${0.025 + rnd() * 0.035})`;
      g.fillRect((i * 1024) / cols, (j * 512) / rows, 1024 / cols, 512 / rows);
    }
  }
  g.strokeStyle = 'rgba(42,54,84,0.55)';
  g.lineWidth = 2;
  for (let i = 0; i <= cols; i++) {
    const x = (i * 1024) / cols;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = (j * 512) / rows;
    g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke();
  }
  g.fillStyle = 'rgba(42,54,84,0.45)';
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j <= rows; j++) {
      const y = Math.min(508, Math.max(4, (j * 512) / rows));
      for (let k = 1; k < 6; k++) g.fillRect((i * 1024) / cols + (k * 1024) / cols / 6, y - 1, 2, 2);
    }
  }
  return tex(c);
}

/** Вертикальная надпись на борту (читается снизу вверх) на прозрачном фоне; шрифт подгоняется по длине. */
export function nameTexture(text: string, opts: { stripe?: boolean; color?: string } = {}) {
  const [c, g] = canvas(256, 1024);
  g.clearRect(0, 0, 256, 1024);
  let size = 168;
  g.font = `800 ${size}px Unbounded, "Golos Text", sans-serif`;
  const w = g.measureText(text).width;
  if (w > 960) size = Math.floor((size * 960) / w);
  g.save();
  g.translate(118, 512);
  g.rotate(-Math.PI / 2);
  g.fillStyle = opts.color ?? '#121A2B';
  g.font = `800 ${size}px Unbounded, "Golos Text", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 6);
  g.restore();
  if (opts.stripe !== false) {
    // оранжевая полоса рядом с надписью
    g.fillStyle = '#FF6B2C';
    g.fillRect(212, 96, 16, 832);
  }
  return tex(c);
}

/**
 * Пояс с бегущей строкой услуг вокруг корпуса. Вся строка — в текстуре шириной 4096,
 * за один оборот видно ~perRev символов; сдвиг offset.x анимируется в сцене.
 */
export function bandTexture(items: string[], perRev = 26) {
  // высота подобрана под пояс 0.24 при ~26 символах на оборот (знаки занимают ~половину высоты)
  const H = 88;
  const [m, mg] = canvas(16, 16);
  void m;
  const sep = '  ●  ';
  const line = items.join(sep) + sep;
  let size = 64;
  mg.font = `800 ${size}px Unbounded, "Golos Text", sans-serif`;
  const W = 4096;
  const width = mg.measureText(line).width;
  size = Math.max(28, Math.floor(size * (W / width)));
  const [c, g] = canvas(W, H);
  g.fillStyle = '#0A0F1C';
  g.fillRect(0, 0, W, H);
  // тонкие светлые кромки пояса
  g.fillStyle = 'rgba(238, 241, 246, 0.22)';
  g.fillRect(0, 5, W, 2);
  g.fillRect(0, H - 7, W, 2);
  g.font = `800 ${size}px Unbounded, "Golos Text", sans-serif`;
  g.textBaseline = 'middle';
  // растягиваем строку ровно на ширину текстуры, чтобы шов не был виден
  const real = g.measureText(line).width;
  g.save();
  g.scale(W / real, 1);
  let x = 0;
  for (const part of line.split(/(●)/)) {
    g.fillStyle = part === '●' ? '#FF6B2C' : '#EEF1F6';
    g.fillText(part, x, H / 2 + 3);
    x += g.measureText(part).width;
  }
  g.restore();
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = Math.min(1, perRev / [...line].length);
  return t;
}

/** Иллюминатор: тёмное стекло, блик и оранжевая V. */
export function windowTexture() {
  const [c, g] = canvas(256, 256);
  const bg = g.createRadialGradient(100, 90, 10, 128, 128, 128);
  bg.addColorStop(0, '#2A3654');
  bg.addColorStop(0.55, '#0A0F1C');
  bg.addColorStop(1, '#05070D');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#FF6B2C';
  g.lineWidth = 22;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(78, 82); g.lineTo(128, 182); g.lineTo(178, 82);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(92, 70, 34, 16, -0.6, 0, Math.PI * 2); g.fill();
  return tex(c);
}

/** Мягкое круглое пятно для пара и свечения. */
export function softTexture() {
  const [c, g] = canvas(128, 128);
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return tex(c, false);
}
