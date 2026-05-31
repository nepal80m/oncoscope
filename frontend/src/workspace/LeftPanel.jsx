/* ============================================================
   Oncoscope — Workspace left panel: review + findings.
   M5: a comment thread on AI regions, and an annotation card
   (class + comments + delete) for the pathologist's drawn marks.
   ============================================================ */
import { Icons } from '../components/Icons.jsx';
import { SectionLabel, ConfBar } from '../components/ui.jsx';
import CommentThread from '../components/CommentThread.jsx';
import { SLIDE } from '../data/mock.js';

const CLS_OPTS = [
  { id: 'tumor', label: 'Tumor' },
  { id: 'uncertain', label: 'Uncertain' },
  { id: 'benign', label: 'Benign' },
];
export const clsTint = (cls) => (cls === 'tumor' ? 'var(--tumor-hi)' : cls === 'uncertain' ? 'var(--uncertain)' : '#7a828a');

function StatRow({ k, v, mono = true, tint }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid var(--hairline)', gap: 10 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{k}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 13, fontWeight: 600, color: tint || 'var(--text-hi)', textAlign: 'right' }}>{v}</span>
    </div>
  );
}

function Relabel({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: 3, borderRadius: 8, background: 'var(--surface-3)' }}>
      {CLS_OPTS.map((o) => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{ flex: 1, padding: '6px 4px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
              background: active ? '#fff' : 'transparent', color: active ? clsTint(o.id) : 'var(--text-mid)',
              boxShadow: active ? 'var(--shadow-1)' : 'none' }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function ActiveRegionCard({ r, slideId, onConfirm, onDismiss, onRelabel, onNote, onRemove }) {
  const dismissed = r.review === 'dismissed', confirmed = r.review === 'confirmed';
  const tint = dismissed ? '#9aa0a7' : clsTint(r.cls);
  return (
    <div style={{ borderRadius: 11, background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 13px', borderBottom: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-hi)' }}>{r.id}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>{r.label}</span>
          </span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: tint }}>{Math.round((r.conf || 0.92) * 100)}%</span>
        </div>
        <ConfBar value={r.conf || 0.92} showViolet={r.cls === 'uncertain'} />
        <div style={{ fontSize: 11.5, color: 'var(--text-mid)', marginTop: 9, lineHeight: 1.45 }}>{r.note}</div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)', marginTop: 7 }}>{r.dim} · {r.areaMm2} mm²</div>
      </div>

      <div style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: confirmed ? 'var(--confirm)' : dismissed ? '#9aa0a7' : 'var(--tumor-lo)' }} />
          <span style={{ color: 'var(--text-mid)' }}>{confirmed ? 'Confirmed by you' : dismissed ? 'Dismissed by you' : 'Awaiting your review'}</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onConfirm(r.id)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
              border: '1px solid ' + (confirmed ? 'var(--confirm)' : 'var(--hairline-2)'), background: confirmed ? 'var(--confirm)' : 'var(--surface-1)', color: confirmed ? '#fff' : 'var(--text-hi)' }}>
            <Icons.check size={15} /> Agree
          </button>
          <button onClick={() => onDismiss(r.id)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
              border: '1px solid ' + (dismissed ? '#9aa0a7' : 'var(--hairline-2)'), background: dismissed ? '#7a828a' : 'var(--surface-1)', color: dismissed ? '#fff' : 'var(--text-hi)' }}>
            <Icons.close size={15} /> Disagree
          </button>
        </div>

        <div>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-lo)', marginBottom: 5 }}>LABEL</div>
          <Relabel value={r.cls} onChange={(c) => onRelabel(r.id, c)} />
        </div>

        <textarea defaultValue={r.docNote || ''} onBlur={(e) => onNote(r.id, e.target.value)} placeholder="Add a note…"
          style={{ width: '100%', minHeight: 42, resize: 'vertical', borderRadius: 7, border: '1px solid var(--hairline-2)', background: 'var(--surface-2)', padding: '8px 10px', fontSize: 12, color: 'var(--text-hi)', outline: 'none' }} />

        <div style={{ height: 1, background: 'var(--hairline)' }} />
        <CommentThread slideId={slideId} targetType="region" targetId={r.id} />
      </div>
    </div>
  );
}

