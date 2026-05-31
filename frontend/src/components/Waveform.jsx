/* Oncoscope — audio waveform affordance (ported from qa.jsx) */
export default function Waveform({ active, bars = 22 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 22 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 2.5, borderRadius: 2,
            background: active ? 'var(--accent-hi)' : 'var(--text-lo)',
            height: active ? `${20 + 70 * Math.abs(Math.sin(i * 1.1))}%` : '24%',
            animation: active ? `wave 0.9s ease-in-out ${i * 0.045}s infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}
