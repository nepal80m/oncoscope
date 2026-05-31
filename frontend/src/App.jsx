/* ============================================================
   Oncoscope — app shell: router, screen navigator, narrate bar
   (ported from app.jsx; navigation now via React Router)
   ============================================================ */
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState.jsx';
import { Icons } from './components/Icons.jsx';
import Waveform from './components/Waveform.jsx';
import { REPORT } from './data/mock.js';
import Landing from './screens/Landing.jsx';
import Upload from './screens/Upload.jsx';
import Workspace from './screens/Workspace.jsx';
import Report from './screens/Report.jsx';
import QA from './screens/QA.jsx';
import Patient from './screens/Patient.jsx';

const SCREENS = [
  { id: 'landing', label: 'Landing', icon: 'heart' },
  { id: 'upload', label: 'Upload slide', icon: 'upload' },
  { id: 'workspace', label: 'Analysis workspace', icon: 'layers' },
  { id: 'report', label: 'Pathology report', icon: 'report' },
  { id: 'qa', label: 'Q&A assistant', icon: 'chat' },
  { id: 'patient', label: 'Patient summary', icon: 'user' },
];

function ScreenNav() {
  const { screen, go, signedOff } = useApp();
  const [open, setOpen] = useState(false);
  const cur = SCREENS.find((s) => s.id === screen) || SCREENS[0];
  return (
    <div style={{ position: 'fixed', left: 14, bottom: 14, zIndex: 95 }}>
      {open && (
        <div className="fade-up" style={{ position: 'absolute', bottom: 50, left: 0, width: 248, padding: 7, borderRadius: 12,
          background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)' }}>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.1em', color: 'var(--text-lo)', padding: '5px 8px 7px' }}>PROTOTYPE SCREENS</div>
          {SCREENS.map((s) => {
            const I = Icons[s.icon], active = s.id === screen, locked = s.id === 'patient' && !signedOff;
            return (
              <button key={s.id} onClick={() => { go(s.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 9px', borderRadius: 7, textAlign: 'left',
                  background: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent-ink)' : 'var(--text)', marginBottom: 1 }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-3)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <I size={15} style={{ color: active ? 'var(--accent-ink)' : 'var(--text-lo)' }} />
                <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                {locked && <Icons.lock size={12} style={{ color: 'var(--text-lo)' }} />}
                {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      )}
      <button onClick={() => setOpen(!open)} title={'Prototype screens · ' + cur.label}
        style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', position: 'relative',
          background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-2)', color: 'var(--accent-ink)' }}>
        <Icons.grid size={17} />
        <span style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-canvas)' }} />
      </button>
    </div>
  );
}

function NarrateBar() {
  const { setNarrate } = useApp();
  const [playing, setPlaying] = useState(true);
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!playing) return undefined;
    const iv = setInterval(() => setP((v) => { if (v >= 100) { clearInterval(iv); return 100; } return v + 0.55; }), 60);
    return () => clearInterval(iv);
  }, [playing]);
  return (
    <div className="fade-up" style={{ position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 96, width: 'min(560px, 92%)',
      padding: '13px 16px', borderRadius: 14, background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <button onClick={() => setPlaying(!playing)} style={{ width: 38, height: 38, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--accent)', color: '#fff' }}>
          {playing ? <Icons.minus size={18} /> : <Icons.play size={16} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Waveform active={playing} bars={16} />
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)', marginLeft: 'auto' }}>Narrating impression · AI voice</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: p + '%', background: 'var(--accent)' }} />
          </div>
        </div>
        <button onClick={() => setNarrate(false)} style={{ color: 'var(--text-lo)', padding: 5, flex: 'none' }}><Icons.close size={17} /></button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, marginTop: 10, maxHeight: 42, overflow: 'hidden' }}>
        “{REPORT.impression}”
      </div>
    </div>
  );
}

function Shell() {
  const { narrate } = useApp();
  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/report" element={<Report />} />
        <Route path="/qa" element={<QA />} />
        <Route path="/patient" element={<Patient />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {narrate && <NarrateBar />}
      <ScreenNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Shell />
      </AppProvider>
    </BrowserRouter>
  );
}
