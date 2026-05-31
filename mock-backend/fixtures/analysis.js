/* ============================================================
   Oncoscope mock-backend — canned AI analysis (the STUB part).
   Shape follows the real backend contract: slide-level prediction,
   top attention patches in level-0 px, regions, and a slide summary.
   Coordinates are placed on real A05 tissue (verified against the
   level-17 tiles). The real backend replaces this with model output.

   `mpp` 0.25 µm/px (placeholder). Patches are 256-aligned so each
   patch thumbnail == one level-17 DZI tile (col=x/256, row=y/256).
   ============================================================ */

const A05 = {
  slide_id: 'A05',
  prediction: 'tumor',
  prob_tumor: 0.94,
  threshold: 0.001,
  num_patches: 16329,
  coordinate_space: 'level0',
  patch_size: 256,

  // slide-level clinical summary (design needs these; flagged optional in the contract)
  slide_summary: {
    call: 'POSITIVE',
    call_label: 'Metastatic carcinoma identified',
    category: 'pN1 (macrometastasis)',
    tumor_area_pct: 7.5,
    largest_deposit_mm: 3.0,
    region_count: 5,
  },

  // AI regions of interest — bbox + center in level-0 px
  regions: [
    { region_id: 'R1', cls: 'tumor',     confidence: 0.96, label: 'Macrometastasis',  cx: 59000, cy: 18500, bbox: { x: 53000, y: 13500, w: 12000, h: 10000 }, dim: '3.0 × 2.5 mm', area_mm2: 5.9, note: 'Confluent sheets of large pleomorphic cells effacing nodal architecture.' },
    { region_id: 'R2', cls: 'tumor',     confidence: 0.90, label: 'Metastatic focus', cx: 24192, cy: 20608, bbox: { x: 21442, y: 18108, w: 5500,  h: 5000  }, dim: '1.4 × 1.3 mm', area_mm2: 1.35, note: 'Cohesive epithelial nest within densely lymphoid stroma.' },
    { region_id: 'R5', cls: 'tumor',     confidence: 0.88, label: 'Metastatic focus', cx: 60500, cy: 21500, bbox: { x: 58100, y: 19300, w: 4800,  h: 4400  }, dim: '1.2 × 1.1 mm', area_mm2: 1.0, note: 'Irregular gland-forming aggregate, high N:C ratio.' },
    { region_id: 'R3', cls: 'uncertain', confidence: 0.74, label: 'Indeterminate',    cx: 54912, cy: 65664, bbox: { x: 52662, y: 63664, w: 4500,  h: 4000  }, dim: '1.1 × 1.0 mm', area_mm2: 0.88, note: 'Atypical cells in loose sinus stroma — recommend review.' },
    { region_id: 'R4', cls: 'uncertain', confidence: 0.66, label: 'Indeterminate',    cx: 24192, cy: 63616, bbox: { x: 22192, y: 61716, w: 4000,  h: 3800  }, dim: '1.0 × 0.95 mm', area_mm2: 0.75, note: 'Small atypical cluster, possible isolated tumor cells.' },
  ],

  // ranked attention patches (level-0 px, 256-aligned → tile = [x/256, y/256])
  top_patches: [
    { patch_id: 'A05:p1', region_id: 'R1', rank: 1, x: 58880, y: 18432, width: 256, height: 256, attention: 0.0041, score: 0.96, tile: [230, 72] },
    { patch_id: 'A05:p2', region_id: 'R1', rank: 2, x: 59904, y: 18944, width: 256, height: 256, attention: 0.0039, score: 0.94, tile: [234, 74] },
    { patch_id: 'A05:p3', region_id: 'R2', rank: 3, x: 24064, y: 20480, width: 256, height: 256, attention: 0.0036, score: 0.90, tile: [94, 80] },
    { patch_id: 'A05:p4', region_id: 'R5', rank: 4, x: 60416, y: 21504, width: 256, height: 256, attention: 0.0033, score: 0.88, tile: [236, 84] },
    { patch_id: 'A05:p5', region_id: 'R3', rank: 5, x: 54784, y: 65536, width: 256, height: 256, attention: 0.0026, score: 0.74, tile: [214, 256] },
    { patch_id: 'A05:p6', region_id: 'R2', rank: 6, x: 23808, y: 20992, width: 256, height: 256, attention: 0.0024, score: 0.72, tile: [93, 82] },
    { patch_id: 'A05:p7', region_id: 'R4', rank: 7, x: 24064, y: 63488, width: 256, height: 256, attention: 0.0019, score: 0.66, tile: [94, 248] },
    { patch_id: 'A05:p8', region_id: 'R3', rank: 8, x: 55296, y: 65792, width: 256, height: 256, attention: 0.0016, score: 0.63, tile: [216, 257] },
  ],
};

export const ANALYSIS = { A05 };

/* Build the response with absolute artifact URLs (mirrors S3/GCS links).
   `dziSlide` is the DZI folder that actually holds tiles — in this mock every
   catalog/uploaded slide is a stand-in backed by the single A05 pyramid. */
export function analysisResponse(slideId, base, dziSlide = slideId) {
  const a = ANALYSIS[dziSlide] || ANALYSIS.A05;
  if (!a) return null;
  const tileUrl = (col, row) => `${base}/dzi/${dziSlide}_files/17/${col}_${row}.jpeg`;
  return {
    ...a,
    slide_id: slideId,
    thumbnail_url: `${base}/dzi/${dziSlide}_files/8/0_0.jpeg`, // level-8 = whole-slide thumbnail
    attention_overlay_url: null, // real backend supplies a heatmap PNG/DZI here; frontend renders from regions otherwise
    top_patches: a.top_patches.map((p) => ({ ...p, thumbnail_url: tileUrl(p.tile[0], p.tile[1]) })),
  };
}
