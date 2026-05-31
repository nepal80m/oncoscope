/* ============================================================
   Oncoscope — evidence patch thumbnail (ported from slide.jsx).
   Renders a crop of the procedural tissue with an optional Grad-CAM
   wash. In M4 this is replaced by backend-provided patch crops.
   ============================================================ */
import { useEffect, useRef } from 'react';
import { getTissueCanvas, tumorRGB } from '../lib/tissue.js';
import { SLIDE_W, SLIDE_H } from '../data/mock.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function PatchThumb({ patch, size = 96, gradcam, cropPx = 230 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = 2;
    c.width = size * dpr;
    c.height = size * dpr;
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    const t = getTissueCanvas();
    const sx = clamp(patch.cx - cropPx / 2, 0, SLIDE_W - cropPx);
    const sy = clamp(patch.cy - cropPx / 2, 0, SLIDE_H - cropPx);
    x.drawImage(t, sx, sy, cropPx, cropPx, 0, 0, size, size);
    if (gradcam) {
      const rgb = tumorRGB(patch.conf);
      const g = x.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size * 0.62);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
      g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.26)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, size, size);
    }
  }, [patch, size, gradcam, cropPx]);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block', borderRadius: 5 }} />;
}
