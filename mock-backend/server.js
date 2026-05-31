/* ============================================================
 * Oncoscope — mock backend (dev only)
 *
 * Implements the NON-AI endpoints for real (catalog, cache-lookup,
 * uploads + jobs, annotations, comments, reviews) so they can be
 * merged into the production backend; the AI analysis is canned.
 *
 * NOTE: this mock has a single real DZI pyramid (A05). Every catalog
 * entry and uploaded slide is a stand-in backed by A05's tiles +
 * analysis. The real backend would store a distinct pyramid/analysis
 * per slide; the routes + shapes are the contract.
 * ============================================================ */
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { analysisResponse } from './fixtures/analysis.js';
import { store } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SAMPLE_DZI_DIR = path.join(REPO_ROOT, 'sample_dzi_files');

const PORT = process.env.PORT || 4100;
const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

/* Serve the DZI pyramid(s) in place. OSD opens /dzi/<id>.dzi then tiles. */
app.use(
  '/dzi',
  express.static(SAMPLE_DZI_DIR, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      res.set('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.dzi')) res.type('application/xml');
    },
  })
);

/* ---- Cached slide catalog (shared metadata; all stand-ins over A05) ---- */
const META = { stain: 'H&E', scanner: 'Aperio GT 450 · 40× · 0.25 µm/px', mpp: 0.25, magnification: 40, width: 86016, height: 89600, tile_size: 256, levels: 18 };
const CATALOG = [
  { slide_id: 'A05',      name: 'CAMELYON-0148', filename: 'CAMELYON-0148.svs', specimen: 'Right axillary sentinel lymph node', dzi: 'A05', status: 'ready', created_at: new Date().toISOString(), ...META },
  { slide_id: 'CAM-0211', name: 'CAMELYON-0211', filename: 'CAMELYON-0211.svs', specimen: 'Left axillary sentinel lymph node',  dzi: 'A05', status: 'ready', created_at: new Date().toISOString(), ...META },
  { slide_id: 'SLN-0934', name: 'SLN-22-0934',   filename: 'SLN-22-0934.ndpi',  specimen: 'Sentinel lymph node, level II',      dzi: 'A05', status: 'ready', created_at: new Date().toISOString(), ...META },
];
const uploaded = []; // dynamically-added uploaded slides (stand-ins over A05)
const jobs = {};
const JOB_STEPS = ['upload', 'validate', 'pyramid', 'embed', 'classify', 'render'];

const publicBase = (req) => `${req.protocol}://${req.get('host')}`;
const allSlides = () => CATALOG.concat(uploaded);
const findSlide = (id) => allSlides().find((s) => s.slide_id === id);
const slideExists = (dzi) => fs.existsSync(path.join(SAMPLE_DZI_DIR, `${dzi}.dzi`));
const norm = (f) => (f || '').trim().toLowerCase();
const publicSlide = (req, s) => ({
  slide_id: s.slide_id, name: s.name, filename: s.filename, status: s.status, specimen: s.specimen,
  stain: s.stain, scanner: s.scanner, mpp: s.mpp, magnification: s.magnification, width: s.width, height: s.height,
  tile_size: s.tile_size, levels: s.levels, created_at: s.created_at,
  thumbnail_url: `${publicBase(req)}/dzi/${s.dzi}_files/8/0_0.jpeg`,
});

app.get('/health', (_req, res) => res.json({ ok: true }));

/* Catalog of cached slides */
app.get('/slides', (req, res) => {
  res.json({ slides: allSlides().filter((s) => s.status === 'ready').map((s) => publicSlide(req, s)) });
});

/* Slide detail (+ DZI tile source) */
app.get('/slides/:id', (req, res) => {
  const s = findSlide(req.params.id);
  if (!s || !slideExists(s.dzi)) return res.status(404).json({ error: { code: 'not_found', message: 'slide not found' } });
  res.json({
    ...publicSlide(req, s),
    dzi_url: `${publicBase(req)}/dzi/${s.dzi}.dzi`,
    tile_url_base: `${publicBase(req)}/dzi/${s.dzi}_files/`,
  });
});

/* Cache lookup — does the backend already have this file? */
app.post('/slides/lookup', (req, res) => {
  const { filename } = req.body || {};
  const hit = CATALOG.find((s) => norm(s.filename) === norm(filename));
  if (hit) res.json({ cached: true, slide_id: hit.slide_id, name: hit.name });
  else res.json({ cached: false });
});

