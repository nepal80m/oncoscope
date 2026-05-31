/* ============================================================
   Oncoscope — procedural H&E tissue + confidence heatmap + color
   helpers (ported from the design handoff: tissue.jsx + the color
   helpers from slide.jsx).

   Used for the landing hero visual and the evidence-patch thumbnails
   in the demo. The Workspace's central viewer is the real OSD slide;
   in M4 the patch thumbnails switch to backend-provided crops.
   ============================================================ */
import { SLIDE_W, SLIDE_H, makeRng } from '../data/mock.js';

const CX = 1250, CY = 752, RX = 1060, RY = 648, B = 200;

// tumor density foci (independent of AI regions; includes a spot the AI under-calls)
const TUMOR_FOCI = [
  { cx: 1685, cy: 545,  rx: 172, ry: 138, conf: 0.97 },
  { cx: 1180, cy: 980,  rx: 104, ry: 92,  conf: 0.91 },
  { cx: 1985, cy: 885,  rx: 96,  ry: 84,  conf: 0.88 },
  { cx: 905,  cy: 790,  rx: 70,  ry: 60,  conf: 0.80 }, // AI under-calls this one
  { cx: 760,  cy: 470,  rx: 70,  ry: 60,  conf: 0.70 },
  { cx: 1520, cy: 1095, rx: 60,  ry: 54,  conf: 0.62 },
];

function boundary() {
  const r = makeRng(7), ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28], a = [];
  for (let i = 0; i < B; i++) {
    const t = (i / B) * Math.PI * 2;
    a.push(1 + 0.10 * Math.sin(t * 2 + ph[0]) + 0.06 * Math.sin(t * 3 + ph[1]) + 0.035 * Math.sin(t * 5 + ph[2]) + 0.02 * Math.sin(t * 8 + ph[3]));
  }
  return a;
}
const BN = boundary();
function edgeR(ang) {
  let f = ((ang + Math.PI) / (Math.PI * 2)) * B;
  const i0 = Math.floor(f) % B, fr = f - Math.floor(f);
  return BN[i0] * (1 - fr) + BN[(i0 + 1) % B] * fr;
}
function inside(x, y) {
  const dx = x - CX, dy = y - CY;
  const nd = Math.sqrt((dx / RX) ** 2 + (dy / RY) ** 2);
  return nd <= edgeR(Math.atan2(dy, dx));
}
function blobPath() {
  const p = new Path2D();
  for (let i = 0; i <= B; i++) {
    const ang = (i / B) * Math.PI * 2 - Math.PI, rr = BN[i % B];
    const x = CX + Math.cos(ang) * RX * rr, y = CY + Math.sin(ang) * RY * rr;
    i ? p.lineTo(x, y) : p.moveTo(x, y);
  }
  p.closePath();
  return p;
}

