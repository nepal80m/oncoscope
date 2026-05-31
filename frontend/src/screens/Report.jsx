/* ============================================================
   Oncoscope — Report view.
   Wired to the editable report doc in Firestore (reports/{slideId},
   lazy-seeded from the bucket's report.json): impression, per-region
   findings text, and pathologist-entered staging (pN / mm / tumor-area %)
   are editable and saved on blur. Slide call + probability come from the
   real analysis. Sign-off is persisted per-slide and unlocks Patient.
   ============================================================ */
import { useState, useEffect, createElement } from 'react';
import { Icons } from '../components/Icons.jsx';
import { LogoMark } from '../components/brand.jsx';
import { ConfBar } from '../components/ui.jsx';
import { tumorRGB, rgbStr } from '../lib/tissue.js';
import { useApp } from '../state/AppState.jsx';
import { api } from '../api/client.js';

const annoClass = (a) => (a.bodies || a.body || []).find((b) => b.purpose === 'tagging')?.value || 'tumor';

function Editable({ initial, style, locked, tag = 'div', onSave }) {
  const [focus, setFocus] = useState(false);
  return createElement(tag, {
    contentEditable: !locked, suppressContentEditableWarning: true,
    onFocus: () => setFocus(true),
    onBlur: (e) => { setFocus(false); if (onSave) onSave(e.currentTarget.innerText.trim()); },
    style: { outline: 'none', borderRadius: 6, padding: locked ? 0 : '3px 7px', margin: locked ? 0 : '-3px -7px', transition: 'background .15s, box-shadow .15s', cursor: locked ? 'default' : 'text', background: focus ? '#fff' : 'transparent', boxShadow: focus ? '0 0 0 2px var(--accent)' : 'none', ...style },
    onMouseEnter: (e) => { if (!locked && !focus) e.currentTarget.style.background = 'rgba(24,168,155,0.06)'; },
    onMouseLeave: (e) => { if (!focus) e.currentTarget.style.background = 'transparent'; },
  }, initial);
}

