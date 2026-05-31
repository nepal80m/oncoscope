/* ============================================================
   Oncoscope — bottom evidence strip.
   Each card is a real crop (patch.thumbnail_url from the bucket),
   ranked by model ATTENTION — high attention means "the model looked
   here," NOT a calibrated tumor probability, so there's no per-patch %.
   The model emits no Grad-CAM, so there is no Grad-CAM toggle.
   ============================================================ */
import { Icons } from '../components/Icons.jsx';

export default function EvidenceStrip({ analyzed, patches = [], regions = [], onHover, onPick, selectedId }) {
  const ranked = [...patches].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  return (
    <div style={{ height: 158, flex: 'none', background: 'var(--surface-1)', borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px 7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icons.grid size={15} style={{ color: 'var(--text-mid)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-hi)' }}>Top high-attention patches</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>ranked by attention · {ranked.length}</span>
        </div>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)' }}>model focus — not confirmed tumor</span>
      </div>

      {!analyzed ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-lo)', fontSize: 12.5 }}>Evidence patches appear after analysis.</div>
      ) : (
        <div className="scroll-dark fade-up" style={{ flex: 1, display: 'flex', gap: 11, padding: '4px 16px 14px', overflowX: 'auto', overflowY: 'hidden' }}>
          {ranked.map((p) => {
            const r = p.region_id ? regions.find((rr) => rr.id === p.region_id) : null;
            const uncertain = r && r.cls === 'uncertain';
            const col = uncertain ? 'var(--uncertain)' : '#7a828a';
            const sel = selectedId === p.patch_id;
            return (
              <div key={p.patch_id} onMouseEnter={() => onHover(p.region_id)} onMouseLeave={() => onHover(null)} onClick={() => onPick(p)}
                style={{ flex: 'none', width: 96, cursor: 'pointer' }}>
                <div style={{ position: 'relative', borderRadius: 7, padding: 3, background: sel ? col : 'var(--surface-3)', boxShadow: sel ? 'var(--shadow-2)' : 'none', transition: 'background .15s' }}>
                  <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 5, overflow: 'hidden', background: '#e8e7e2', display: 'grid', placeItems: 'center' }}>
                    {p.thumbnail_url
                      ? <img src={p.thumbnail_url} alt={p.patch_id} width={88} height={88} style={{ width: 88, height: 88, objectFit: 'cover', display: 'block' }} />
                      : <span className="mono" style={{ fontSize: 9, color: 'var(--text-lo)', textAlign: 'center', lineHeight: 1.3 }}>crop<br />n/a</span>}
                  </div>
                  <span className="mono" style={{ position: 'absolute', top: 6, left: 6, fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.9)', color: 'var(--ink)' }}>#{p.rank}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, padding: '0 1px' }}>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mid)' }}>{p.region_id || `${p.x},${p.y}`}</span>
                  <span style={{ fontSize: 10, color: uncertain ? 'var(--uncertain)' : 'var(--text-lo)' }}>attention</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
