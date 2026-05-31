/* ============================================================
   Oncoscope — Open a slide (case intake).
   Lists the pre-processed slide library (from the GCS manifest) and
   opens one instantly. A dropped file is matched against the library
   by name (cache-lookup); new-slide tiling + analysis runs in the
   offline ML pipeline and is published to storage, not in this app.
   ============================================================ */
import { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons.jsx';
import { LogoMark } from '../components/brand.jsx';
import { useApp } from '../state/AppState.jsx';
import { api } from '../api/client.js';

const ACCEPTED = '.svs, .tiff, .ndpi, .mrxs, .scn, .dcm';

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

export default function Upload() {
  const app = useApp();
  const [catalog, setCatalog] = useState([]);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [cacheNote, setCacheNote] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { api.listSlides().then((d) => setCatalog(d.slides || [])).catch(() => {}); }, []);

  const openSlide = (slideId) => { app.setSlideId(slideId); app.setAnalyzed(true); app.go('workspace'); };
  const pickFile = (f) => { if (f) { setFile({ name: f.name, size: f.size }); setCacheNote(''); } };
  const onDrop = (e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files && e.dataTransfer.files[0]); };

  const start = async () => {
    if (!file) return;
    setCacheNote('Checking the slide library…');
    try {
      const hit = await api.lookupSlide(file.name, file.size);
      if (hit.cached) {
        setCacheNote(`Found “${hit.name}” in the library — opening.`);
        setTimeout(() => openSlide(hit.slide_id), 500);
        return;
      }
      setCacheNote('This slide isn’t in the processed library yet. New slides are tiled & analyzed by the offline ML pipeline and published to storage — for this demo, open one of the cached slides above.');
    } catch (e) {
      setCacheNote('Couldn’t reach the slide library: ' + e.message);
    }
  };

  return (
    <div className="scroll-dark" style={{ height: '100%', overflowY: 'auto', background: 'radial-gradient(120% 90% at 80% -10%, #e7f2f0 0%, var(--bg-canvas) 52%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '16px 26px' }}>
        <LogoMark />
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-hi)', letterSpacing: '-.01em' }}>Oncoscope</span>
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ width: 'min(760px, 92%)', margin: '12px auto 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-hi)', letterSpacing: '-.02em', margin: '0 0 8px' }}>Open or upload a whole-slide image</h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.55, margin: 0 }}>
            Pick a pre-processed slide to open it instantly. New slides are tiled and analyzed by the offline ML pipeline and published to storage.
          </p>
        </div>

        <div className="fade-up">
          {/* pre-processed slide library */}
          {catalog.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: '.1em', color: 'var(--text-lo)', textTransform: 'uppercase', marginBottom: 10 }}>Slide library · ready instantly</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {catalog.map((s) => (
                  <button key={s.slide_id} onClick={() => openSlide(s.slide_id)}
                    style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 11, textAlign: 'left',
                      border: '1px solid var(--hairline-2)', background: 'var(--surface-1)', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hairline-2)'; e.currentTarget.style.background = 'var(--surface-1)'; }}>
                    <img src={s.thumbnail_url} alt="" width={46} height={46} style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', flex: 'none', background: '#e8e7e2' }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.specimen}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 4px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-lo)' }}>or upload a new slide</span>
                <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
              </div>
            </div>
          )}

          {!file ? (
            <div onClick={() => inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
              style={{ borderRadius: 14, border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--hairline-2)'}`, background: dragging ? 'var(--accent-soft)' : 'var(--surface-1)', padding: '40px 30px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s, background .15s' }}>
              <span style={{ width: 56, height: 56, borderRadius: 15, margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}><Icons.upload size={26} /></span>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-hi)' }}>Drag &amp; drop a slide here</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>or <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>browse files</span> · up to 4&nbsp;GB</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)', marginTop: 12 }}>{ACCEPTED}</div>
              <input ref={inputRef} type="file" hidden onChange={(e) => pickFile(e.target.files[0])} />
              <div style={{ fontSize: 11.5, color: 'var(--text-lo)', marginTop: 14 }}>Tip: a file named like a processed slide (e.g. <span className="mono">test_016.tif</span>) opens instantly from the library.</div>
            </div>
          ) : (
            <div className="fade-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--hairline-2)' }}>
                <span style={{ width: 46, height: 46, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#caa1bd,#8a5f88)', color: '#fff' }}><Icons.file size={22} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2 }}>{fmtSize(file.size)} · ready to look up</div>
                </div>
                <button onClick={() => { setFile(null); setCacheNote(''); }} style={{ color: 'var(--text-lo)', padding: 6 }} title="Remove"><Icons.close size={18} /></button>
              </div>
              <button className="btn-primary" onClick={start} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 14, fontSize: 14.5 }}>
                <Icons.bolt size={16} /> Open from library
              </button>
              {cacheNote && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent-ink)', marginTop: 10, lineHeight: 1.5 }}>{cacheNote}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
