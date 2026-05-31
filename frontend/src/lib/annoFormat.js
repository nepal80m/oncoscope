/* ============================================================
   Oncoscope — normalize Annotorious v2 annotations to W3C.
   Our @recogito/annotorious-openseadragon emits a createAnnotation
   payload with an internal selector ({type:'RECTANGLE', geometry})
   that setAnnotations() does NOT re-render. setAnnotations *does*
   render W3C FragmentSelector / SvgSelector, so we persist W3C.
   Geometry is in level-0 image px either way.
   ============================================================ */
export function toW3C(a) {
  const sel = a?.target?.selector || {};
  const body = a.bodies || a.body || [];
  const base = { '@context': 'http://www.w3.org/ns/anno.jsonld', id: a.id, type: 'Annotation', body };

  // already W3C → pass through
  if (sel.type === 'FragmentSelector' || sel.type === 'SvgSelector') {
    return { ...base, target: { source: a.target?.source, selector: sel } };
  }

  const g = sel.geometry || {};
  const isRect = sel.type === 'RECTANGLE' || (g.w != null && g.h != null && !g.points);
  if (isRect) {
    const x = g.x ?? g.bounds?.minX ?? 0;
    const y = g.y ?? g.bounds?.minY ?? 0;
    const w = g.w ?? ((g.bounds?.maxX ?? 0) - (g.bounds?.minX ?? 0));
    const h = g.h ?? ((g.bounds?.maxY ?? 0) - (g.bounds?.minY ?? 0));
    return { ...base, target: { source: a.target?.source, selector: { type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: `xywh=pixel:${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}` } } };
  }

  // polygon / freehand / circle → SVG selector
  const pts = (g.points || []).map((p) => (Array.isArray(p) ? `${Math.round(p[0])},${Math.round(p[1])}` : `${Math.round(p.x)},${Math.round(p.y)}`)).join(' ');
  return { ...base, target: { source: a.target?.source, selector: { type: 'SvgSelector', value: `<svg><polygon points="${pts}"></polygon></svg>` } } };
}
