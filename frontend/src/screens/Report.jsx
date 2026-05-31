/* ============================================================
   Oncoscope — Report view (ported from report.jsx).
   M7: wired to the active slide — metadata, slide-level summary,
   real A05 patch thumbnails, and the pathologist's reviewed regions
   (kept/dismissed) + drawn annotations. Sign-off unlocks Patient.
   ============================================================ */
import { useState, useEffect, createElement } from 'react';
import { Icons } from '../components/Icons.jsx';
import { LogoMark, Disclaimer } from '../components/brand.jsx';
import { ConfBar } from '../components/ui.jsx';
import { tumorRGB, rgbStr } from '../lib/tissue.js';
import { useApp } from '../state/AppState.jsx';
import { api } from '../api/client.js';
import { REPORT } from '../data/mock.js';

const annoClass = (a) => (a.bodies || a.body || []).find((b) => b.purpose === 'tagging')?.value || 'tumor';

function Editable({ initial, style, locked, tag = 'div' }) {
  const [focus, setFocus] = useState(false);
  return createElement(tag, {
    contentEditable: !locked, suppressContentEditableWarning: true,
    onFocus: () => setFocus(true), onBlur: () => setFocus(false),
    style: { outline: 'none', borderRadius: 6, padding: locked ? 0 : '3px 7px', margin: locked ? 0 : '-3px -7px', transition: 'background .15s, box-shadow .15s', cursor: locked ? 'default' : 'text', background: focus ? '#fff' : 'transparent', boxShadow: focus ? '0 0 0 2px var(--accent)' : 'none', ...style },
    onMouseEnter: (e) => { if (!locked && !focus) e.currentTarget.style.background = 'rgba(24,168,155,0.06)'; },
    onMouseLeave: (e) => { if (!focus) e.currentTarget.style.background = 'transparent'; },
  }, initial);
}

