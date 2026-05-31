/* ============================================================
 * Oncoscope — data client (single source of truth for the screens).
 *
 * READS come straight from the public GCS bucket (manifest, result.json,
 * DZI dimensions) via lib/gcsConfig + lib/adaptAnalysis — no read backend.
 * WRITES (annotations, reviews, comments, editable report) go to
 * Firestore, wired in B3/B4. Until then they are no-op stubs so the
 * screens work with nothing else running.
 *
 * The exported `api.*` surface is unchanged, so screens/components keep
 * calling api.getAnalysis(), api.createAnnotation(), etc.
 * ============================================================ */
import { manifestUrl, dziUrl, resultUrl, reportUrl, thumbnailUrl } from '../lib/gcsConfig.js';
import { adaptAnalysis } from '../lib/adaptAnalysis.js';
import { db } from '../lib/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}
async function getText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

/* ---- manifest (catalog index), fetched once ---- */
let _manifest = null;
function loadManifest() {
  if (!_manifest) _manifest = getJSON(manifestUrl()).catch((e) => { _manifest = null; throw e; });
  return _manifest;
}
const slideEntry = async (id) => ((await loadManifest()).slides || []).find((s) => s.slide_id === id) || {};

/* Shared slide metadata. The model/bucket don't carry per-slide specimen,
   scanner or mpp, so these are honest placeholders (CAMELYON16 H&E). */
const META = { specimen: 'Lymph node · CAMELYON16 test slide', stain: 'H&E', scanner: 'CAMELYON16 (scanner n/a)', mpp: 0.25, magnification: 40 };
const slideCard = (entry) => ({
  slide_id: entry.slide_id,
  name: entry.slide_id,
  label: entry.label || null,
  thumbnail_url: entry.thumbnail_url || thumbnailUrl(entry.slide_id),
  status: 'ready',
  ...META,
});

/* True pixel dimensions from the DZI xml (authoritative — OSD reads the same). */
async function dziDimensions(id) {
  try {
    const xml = await getText(dziUrl(id));
    const w = xml.match(/Width="(\d+)"/);
    const h = xml.match(/Height="(\d+)"/);
    return { width: w ? +w[1] : undefined, height: h ? +h[1] : undefined };
  } catch {
    return {};
  }
}

const norm = (s) => (s || '').trim().toLowerCase().replace(/\.(svs|tif|tiff|ndpi|mrxs|scn|dcm)$/, '');

/* ---- Firestore collections (mutable, per-slide) ---- */
const annCol = (sid) => collection(db, 'slides', sid, 'annotations');
const revCol = (sid) => collection(db, 'slides', sid, 'reviews');
const comCol = (sid) => collection(db, 'slides', sid, 'comments');
const repDoc = (sid) => doc(db, 'reports', sid);
const fid = (x) => encodeURIComponent(String(x)); // safe Firestore doc id from an arbitrary id

