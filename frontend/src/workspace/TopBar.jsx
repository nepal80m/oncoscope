/* ============================================================
   Oncoscope — Workspace top bar (ported from workspace-panels.jsx)
   ============================================================ */
import { Icons } from '../components/Icons.jsx';
import { Disclaimer, LogoMark } from '../components/brand.jsx';
import { SLIDE } from '../data/mock.js';

function ToolBtn({ icon, label, onClick, active }) {
  const I = Icons[icon];
  return (
    <button onClick={onClick} title={label} className={'btn-ghost' + (active ? ' active' : '')}
      style={{ width: 38, height: 38, padding: 0, justifyContent: 'center', flex: 'none' }}>
      <I size={17} />
    </button>
  );
}

export default function TopBar({ running, analyzed, onRun, onReanalyze, onReport, onNarrate, onAsk, qaOpen, onUpload, slideName }) {
  return (
    <div style={{ height: 56, flex: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px',
      background: 'var(--surface-1)', borderBottom: '1px solid var(--hairline)', zIndex: 30, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
        <LogoMark />
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text-hi)' }}>Oncoscope</span>
      </div>
      <div style={{ width: 1, height: 26, background: 'var(--hairline)', flex: 'none' }} />
      <button onClick={onUpload} title="Upload a different slide" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 11px', borderRadius: 7, flex: 'none',
        border: '1px solid var(--hairline-2)', background: 'var(--surface-1)' }}>
        <span style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg,#caa1bd,#8a5f88)', flex: 'none' }} />
        <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-hi)', fontWeight: 600, whiteSpace: 'nowrap' }}>{slideName || SLIDE.caseId}</div>
        <Icons.chevD size={13} style={{ color: 'var(--text-lo)' }} />
      </button>
      <button onClick={onUpload} className="btn-ghost" style={{ flex: 'none', padding: '8px 11px' }} title="Upload a new whole-slide image">
        <Icons.upload size={15} /> Upload
      </button>

      <div style={{ flex: 1, minWidth: 12 }} />

      <Disclaimer compact />
      <div style={{ width: 1, height: 26, background: 'var(--hairline)', flex: 'none' }} />

      {analyzed ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
          <ToolBtn icon="refresh" label="Re-run analysis" onClick={onReanalyze} />
          <ToolBtn icon="chat" label="Ask the assistant" onClick={onAsk} active={qaOpen} />
          <ToolBtn icon="speaker" label="Narrate findings" onClick={onNarrate} />
          <button className="btn-primary" onClick={onReport} style={{ flex: 'none' }}><Icons.report size={15} /> Report</button>
        </div>
      ) : (
        <button className="btn-primary" onClick={onRun} disabled={running}
          style={{ flex: 'none', background: running ? 'var(--surface-3)' : 'var(--accent)', color: running ? 'var(--text-mid)' : '#fff' }}>
          {running ? <><Icons.bolt size={15} className="spin" /> Analyzing…</> : <><Icons.play size={14} /> Run analysis</>}
        </button>
      )}
    </div>
  );
}
