/* ============================================================
 * Oncoscope — GCS read helpers.
 * Every read-only slide artifact lives in the public bucket
 * (manifest, result.json, report.json, DZI tiles, thumbnails,
 * overlays, crops). The browser fetches them directly — CORS is
 * open on the bucket — so there is no read backend.
 * ============================================================ */
export const GCS_BASE =
  import.meta.env.VITE_GCS_BASE || 'https://storage.googleapis.com/oncoscope-1';

const artifact = (id, p) => `${GCS_BASE}/artifacts/${id}/${p}`;

export const manifestUrl = () => `${GCS_BASE}/artifacts/manifest.json`;
export const dziUrl = (id) => artifact(id, `dzi/${id}.dzi`);
export const resultUrl = (id) => artifact(id, 'outputs/result.json');
export const reportUrl = (id) => artifact(id, 'outputs/report.json');
export const thumbnailUrl = (id) => artifact(id, 'thumbnails/thumbnail.jpg');
export const overlayUrl = (id) => artifact(id, 'overlays/attention_overlay.png');

/* Some crop_urls in result.json are relative server-fallback routes
   ("/slides/.../crop.jpg") whose files aren't in the bucket. Keep
   absolute GCS urls as-is; otherwise use the supplied fallback. */
export const absUrl = (u, fallback = null) =>
  (typeof u === 'string' && /^https?:\/\//.test(u)) ? u : fallback;
