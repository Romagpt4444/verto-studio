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

/** Надпись «VERTO-1» — читается снизу вверх, на прозрачном фоне. */
export function nameTexture(text: string) {
  const [c, g] = canvas(256, 1024);
  g.clearRect(0, 0, 256, 1024);
  g.save();
  g.translate(128, 512);
  g.rotate(-Math.PI / 2);
  g.fillStyle = '#121A2B';
  g.font = '800 168px Unbounded, "Golos Text", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 6);
  g.restore();
  // оранжевая полоса рядом с надписью
  g.fillStyle = '#FF6B2C';
  g.fillRect(212, 96, 16, 832);
  return tex(c);
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
