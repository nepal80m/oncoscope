/* ============================================================
   Oncoscope — app-state context (ported from app.jsx's lifted state).
   Exposes the same shape the design's screens expect via `app`
   (app.go, app.analyzed, app.regions, review handlers, …) but backs
   navigation with React Router instead of a manual screen switch.
   ============================================================ */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UM_PER_PX } from '../data/mock.js';
import { api } from '../api/client.js';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const SCREEN_PATH = {
  landing: '/', upload: '/upload', workspace: '/workspace',
  report: '/report', qa: '/qa', patient: '/patient',
};
const PATH_SCREEN = Object.fromEntries(Object.entries(SCREEN_PATH).map(([k, v]) => [v, k]));

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const screen = PATH_SCREEN[location.pathname] || 'landing';
  const go = (s) => navigate(SCREEN_PATH[s] || '/');

  const [analyzed, setAnalyzed] = useState(() => localStorage.getItem('onco.analyzed') === '1');
  const [running, setRunning] = useState(false);
  const [signedOff, setSignedOff] = useState(false); // derived per-slide from the report doc
  const [report, setReport] = useState(null);
  // default to a real cached slide; migrate the legacy 'A05' stand-in id
  const [slideId, setSlideIdState] = useState(() => {
    const stored = localStorage.getItem('onco.slide');
    return stored && stored !== 'A05' ? stored : 'test_016';
  });
  const [qaOpen, setQaOpen] = useState(false);
  const [narrate, setNarrate] = useState(false);
  const [regions, setRegions] = useState([]); // populated from real analysis via initRegions
  const docCount = useRef(0);
  const loadedSlide = useRef(null);

  // Map a backend analysis region into the reviewable shape used across the app.
  const mapAnalysisRegion = (r) => ({
    id: r.region_id, cls: r.cls, conf: r.confidence, rank: r.rank, attention: r.attention, label: r.label,
    cx: r.cx, cy: r.cy, bbox: r.bbox, dim: r.dim, areaMm2: r.area_mm2, note: r.note, crop_url: r.crop_url,
    source: 'ai', review: 'pending', docNote: '',
  });
  // Load regions for a slide once; preserves the pathologist's review on re-renders.
  const initRegions = (sid, regs) => {
    if (!sid || loadedSlide.current === sid) return;
    loadedSlide.current = sid;
    docCount.current = 0;
    setRegions((regs || []).map(mapAnalysisRegion));
  };

  // Switch the active slide (catalog pick / cache hit / completed upload).
  const setSlideId = (id) => {
    if (!id) return;
    setSlideIdState(id);
    localStorage.setItem('onco.slide', id);
    loadedSlide.current = null; // force region reload for the new slide
  };

  useEffect(() => { localStorage.setItem('onco.analyzed', analyzed ? '1' : '0'); }, [analyzed]);
  // load the active slide's editable report; sign-off is per-slide (Firestore)
  useEffect(() => {
    let cancelled = false;
    setReport(null);
    api.getReport(slideId)
      .then((r) => { if (!cancelled) { setReport(r); setSignedOff(!!r?.signed_off); } })
      .catch(() => { if (!cancelled) { setReport(null); setSignedOff(false); } });
    return () => { cancelled = true; };
  }, [slideId]);

  // merge persisted review decisions (from the backend) onto the loaded regions
  const applyReviews = (map) => {
    if (!map) return;
    setRegions((rs) => rs.map((r) => {
      const rv = map[r.id];
      return rv ? { ...r, review: rv.review || r.review, cls: rv.cls || r.cls, docNote: rv.note ?? r.docNote } : r;
    }));
  };

  const confirmRegion = (id) => setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, review: r.review === 'confirmed' ? 'pending' : 'confirmed' } : r)));
  const dismissRegion = (id) => setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, review: r.review === 'dismissed' ? 'pending' : 'dismissed' } : r)));
  const relabelRegion = (id, cls) => setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, cls, review: r.review === 'pending' ? 'confirmed' : r.review } : r)));
  const noteRegion = (id, docNote) => setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, docNote } : r)));
  const removeRegion = (id) => setRegions((rs) => rs.filter((r) => r.id !== id));
  const addRegion = (box) => {
    docCount.current += 1;
    const id = 'D' + docCount.current;
    const areaMm2 = +(box.rx * box.ry * Math.PI * (UM_PER_PX / 1000) ** 2).toFixed(2);
    const reg = {
      id, cx: box.cx, cy: box.cy, rx: box.rx, ry: box.ry, conf: null, cls: 'tumor',
      label: 'Marked by pathologist',
      dim: `${((box.rx * 2 * UM_PER_PX) / 1000).toFixed(1)} × ${((box.ry * 2 * UM_PER_PX) / 1000).toFixed(1)} mm`,
      areaMm2, note: 'Region marked manually by the reviewing pathologist.', source: 'doctor', review: 'confirmed', docNote: '',
    };
    setRegions((rs) => [...rs, reg]);
    return id;
  };

  // editable report (merged patch → Firestore) + per-slide sign-off
  const saveReport = async (patch) => {
    setReport((r) => ({ ...(r || {}), ...patch }));
    try { await api.putReport(slideId, patch); } catch { /* ignore */ }
  };
  const signOff = async (signer = 'Dana Whitfield') => {
    setSignedOff(true);
    setReport((r) => ({ ...(r || {}), signed_off: true, signer, signed_at: new Date().toISOString() }));
    try { await api.signReport(slideId, signer); } catch { /* ignore */ }
  };

  const value = {
    screen, go, slideId, setSlideId,
    analyzed, setAnalyzed, running, setRunning, signedOff, setSignedOff,
    report, saveReport, signOff,
    qaOpen, setQaOpen, narrate, setNarrate,
    regions, initRegions, applyReviews, confirmRegion, dismissRegion, relabelRegion, noteRegion, addRegion, removeRegion,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