function ReportToolbar({ app }) {
  const { signedOff, setNarrate } = app;
  return (
    <div className="report-toolbar" style={{ height: 56, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', background: 'var(--surface-1)', borderBottom: '1px solid var(--hairline)' }}>
      <button onClick={() => app.go('workspace')} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-mid)', padding: '7px 11px', borderRadius: 7, border: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
        <Icons.chevL size={15} /> Workspace
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icons.report size={17} style={{ color: 'var(--accent-hi)' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-hi)' }}>Surgical pathology report</span>
        {signedOff && <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--confirm)', padding: '3px 9px', borderRadius: 100, background: '#e6f6ec', border: '1px solid #bfe6cd' }}><Icons.checkCircle size={13} /> SIGNED</span>}
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn-ghost" onClick={() => setNarrate(true)}><Icons.speaker size={16} /> Narrate</button>
      <button className="btn-ghost" onClick={() => window.print()}><Icons.download size={15} /> Export PDF</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 18, padding: '11px 0', borderBottom: '1px solid var(--paper-line)' }}>
      <div className="mono" style={{ width: 150, flex: 'none', fontSize: 11, letterSpacing: '.04em', color: 'var(--ink-2)', textTransform: 'uppercase', paddingTop: 2 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>{children}</div>
    </div>
  );
}

const statInput = { font: 'inherit', color: 'inherit', border: 'none', borderBottom: '1px dashed var(--paper-line)', background: 'transparent', width: '100%', outline: 'none', padding: '0 0 2px' };
function MCard({ label, children }) {
  return (
    <div style={{ padding: '12px 15px', borderRadius: 10, background: '#fff', border: '1px solid var(--paper-line)' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{children}</div>
    </div>
  );
}

export default function Report() {
  const app = useApp();
  const { slideId, signedOff, signOff, report, saveReport, regions, initRegions, applyReviews } = app;
  const [slide, setSlide] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [annos, setAnnos] = useState([]);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSlide(null); setAnalysis(null); setAnnos([]);
    Promise.all([api.getSlide(slideId), api.getAnalysis(slideId), api.getAnnotations(slideId), api.getReviews(slideId)])
      .then(([s, a, an, rev]) => {
        if (cancelled) return;
        setSlide(s); setAnalysis(a); setAnnos(an.annotations || []);
        initRegions(a.slide_id, a.regions); // no-op if Workspace already loaded this slide
        applyReviews(rev.reviews);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slideId]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = signedOff;
  const now = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const ready = report && analysis;

  const order = { tumor: 0, uncertain: 1, benign: 2 };
  const kept = regions.filter((r) => r.review !== 'dismissed').sort((a, b) => (order[a.cls] - order[b.cls]) || ((b.rank ? -b.rank : 0) - (a.rank ? -a.rank : 0)));
  const dismissed = regions.filter((r) => r.review === 'dismissed');
  const positive = analysis?.prediction === 'tumor';
  const conf = analysis?.prob_tumor ?? 0;
  const probTxt = analysis?.display_probability || Math.round(conf * 100) + '%';
  const patchThumb = (rid) => analysis?.top_patches?.find((p) => p.region_id === rid)?.thumbnail_url;
  const r0 = report || {};
  const foci = `${kept.filter((r) => r.cls === 'tumor').length} confirmed tumor · ${kept.filter((r) => r.cls === 'uncertain').length} for review`;

  return (
    <div className="report-screen" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      <ReportToolbar app={app} />
      <div className="scroll-dark report-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 0 80px', background: 'var(--bg-canvas)' }}>
        {!ready ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '60%', color: 'var(--text-lo)' }} className="mono">assembling report…</div>
        ) : (
        <div className="report-paper" style={{ width: 'min(880px, 92%)', margin: '0 auto', background: 'var(--paper)', borderRadius: 14, boxShadow: 'var(--shadow-2)', overflow: 'hidden', color: 'var(--ink)' }}>
          <div style={{ padding: '30px 40px 44px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}><LogoMark size={20} /><span style={{ fontSize: 15, fontWeight: 700 }}>Oncoscope</span></div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em' }}>Lymph node — metastasis assessment</div>
              </div>
              <div className="mono" style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                <div>CASE {slide?.name || slideId}</div><div>{slide?.stain || 'H&E'}</div><div>{now}</div>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <Field label="Specimen">{slide?.specimen || '—'}</Field>
              <Field label="Acquisition">{slide?.scanner || '—'}</Field>
              <Field label="AI tumor probability">
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="mono" style={{ fontWeight: 700, color: positive ? '#c0392b' : 'var(--confirm)' }}>{probTxt}</span>
                  <span style={{ flex: 1, maxWidth: 220 }}><ConfBar value={conf} h={7} /></span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{positive ? 'POSITIVE' : 'NEGATIVE'}{analysis?.review_priority ? ` · ${String(analysis.review_priority).toUpperCase()} PRIORITY` : ''}</span>
                </span>
              </Field>
            </div>

            <h3 style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '26px 0 10px' }} className="mono">Impression</h3>
            <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 10, background: positive ? '#fbeaea' : '#eef6f0', border: '1px solid ' + (positive ? '#f0cccc' : '#cfe6d6') }}>
              <Icons.alert size={18} style={{ color: positive ? '#c0392b' : 'var(--confirm)', flex: 'none', marginTop: 1 }} />
              <Editable key={'imp-' + slideId} locked={locked} initial={r0.impression || r0.report_clinician || ''} onSave={(t) => saveReport({ impression: t })} style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 500, color: positive ? '#7a1f1f' : '#1f5a3f', flex: 1 }} />
            </div>

            <h3 style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '26px 0 12px' }} className="mono">Findings by region</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {kept.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>No regions retained for reporting.</div>}
              {kept.map((r) => {
                const uncertain = r.cls === 'uncertain', benign = r.cls === 'benign';
                const col = benign ? '#7a828a' : uncertain ? 'var(--uncertain)' : rgbStr(tumorRGB(0.92));
                const thumb = patchThumb(r.id);
                const status = r.review === 'confirmed' ? ['CONFIRMED', 'var(--confirm)', '#e6f6ec'] : ['AWAITING REVIEW', '#9a6b00', 'var(--warn-soft)'];
                return (
                  <div key={r.id} style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 11, background: '#fff', border: '1px solid var(--paper-line)' }}>
                    <div style={{ flex: 'none', position: 'relative', width: 86, height: 86 }}>
                      <div style={{ width: 86, height: 86, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--paper-line)', background: '#e8e7e2', display: 'grid', placeItems: 'center' }}>
                        {thumb ? <img src={thumb} alt="" width={86} height={86} style={{ width: 86, height: 86, objectFit: 'cover', display: 'block' }} /> : <span className="mono" style={{ fontSize: 9, color: 'var(--ink-2)' }}>no crop</span>}
                      </div>
                      {r.rank ? <span className="mono" style={{ position: 'absolute', bottom: 5, right: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: col, color: '#fff' }}>#{r.rank}</span> : null}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Region {r.id} — {r.label}</span>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, color: status[1], background: status[2], whiteSpace: 'nowrap' }}>{status[0]}</span>
                      </div>
                      <Editable key={'find-' + slideId + '-' + r.id} locked={locked} initial={(r0.findings && r0.findings[r.id]) || r.note || ''} onSave={(t) => saveReport({ findings: { ...(r0.findings || {}), [r.id]: t } })} style={{ fontSize: 13, lineHeight: 1.55, color: (r0.findings && r0.findings[r.id]) ? 'var(--ink)' : 'var(--ink-2)' }} />
                      {!locked && !(r0.findings && r0.findings[r.id]) && <div style={{ fontSize: 11, color: 'var(--text-lo)', marginTop: 4, fontStyle: 'italic' }}>High-attention area (rank {r.rank}). Add your description.</div>}
                      {r.docNote ? <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-ink)', display: 'flex', gap: 6, alignItems: 'flex-start' }}><Icons.edit size={13} style={{ marginTop: 1, flex: 'none' }} /> <span>{r.docNote}</span></div> : null}
                    </div>
                  </div>
                );
              })}
              {dismissed.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--paper-2)', border: '1px solid var(--paper-line)' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600 }}>Dismissed by reviewer:</span>
                  {dismissed.map((r) => <span key={r.id} className="mono" style={{ fontSize: 11.5, color: '#9aa0a7', textDecoration: 'line-through' }}>{r.id}{r.rank ? ` (#${r.rank})` : ''}</span>)}
                </div>
              )}
            </div>

            {annos.length > 0 && (
              <>
                <h3 style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '26px 0 12px' }} className="mono">Pathologist annotations</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {annos.map((a, i) => {
                    const cls = annoClass(a);
                    const col = cls === 'uncertain' ? 'var(--uncertain)' : cls === 'benign' ? '#7a828a' : 'var(--tumor-hi)';
                    return <span key={a.id || i} className="mono" style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 100, color: col, border: `1px solid ${col}`, background: '#fff' }}>Mark {i + 1} · {cls}</span>;
                  })}
                </div>
              </>
            )}

            <h3 style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '26px 0 12px' }} className="mono">Measurements &amp; staging <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text-lo)' }}>· pathologist-entered</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MCard label="Largest deposit (mm)">
                {locked ? <span>{r0.largest_deposit_mm != null ? r0.largest_deposit_mm + ' mm' : '—'}</span>
                  : <input className="mono" defaultValue={r0.largest_deposit_mm ?? ''} placeholder="—" onBlur={(e) => { const n = parseFloat(e.target.value); saveReport({ largest_deposit_mm: Number.isFinite(n) ? n : null }); }} style={statInput} />}
              </MCard>
              <MCard label="Total tumor area (%)">
                {locked ? <span>{r0.tumor_area_pct != null ? r0.tumor_area_pct + '%' : '—'}</span>
                  : <input className="mono" defaultValue={r0.tumor_area_pct ?? ''} placeholder="—" onBlur={(e) => { const n = parseFloat(e.target.value); saveReport({ tumor_area_pct: Number.isFinite(n) ? n : null }); }} style={statInput} />}
              </MCard>
              <MCard label="Regions (kept)"><span>{foci}</span></MCard>
              <MCard label="Nodal category">
                {locked ? <span>{r0.category || '—'}</span>
                  : <input className="mono" defaultValue={r0.category ?? ''} placeholder="e.g. pN1 (macrometastasis)" onBlur={(e) => saveReport({ category: e.target.value.trim() || null })} style={{ ...statInput, fontSize: 13 }} />}
              </MCard>
            </div>

            <div style={{ marginTop: 30, paddingTop: 22, borderTop: '2px solid var(--paper-line)' }}>
              {signedOff ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'cursive', fontSize: 26, color: '#1d3a8a', borderBottom: '1px solid var(--paper-line)', paddingBottom: 2, width: 230 }}>{r0.signer || 'Dana Whitfield'}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>{r0.signer || 'Dana Whitfield'}, MD · Anatomic Pathology<br />Electronically signed {now}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--confirm)', fontWeight: 600, fontSize: 13 }}><Icons.checkCircle size={18} /> Report finalized · patient summary unlocked</div>
                </div>
              ) : (
                <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', maxWidth: 420, lineHeight: 1.5 }}>Review and edit every field above. Signing off finalizes the report and unlocks the plain-language patient summary.</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-primary" onClick={() => setConfirm(true)}><Icons.sign size={16} /> Sign off &amp; finalize</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {confirm && (
        <div onClick={() => setConfirm(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', background: 'rgba(28,30,25,0.42)', backdropFilter: 'blur(3px)' }}>
          <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: 420, padding: 26, borderRadius: 16, background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent-hi)' }}><Icons.sign size={20} /></span>
              <div><div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-hi)' }}>Finalize &amp; sign report</div><div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{slide?.name || slideId} · {slide?.specimen || ''}</div></div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.55, margin: '0 0 18px' }}>
              By signing you confirm you have personally reviewed the slide and verified all findings. This locks the report and unlocks the patient summary. (Demo only — no real record is created.)
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => { signOff(); setConfirm(false); }}><Icons.check size={16} /> Confirm sign-off</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
