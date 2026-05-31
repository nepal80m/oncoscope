# Oncoscope

A web-based AI "second reader" for detecting breast-cancer metastases in lymph-node whole-slide
images. The pathologist reviews a deep-zoom slide with an AI confidence heatmap + flagged regions,
**agrees / disagrees / relabels** the AI's findings, **draws their own annotations and threaded
comments**, and signs out a structured report that unlocks a plain-language patient summary.

Built from the Claude Design handoff (`oncoscope-design-handoff/`), with the faked prototype viewer
replaced by a real **OpenSeadragon** deep-zoom viewer + **Annotorious** annotation layer (the
wsi-annotation-demo pattern).

## Layout

```
frontend/                 React + Vite app (the product)
mock-backend/             Node/Express dev backend — real non-AI endpoints + canned AI (mergeable)
sample_dzi_files/         the A05 sample DZI pyramid (served in place; not committed)
BACKEND_REQUIREMENTS.md   ← canonical API/data contract for the real backend team
oncoscope-design-handoff/ original design export (reference only)
```

## Run it (two terminals)

```bash
# 1) backend (serves the A05 DZI + catalog/analysis/annotations/comments/reviews/uploads)
cd mock-backend && npm install && npm run dev        # → http://localhost:4100

# 2) frontend
cd frontend && npm install && npm run dev            # → http://localhost:5173
```

Open **http://localhost:5173**. `frontend/.env` sets `VITE_API_BASE=http://localhost:4100`.

## Try the flow
Landing → **Upload a slide** → pick a cached slide (instant) *or* drop a file (a name like
`CAMELYON-0148.svs` hits the cache; anything else runs the upload→processing job) → **Workspace**:
deep-zoom the slide, toggle the AI heatmap, review regions (Agree/Disagree/relabel/comment), and
**draw annotations** (Box / Polygon / Freehand) with a comment + class — everything persists. Then
**Report** → sign off → **Patient summary** unlocks. The ⊞ button (bottom-left) jumps between screens.

## Tech
React + Vite · OpenSeadragon 3 · Annotorious v2 (`@recogito/annotorious-openseadragon` + selector
pack) · React Router · localStorage for session UI state. The backend boundary is one API client
(`frontend/src/api/client.js`); see **BACKEND_REQUIREMENTS.md** to build the production service.

> Research prototype — **not for clinical use.**
