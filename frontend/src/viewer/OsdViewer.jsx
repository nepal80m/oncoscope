/* ============================================================
 * Oncoscope — OpenSeadragon viewer + chrome + AI overlays + annotations
 * M1: tiles/pan/zoom.  M2: magnification, scale bar, overview, AI panel.
 * M4: AI region boxes, heatmap overlay, selected-patch pulse, fly-to.
 * M5: Annotorious **v2** (Recogito — the wsi-annotation-demo stack) for
 *     the pathologist's annotation layer: rectangle/polygon/freehand
 *     drawing rendered as SVG, a built-in comment + class-tag editor,
 *     and load/persist via events. (v2 + OpenSeadragon 3.)
 * ============================================================ */
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import SelectorPack from '@recogito/annotorious-selector-pack';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';
import { clsColor, tumorRGB } from '../lib/tissue.js';
import { toW3C, annoBounds } from '../lib/annoFormat.js';
import { Icons } from '../components/Icons.jsx';

const MAG_STEPS = [4, 10, 20, 40];
const BAR_TARGETS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const VIOLET = [106, 90, 224];
const TOOLS = [['rect', 'Box'], ['polygon', 'Polygon'], ['freehand', 'Freehand']];

// color the SVG shape by its class tag (set via the editor's TAG widget)
function annoFormatter(annotation) {
  const bodies = annotation.bodies || annotation.body || [];
  const tag = (Array.isArray(bodies) ? bodies : [bodies]).find((b) => b && b.purpose === 'tagging');
  const cls = (tag?.value || '').toLowerCase();
  const c = cls === 'tumor' ? 'onco-tumor' : cls === 'uncertain' ? 'onco-uncertain' : cls === 'benign' ? 'onco-benign' : '';
  return 'onco-anno' + (c ? ' ' + c : '');
}

function readScale(viewer, imageWidth, mpp, nativeMag) {
  const vp = viewer.viewport;
  const bounds = vp.getBounds(true);
  const containerPx = vp.getContainerSize().x;
  if (!bounds.width || !containerPx || !imageWidth) return null;
  const screenPxPerImagePx = containerPx / (bounds.width * imageWidth);
  return { screenPxPerImagePx, umPerScreenPx: mpp / screenPxPerImagePx, effectiveMag: nativeMag * screenPxPerImagePx };
}
function pickBar(umPerScreenPx) {
  let um = BAR_TARGETS[BAR_TARGETS.length - 1];
  for (const t of BAR_TARGETS) { um = t; if (t / umPerScreenPx >= 70) break; }
  return { um, px: um / umPerScreenPx };
}
const nearestMag = (m) => MAG_STEPS.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
const fmtMag = (m) => (m >= 1 ? `${Math.round(m)}×` : `${m.toFixed(1)}×`);
const boxOf = (r) => r.bbox || { x: r.cx - (r.rx || 120), y: r.cy - (r.ry || 120), w: (r.rx || 120) * 2, h: (r.ry || 120) * 2 };

