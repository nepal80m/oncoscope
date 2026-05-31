/* ============================================================
   Oncoscope mock-backend — persistence (the MERGEABLE part).
   A tiny JSON-file store for annotations, AI-region reviews, and
   comments. Survives restarts. The real backend would back these
   with a database; the routes + shapes are the contract.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

let db = { annotations: {}, reviews: {}, comments: {} };

function load() {
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    db = { annotations: {}, reviews: {}, comments: {} };
  }
  db.annotations ||= {};
  db.reviews ||= {};
  db.comments ||= {};
}
function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('[store] save failed', e);
  }
}
load();

export const store = {
  // --- annotations (W3C, per slide) ---
  listAnnotations(slide) { return db.annotations[slide] || []; },
  putAnnotation(slide, ann) {
    const arr = (db.annotations[slide] ||= []);
    const i = arr.findIndex((a) => a.id === ann.id);
    if (i >= 0) arr[i] = ann; else arr.push(ann);
    save();
    return ann;
  },
  deleteAnnotation(slide, id) {
    db.annotations[slide] = (db.annotations[slide] || []).filter((a) => a.id !== id);
    save();
  },

  // --- AI-region review decisions (per slide, keyed by region id) ---
  getReviews(slide) { return db.reviews[slide] || {}; },
  putReview(slide, regionId, review) {
    (db.reviews[slide] ||= {})[regionId] = review;
    save();
    return review;
  },

  // --- threaded comments (per slide, on any target: annotation | region | slide) ---
  listComments(slide, targetType, targetId) {
    let arr = db.comments[slide] || [];
    if (targetId) arr = arr.filter((c) => (!targetType || c.target_type === targetType) && c.target_id === targetId);
    return arr;
  },
  addComment(slide, c) {
    (db.comments[slide] ||= []).push(c);
    save();
    return c;
  },
  deleteComment(slide, id) {
    db.comments[slide] = (db.comments[slide] || []).filter((c) => c.id !== id);
    save();
  },
};
