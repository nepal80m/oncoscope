/* ============================================================
 * Oncoscope — Firebase / Firestore init (the mutable data store).
 *
 * Read-only slide artifacts (DZI, result.json, report.json, thumbs,
 * overlays, crops) come from the public GCS bucket — see
 * lib/gcsConfig.js. Everything the pathologist *writes* (annotations,
 * region reviews, comments, editable report + sign-off) lives in
 * Cloud Firestore (Firebase project uoo-quackathon26eug-8226).
 *
 * Config comes from Vite env (VITE_FB_*). The web apiKey is PUBLIC by
 * design — it only identifies the project; access is governed by
 * Firestore security rules, not by keeping the key secret.
 * ============================================================ */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

export const app = initializeApp(firebaseConfig);

// This project uses a NAMED Firestore database ("oncodb"), not "(default)".
// The web SDK takes the database id as getFirestore's 2nd arg (v10.4+).
export const FB_DB_ID = import.meta.env.VITE_FB_DB_ID || '(default)';
export const db = getFirestore(app, FB_DB_ID);
export const FB_PROJECT_ID = firebaseConfig.projectId;
