# Oncoscope

A web-based AI "second reader" for detecting breast-cancer metastases in lymph-node whole-slide
images. The pathologist reviews a deep-zoom slide with the model's attention heatmap + ranked
high-attention regions, **agrees / disagrees / relabels** the AI's findings, **draws their own
annotations with threaded comments**, fills in the staging, and signs out a report that unlocks a
plain-language patient summary.

Built from the Claude Design handoff (`oncoscope-design-handoff/`), with the faked prototype viewer
replaced by a real **OpenSeadragon** deep-zoom viewer + **Annotorious** annotation layer.

## Architecture

Frontend-only — **no server to run**:

- **Reads** slide artifacts (catalog, AI `result.json`, DZI tiles, thumbnails, attention overlay,
  crops) **directly** from the public GCS bucket `gs://oncoscope-1`.
- **Writes** the pathologist's data (annotations, region reviews, comments, editable report +
  sign-off) **directly** to **Cloud Firestore** (project `uoo-quackathon26eug-8226`, database `oncodb`).
- The AI (tiling + UNI2 embeddings + ABMIL inference + report text) runs **offline** in the ML
  pipeline and publishes artifacts to the bucket.

See **[BACKEND_REQUIREMENTS.md](BACKEND_REQUIREMENTS.md)** for the full data/integration contract
(GCS layout, the `result.json` adapter mapping, the Firestore schema + rules, and the optional
FastAPI-on-Cloud-Run seam for live Gemini Q&A / predict).

## Layout

```
frontend/                 React + Vite app (the product) — reads GCS, writes Firestore
BACKEND_REQUIREMENTS.md   ← data/integration contract (GCS + Firestore)
oncoscope-design-handoff/ original design export (reference only)
mock-backend/             DEPRECATED — the old Node/Express dev stand-in; no longer used or required
```

## Run it

```bash
cd frontend && npm install && npm run dev      # → http://localhost:5173
```

Config lives in `frontend/.env` (already set): `VITE_GCS_BASE` (the bucket) and `VITE_FB_*`
(Firebase web config + `VITE_FB_DB_ID=oncodb`). The Firebase `apiKey` is public by design — access is
governed by Firestore security rules. The Firestore database `oncodb` must exist (Native mode).

## Try the flow

Landing → **Open a slide** → pick a processed slide from the library (e.g. `test_016`) → **Workspace**:
deep-zoom the real WSI, toggle the AI attention heatmap, step through high-attention regions
(Agree / Disagree / relabel / comment), and **draw annotations** (Box / Polygon / Freehand) with a
class + comment — everything persists to Firestore. Then **Report**: edit the impression/findings,
enter staging (pN / mm / tumor-area %), **sign off** → the **Patient summary** unlocks. The ⊞ button
(bottom-left) jumps between screens.

`test_016 / test_027 / test_040` are tumor-positive; `test_031 / test_063` read negative.

## Tech

React + Vite · OpenSeadragon 3 · Annotorious v2 (`@recogito/annotorious-openseadragon` + selector
pack) · React Router · **Firebase / Firestore** (web SDK) · public GCS for read artifacts. The data
seam is one client (`frontend/src/api/client.js`) + `lib/{gcsConfig,adaptAnalysis,firebase}.js`.

> Research prototype — **not for clinical use.**
