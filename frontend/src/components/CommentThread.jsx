/* ============================================================
   Oncoscope — threaded comments on a target (annotation | region).
   Persists to the backend; reloads when the target changes.
   ============================================================ */
import { useEffect, useState } from 'react';
import { Icons } from './Icons.jsx';
import { api } from '../api/client.js';

export default function CommentThread({ slideId, targetType, targetId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setComments([]);
    if (slideId && targetId) {
      api.getComments(slideId, targetType, targetId).then((d) => { if (!cancelled) setComments(d.comments || []); }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [slideId, targetType, targetId]);

  const add = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    setBusy(true);
    try {
      const c = await api.addComment(slideId, { target_type: targetType, target_id: targetId, text: t });
      setComments((cs) => [...cs, c]);
    } catch { /* ignore in demo */ } finally { setBusy(false); }
  };
  const del = async (id) => {
    setComments((cs) => cs.filter((c) => c.id !== id));
    try { await api.deleteComment(slideId, id); } catch { /* ignore */ }
  };
  const when = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

  return (
    <div>
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-lo)', marginBottom: 6 }}>COMMENTS{comments.length ? ` · ${comments.length}` : ''}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
        {comments.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--text-lo)' }}>No comments yet.</div>}
        {comments.map((c) => (
          <div key={c.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '7px 9px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-hi)' }}>{c.author?.name || 'You'}</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-lo)' }}>{when(c.created_at)}</span>
                <button onClick={() => del(c.id)} title="Delete comment" style={{ color: 'var(--text-lo)', padding: 1, lineHeight: 0 }}><Icons.close size={12} /></button>
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>{c.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="Add a comment…"
          style={{ flex: 1, fontSize: 12, padding: '7px 9px', borderRadius: 7, border: '1px solid var(--hairline-2)', background: 'var(--surface-2)', color: 'var(--text-hi)', outline: 'none' }} />
        <button onClick={add} disabled={busy || !text.trim()} className="btn-primary" style={{ padding: '7px 10px', fontSize: 12.5, opacity: text.trim() ? 1 : 0.5 }} title="Post comment"><Icons.arrowR size={14} /></button>
      </div>
    </div>
  );
}
