/* ============================================================
   Oncoscope — bottom evidence strip (M4: backend attention patches).
   Each patch thumbnail is a real A05 crop (a level-17 DZI tile via
   patch.thumbnail_url); Grad-CAM is a CSS attention wash on top.
   ============================================================ */
import { Icons } from '../components/Icons.jsx';
import { tumorRGB, rgbStr } from '../lib/tissue.js';

export default function EvidenceStrip({ analyzed, patches = [], regions = [], gradcam, setGradcam, onHover, onPick, selectedId }) {
  const ranked = [...patches].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  return (
    <div style={{ height: 158, flex: 'none', background: 'var(--surface-1)', borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px 7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icons.grid size={15} style={{ color: 'var(--text-mid)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-hi)' }}>Top suspicious regions</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>ranked by attention · {ranked.length}</span>
        </div>
        <button onClick={() => setGradcam(!gradcam)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            border: '1px solid ' + (gradcam ? 'var(--accent)' : 'var(--hairline-2)'), color: gradcam ? 'var(--accent-ink)' : 'var(--text-mid)',
            background: gradcam ? 'var(--accent-soft)' : 'var(--surface-1)' }}>
          <Icons.sparkle size={14} /> Grad-CAM {gradcam ? 'on' : 'off'}
        </button>
      </div>

      {!analyzed ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-lo)', fontSize: 12.5 }}>Evidence patches appear after analysis.</div>
      ) : (
        <div className="scroll-dark fade-up" style={{ flex: 1, display: 'flex', gap: 11, padding: '4px 16px 14px', overflowX: 'auto', overflowY: 'hidden' }}>
          {ranked.map((p) => {
            const r = regions.find((rr) => rr.id === p.region_id);
            const uncertain = r && r.cls === 'uncertain';
            const score = p.score != null ? p.score : 0.9;
            const col = uncertain ? 'var(--uncertain)' : rgbStr(tumorRGB(score));
            const rgb = tumorRGB(score);
            const sel = selectedId === p.patch_id;
            return (
              <div key={p.patch_id} onMouseEnter={() => onHover(p.region_id)} onMouseLeave={() => onHover(null)} onClick={() => onPick(p)}
                style={{ flex: 'none', width: 96, cursor: 'pointer' }}>
                <div style={{ position: 'relative', borderRadius: 7, padding: 3, background: sel ? col : 'var(--surface-3)', boxShadow: sel ? 'var(--shadow-2)' : 'none', transition: 'background .15s' }}>
                  <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 5, overflow: 'hidden', background: '#e8e7e2' }}>
                    <img src={p.thumbnail_url} alt={p.patch_id} width={88} height={88} style={{ width: 88, height: 88, objectFit: 'cover', display: 'block' }} />
                    {gradcam && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55), rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.22) 45%, transparent 66%)` }} />}
                  </div>
                  <span className="mono" style={{ position: 'absolute', top: 6, left: 6, fontSize: 9.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(255,255,255,0.9)', color: 'var(--ink)' }}>#{p.rank}</span>
                  <span className="mono" style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 10.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: col, color: '#fff' }}>{Math.round(score * 100)}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, padding: '0 1px' }}>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mid)' }}>{p.region_id}</span>
                  <span style={{ fontSize: 10, color: uncertain ? 'var(--uncertain)' : 'var(--text-lo)' }}>{uncertain ? 'review' : 'tumor'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
