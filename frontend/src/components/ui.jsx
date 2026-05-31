/* ============================================================
   Oncoscope — shared UI primitives (ported from ui.jsx)
   ============================================================ */
import { useRef } from 'react';

export function Toggle({ on, onChange, size = 'md' }) {
  const w = size === 'sm' ? 30 : 38, h = size === 'sm' ? 17 : 21, k = h - 4;
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ width: w, height: h, borderRadius: h, padding: 2, flex: 'none',
        background: on ? 'var(--accent)' : 'var(--surface-3)', border: '1px solid ' + (on ? 'var(--accent-lo)' : 'var(--hairline-2)'),
        transition: 'background .18s', position: 'relative' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? w - k - 3 : 2, width: k, height: k, borderRadius: '50%',
        background: on ? '#ffffff' : 'var(--text-lo)', transition: 'left .18s cubic-bezier(.3,.8,.3,1)' }} />
    </button>
  );
}

export function Slider({ value, min = 0, max = 1, step = 0.01, onChange, disabled, fmt = (v) => v, tint = 'var(--accent)' }) {
  const trackRef = useRef(null);
  const pct = ((value - min) / (max - min)) * 100;
  const set = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    let f = (clientX - r.left) / r.width; f = Math.max(0, Math.min(1, f));
    let v = min + f * (max - min);
    v = Math.round(v / step) * step;
    onChange(Math.max(min, Math.min(max, +v.toFixed(4))));
  };
  const down = (e) => {
    if (disabled) return;
    set(e.clientX);
    const mv = (ev) => set(ev.clientX);
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: disabled ? 0.4 : 1 }}>
      <div ref={trackRef} onMouseDown={down}
        style={{ flex: 1, height: 22, display: 'flex', alignItems: 'center', cursor: disabled ? 'default' : 'pointer' }}>
        <div style={{ position: 'relative', width: '100%', height: 4, borderRadius: 4, background: 'var(--surface-3)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: pct + '%', background: tint, borderRadius: 4 }} />
          <div style={{ position: 'absolute', left: `calc(${pct}% - 7px)`, top: -5, width: 14, height: 14, borderRadius: '50%',
            background: '#fff', border: '2px solid ' + tint, boxShadow: '0 1px 4px rgba(28,30,25,.25)' }} />
        </div>
      </div>
      <span className="mono" style={{ fontSize: 12, color: 'var(--text-hi)', minWidth: 38, textAlign: 'right', fontWeight: 600 }}>{fmt(value)}</span>
    </div>
  );
}

// confidence meter with amber→red gradient
export function ConfBar({ value, h = 6, showViolet }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ position: 'relative', width: '100%', height: h, borderRadius: h, background: 'var(--surface-3)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, width: pct + '%',
        background: showViolet ? 'var(--uncertain)' : 'linear-gradient(90deg, var(--tumor-lo), var(--tumor-mid) 55%, var(--tumor-hi))',
        borderRadius: h }} />
    </div>
  );
}

export function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span className="mono" style={{ fontSize: 10.5, letterSpacing: '.10em', color: 'var(--text-lo)', textTransform: 'uppercase' }}>{children}</span>
      {right}
    </div>
  );
}
