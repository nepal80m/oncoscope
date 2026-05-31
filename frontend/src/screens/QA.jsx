/* ============================================================
   Oncoscope — Q&A screen (standalone wrapper around QAPanel)
   ============================================================ */
import { Icons } from '../components/Icons.jsx';
import QAPanel from '../components/QAPanel.jsx';
import { useApp } from '../state/AppState.jsx';

export default function QA() {
  const app = useApp();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      <div style={{ height: 56, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', background: 'var(--surface-1)', borderBottom: '1px solid var(--hairline)' }}>
        <button onClick={() => app.go('workspace')} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-mid)', padding: '7px 11px', borderRadius: 7, border: '1px solid var(--hairline-2)', background: 'var(--surface-1)' }}><Icons.chevL size={15} /> Workspace</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-hi)' }}>Pathology Q&amp;A assistant</span>
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minHeight: 0 }}>
        <div style={{ width: 'min(720px, 100%)', borderLeft: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)' }}>
          <QAPanel onCite={() => app.go('workspace')} />
        </div>
      </div>
    </div>
  );
}