function drawRegionHeatmap(canvas, regions, slideW, slideH) {
  const K = Math.max(1, Math.ceil(Math.max(slideW, slideH) / 1600));
  canvas.width = Math.max(1, Math.ceil(slideW / K));
  canvas.height = Math.max(1, Math.ceil(slideH / K));
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const r of regions) {
    if (r.review === 'dismissed' || r.cls === 'benign') continue;
    const bb = boxOf(r);
    const cx = (bb.x + bb.w / 2) / K, cy = (bb.y + bb.h / 2) / K;
    const rad = (Math.max(bb.w, bb.h) / K) * 0.95;
    const rgb = r.cls === 'uncertain' ? VIOLET : tumorRGB(r.conf != null ? r.conf : 0.92);
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
    g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.28)`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad, rad, 0, 0, 6.283);
    ctx.fill();
  }
}

const OsdViewer = forwardRef(function OsdViewer(props, ref) {
  const { slide, regions = [], analyzed, overlayUrl, selectedRegion, hoveredRegion, selectedPatch, onPickRegion,
    annotations, drawTool, onSetDrawTool, onAnnotationCreate, onAnnotationUpdate, onAnnotationDelete } = props;
  const elRef = useRef(null);
  const viewerRef = useRef(null);
  const annoRef = useRef(null);
  const overviewRef = useRef(null);
  const loadedRef = useRef(false);
  const cbRef = useRef({});
  cbRef.current = { onAnnotationCreate, onAnnotationUpdate, onAnnotationDelete };
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(null);
  const [heatUrl, setHeatUrl] = useState(null);
  const [, setTick] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [opacity, setOpacity] = useState(0.72);

  const dziUrl = slide?.dzi_url;
  const imageWidth = slide?.width;
  const imageHeight = slide?.height;
  const mpp = slide?.mpp ?? 0.25;
  const nativeMag = slide?.magnification ?? 40;

  useEffect(() => {
    if (!elRef.current || !dziUrl) return undefined;

    const navEl = document.createElement('div');
    navEl.id = `osd-nav-${Math.random().toString(36).slice(2)}`;
    navEl.style.width = '150px';
    navEl.style.height = `${Math.round((150 * (imageHeight || 1)) / (imageWidth || 1))}px`;
    overviewRef.current?.appendChild(navEl);

    const viewer = OpenSeadragon({
      element: elRef.current,
      tileSources: dziUrl,
      crossOriginPolicy: 'Anonymous',
      ajaxWithCredentials: false,
      showNavigator: true,
      navigatorId: navEl.id,
      showNavigationControl: false,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      zoomPerScroll: 1.4,
      animationTime: 0.5,
      springStiffness: 7,
      minZoomImageRatio: 0.7,
      maxZoomPixelRatio: 2.5,
      visibilityRatio: 1,
    });
    viewerRef.current = viewer;
    loadedRef.current = false;

    // Annotorious v2 annotation layer (SVG) — pathologist marks + comment/tag editor
    let anno = null;
    try {
      anno = Annotorious(viewer, {
        widgets: ['COMMENT', { widget: 'TAG', vocabulary: ['Tumor', 'Uncertain', 'Benign'] }],
        formatters: [annoFormatter],
      });
      SelectorPack(anno);
      anno.on('createAnnotation', (a) => { viewer.setMouseNavEnabled(true); cbRef.current.onAnnotationCreate?.(toW3C(a)); });
      anno.on('updateAnnotation', (a) => cbRef.current.onAnnotationUpdate?.(toW3C(a)));
      anno.on('deleteAnnotation', (a) => cbRef.current.onAnnotationDelete?.(a.id));
      anno.on('startSelection', () => viewer.setMouseNavEnabled(false));
      anno.on('cancelSelected', () => viewer.setMouseNavEnabled(true));
      annoRef.current = anno;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Annotorious v2 init failed', e);
    }

    const update = () => { const s = readScale(viewer, imageWidth, mpp, nativeMag); if (s) setScale(s); };
    let raf = 0;
    const onViewport = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; setTick((t) => t + 1); }); };

    viewer.addHandler('open', () => { setReady(true); update(); });
    viewer.addHandler('zoom', update);
    viewer.addHandler('resize', update);
    viewer.addHandler('animation', update);
    ['update-viewport', 'animation', 'pan', 'zoom', 'resize'].forEach((ev) => viewer.addHandler(ev, onViewport));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { annoRef.current?.destroy?.(); } catch { /* noop */ }
      annoRef.current = null;
      viewer.destroy();
      navEl.remove();
      viewerRef.current = null;
      setReady(false);
    };
  }, [dziUrl, imageWidth, imageHeight, mpp, nativeMag]);

  // heatmap: prefer the model's real attention-overlay PNG (stretched over the
  // slide bounds); fall back to a region-derived heatmap only if none exists.
  useEffect(() => {
    if (!imageWidth || !analyzed) { setHeatUrl(null); return; }
    if (overlayUrl) { setHeatUrl(overlayUrl); return; }
    const c = document.createElement('canvas');
    drawRegionHeatmap(c, regions, imageWidth, imageHeight);
    setHeatUrl(c.toDataURL());
  }, [regions, analyzed, imageWidth, imageHeight, overlayUrl]);

  // load persisted annotations once
  useEffect(() => {
    const anno = annoRef.current;
    if (!anno || !ready || loadedRef.current || !Array.isArray(annotations)) return;
    try { anno.setAnnotations(annotations); } catch { /* noop */ }
    loadedRef.current = true;
  }, [annotations, ready]);

  // drawing tool
  useEffect(() => {
    const anno = annoRef.current;
    if (!anno || !ready) return;
    if (drawTool) { try { anno.setDrawingTool(drawTool); anno.setDrawingEnabled(true); } catch { /* noop */ } }
    else { try { anno.setDrawingEnabled(false); viewerRef.current?.setMouseNavEnabled(true); } catch { /* noop */ } }
  }, [drawTool, ready]);

  const flyTo = (bb, pad) => {
    const v = viewerRef.current;
    if (!v) return;
    const px = bb.w * pad, py = bb.h * pad;
    v.viewport.fitBounds(v.viewport.imageToViewportRectangle(new OpenSeadragon.Rect(bb.x - px, bb.y - py, bb.w + 2 * px, bb.h + 2 * py)), false);
  };
  useImperativeHandle(ref, () => ({
    focusRegion(id) { const r = regions.find((x) => x.id === id); if (r) flyTo(boxOf(r), 0.5); },
    focusPatch(p) { if (p) flyTo({ x: p.x, y: p.y, w: p.width, h: p.height }, 4); },
    focusAnnotation(a) { const bb = annoBounds(a); if (bb) flyTo(bb, 0.6); },
    reset() { viewerRef.current?.viewport.goHome(); },
  }), [regions]);

  const zoomBy = (f) => { const v = viewerRef.current; if (!v) return; v.viewport.zoomBy(f); v.viewport.applyConstraints(); };
  const home = () => viewerRef.current?.viewport.goHome();
  const goToMag = (target) => {
    const v = viewerRef.current; if (!v) return;
    const s = readScale(v, imageWidth, mpp, nativeMag); if (!s) return;
    v.viewport.zoomTo(v.viewport.getZoom(true) * (target / nativeMag / s.screenPxPerImagePx));
    v.viewport.applyConstraints();
  };

  const activeMag = scale ? nearestMag(scale.effectiveMag) : null;
  const bar = scale ? pickBar(scale.umPerScreenPx) : null;
  const vp = viewerRef.current?.viewport;
  const showBoxes = analyzed && showOverlay && ready && vp;
  const selPatch = selectedPatch && typeof selectedPatch === 'object' ? selectedPatch : null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div ref={elRef} style={stage} />

      {/* AI overlays (heatmap + region boxes), synced to the viewport */}
      {showBoxes && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12 }}>
          {heatUrl && (() => {
            const tl = vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(0, 0));
            const br = vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(imageWidth, imageHeight));
            return <img key="heat-overlay" src={heatUrl} alt="" style={{ position: 'absolute', left: tl.x, top: tl.y, width: br.x - tl.x, height: br.y - tl.y, opacity, pointerEvents: 'none' }} />;
          })()}
          {regions.map((r) => {
            const bb = boxOf(r);
            const tl = vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(bb.x, bb.y));
            const br = vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(bb.x + bb.w, bb.y + bb.h));
            let left = tl.x, top = tl.y, width = br.x - tl.x, height = br.y - tl.y;
            if (width < 0 || height < 0) return null;
            const MIN = 18; // keep tiny 256-px attention spots clickable at slide scale
            if (width < MIN) { left -= (MIN - width) / 2; width = MIN; }
            if (height < MIN) { top -= (MIN - height) / 2; height = MIN; }
            const dismissed = r.review === 'dismissed';
            const confirmed = r.review === 'confirmed';
            const col = dismissed ? '#9aa0a7' : clsColor(r);
            const hot = r.id === selectedRegion || r.id === hoveredRegion || (selPatch && selPatch.region_id === r.id);
            const labelTxt = r.rank ? `${r.id} · #${r.rank}` : r.id;
            return (
              <div key={r.id} onClick={(e) => { e.stopPropagation(); onPickRegion && onPickRegion(r.id); }}
                style={{ position: 'absolute', left, top, width, height, borderRadius: 4,
                  border: `${hot ? 2 : 1.5}px ${dismissed ? 'dashed' : 'solid'} ${col}`,
                  boxShadow: hot ? `0 0 0 3px ${col}22` : 'none', opacity: dismissed ? 0.62 : 1,
                  background: hot ? `${col}10` : 'transparent', cursor: drawTool ? 'crosshair' : 'pointer',
                  pointerEvents: drawTool ? 'none' : 'auto', transition: 'box-shadow .15s, background .15s' }}>
                <div className="mono" style={{ position: 'absolute', top: -21, left: -1.5, display: 'flex', gap: 5, alignItems: 'center',
                  padding: '2px 7px', borderRadius: 4, background: col, color: '#fff', fontSize: 10.5, fontWeight: 600,
                  whiteSpace: 'nowrap', boxShadow: 'var(--shadow-1)', textDecoration: dismissed ? 'line-through' : 'none' }}>{labelTxt}</div>
                {confirmed && <span style={badge('var(--confirm)')}><Icons.check size={12} /></span>}
                {dismissed && <span style={badge('#9aa0a7')}><Icons.close size={11} /></span>}
              </div>
            );
          })}
        </div>
      )}

      {/* selected-patch pulse */}
      {showBoxes && selPatch && (() => {
        const c = vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(selPatch.x + selPatch.width / 2, selPatch.y + selPatch.height / 2));
        return <div style={{ position: 'absolute', left: c.x - 9, top: c.y - 9, width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', background: 'rgba(255,255,255,0.4)', animation: 'pulse-ring 1.5s ease-out infinite', pointerEvents: 'none', zIndex: 13 }} />;
      })()}

      {/* annotation drawing toolbar (top-center) */}
      <div style={{ ...chrome, position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, borderRadius: 8, padding: 4, zIndex: 15 }}>
        <span className="mono" style={{ fontSize: 9.5, color: '#9aa0a7', alignSelf: 'center', padding: '0 6px', letterSpacing: '.04em' }}>ANNOTATE</span>
        {TOOLS.map(([t, label]) => (
          <button key={t} onClick={() => onSetDrawTool?.(drawTool === t ? null : t)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: drawTool === t ? ACCENT : 'transparent', color: drawTool === t ? '#fff' : '#3c424a' }}>
            <Icons.plus size={13} /> {label}
          </button>
        ))}
      </div>
      {drawTool && (
        <div className="mono" style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 15, padding: '5px 12px', borderRadius: 100, background: ACCENT, color: '#fff', fontSize: 11, fontWeight: 600, boxShadow: 'var(--shadow-2)' }}>
          {drawTool === 'polygon' ? 'Click points; click the first to close, then add a comment' : drawTool === 'freehand' ? 'Drag to draw freehand, then add a comment' : 'Drag a box over the area, then add a comment'}
        </div>
      )}

      {/* magnification */}
      <div style={{ ...chrome, position: 'absolute', top: 14, left: 14, display: 'flex', borderRadius: 7, overflow: 'hidden', zIndex: 14 }} className="mono">
        {MAG_STEPS.map((m, i) => (
          <button key={m} onClick={() => goToMag(m)}
            style={{ padding: '6px 11px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer',
              color: activeMag === m ? '#fff' : '#6a7178', background: activeMag === m ? ACCENT : 'transparent',
              borderRight: i < MAG_STEPS.length - 1 ? '1px solid #e7e5de' : 'none' }}>{m}×</button>
        ))}
      </div>

      {/* scale bar */}
      {bar && (
        <div style={{ ...chrome, position: 'absolute', top: 58, left: 14, padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start', zIndex: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ width: Math.round(bar.px), height: 4, background: '#1c2024', borderRadius: 1, position: 'relative' }}>
              <span style={tick(0)} /><span style={tick(1)} />
            </div>
            <span className="mono" style={{ fontSize: 11, color: '#1b1f23', fontWeight: 600 }}>{bar.um >= 1000 ? `${bar.um / 1000} mm` : `${bar.um} µm`}</span>
          </div>
          <span className="mono" style={{ fontSize: 9.5, color: '#9aa0a7', letterSpacing: '.03em' }}>{fmtMag(scale.effectiveMag)} · {scale.umPerScreenPx.toFixed(2)} µm/px</span>
        </div>
      )}

      {/* AI overlay control panel */}
      <div style={{ ...chrome, position: 'absolute', top: 116, left: 14, width: showOverlay ? 212 : 'auto', borderRadius: 9, padding: '9px 11px', zIndex: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icons.layers size={14} style={{ color: showOverlay ? 'var(--accent-ink)' : 'var(--text-lo)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1b1f23', whiteSpace: 'nowrap' }}>AI overlay</span>
          </span>
          <button role="switch" aria-checked={showOverlay} onClick={() => setShowOverlay((v) => !v)}
            style={{ width: 30, height: 17, borderRadius: 17, padding: 2, position: 'relative', cursor: 'pointer', background: showOverlay ? ACCENT : '#efeee9', border: '1px solid ' + (showOverlay ? '#0a6a61' : '#d9d7ce') }}>
            <span style={{ position: 'absolute', top: 2, left: showOverlay ? 16 : 2, width: 11, height: 11, borderRadius: '50%', background: showOverlay ? '#fff' : '#9aa0a7', transition: 'left .18s' }} />
          </button>
        </div>
        {showOverlay && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.05em', color: '#9aa0a7' }}>OPACITY</span>
              <input type="range" min={0} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(+e.target.value)} style={{ flex: 1, accentColor: ACCENT }} />
              <span className="mono" style={{ fontSize: 11, color: '#1b1f23', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{Math.round(opacity * 100)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, marginTop: 9, background: 'linear-gradient(90deg, #e0920f, #df661f, #d23b40)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }} className="mono">
              <span style={{ fontSize: 8.5, color: '#9aa0a7' }}>BENIGN</span><span style={{ fontSize: 8.5, color: '#9aa0a7' }}>TUMOR</span>
            </div>
          </div>
        )}
      </div>

      {/* overview navigator */}
      <div style={{ ...chrome, position: 'absolute', top: 14, right: 14, padding: 6, borderRadius: 8, zIndex: 14 }}>
        <div ref={overviewRef} style={{ width: 150, borderRadius: 4, overflow: 'hidden', background: '#e8e7e2', lineHeight: 0 }} />
        <div className="mono" style={{ fontSize: 9.5, color: '#9aa0a7', marginTop: 4, textAlign: 'center', letterSpacing: '.04em' }}>SLIDE OVERVIEW</div>
      </div>

      {/* zoom controls */}
      <div style={{ ...chrome, position: 'absolute', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', borderRadius: 8, overflow: 'hidden', zIndex: 14 }}>
        <button style={zoomBtn} onClick={() => zoomBy(1.4)} title="Zoom in">+</button>
        <button style={{ ...zoomBtn, borderTop: '1px solid #e7e5de' }} onClick={() => zoomBy(1 / 1.4)} title="Zoom out">−</button>
        <button style={{ ...zoomBtn, borderTop: '1px solid #e7e5de', fontSize: 12 }} onClick={home} title="Fit to screen">fit</button>
      </div>
    </div>
  );
});

export default OsdViewer;

const ACCENT = '#0e8c80';
// width/height:100% (not just inset:0) — OSD 3 sets the mount element to
// position:relative, which would otherwise collapse an inset-only element to 0 height.
const stage = { position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'radial-gradient(130% 130% at 50% 35%, #f0efeb 0%, #e4e3de 100%)' };
const chrome = { background: 'rgba(255,255,255,0.92)', border: '1px solid #d9d7ce', backdropFilter: 'blur(6px)', boxShadow: '0 1px 2px rgba(28,30,25,0.05), 0 1px 3px rgba(28,30,25,0.05)' };
const zoomBtn = { width: 40, height: 40, fontSize: 20, lineHeight: 1, cursor: 'pointer', border: 'none', background: 'transparent', color: '#3c424a' };
const tick = (right) => ({ position: 'absolute', bottom: -1, [right ? 'right' : 'left']: 0, width: 1.5, height: 9, background: '#1c2024' });
const badge = (bg) => ({ position: 'absolute', top: -9, right: -9, width: 18, height: 18, borderRadius: '50%', background: bg, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-1)' });
