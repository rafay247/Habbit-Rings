// Bumped on every GitHub push (v1 → v2 → …). Shown next to the logo.
export const APP_VERSION = "v3";

export const STORAGE_KEY = "habit-rings-data-v1";
export const DATA_VERSION_KEY = "habit-rings-data-version";
export const DEFAULT_REMINDER_TIME = "20:00";
export const IDB_NAME = "habit-rings-db";
export const IDB_STORE = "kv";
export const IDB_STATE_KEY = "state";
export const AUTO_BACKUP_ENABLED_KEY = "habit-rings-auto-backup-enabled";
export const AUTO_BACKUP_LAST_DATE_KEY = "habit-rings-auto-backup-last-date";
export const FIREBASE_SYNC_KEY = "habit-rings-firebase-sync-enabled";
export const FIREBASE_USER_KEY = "habit-rings-firebase-user-id";
export const DEFAULT_BACKUP_APPLIED_KEY = "habit-rings-default-backup-applied";

export const APP_STORAGE_PREFIX = "habit-rings-";
export const LEGACY_PAGE_KEYS = [
  "habit-rings-vibe-notes",
  "habit-rings-wall-notes-v1",
  "habit-rings-calendar-selection-v1",
  "habit-rings-calendar-x-marks-v1",
  "habit-rings-calendar-events-v1",
  "habit-rings-books-v4",
  "habit-rings-books-tabs-v2",
  "habit-rings-books-categories-v1",
  "habit-rings-read-books-v1",
  "habit-rings-goals-v1",
  "habit-rings-tech-categories-v1",
  "habit-rings-tech-docs-v1",
];

// Firebase config inlined (client-side keys, as in the original web app).
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFKfYvDsnYYONtdp8a1SUT_Aqvuye3bsE",
  authDomain: "habit-ring-1849d.firebaseapp.com",
  databaseURL: "https://habit-ring-1849d-default-rtdb.firebaseio.com",
  projectId: "habit-ring-1849d",
  storageBucket: "habit-ring-1849d.firebasestorage.app",
  messagingSenderId: "664973712334",
  appId: "1:664973712334:web:bc486cd8410b9695e6299f",
  measurementId: "G-123ZBJ50CN",
};
