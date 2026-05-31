/* ============================================================
   Oncoscope — Pathology Q&A assistant panel (ported from qa.jsx).
   Used both docked beside the workspace and as the full QA screen.
   (Canned exchanges in the demo; a POST /qa seam comes later.)
   ============================================================ */
import { useState, useRef, Fragment } from 'react';
import { Icons } from './Icons.jsx';
import Waveform from './Waveform.jsx';
import { REGIONS, PATCHES, QA } from '../data/mock.js';
import { useApp } from '../state/AppState.jsx';

function CiteChip({ id, onCite }) {
  const r = REGIONS.find((x) => x.id === id) || PATCHES.find((p) => p.id === id);
  const col = !r ? 'var(--text-mid)' : r.cls === 'uncertain' ? 'var(--uncertain)' : id[0] === 'P' ? 'var(--accent)' : 'var(--tumor-hi)';
  return (
    <button onClick={() => onCite && onCite((r && r.region) || id)} className="mono"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600,
        border: `1px solid ${col}`, color: col, background: 'transparent', margin: '0 2px', verticalAlign: 'middle' }}>
      <Icons.pin size={11} /> {id}
    </button>
  );
}

function Bubble({ role, children, cites, onCite }) {
  const user = role === 'user';
  return (
    <div className="fade-up" style={{ display: 'flex', gap: 10, flexDirection: user ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      {!user && <span style={{ width: 28, height: 28, borderRadius: 7, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-lo)', color: 'var(--accent-hi)' }}><Icons.sparkle size={15} /></span>}
      <div style={{ maxWidth: '82%' }}>
        <div style={{ padding: '10px 13px', borderRadius: 12, fontSize: 13, lineHeight: 1.55,
          background: user ? 'var(--accent)' : 'var(--surface-2)', color: user ? '#fff' : 'var(--text)',
          border: user ? 'none' : '1px solid var(--hairline)', borderTopRightRadius: user ? 3 : 12, borderTopLeftRadius: user ? 12 : 3, fontWeight: user ? 600 : 400 }}>
          {children}
        </div>
        {cites && cites.length > 0 && (
          <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-lo)', marginRight: 2 }}>Evidence:</span>
            {cites.map((c) => <CiteChip key={c} id={c} onCite={onCite} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QAPanel({ onClose, onCite, dock, slideName }) {
  const { slideId } = useApp();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const name = slideName || slideId;

  return (
    <div className="scroll-dark" style={{ width: dock ? 372 : '100%', flex: 'none', height: '100%', background: 'var(--surface-1)',
      borderLeft: dock ? '1px solid var(--hairline)' : 'none', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', padding: '13px 15px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-lo)', color: 'var(--accent-hi)' }}><Icons.chat size={16} /></span>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-hi)' }}>Pathology assistant</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)' }}>Grounded in {name}</div>
          </div>
        </div>
        {dock && <button onClick={onClose} style={{ color: 'var(--text-lo)', padding: 5 }}><Icons.close size={17} /></button>}
      </div>

      <div style={{ flex: 'none', padding: '9px 15px', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--warn-soft)', borderBottom: '1px solid var(--hairline)' }}>
        <Icons.alert size={14} style={{ color: 'var(--warn)', flex: 'none' }} />
        <span style={{ fontSize: 11, color: 'var(--warn)', lineHeight: 1.35 }}>Answers reference this slide only and may be incomplete. Not a substitute for pathologist judgement.</span>
      </div>

      <div ref={scrollRef} className="scroll-dark" style={{ flex: 1, overflowY: 'auto', padding: '16px 15px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {QA.map((ex, i) => (
          <Fragment key={i}>
            <Bubble role="user">{ex.q}</Bubble>
            <Bubble role="assistant" cites={ex.cites} onCite={onCite}>{ex.a}</Bubble>
          </Fragment>
        ))}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
          {['Summarize the slide', 'What stains would you order?', 'Compare R3 to R1'].map((s) => (
            <button key={s} onClick={() => setText(s)} style={{ fontSize: 11.5, padding: '6px 11px', borderRadius: 100, border: '1px solid var(--hairline-2)', background: 'var(--surface-2)', color: 'var(--text-mid)' }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 'none', padding: 13, borderTop: '1px solid var(--hairline)' }}>
        {listening && (
          <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 13px', marginBottom: 10, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent-lo)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--tumor-hi)', animation: 'pulse-ring 1.4s infinite' }} />
            <Waveform active />
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent-hi)', marginLeft: 'auto' }}>listening…</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 6px 6px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--hairline-2)' }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about this slide…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-hi)', fontSize: 13 }} />
          <button onClick={() => setListening(!listening)} title="Voice input"
            style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none',
              background: listening ? 'var(--tumor-hi)' : 'var(--surface-3)', color: listening ? '#fff' : 'var(--text-mid)', border: '1px solid var(--hairline-2)' }}>
            <Icons.mic size={16} />
          </button>
          <button style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none', background: 'var(--accent)', color: '#fff' }}>
            <Icons.arrowR size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
