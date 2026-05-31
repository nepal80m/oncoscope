/* ============================================================
 * Oncoscope — analysis adapter.
 * Normalizes the real result.json (+ its manifest entry) into the
 * shape the screens already consume.
 *
 * Honest mapping of the model's actual output:
 *  - `regions` / `top_patches` are high-ATTENTION 256-px spots in
 *    level-0 px — NOT confirmed tumor. Attention is ~flat across
 *    spots, so it is not a per-region probability → we surface
 *    `rank`, never a fabricated per-region %.
 *  - the model gives no per-region class → default to 'uncertain'
 *    ("needs review"); the pathologist relabels.
 *  - clinical staging (pN, mm, tumor-area %, notes) is NOT produced
 *    by the model → left null here; pathologist-entered in the
 *    editable report (Firestore, B4).
 *  - the slide-level call + probability ARE real model outputs.
 * ============================================================ */
import { absUrl } from './gcsConfig.js';

const num = (v, d = null) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function adaptAnalysis(result = {}, manifestEntry = {}) {
  const dims = result.slide_dimensions || {};
  const thumb = manifestEntry.thumbnail_url || null;

  // Emit the backend-region shape that AppState.mapAnalysisRegion expects
  // (region_id, confidence, area_mm2, …) plus rank/attention/crop_url.
  const regions = (result.regions || []).map((r) => ({
    region_id: r.region_id,
    cls: 'uncertain', // model emits no class → neutral "review" until relabeled
    confidence: null, // attention is not a probability
    rank: num(r.rank),
    attention: num(r.attention_max ?? r.attention),
    label: 'High-attention region',
    cx: num(r.centroid_x, r.x + (r.width || 256) / 2),
    cy: num(r.centroid_y, r.y + (r.height || 256) / 2),
    bbox: { x: r.x, y: r.y, w: r.width || 256, h: r.height || 256 },
    dim: null,
    area_mm2: null,
    note: null, // pathologist describes in the report
    crop_url: absUrl(r.crop_url), // real GCS crop, or null (no misleading fallback)
  }));

  // link a top-patch to a region when they sit at the same level-0 origin
  const regionByXY = new Map(regions.map((r) => [`${r.bbox.x}_${r.bbox.y}`, r.region_id]));

  const top_patches = (result.top_patches || []).map((p) => ({
    patch_id: p.patch_id ?? `${p.x}_${p.y}`,
    rank: num(p.rank),
    attention: num(p.attention),
    score: null, // no calibrated per-patch probability from attention
    x: p.x,
    y: p.y,
    width: p.width || 256,
    height: p.height || 256,
    region_id: regionByXY.get(`${p.x}_${p.y}`) ?? null,
    thumbnail_url: absUrl(p.crop_url), // real GCS crop, or null → strip shows a placeholder
  }));

  const positive = result.prediction === 'tumor';

  return {
    slide_id: result.slide_id,
    prediction: result.prediction,
    prob_tumor: num(result.prob_tumor, 0),
    display_probability: result.display_probability || null,
    review_priority: result.review_priority || null,
    operating_threshold: num(result.operating_threshold),
    num_patches: num(result.num_patches),
    coordinate_space: result.coordinate_space || 'level0',
    patch_size: num(result.patch_size, 256),
    width: num(dims.width),
    height: num(dims.height),
    thumbnail_url: thumb,
    attention_overlay_url: manifestEntry.attention_overlay_url || null,
    regions,
    top_patches,
    // slide-level call + probability are real; clinical staging is pathologist-entered (null)
    slide_summary: {
      call: positive ? 'POSITIVE' : 'NEGATIVE',
      call_label: positive
        ? 'High-attention regions flagged for review'
        : 'No high-attention regions of concern',
      confidence: num(result.prob_tumor, 0),
      display_probability: result.display_probability || null,
      review_priority: result.review_priority || null,
      region_count: regions.length,
      tumor_area_pct: null,
      largest_deposit_mm: null,
      category: null,
    },
  };
}
