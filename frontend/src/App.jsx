/* ============================================================
   Oncoscope — app shell: router, screen navigator, narrate bar
   (ported from app.jsx; navigation now via React Router)
   ============================================================ */
import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppState.jsx';
import { Icons } from './components/Icons.jsx';
import Waveform from './components/Waveform.jsx';
import { api } from './api/client.js';
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
  // Patient summary is intentionally not listed — reachable only via /patient (URL).
];

function ScreenNav() {
  const { screen, go, signedOff } = useApp();
  const [open, setOpen] = useState(false);
  const cur = SCREENS.find((s) => s.id === screen) || SCREENS[0];
  return (
    <div className="screen-nav no-print" style={{ position: 'fixed', left: 14, bottom: 14, zIndex: 95 }}>
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
  const { setNarrate, slideId } = useApp();
  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading'); setErr(''); setPct(0); setPlaying(false);
    api.slideNarration(slideId)
      .then(({ report, audioUrl }) => {
        if (cancelled) return;
        setText(report?.report_clinician || '');
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.addEventListener('timeupdate', () => { if (audio.duration) setPct((audio.currentTime / audio.duration) * 100); });
        audio.addEventListener('ended', () => { setPlaying(false); setPct(100); });
        setPhase('ready');
        audio.play().then(() => { if (!cancelled) setPlaying(true); }).catch(() => { /* autoplay blocked → user taps play */ });
      })
      .catch((e) => { if (!cancelled) { setPhase('error'); setErr(e.message || 'could not generate narration'); } });
    return () => { cancelled = true; const a = audioRef.current; if (a) { a.pause(); a.src = ''; } audioRef.current = null; };
  }, [slideId]);

  const toggle = () => { const a = audioRef.current; if (!a) return; if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); } };
  const close = () => { const a = audioRef.current; if (a) a.pause(); setNarrate(false); };
  const label = phase === 'loading' ? 'Generating narration…' : phase === 'error' ? 'Narration unavailable' : 'Slide narration · AI voice';

  return (
    <div className="fade-up" style={{ position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 96, width: 'min(560px, 92%)',
      padding: '13px 16px', borderRadius: 14, background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <button onClick={toggle} disabled={phase !== 'ready'} title={playing ? 'Pause' : 'Play'}
          style={{ width: 38, height: 38, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', cursor: phase === 'ready' ? 'pointer' : 'default',
            background: phase === 'ready' ? 'var(--accent)' : 'var(--surface-3)', color: phase === 'ready' ? '#fff' : 'var(--text-lo)' }}>
          {phase === 'loading' ? <Icons.bolt size={16} className="spin" /> : playing ? <Icons.pause size={16} /> : <Icons.play size={16} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Waveform active={playing} bars={16} />
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)', marginLeft: 'auto' }}>{label}</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)', transition: 'width .1s' }} />
          </div>
        </div>
        <button onClick={close} title="Close" style={{ color: 'var(--text-lo)', padding: 5, flex: 'none' }}><Icons.close size={17} /></button>
      </div>
      <div style={{ fontSize: 12.5, color: phase === 'error' ? 'var(--tumor-hi)' : 'var(--text-mid)', lineHeight: 1.5, marginTop: 10, maxHeight: 52, overflow: 'hidden' }}>
        {phase === 'error' ? err : phase === 'loading' ? 'Generating the slide-level narration with Gemini and ElevenLabs…' : (text ? '“' + text + '”' : '')}
      </div>
    </div>
  );
}

function Shell() {
  const { narrate } = useApp();
  return (
    <div className="app-shell" style={{ height: '100%', position: 'relative' }}>
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
