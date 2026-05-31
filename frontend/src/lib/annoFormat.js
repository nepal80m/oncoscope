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

/* Level-0 px bounding box of a (W3C) annotation, for fly-to. Handles both the
   FragmentSelector (rect) and SvgSelector (polygon/freehand) shapes we persist. */
export function annoBounds(a) {
  const sel = a?.target?.selector || {};
  if (sel.type === 'FragmentSelector' && typeof sel.value === 'string') {
    const m = sel.value.match(/xywh=(?:pixel:)?(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/);
    if (m) return { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
  }
  if (sel.type === 'SvgSelector' && typeof sel.value === 'string') {
    const pts = [...sel.value.matchAll(/(-?\d[\d.]*),(-?\d[\d.]*)/g)].map((mm) => [+mm[1], +mm[2]]);
    if (pts.length) {
      const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
      const x = Math.min(...xs); const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
  }
  return null;
}

/* class tag + first comment of an annotation, for list rows. */
export function annoMeta(a) {
  const body = a?.bodies || a?.body || [];
  const arr = Array.isArray(body) ? body : [body];
  const tag = arr.find((x) => x && x.purpose === 'tagging')?.value || '';
  const comment = arr.find((x) => x && x.purpose === 'commenting')?.value || '';
  return { tag, comment };
}
