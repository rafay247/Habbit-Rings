// Firebase Realtime Database sync, ported from script.js.
// Uses the `firebase` npm package (lazy-imported) instead of the gstatic CDN.
import { FIREBASE_CONFIG, DATA_VERSION_KEY } from "./constants";
import { collectAllPagesData, applyAllPagesData, normalizeParsedState } from "./storage";
import type { Database } from "firebase/database";
import type { AppState } from "./types";

let _fbDb: Database | null = null;

export function generateUserId(): string {
  return "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function getFirebaseDb(): Promise<Database | null> {
  if (_fbDb) return _fbDb;
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getDatabase } = await import("firebase/database");
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    _fbDb = getDatabase(app);
    return _fbDb;
  } catch (e) {
    console.error("Firebase init failed", e);
    return null;
  }
}

function userPath(userId: string): string {
  return `users/${userId}/habitState`;
}

export async function pushStateToFirebase(
  userId: string,
  stateObj: AppState
): Promise<boolean> {
  try {
    const db = await getFirebaseDb();
    if (!db) return false;
    const { ref, set } = await import("firebase/database");
    const syncedAt = Number(localStorage.getItem(DATA_VERSION_KEY) || Date.now());
    const payload = {
      ...stateObj,
      _syncedAt: syncedAt,
      _allPages: collectAllPagesData(),
    };
    await set(ref(db, userPath(userId)), payload);
    return true;
  } catch (e) {
    console.error("Firebase push failed", e);
    return false;
  }
}

export interface RemoteState {
  state: AppState;
  syncedAt: number;
  /** Cross-page localStorage snapshot. Caller decides whether to apply it. */
  allPages: Record<string, unknown> | null;
}

/**
 * Fetch the remote snapshot WITHOUT touching local storage. The caller compares
 * `syncedAt` against the local data version and only applies `allPages` (via
 * applyAllPagesData) when the remote is strictly newer. Applying an older/equal
 * snapshot here would silently revert local edits — most painfully Books/Quotes
 * changes, which write localStorage directly and never bump the sync version.
 */
export async function pullStateFromFirebase(
  userId: string
): Promise<RemoteState | null> {
  try {
    const db = await getFirebaseDb();
    if (!db) return null;
    const { ref, get } = await import("firebase/database");
    const snap = await get(ref(db, userPath(userId)));
    if (!snap.exists()) return null;
    const data = snap.val();
    const allPages = (data._allPages as Record<string, unknown>) || null;
    const syncedAt = Number(data._syncedAt || 0);
    delete data._allPages;
    delete data._syncedAt;
    return { state: normalizeParsedState(data), syncedAt, allPages };
  } catch (e) {
    console.error("Firebase pull failed", e);
    return null;
  }
}

export interface RemoteUpdate {
  state: AppState;
  syncedAt: number;
}

/**
 * Subscribe to live updates for another device. Skips the initial fire (handled
 * by the startup pull) and applies cross-page data. Returns an unsubscribe fn.
 * `onRemote` is only called when the remote write is newer than the local one.
 */
export async function startFirebaseListener(
  userId: string,
  onRemote: (update: RemoteUpdate) => void
): Promise<() => void> {
  const db = await getFirebaseDb();
  if (!db) return () => {};
  const { ref, onValue } = await import("firebase/database");
  let isFirstCall = true;

  const unsub = onValue(ref(db, userPath(userId)), (snap) => {
    if (!snap.exists()) return;
    if (isFirstCall) {
      isFirstCall = false;
      return;
    }
    const remote = snap.val();
    const allPages = (remote._allPages as Record<string, unknown>) || null;
    const remoteSyncedAt = Number(remote._syncedAt || 0);
    delete remote._allPages;
    delete remote._syncedAt;
    const localSyncedAt = Number(localStorage.getItem(DATA_VERSION_KEY) || 0);
    // Only let a remote write touch local data when it is strictly newer.
    // Otherwise an echo/stale snapshot would clobber edits made here.
    if (remoteSyncedAt > localSyncedAt) {
      if (allPages) applyAllPagesData(allPages);
      onRemote({ state: normalizeParsedState(remote), syncedAt: remoteSyncedAt });
    }
  });

  return unsub;
}
