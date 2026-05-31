/* ============================================================
   Oncoscope — brand bits: LogoMark + Disclaimer (ported from
   workspace-panels.jsx)
   ============================================================ */

export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" stroke="var(--accent)" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="6.5" stroke="var(--accent)" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="2" fill="var(--accent)" />
      <path d="M14 1.5v4M14 22.5v4M1.5 14h4M22.5 14h4" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Disclaimer({ compact }) {
  return (
    <div className="disclaimer-pill" title="This is a research prototype. Outputs are not validated for clinical decision-making.">
      <span className="dot" /> {compact ? 'NOT FOR CLINICAL USE' : 'RESEARCH PROTOTYPE — NOT FOR CLINICAL USE'}
    </div>
  );
}
