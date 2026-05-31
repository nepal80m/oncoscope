/* ============================================================
   Oncoscope — icon set (ported from icons.jsx; clean 1.6px line
   icons, currentColor)
   ============================================================ */
import React from 'react';

const Ic = ({ d, size = 18, fill, sw = 1.6, children, vb = 24, style }) =>
  React.createElement(
    'svg',
    {
      width: size, height: size, viewBox: `0 0 ${vb} ${vb}`,
      fill: fill || 'none', stroke: fill ? 'none' : 'currentColor',
      strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', style,
    },
    children || React.createElement('path', { d })
  );

export const Icons = {
  play:    (p) => <Ic {...p} fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></Ic>,
  pause:   (p) => <Ic {...p} fill="currentColor"><path d="M8 5h3.2v14H8zM12.8 5H16v14h-3.2z" /></Ic>,
  bolt:    (p) => <Ic {...p}><path d="M13 3 5 13h6l-2 8 8-11h-6z" /></Ic>,
  layers:  (p) => <Ic {...p}><path d="M12 3 3 8l9 5 9-5z" /><path d="M3 13l9 5 9-5" /></Ic>,
  eye:     (p) => <Ic {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Ic>,
  eyeOff:  (p) => <Ic {...p}><path d="M3 3l18 18" /><path d="M10.6 6.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4.5-1" /><path d="M9.5 9.6a3 3 0 0 0 4.2 4.2" /></Ic>,
  target:  (p) => <Ic {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></Ic>,
  next:    (p) => <Ic {...p}><path d="M5 12h13" /><path d="M13 6l6 6-6 6" /></Ic>,
  report:  (p) => <Ic {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6M9 8h2" /></Ic>,
  mic:     (p) => <Ic {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></Ic>,
  speaker: (p) => <Ic {...p}><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10" /></Ic>,
  chat:    (p) => <Ic {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5A8 8 0 1 1 21 12z" /></Ic>,
  chevL:   (p) => <Ic {...p}><path d="M15 6l-6 6 6 6" /></Ic>,
  chevR:   (p) => <Ic {...p}><path d="M9 6l6 6-6 6" /></Ic>,
  chevD:   (p) => <Ic {...p}><path d="M6 9l6 6 6-6" /></Ic>,
  close:   (p) => <Ic {...p}><path d="M6 6l12 12M18 6L6 18" /></Ic>,
  check:   (p) => <Ic {...p}><path d="M4 12l5 5L20 6" /></Ic>,
  checkCircle: (p) => <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></Ic>,
  edit:    (p) => <Ic {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></Ic>,
  download:(p) => <Ic {...p}><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></Ic>,
  upload:  (p) => <Ic {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></Ic>,
  file:    (p) => <Ic {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></Ic>,
  refresh: (p) => <Ic {...p}><path d="M20 11a8 8 0 1 0-2 6" /><path d="M20 4v6h-6" /></Ic>,
  server:  (p) => <Ic {...p}><rect x="3" y="4" width="18" height="7" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /><path d="M7 7.5h.01M7 17h.01" /></Ic>,
  sign:    (p) => <Ic {...p}><path d="M3 18c3-1 4-9 6-9s2 6 4 6 3-3 5-3" /><path d="M3 21h18" /></Ic>,
  grid:    (p) => <Ic {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Ic>,
  plus:    (p) => <Ic {...p}><path d="M12 5v14M5 12h14" /></Ic>,
  minus:   (p) => <Ic {...p}><path d="M5 12h14" /></Ic>,
  fit:     (p) => <Ic {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Ic>,
  brain:   (p) => <Ic {...p}><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4.5A2.5 2.5 0 0 0 9 4z" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1" /></Ic>,
  flask:   (p) => <Ic {...p}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7.5 15h9" /></Ic>,
  clock:   (p) => <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ic>,
  ruler:   (p) => <Ic {...p}><path d="M3 8h18v8H3z" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></Ic>,
  pin:     (p) => <Ic {...p}><path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></Ic>,
  alert:   (p) => <Ic {...p}><path d="M12 3 2 20h20z" /><path d="M12 9v5M12 17v.5" /></Ic>,
  lock:    (p) => <Ic {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Ic>,
  user:    (p) => <Ic {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></Ic>,
  heart:   (p) => <Ic {...p}><path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" /></Ic>,
  arrowR:  (p) => <Ic {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Ic>,
  sparkle: (p) => <Ic {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Ic>,
  scan:    (p) => <Ic {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" /><path d="M4 12h16" /></Ic>,
  dot:     (p) => <Ic {...p} fill="currentColor"><circle cx="12" cy="12" r="4" /></Ic>,
};

export default Icons;