function ReportToolbar({ app }) {
  const { signedOff, setNarrate } = app;
  return (
    <div style={{ height: 56, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', background: 'var(--surface-1)', borderBottom: '1px solid var(--hairline)' }}>
      <button onClick={() => app.go('workspace')} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-mid)', padding: '7px 11px', borderRadius: 7, border: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
        <Icons.chevL size={15} /> Workspace
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icons.report size={17} style={{ color: 'var(--accent-hi)' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-hi)' }}>Surgical pathology report</span>
        {signedOff && <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--confirm)', padding: '3px 9px', borderRadius: 100, background: '#e6f6ec', border: '1px solid #bfe6cd' }}><Icons.checkCircle size={13} /> SIGNED</span>}
      </div>
      <div style={{ flex: 1 }} />
      <Disclaimer />
      <button className="btn-ghost" onClick={() => setNarrate(true)}><Icons.speaker size={16} /> Narrate</button>
      <button className="btn-ghost"><Icons.download size={15} /> Export PDF</button>
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

export default function Report() {
  const app = useApp();
  const { slideId, signedOff, setSignedOff, regions } = app;
  const [slide, setSlide] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [annos, setAnnos] = useState([]);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getSlide(slideId), api.getAnalysis(slideId), api.getAnnotations(slideId)])
      .then(([s, a, an]) => { if (cancelled) return; setSlide(s); setAnalysis(a); setAnnos(an.annotations || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slideId]);

  const locked = signedOff;
  const now = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const order = { tumor: 0, uncertain: 1, benign: 2 };
  const kept = regions.filter((r) => r.review !== 'dismissed').sort((a, b) => (order[a.cls] - order[b.cls]) || ((b.conf || 0.92) - (a.conf || 0.92)));
  const dismissed = regions.filter((r) => r.review === 'dismissed');
  const sum = analysis?.slide_summary || {};
  const conf = analysis?.prob_tumor ?? 0.94;
  const patchThumb = (rid) => analysis?.top_patches?.find((p) => p.region_id === rid)?.thumbnail_url;
  const measurements = [
    { k: 'Largest deposit', v: (sum.largest_deposit_mm ?? '—') + ' mm' },
    { k: 'Total tumor area', v: (sum.tumor_area_pct ?? '—') + '% of section' },
    { k: 'Metastatic foci', v: `${kept.filter((r) => r.cls === 'tumor').length} kept · ${kept.filter((r) => r.cls === 'uncertain').length} indeterminate` },
    { k: 'Nodal category', v: sum.category || '—' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      <ReportToolbar app={app} />
      <div className="scroll-dark" style={{ flex: 1, overflowY: 'auto', padding: '28px 0 80px', background: 'var(--bg-canvas)' }}>
        <div style={{ width: 'min(880px, 92%)', margin: '0 auto', background: 'var(--paper)', borderRadius: 14, boxShadow: 'var(--shadow-2)', overflow: 'hidden', color: 'var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 30px', background: 'rgba(232,179,57,0.14)', borderBottom: '1px solid rgba(180,140,40,0.3)' }}>
            <Icons.alert size={16} style={{ color: '#b5862a', flex: 'none' }} />
            <span style={{ fontSize: 12, color: '#8a661f', lineHeight: 1.4, fontWeight: 500 }}>
              AI-generated draft for research demonstration only. Every statement must be independently verified by a qualified pathologist before any clinical use. <strong>Not a validated diagnostic device.</strong>
            </span>
          </div>

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
              <Field label="AI confidence">
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="mono" style={{ fontWeight: 700, color: '#c0392b' }}>{Math.round(conf * 100)}%</span>
                  <span style={{ flex: 1, maxWidth: 220 }}><ConfBar value={conf} h={7} /></span>
                </span>
              </Field>
            </div>

            <h3 style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '26px 0 10px' }} className="mono">Impression</h3>
            <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 10, background: '#fbeaea', border: '1px solid #f0cccc' }}>
              <Icons.alert size={18} style={{ color: '#c0392b', flex: 'none', marginTop: 1 }} />
              <Editable locked={locked} initial={REPORT.impression} style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 500, color: '#7a1f1f', flex: 1 }} />
            </div>

            <h3 style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '26px 0 12px' }} className="mono">Findings by region</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {kept.map((r) => {
                const uncertain = r.cls === 'uncertain', benign = r.cls === 'benign';
                const fnd = REPORT.findings.find((f) => f.region === r.id);
                const col = benign ? '#7a828a' : uncertain ? 'var(--uncertain)' : rgbStr(tumorRGB(r.conf != null ? r.conf : 0.92));
                const thumb = patchThumb(r.id);
                const status = r.review === 'confirmed' ? ['CONFIRMED', 'var(--confirm)', '#e6f6ec'] : ['AWAITING REVIEW', '#9a6b00', 'var(--warn-soft)'];
                return (
                  <div key={r.id} style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 11, background: '#fff', border: '1px solid var(--paper-line)' }}>
                    <div style={{ flex: 'none', position: 'relative', width: 86, height: 86 }}>
                      <div style={{ width: 86, height: 86, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--paper-line)', background: '#e8e7e2' }}>
                        {thumb && <img src={thumb} alt="" width={86} height={86} style={{ width: 86, height: 86, objectFit: 'cover', display: 'block' }} />}
                      </div>
                      <span className="mono" style={{ position: 'absolute', bottom: 5, right: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: col, color: '#fff' }}>{Math.round((r.conf || 0.92) * 100)}%</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Region {r.id} — {r.label}</span>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, color: status[1], background: status[2], whiteSpace: 'nowrap' }}>{status[0]}</span>
                      </div>
                      <Editable locked={locked} initial={fnd ? fnd.text : r.note} style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink)' }} />
                      {r.docNote ? <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-ink)', display: 'flex', gap: 6, alignItems: 'flex-start' }}><Icons.edit size={13} style={{ marginTop: 1, flex: 'none' }} /> <span>{r.docNote}</span></div> : null}
                    </div>
                  </div>
                );
              })}
              {dismissed.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--paper-2)', border: '1px solid var(--paper-line)' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600 }}>Dismissed by reviewer:</span>
                  {dismissed.map((r) => <span key={r.id} className="mono" style={{ fontSize: 11.5, color: '#9aa0a7', textDecoration: 'line-through' }}>{r.id} ({Math.round((r.conf || 0.92) * 100)}%)</span>)}
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

            <h3 style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '26px 0 12px' }} className="mono">Measurements &amp; staging</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {measurements.map((m) => (
                <div key={m.k} style={{ padding: '12px 15px', borderRadius: 10, background: '#fff', border: '1px solid var(--paper-line)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 3 }}>{m.k}</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{m.v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 30, paddingTop: 22, borderTop: '2px solid var(--paper-line)' }}>
              {signedOff ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'cursive', fontSize: 26, color: '#1d3a8a', borderBottom: '1px solid var(--paper-line)', paddingBottom: 2, width: 230 }}>Dana Whitfield</div>
                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>Dana Whitfield, MD · Anatomic Pathology<br />Electronically signed {now}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--confirm)', fontWeight: 600, fontSize: 13 }}><Icons.checkCircle size={18} /> Report finalized · patient summary unlocked</div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', maxWidth: 420, lineHeight: 1.5 }}>Review and edit every field above. Signing off finalizes the report and unlocks the plain-language patient summary.</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" style={{ background: 'var(--paper-2)', color: 'var(--ink)', border: '1px solid var(--paper-line)' }}><Icons.edit size={15} /> Save draft</button>
                    <button className="btn-primary" onClick={() => setConfirm(true)}><Icons.sign size={16} /> Sign off &amp; finalize</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
              <button className="btn-primary" onClick={() => { setSignedOff(true); setConfirm(false); }}><Icons.check size={16} /> Confirm sign-off</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
