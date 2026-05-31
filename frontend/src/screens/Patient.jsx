/* ============================================================
   Oncoscope — Patient summary.
   Unlocks only after sign-off. Plain language, and it reflects the
   actual result (cancer found vs. not found) for the active slide.
   ============================================================ */
import { useState, useEffect } from 'react';
import { Icons } from '../components/Icons.jsx';
import { useApp } from '../state/AppState.jsx';
import { api } from '../api/client.js';

function PatientLocked({ app }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--bg-canvas)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <span style={{ width: 64, height: 64, borderRadius: 16, display: 'grid', placeItems: 'center', margin: '0 auto 18px', background: 'var(--surface-2)', border: '1px solid var(--hairline-2)', color: 'var(--text-mid)' }}><Icons.lock size={26} /></span>
        <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 8 }}>Patient summary is locked</div>
        <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 22px' }}>
          This summary is available only after a pathologist has reviewed and signed off on the report.
        </p>
        <button className="btn-primary" onClick={() => app.go('report')}><Icons.sign size={16} /> Go to report to sign off</button>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, children, tint = 'var(--accent)' }) {
  const I = Icons[icon];
  return (
    <div style={{ display: 'flex', gap: 16, padding: '20px 22px', borderRadius: 16, background: '#fff', border: '1px solid #e7e4dc', boxShadow: '0 1px 2px rgba(40,30,20,0.04)' }}>
      <span style={{ width: 42, height: 42, borderRadius: 11, flex: 'none', display: 'grid', placeItems: 'center', background: tint + '1f', color: tint }}><I size={21} /></span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#2a2622', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.62, color: '#55504a' }}>{children}</div>
      </div>
    </div>
  );
}

export default function Patient() {
  const app = useApp();
  const [analysis, setAnalysis] = useState(null);
  useEffect(() => {
    if (!app.signedOff) return undefined;
    let cancelled = false;
    api.getAnalysis(app.slideId).then((a) => { if (!cancelled) setAnalysis(a); }).catch(() => {});
    return () => { cancelled = true; };
  }, [app.signedOff, app.slideId]);

  if (!app.signedOff) return <PatientLocked app={app} />;

  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const signer = app.report?.signer || 'Dana Whitfield';
  const mm = app.report?.largest_deposit_mm ?? null;
  const positive = analysis ? analysis.prediction === 'tumor' : null; // null = still loading

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #f4f1ea 0%, #eef2ee 100%)' }}>
      <div style={{ height: 52, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', background: 'rgba(255,255,255,0.7)', borderBottom: '1px solid #e2ddd3', backdropFilter: 'blur(8px)' }}>
        <button onClick={() => app.go('report')} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#6a655d', padding: '7px 11px', borderRadius: 7, border: '1px solid #e2ddd3', background: '#fff' }}><Icons.chevL size={15} /> Clinical report</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icons.heart size={16} style={{ color: 'var(--accent)' }} /><span style={{ fontSize: 14, fontWeight: 600, color: '#2a2622' }}>Your results, explained</span></div>
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: 'var(--accent-lo)', padding: '7px 13px', borderRadius: 100, border: '1px solid #cfe5e1', background: '#eaf6f4' }}><Icons.speaker size={15} /> Read aloud</button>
      </div>

      <div className="scroll-dark" style={{ flex: 1, overflowY: 'auto', padding: '36px 0 70px' }}>
        <div style={{ width: 'min(680px, 90%)', margin: '0 auto' }}>
          {positive === null ? (
            <div className="mono" style={{ textAlign: 'center', color: '#9a948a', padding: '60px 0', fontSize: 13 }}>preparing your summary…</div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <span className="mono" style={{ fontSize: 11.5, letterSpacing: '.12em', color: '#9a948a', textTransform: 'uppercase' }}>Patient summary · {now}</span>
                <h1 style={{ fontSize: 30, fontWeight: 700, color: '#2a2622', letterSpacing: '-.02em', margin: '10px 0 12px', lineHeight: 1.18 }}>
                  {positive
                    ? 'Your lymph node was checked, and some cancer cells were found.'
                    : 'Your lymph node was checked, and no cancer cells were found.'}
                </h1>
                <p style={{ fontSize: 15, color: '#6a655d', lineHeight: 1.6, maxWidth: 540, margin: '0 auto' }}>
                  This is a plain-language summary of your results, reviewed and approved by your pathologist. It does not replace the conversation you will have with your care team.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <SummaryCard icon="scan" title="What we looked at">
                  A small lymph node was removed and looked at under a microscope. Lymph nodes help filter the body, so checking them shows whether any cancer cells have spread from where they started.
                </SummaryCard>

                {positive ? (
                  <SummaryCard icon="alert" title="What we found" tint="var(--tumor-mid)">
                    There are some cancer cells in the sample. {mm ? <>The largest area is <strong>about {mm} mm</strong> across. </> : ''}Finding it now helps your care team plan the right next steps.
                  </SummaryCard>
                ) : (
                  <SummaryCard icon="checkCircle" title="What we found" tint="var(--confirm)">
                    No cancer cells were found in this lymph node.
                  </SummaryCard>
                )}

                <SummaryCard icon="checkCircle" title="What this means" tint="var(--confirm)">
                  {positive
                    ? 'A specialist doctor has reviewed the slide and confirmed these findings. Knowing what is there, and where, helps your team plan care that fits you.'
                    : 'A specialist doctor has reviewed the slide and confirmed there are no cancer cells in this node.'}
                </SummaryCard>

                <SummaryCard icon="next" title="What happens next" tint="var(--accent)">
                  {positive
                    ? 'Your care team will contact you to talk through the results and your options. You do not need to do anything right now. It is normal to have questions, so write them down and bring them to your next appointment.'
                    : 'Your care team will contact you to talk through the results. It is normal to have questions, so write them down and bring them to your next appointment.'}
                </SummaryCard>
              </div>

              <div style={{ marginTop: 22, padding: '20px 24px', borderRadius: 16, background: '#eaf6f4', border: '1px solid #cfe5e1', textAlign: 'center' }}>
                <Icons.heart size={22} style={{ color: 'var(--accent)' }} />
                <p style={{ fontSize: 14.5, color: '#2f6b63', lineHeight: 1.6, margin: '10px 0 0', fontWeight: 500 }}>
                  A specialist nurse can answer any questions before your appointment.
                </p>
                <button className="btn-primary" style={{ marginTop: 16 }}><Icons.chat size={16} /> Contact your care team</button>
              </div>

              <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontSize: 11.5, color: '#9a948a' }}>
                <Icons.checkCircle size={14} /> Reviewed &amp; approved by Dr. {signer}, Pathology · {now}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