export const api = {
  /* ---- catalog (from manifest.json) ---- */
  listSlides: async () => {
    const m = await loadManifest();
    return { slides: (m.slides || []).map(slideCard) };
  },

  /* ---- slide detail (+ DZI tile source + true dimensions) ---- */
  getSlide: async (id) => {
    const entry = await slideEntry(id);
    const dims = await dziDimensions(id);
    return { ...slideCard({ slide_id: id, ...entry }), ...dims, dzi_url: dziUrl(id), created_at: new Date().toISOString() };
  },

  /* ---- AI analysis (real result.json, normalized) ---- */
  getAnalysis: async (id) => {
    const [entry, result] = await Promise.all([slideEntry(id), getJSON(resultUrl(id))]);
    return adaptAnalysis(result, entry);
  },

  /* ---- cache lookup: does the bucket already have this slide? ---- */
  lookupSlide: async (filename) => {
    const m = await loadManifest();
    const key = norm(filename);
    const hit = (m.slides || []).find((s) => norm(s.slide_id) === key);
    return hit ? { cached: true, slide_id: hit.slide_id, name: hit.slide_id } : { cached: false };
  },

  /* ---- annotations (pathologist's W3C marks) → Firestore ---- */
  getAnnotations: async (id) => {
    const snap = await getDocs(annCol(id));
    return { annotations: snap.docs.map((d) => d.data()) };
  },
  createAnnotation: async (id, ann) => { await setDoc(doc(annCol(id), fid(ann.id)), ann); return ann; },
  updateAnnotation: async (id, aid, ann) => { await setDoc(doc(annCol(id), fid(aid)), ann); return ann; },
  deleteAnnotation: async (id, aid) => { await deleteDoc(doc(annCol(id), fid(aid))); return null; },

  /* ---- AI-region review decisions → Firestore (one doc per region) ---- */
  getReviews: async (id) => {
    const snap = await getDocs(revCol(id));
    const reviews = {};
    snap.docs.forEach((d) => { reviews[decodeURIComponent(d.id)] = d.data(); });
    return { reviews };
  },
  putReview: async (id, regionId, body) => {
    const data = { review: body.review ?? 'pending', cls: body.cls ?? null, note: body.note ?? '', updated_at: new Date().toISOString() };
    await setDoc(doc(revCol(id), fid(regionId)), data);
    return data;
  },

  /* ---- threaded comments → Firestore ---- */
  getComments: async (id, targetType, targetId) => {
    const snap = await getDocs(query(comCol(id), where('target_type', '==', targetType), where('target_id', '==', targetId)));
    const comments = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
    return { comments };
  },
  addComment: async (id, body) => {
    const c = {
      target_type: body.target_type, target_id: body.target_id, text: body.text,
      parent_id: body.parent_id ?? null, author: body.author || { id: 'me', name: 'You' },
      created_at: new Date().toISOString(),
    };
    const ref = await addDoc(comCol(id), c);
    return { id: ref.id, ...c };
  },
  deleteComment: async (id, cid) => { await deleteDoc(doc(comCol(id), cid)); return null; },

  /* ---- editable report → Firestore (reports/{slideId}); lazy-seeded from
     the bucket's report.json on first open. Structured staging fields
     (pN, mm, tumor-area %) start null — pathologist-entered. ---- */
  getReport: async (id) => {
    const snap = await getDoc(repDoc(id));
    if (snap.exists()) return { slide_id: id, ...snap.data() };
    let seed = {};
    try { seed = await getJSON(reportUrl(id)); } catch { /* no report.json in bucket */ }
    let result = {};
    try { result = await getJSON(resultUrl(id)); } catch { /* no result.json */ }
    // Plain-language default impression composed from the real result. (The
    // bucket's report_clinician reads too technical to show, but is kept below.)
    const positive = result.prediction === 'tumor';
    const n = (result.regions || []).length;
    const prob = result.display_probability || (typeof result.prob_tumor === 'number' ? Math.round(result.prob_tumor * 100) + '%' : '');
    const impression = positive
      ? `This lymph node has ${n} area${n === 1 ? '' : 's'} flagged for review${prob ? ` (overall tumor probability ${prob})` : ''}. The highlighted regions are shown below. Confirm or rule out each one before signing.`
      : `No areas of concern were flagged on this lymph node${prob ? ` (overall tumor probability ${prob})` : ''}. Please confirm before signing.`;
    const doc0 = {
      report_clinician: seed.report_clinician || '',
      report_patient: seed.report_patient || '',
      limitations: seed.limitations || [],
      next_step: seed.next_step || '',
      impression,
      findings: {},
      category: null, tumor_area_pct: null, largest_deposit_mm: null,
      signed_off: false, signer: null, signed_at: null,
      seeded_from: seed.source || 'gcs', updated_at: new Date().toISOString(),
    };
    try { await setDoc(repDoc(id), doc0); } catch { /* read-only fallback */ }
    return { slide_id: id, ...doc0 };
  },
  putReport: async (id, patch) => {
    await setDoc(repDoc(id), { ...patch, updated_at: new Date().toISOString() }, { merge: true });
    return patch;
  },
  signReport: async (id, signer) => {
    const data = { signed_off: true, signer: signer || 'Pathologist', signed_at: new Date().toISOString() };
    await setDoc(repDoc(id), data, { merge: true });
    return data;
  },
};
