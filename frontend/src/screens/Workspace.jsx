/* ============================================================
   Oncoscope — Analysis workspace.
   M4: AI analysis overlays on the real slide.
   M5: pathologist annotation layer (draw rect/polygon) + threaded
   comments + persisted review decisions, all via the backend.
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { Icons } from '../components/Icons.jsx';
import { useApp } from '../state/AppState.jsx';
import { api } from '../api/client.js';
import OsdViewer from '../viewer/OsdViewer.jsx';
import TopBar from '../workspace/TopBar.jsx';
import LeftPanel from '../workspace/LeftPanel.jsx';
import EvidenceStrip from '../workspace/EvidenceStrip.jsx';
import QAPanel from '../components/QAPanel.jsx';

function RunningOverlay({ progress }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', background: 'rgba(245,244,240,0.55)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: `${progress}%`, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />
      <div style={{ textAlign: 'center', padding: '22px 30px', borderRadius: 14, background: 'var(--surface-1)', border: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)', minWidth: 280 }}>
        <Icons.brain size={26} style={{ color: 'var(--accent)' }} className="spin" />
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-hi)', marginTop: 10 }}>Analyzing whole-slide image</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-lo)', marginTop: 4 }}>
          {progress < 40 ? 'Tiling at 40× · 2,150 patches' : progress < 75 ? 'Running inference…' : 'Aggregating heatmap…'}
        </div>
        <div style={{ marginTop: 14, height: 5, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: progress + '%', background: 'var(--accent)', transition: 'width .15s' }} />
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 7 }}>{Math.round(progress)}%</div>
      </div>
    </div>
  );
}

export default function Workspace() {
  const app = useApp();
  const {
    slideId, analyzed, setAnalyzed, running, setRunning, qaOpen, setQaOpen, go, setNarrate,
    regions, initRegions, applyReviews, confirmRegion, dismissRegion, relabelRegion, noteRegion, report,
  } = app;

  const slideRef = useRef(null);
  const [slide, setSlide] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [annotations, setAnnotations] = useState(undefined); // undefined until loaded
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selectedPatch, setSelectedPatch] = useState(null);
  const [activeRegion, setActiveRegion] = useState(null);
  const [drawTool, setDrawTool] = useState(null);
  const [progress, setProgress] = useState(0);
  const stepIdx = useRef(-1);

  useEffect(() => {
    let cancelled = false;
    setSlide(null); setAnalysis(null); setAnnotations(undefined); setError(null);
    setActiveRegion(null); setSelectedPatch(null);
    Promise.all([api.getSlide(slideId), api.getAnalysis(slideId), api.getAnnotations(slideId), api.getReviews(slideId)])
      .then(([s, a, ann, rev]) => {
        if (cancelled) return;
        setSlide(s);
        setAnalysis(a);
        initRegions(a.slide_id, a.regions);
        applyReviews(rev.reviews);
        setAnnotations(ann.annotations || []);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [slideId]); // eslint-disable-line react-hooks/exhaustive-deps

  const patches = analysis?.top_patches || [];
  const summary = analysis ? {
    ...analysis.slide_summary, confidence: analysis.prob_tumor,
    tumor_area_pct: report?.tumor_area_pct ?? null,
    largest_deposit_mm: report?.largest_deposit_mm ?? null,
    category: report?.category ?? null,
  } : null;
  const viewerAnalyzed = analyzed && !!analysis;

  const runAnalysis = () => {
    setRunning(true);
    setProgress(0);
    const t0 = Date.now();
    const iv = setInterval(() => {
      const e = Math.min(1, (Date.now() - t0) / 2100);
      setProgress(e * 100);
      if (e >= 1) { clearInterval(iv); setRunning(false); setAnalyzed(true); }
    }, 30);
  };

  const selectRegion = (id) => {
    setActiveRegion(id);
    setHovered(id);
    const tp = patches.filter((p) => p.region_id === id).sort((a, b) => (a.rank || 0) - (b.rank || 0))[0];
    setSelectedPatch(tp || null);
    slideRef.current?.focusRegion(id);
  };
  const nextRegion = () => {
    const list = [...regions].sort((a, b) => (b.conf || 0.92) - (a.conf || 0.92));
    if (!list.length) return;
    stepIdx.current = (stepIdx.current + 1) % list.length;
    selectRegion(list[stepIdx.current].id);
  };
  const pickPatch = (p) => { setSelectedPatch(p); setActiveRegion(p.region_id); slideRef.current?.focusPatch(p); };
  const pickAnnotation = (a) => slideRef.current?.focusAnnotation(a);

  // --- persisted AI-region review ---
  const persistReview = (id, patch) => api.putReview(slideId, id, patch).catch(() => {});
  const onConfirm = (id) => { const r = regions.find((x) => x.id === id); const review = r?.review === 'confirmed' ? 'pending' : 'confirmed'; confirmRegion(id); persistReview(id, { review, cls: r?.cls, note: r?.docNote || '' }); };
  const onDismiss = (id) => { const r = regions.find((x) => x.id === id); const review = r?.review === 'dismissed' ? 'pending' : 'dismissed'; dismissRegion(id); persistReview(id, { review, cls: r?.cls, note: r?.docNote || '' }); };
  const onRelabelReview = (id, cls) => { const r = regions.find((x) => x.id === id); const review = r?.review === 'pending' ? 'confirmed' : r?.review; relabelRegion(id, cls); persistReview(id, { review, cls, note: r?.docNote || '' }); };
  const onNoteReview = (id, note) => { const r = regions.find((x) => x.id === id); noteRegion(id, note); persistReview(id, { review: r?.review || 'pending', cls: r?.cls, note }); };

  // --- annotations (Annotorious v2 events; the popup editor handles class + comments) ---
  const onAnnotationCreate = (a) => { setAnnotations((prev) => [...(prev || []), a]); api.createAnnotation(slideId, a).catch(() => {}); setDrawTool(null); };
  const onAnnotationUpdate = (a) => { setAnnotations((prev) => (prev || []).map((x) => (x.id === a.id ? a : x))); api.updateAnnotation(slideId, a.id, a).catch(() => {}); };
  const onAnnotationDeleteEvent = (id) => { setAnnotations((prev) => (prev || []).filter((x) => x.id !== id)); api.deleteAnnotation(slideId, id).catch(() => {}); };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      <TopBar running={running} analyzed={analyzed} onRun={runAnalysis} slideName={slide?.name}
        onReanalyze={runAnalysis} onReport={() => go('report')} onNarrate={() => setNarrate(true)}
        onAsk={() => setQaOpen(!qaOpen)} qaOpen={qaOpen} onUpload={() => go('upload')} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftPanel {...{ analyzed, regions, activeRegion, slideId: slideId, summary,
          addMode: drawTool, setAddMode: setDrawTool, onNext: nextRegion,
          onConfirm, onDismiss, onRelabel: onRelabelReview, onNote: onNoteReview,
          annotations, onPickAnnotation: pickAnnotation }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {slide && (
              <OsdViewer ref={slideRef} slide={slide} regions={regions} analyzed={viewerAnalyzed}
                overlayUrl={analysis?.attention_overlay_url}
                selectedRegion={activeRegion} hoveredRegion={hovered} selectedPatch={selectedPatch} onPickRegion={selectRegion}
                annotations={annotations} drawTool={drawTool} onSetDrawTool={setDrawTool}
                onAnnotationCreate={onAnnotationCreate} onAnnotationUpdate={onAnnotationUpdate} onAnnotationDelete={onAnnotationDeleteEvent} />
            )}
            {!slide && !error && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-lo)' }} className="mono">loading whole-slide image…</div>}
            {error && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-mid)', padding: 24, textAlign: 'center' }}>Couldn’t load the slide.<br /><span className="mono" style={{ fontSize: 12, color: 'var(--text-lo)' }}>{error}</span></div>}
            {running && <RunningOverlay progress={progress} />}
          </div>

          <EvidenceStrip {...{ analyzed: viewerAnalyzed, patches, regions, selectedId: selectedPatch?.patch_id, onHover: setHovered, onPick: pickPatch }} />
        </div>

        {qaOpen && <QAPanel onClose={() => setQaOpen(false)} onCite={selectRegion} dock slideName={slide?.name} />}
      </div>
    </div>
  );
}