/* Upload (non-cached) → kicks off a processing job. Mock: no bytes/tiling;
   the resulting slide is a stand-in over A05. Real backend: presigned S3 PUT
   of the raw WSI, then tiling + analysis. */
app.post('/uploads', (req, res) => {
  const { filename = 'slide.svs', size = 0 } = req.body || {};
  const slide_id = 'up-' + randomUUID().slice(0, 8);
  const job_id = 'job-' + randomUUID().slice(0, 8);
  uploaded.push({ slide_id, name: 'Uploaded — ' + filename, filename, specimen: 'Uploaded whole-slide image', dzi: 'A05', status: 'processing', size, created_at: new Date().toISOString(), ...META });
  jobs[job_id] = { job_id, slide_id, started: Date.now(), durationMs: 6000 };
  res.status(201).json({ job_id, slide_id });
});

/* Job status — time-based progression through the pipeline steps. */
app.get('/jobs/:id', (req, res) => {
  const j = jobs[req.params.id];
  if (!j) return res.status(404).json({ error: { code: 'not_found', message: 'job not found' } });
  const p = Math.min(1, (Date.now() - j.started) / j.durationMs);
  const done = p >= 1;
  if (done) { const s = uploaded.find((u) => u.slide_id === j.slide_id); if (s) s.status = 'ready'; }
  const idx = Math.min(JOB_STEPS.length - 1, Math.floor(p * JOB_STEPS.length));
  res.json({ job_id: j.job_id, slide_id: j.slide_id, status: done ? 'done' : 'processing', progress: Math.round(p * 100), step: done ? 'done' : JOB_STEPS[idx], step_index: done ? JOB_STEPS.length : idx });
});

/* Canned AI analysis (stub). Real backend computes this from the model. */
app.get('/slides/:id/analysis', (req, res) => {
  const s = findSlide(req.params.id);
  const a = analysisResponse(req.params.id, publicBase(req), s?.dzi || 'A05');
  if (!a) return res.status(404).json({ error: { code: 'not_found', message: 'analysis not found' } });
  res.json(a);
});

/* ---- Annotations: pathologist's drawn marks (W3C + tag bodies) ---- */
app.get('/slides/:id/annotations', (req, res) => res.json({ annotations: store.listAnnotations(req.params.id) }));
app.post('/slides/:id/annotations', (req, res) => {
  const ann = { ...req.body };
  if (!ann.id) ann.id = randomUUID();
  res.status(201).json(store.putAnnotation(req.params.id, ann));
});
app.put('/slides/:id/annotations/:aid', (req, res) => res.json(store.putAnnotation(req.params.id, { ...req.body, id: req.params.aid })));
app.delete('/slides/:id/annotations/:aid', (req, res) => { store.deleteAnnotation(req.params.id, req.params.aid); res.status(204).end(); });

/* ---- AI-region review decisions (agree / disagree / relabel / note) ---- */
app.get('/slides/:id/reviews', (req, res) => res.json({ reviews: store.getReviews(req.params.id) }));
app.put('/slides/:id/reviews/:regionId', (req, res) => {
  const { review = 'pending', cls = null, note = '' } = req.body || {};
  res.json(store.putReview(req.params.id, req.params.regionId, { review, cls, note, updated_at: new Date().toISOString() }));
});

/* ---- Comments: threaded; target = annotation | region | slide ---- */
app.get('/slides/:id/comments', (req, res) => res.json({ comments: store.listComments(req.params.id, req.query.target_type, req.query.target_id) }));
app.post('/slides/:id/comments', (req, res) => {
  const { target_type, target_id, text, parent_id = null, author } = req.body || {};
  if (!target_type || !target_id || !text) return res.status(400).json({ error: { code: 'bad_request', message: 'target_type, target_id, text required' } });
  const c = { id: randomUUID(), target_type, target_id, text, parent_id, author: author || { id: 'me', name: 'You' }, created_at: new Date().toISOString() };
  res.status(201).json(store.addComment(req.params.id, c));
});
app.delete('/slides/:id/comments/:cid', (req, res) => { store.deleteComment(req.params.id, req.params.cid); res.status(204).end(); });

app.listen(PORT, () => {
  console.log(`[mock-backend] http://localhost:${PORT}`);
  console.log(`[mock-backend] serving DZI from ${SAMPLE_DZI_DIR}`);
});
