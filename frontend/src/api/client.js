/* ============================================================
 * Oncoscope — API client
 * Single source of truth for talking to the backend. In dev this
 * points at the local mock-backend (VITE_API_BASE); in prod, the
 * real backend. Swapping environments = change VITE_API_BASE.
 * ============================================================ */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function http(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`);
  }
  return res.status === 204 ? null : res.json();
}

const enc = encodeURIComponent;

export const api = {
  listSlides: () => http('/slides'),
  getSlide: (id) => http(`/slides/${enc(id)}`),
  getAnalysis: (id) => http(`/slides/${enc(id)}/analysis`),

  // cache lookup + upload + job polling
  lookupSlide: (filename, size) => http('/slides/lookup', { method: 'POST', body: JSON.stringify({ filename, size }) }),
  uploadSlide: (filename, size) => http('/uploads', { method: 'POST', body: JSON.stringify({ filename, size }) }),
  getJob: (jobId) => http(`/jobs/${enc(jobId)}`),

  // annotations (pathologist's drawn marks)
  getAnnotations: (id) => http(`/slides/${enc(id)}/annotations`),
  createAnnotation: (id, ann) => http(`/slides/${enc(id)}/annotations`, { method: 'POST', body: JSON.stringify(ann) }),
  updateAnnotation: (id, aid, ann) => http(`/slides/${enc(id)}/annotations/${enc(aid)}`, { method: 'PUT', body: JSON.stringify(ann) }),
  deleteAnnotation: (id, aid) => http(`/slides/${enc(id)}/annotations/${enc(aid)}`, { method: 'DELETE' }),

  // AI-region review decisions
  getReviews: (id) => http(`/slides/${enc(id)}/reviews`),
  putReview: (id, regionId, body) => http(`/slides/${enc(id)}/reviews/${enc(regionId)}`, { method: 'PUT', body: JSON.stringify(body) }),

  // threaded comments
  getComments: (id, targetType, targetId) => http(`/slides/${enc(id)}/comments?target_type=${enc(targetType)}&target_id=${enc(targetId)}`),
  addComment: (id, body) => http(`/slides/${enc(id)}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  deleteComment: (id, cid) => http(`/slides/${enc(id)}/comments/${enc(cid)}`, { method: 'DELETE' }),
};