function generate(ctx) {
  const rng = makeRng(20240517);
  ctx.fillStyle = '#e8e7e2';
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
  const blob = blobPath();

  ctx.save();
  ctx.clip(blob);

  ctx.fillStyle = '#a06f90';
  ctx.fill(blob);

  const tones = ['#9d6f93', '#7f5680', '#b083a0', '#6e4a78', '#8a5f88', '#5f4470'];
  for (let i = 0; i < 90; i++) {
    const x = CX + (rng() * 2 - 1) * RX, y = CY + (rng() * 2 - 1) * RY;
    const rad = 70 + rng() * 240;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = tones[(rng() * tones.length) | 0];
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.32 + rng() * 0.28;
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 900; i++) {
    const x = CX + (rng() * 2 - 1) * RX, y = CY + (rng() * 2 - 1) * RY;
    const rad = 5 + rng() * 20;
    ctx.globalAlpha = 0.05 + rng() * 0.09;
    ctx.fillStyle = rng() > 0.5 ? '#e09bb0' : '#d98fae';
    ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.5 + rng()), rng() * 3, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.lineCap = 'round';
  for (let s = 0; s < 6; s++) {
    const a0 = rng() * 6.28, span = 0.5 + rng() * 0.8, rr = 0.80 + rng() * 0.14;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.05) {
      const ang = a0 + span * t;
      const x = CX + Math.cos(ang) * RX * rr, y = CY + Math.sin(ang) * RY * rr;
      t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.globalAlpha = 0.18; ctx.strokeStyle = '#edcdd9';
    ctx.lineWidth = 13 + rng() * 16; ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tumors = TUMOR_FOCI;
  const norm = ['#4a2960', '#3d2253', '#5a3575', '#45285f', '#523070', '#36204e'];
  const tum = ['#321a48', '#3c1f55', '#4e2a6a', '#281640', '#2c1a44'];
  const N = 64000;
  for (let k = 0; k < N; k++) {
    const x = CX + (rng() * 2 - 1) * RX * 1.02, y = CY + (rng() * 2 - 1) * RY * 1.02;
    if (!inside(x, y)) continue;
    let boost = 0;
    for (const t of tumors) {
      const s = Math.max(t.rx, t.ry) * 1.15;
      const d2 = ((x - t.cx) ** 2 + (y - t.cy) ** 2) / (s * s);
      boost += Math.exp(-d2 * 0.9) * (t.conf > 0.85 ? 1.15 : 0.85);
    }
    const p = 0.78 + boost * 0.6;
    if (rng() > Math.min(0.995, p)) continue;
    const tumorish = boost > 0.22;
    const rad = tumorish ? 1.8 + rng() * 2.5 : 1.15 + rng() * 1.7;
    const pal = tumorish ? tum : norm;
    ctx.globalAlpha = 0.62 + rng() * 0.36;
    ctx.fillStyle = pal[(rng() * pal.length) | 0];
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.62 + rng() * 0.55), rng() * 3.14, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(120,72,98,0.55)'; ctx.lineWidth = 9; ctx.stroke(blob);
  ctx.strokeStyle = 'rgba(60,30,46,0.35)'; ctx.lineWidth = 3; ctx.stroke(blob);
  ctx.restore();
}

let cache = null;
export function getTissueCanvas() {
  if (cache) return cache;
  const c = document.createElement('canvas');
  c.width = SLIDE_W; c.height = SLIDE_H;
  generate(c.getContext('2d'));
  cache = c;
  return c;
}

// confidence → RGB (amber → orange → red)
export function tumorRGB(c) {
  const t = Math.max(0, Math.min(1, (c - 0.5) / 0.5));
  const stops = [[224, 146, 15], [223, 102, 31], [210, 59, 64]];
  const seg = t < 0.5 ? 0 : 1, lt = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const a = stops[seg], b = stops[seg + 1];
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * lt));
}

export const rgbStr = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;

// outline colour by classification (review state handled separately)
export function clsColor(r) {
  if (r.cls === 'uncertain') return 'var(--uncertain)';
  if (r.cls === 'benign') return '#7a828a';
  return rgbStr(tumorRGB(r.conf != null ? r.conf : 0.92));
}

const VIOLET = [106, 90, 224], CONFIRM = [31, 157, 92];
export const HEAT_COLORS = { VIOLET, CONFIRM };

function radial(ctx, r, rgb, a, scale = 1.5) {
  const R = Math.max(r.rx, r.ry) * scale;
  const g = ctx.createRadialGradient(r.cx, r.cy, 2, r.cx, r.cy, R);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.5})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(r.cx, r.cy, r.rx * scale, r.ry * scale, 0, 0, 6.283);
  ctx.fill();
}

// heatmap reflects the live (reviewed) region list
export function drawHeatmap(ctx, regions, threshold) {
  ctx.clearRect(0, 0, SLIDE_W, SLIDE_H);
  for (const r of regions) {
    if (r.review === 'dismissed') continue;
    if (r.cls === 'benign') continue;
    if (r.source === 'ai' && r.conf < threshold) continue;
    const rgb = r.cls === 'uncertain' ? VIOLET : tumorRGB(r.conf != null ? r.conf : 0.92);
    radial(ctx, r, rgb, 0.5);
  }
}