export default function LeftPanel(p) {
  const { analyzed, regions, activeRegion, addMode, setAddMode, summary, slideId,
    onNext, onConfirm, onDismiss, onRelabel, onNote } = p;
  const SUM = summary || { call: SLIDE.call, call_label: SLIDE.callLabel, confidence: SLIDE.confidence, tumor_area_pct: SLIDE.tumorAreaPct, largest_deposit_mm: SLIDE.largestMm, category: SLIDE.category };
  const reviewed = regions.filter((r) => r.review !== 'pending');
  const ar = activeRegion ? regions.find((r) => r.id === activeRegion) : null;
  const tumors = regions.filter((r) => r.cls === 'tumor' && r.review !== 'dismissed').length;

  return (
    <div className="scroll-dark" style={{ width: 304, flex: 'none', background: 'var(--surface-1)', borderRight: '1px solid var(--hairline)', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px 16px 14px' }}>
        <SectionLabel right={analyzed ? <span className="mono" style={{ fontSize: 11, color: 'var(--text-mid)' }}>{reviewed.length}/{regions.length} reviewed</span> : null}>Your review</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" disabled={!analyzed} onClick={onNext} style={{ flex: 1, justifyContent: 'center', opacity: analyzed ? 1 : 0.5 }}>
            <Icons.next size={15} /> Next region
          </button>
          <button onClick={() => analyzed && setAddMode(addMode === 'rect' ? null : 'rect')} disabled={!analyzed}
            className={'btn-ghost' + (addMode ? ' active' : '')} style={{ flex: 1, justifyContent: 'center', opacity: analyzed ? 1 : 0.5 }}>
            <Icons.plus size={15} /> Mark region
          </button>
        </div>
        {addMode && <div style={{ fontSize: 11, color: 'var(--accent-ink)', marginTop: 8, lineHeight: 1.4 }}>Drawing enabled — drag a box on the slide (or use the Box/Polygon tools on the image), then classify &amp; comment below.</div>}

        {ar ? (
          <div style={{ marginTop: 12 }}>
            <ActiveRegionCard r={ar} slideId={slideId} onConfirm={onConfirm} onDismiss={onDismiss} onRelabel={onRelabel} onNote={onNote} />
          </div>
        ) : analyzed ? (
          <div style={{ marginTop: 12, padding: '16px 14px', textAlign: 'center', border: '1px dashed var(--hairline-2)', borderRadius: 9, color: 'var(--text-lo)', fontSize: 12, lineHeight: 1.5 }}>
            Select a region on the slide, step through with <strong style={{ color: 'var(--text-mid)' }}>Next region</strong>, or draw your own with <strong style={{ color: 'var(--text-mid)' }}>Mark region</strong>.
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-lo)', lineHeight: 1.5 }}>Run analysis to begin reviewing regions.</div>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--hairline)' }} />

      <div style={{ padding: '14px 16px 24px' }}>
        <SectionLabel>Slide-level findings</SectionLabel>
        {!analyzed ? (
          <div style={{ padding: '22px 14px', textAlign: 'center', border: '1px dashed var(--hairline-2)', borderRadius: 9, color: 'var(--text-lo)' }}>
            <Icons.flask size={22} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>Run analysis to generate a slide-level call and region findings.</div>
          </div>
        ) : (
          <div className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 9, marginBottom: 10, background: '#fdeceb', border: '1px solid #f3cfce' }}>
              <Icons.alert size={18} style={{ color: 'var(--tumor-hi)' }} />
              <div style={{ lineHeight: 1.2 }}>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--tumor-hi)', letterSpacing: '.03em' }}>{SUM.call}</div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)' }}>{SUM.call_label}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>Overall confidence</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-hi)' }}>{Math.round(SUM.confidence * 100)}%</span>
            </div>
            <ConfBar value={SUM.confidence} h={7} />
            <div style={{ marginTop: 12 }}>
              <StatRow k="Tumor area" v={SUM.tumor_area_pct + '%'} />
              <StatRow k="Tumor regions (kept)" v={tumors} />
              <StatRow k="Largest deposit" v={SUM.largest_deposit_mm + ' mm'} />
              <StatRow k="Category" v={SUM.category} mono={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
