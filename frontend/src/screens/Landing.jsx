/* ============================================================
   Oncoscope — Landing page (ported from landing.jsx)
   ============================================================ */
import { useEffect, useRef } from 'react';
import { Icons } from '../components/Icons.jsx';
import { LogoMark, Disclaimer } from '../components/brand.jsx';
import { useApp } from '../state/AppState.jsx';
import { getTissueCanvas, drawHeatmap, tumorRGB, rgbStr } from '../lib/tissue.js';
import { REGIONS, METRIC, SLIDE_W, SLIDE_H } from '../data/mock.js';

function HeroVisual() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const W = 640, H = 460, dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const t = getTissueCanvas();
    const cropX = 1180, cropY = 150, cropW = 1180, cropH = (cropW * H) / W;
    x.drawImage(t, cropX, cropY, cropW, cropH, 0, 0, W, H);
    const hc = document.createElement('canvas'); hc.width = SLIDE_W; hc.height = SLIDE_H;
    drawHeatmap(hc.getContext('2d'), REGIONS, 0.5);
    x.globalAlpha = 0.9;
    x.drawImage(hc, cropX, cropY, cropW, cropH, 0, 0, W, H);
    x.globalAlpha = 1;
    const g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(228,227,222,0.5)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }, []);

  const marks = [
    { x: 44, y: 44, conf: 97 },
    { x: 70, y: 70, conf: 88 },
  ];
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)', aspectRatio: '640/460' }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', animation: 'heroScan 3.4s ease-in-out infinite' }} />
      {marks.map((m, i) => (
        <div key={i} style={{ position: 'absolute', left: m.x + '%', top: m.y + '%', width: 60, height: 52, transform: 'translate(-50%,-50%)', border: '1.5px solid ' + rgbStr(tumorRGB(m.conf / 100)), borderRadius: 5 }}>
          <span className="mono" style={{ position: 'absolute', top: -19, left: -1, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: rgbStr(tumorRGB(m.conf / 100)), color: '#fff' }}>{m.conf}%</span>
        </div>
      ))}
      <div className="mono" style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, color: 'var(--ink)', fontWeight: 600 }}>
        <span style={{ width: 46, height: 3, background: 'var(--ink)', borderRadius: 1 }} /> 200 µm
      </div>
      <div className="mono" style={{ position: 'absolute', right: 12, bottom: 12, fontSize: 10.5, color: 'var(--text-hi)', fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.9)', border: '1px solid var(--hairline-2)' }}>40×</div>
    </div>
  );
}

export default function Landing() {
  const app = useApp();
  return (
    <div className="scroll-dark" style={{ height: '100%', overflowY: 'auto', background: 'radial-gradient(120% 90% at 82% -10%, #e7f2f0 0%, var(--bg-canvas) 52%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 30px', position: 'relative', zIndex: 5 }}>
        <LogoMark />
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-hi)', letterSpacing: '-.01em' }}>Oncoscope</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--hairline)', marginLeft: 2, whiteSpace: 'nowrap' }}>v0.4 · research</span>
        <div style={{ flex: 1 }} />
        <Disclaimer />
        <button className="btn-primary" onClick={() => app.go('upload')}>Upload a slide <Icons.arrowR size={15} /></button>
      </div>

      <div style={{ width: 'min(1140px, 92%)', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center', padding: '40px 0 30px', minHeight: 'calc(100% - 200px)' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, border: '1px solid var(--hairline-2)', background: 'var(--surface-1)', marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-hi)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500 }}>AI second reader for lymph-node metastasis</span>
          </div>

          <h1 style={{ fontSize: 46, lineHeight: 1.08, fontWeight: 700, letterSpacing: '-.025em', color: 'var(--text-hi)', margin: '0 0 22px', textWrap: 'balance' }}>
            A two-millimeter metastasis hides on the fortieth slide of the day.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--text-mid)', margin: '0 0 32px', maxWidth: 480 }}>
            Sentinel-node review is slow, repetitive, and unforgiving — a single missed deposit changes a patient's staging. Oncoscope triages every slide, shows you <em style={{ color: 'var(--text)', fontStyle: 'normal', fontWeight: 600 }}>why</em> it flagged each region, and hands you a signable report. You stay the decision-maker.
          </p>

          <div style={{ display: 'flex', alignItems: 'stretch', gap: 22, padding: '20px 24px', borderRadius: 14, background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', marginBottom: 30, maxWidth: 520 }}>
            <div>
              <div className="mono" style={{ fontSize: 44, fontWeight: 700, color: 'var(--accent-hi)', lineHeight: 1, letterSpacing: '-.02em' }}>{(METRIC.value * 100).toFixed(1)}%</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginTop: 7, maxWidth: 180, lineHeight: 1.4 }}>{METRIC.label}</div>
            </div>
            <div style={{ width: 1, background: 'var(--hairline)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 12, color: 'var(--text-lo)', lineHeight: 1.5 }}>
              {METRIC.detail}
              <span style={{ color: 'var(--warn)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.alert size={13} /> Still misses ~{(METRIC.fn * 100).toFixed(1)}% — assistive only, never autonomous.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="btn-primary" style={{ fontSize: 15, padding: '13px 24px' }} onClick={() => app.go('upload')}>
              <Icons.upload size={18} /> Upload a slide <Icons.arrowR size={16} />
            </button>
            <button onClick={() => { app.setAnalyzed(true); app.go('workspace'); }} style={{ fontSize: 13, color: 'var(--accent-ink)', fontWeight: 600, padding: '8px 4px' }}>or explore the demo case →</button>
          </div>
        </div>

        <div>
          <HeroVisual />
          <div style={{ display: 'flex', gap: 18, marginTop: 16, justifyContent: 'center' }}>
            {[['amber → red', 'tumor likelihood', 'linear-gradient(90deg,var(--tumor-lo),var(--tumor-hi))'], ['violet', 'needs review', 'var(--uncertain)'], ['green', 'doctor-confirmed', 'var(--confirm)']].map(([a, b, c]) => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 14, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-mid)' }}><span style={{ color: 'var(--text)', fontWeight: 600 }}>{a}</span> · {b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '10px 0 40px', fontSize: 11.5, color: 'var(--text-lo)', maxWidth: 620, margin: '0 auto', lineHeight: 1.5 }}>
        Oncoscope is a research prototype for demonstration. It is not FDA-cleared, not CE-marked, and must not be used for diagnosis or treatment decisions.
      </div>
    </div>
  );
}
