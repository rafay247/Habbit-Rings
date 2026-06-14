import {
  STORAGE_KEY,
  DATA_VERSION_KEY,
  DEFAULT_REMINDER_TIME,
  IDB_NAME,
  IDB_STORE,
  IDB_STATE_KEY,
  APP_STORAGE_PREFIX,
  LEGACY_PAGE_KEYS,
  DEFAULT_BACKUP_APPLIED_KEY,
} from "./constants";
import type { AppState } from "./types";
import defaultBackup from "./defaultBackup.json";

type BackupPayload = Partial<AppState> & {
  _allPages?: Record<string, unknown>;
  _localStorage?: Record<string, unknown>;
  _exportedAt?: string;
};

const DEFAULT_BACKUP = defaultBackup as BackupPayload;
const DEFAULT_BACKUP_SIGNATURE = [
  "full-backup-v2",
  DEFAULT_BACKUP._version || "",
  DEFAULT_BACKUP._exportedAt || "",
  JSON.stringify(DEFAULT_BACKUP).length,
].join(":");

function buildStateFromBackup(backup: BackupPayload): AppState {
  return normalizeParsedState({
    habits: backup.habits,
    checkins: backup.checkins,
    subcheckins: backup.subcheckins,
    notes: backup.notes,
    notepadText: backup.notepadText,
    reminderTime: backup.reminderTime,
    remindersEnabled: backup.remindersEnabled,
    theme: backup.theme,
    _version: backup._version,
  });
}

export function defaultState(): AppState {
  return structuredClone(buildStateFromBackup(DEFAULT_BACKUP));
}

export function normalizeParsedState(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== "object") return defaultState();
  const p = parsed as Record<string, unknown>;
  if (!p.reminderTime) p.reminderTime = DEFAULT_REMINDER_TIME;
  if (p.remindersEnabled === undefined) p.remindersEnabled = true;
  if (!p.theme) p.theme = "dark";
  if (!p.notes) p.notes = [];
  if (typeof p.notepadText !== "string") p.notepadText = "";
  if (!p.checkins) p.checkins = {};
  if (!p.subcheckins) p.subcheckins = {};
  if (Array.isArray(p.habits)) {
    (p.habits as Record<string, unknown>[]).forEach((h) => {
      if (h.targetPerWeek == null) h.targetPerWeek = 3;
      if (h.description == null) h.description = "";
      if (!Array.isArray(h.subtasks)) h.subtasks = [];
      if (h.priority == null) h.priority = false;
      if (!h.category) h.category = "Other";
    });
  } else {
    p.habits = [];
  }
  return p as unknown as AppState;
}

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeParsedState(JSON.parse(raw));
  } catch (e) {
    console.error("Failed to load state", e);
    return defaultState();
  }
}

/** Persist state: localStorage (primary) + bump version. IndexedDB mirror handled by caller. */
export function persistLocal(state: AppState): number {
  const version = Date.now();
  state._version = version;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(DATA_VERSION_KEY, String(version));
  return version;
}

// ── IndexedDB mirror ──────────────────────────────────────────────────────────
function openPersistenceDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveStateToIndexedDb(stateObj: AppState): Promise<void> {
  try {
    const db = await openPersistenceDb();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(JSON.stringify(stateObj), IDB_STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.error("IndexedDB save failed", e);
  }
}

export async function loadStateFromIndexedDb(): Promise<AppState | null> {
  try {
    const db = await openPersistenceDb();
    if (!db) return null;
    const raw = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_STATE_KEY);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!raw) return null;
    return normalizeParsedState(JSON.parse(raw));
  } catch (e) {
    console.error("IndexedDB load failed", e);
    return null;
  }
}

// ── All-pages snapshot (for full backup / cross-device sync) ──────────────────
function safeParseLocalStorageValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getAppLocalStorageKeys(): string[] {
  const keys = new Set(LEGACY_PAGE_KEYS);
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(APP_STORAGE_PREFIX)) keys.add(key);
  }
  return Array.from(keys).sort();
}

export function collectAllPagesData(): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(getBackupPagesData(DEFAULT_BACKUP)).forEach(([key, value]) => {
    if (!key || !key.startsWith(APP_STORAGE_PREFIX) || value === undefined) return;
    out[key] = typeof value === "string" ? value : JSON.stringify(value);
  });
  getAppLocalStorageKeys().forEach((k) => {
    const v = localStorage.getItem(k);
    if (v !== null) out[k] = v;
  });
  return out;
}

function collectDecodedAllPagesData(
  raw: Record<string, string> = collectAllPagesData()
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      safeParseLocalStorageValue(value),
    ])
  );
}

export function applyAllPagesData(pagesObj: Record<string, unknown>): void {
  if (!pagesObj || typeof pagesObj !== "object") return;
  Object.entries(pagesObj).forEach(([key, value]) => {
    if (!key || !key.startsWith(APP_STORAGE_PREFIX) || value === undefined)
      return;
    localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  });
}

function getBackupPagesData(backup: BackupPayload): Record<string, unknown> {
  return backup._allPages || backup._localStorage || {};
}

function parseBackupLocalStorageValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return safeParseLocalStorageValue(value);
}

export function applyDefaultBackupData(overwrite = false): boolean {
  if (typeof window === "undefined") return false;
  const backupPages = getBackupPagesData(DEFAULT_BACKUP);
  const primaryMissing = localStorage.getItem(STORAGE_KEY) === null;
  const shouldOverwrite =
    overwrite ||
    primaryMissing ||
    localStorage.getItem(DEFAULT_BACKUP_APPLIED_KEY) !== DEFAULT_BACKUP_SIGNATURE;

  Object.entries(backupPages).forEach(([key, value]) => {
    if (!key || !key.startsWith(APP_STORAGE_PREFIX) || value === undefined) return;
    if (!shouldOverwrite && localStorage.getItem(key) !== null) return;
    localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  });
  if (shouldOverwrite && backupPages[STORAGE_KEY] === undefined) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildStateFromBackup(DEFAULT_BACKUP)));
  }
  if (shouldOverwrite) {
    localStorage.setItem(DEFAULT_BACKUP_APPLIED_KEY, DEFAULT_BACKUP_SIGNATURE);
  }
  return shouldOverwrite;
}

export function applyBackupPagesData(parsed: unknown): void {
  if (!parsed || typeof parsed !== "object") return;
  const pages = getBackupPagesData(parsed as BackupPayload);
  applyAllPagesData(pages);
}

export function restoreFullBackup(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== "object") return defaultState();
  const backup = parsed as BackupPayload;
  const pages = getBackupPagesData(backup);
  applyAllPagesData(pages);

  const storedState = pages[STORAGE_KEY];
  if (storedState !== undefined) {
    return normalizeParsedState(parseBackupLocalStorageValue(storedState));
  }

  const restored = normalizeParsedState(backup);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
  return restored;
}

function buildBooksBackupMeta() {
  const raw = localStorage.getItem("habit-rings-books-v4");
  const base = {
    tracked: true,
    storageKey: "habit-rings-books-v4",
    totalBooks: 0,
    readBooks: 0,
    unreadBooks: 0,
  };
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("invalid books payload");
    let totalBooks = 0;
    let readBooks = 0;
    parsed.forEach((category: { books?: { read?: boolean }[] }) => {
      if (!Array.isArray(category?.books)) return;
      totalBooks += category.books.length;
      readBooks += category.books.filter((b) => !!b?.read).length;
    });
    return {
      ...base,
      totalBooks,
      readBooks,
      unreadBooks: Math.max(0, totalBooks - readBooks),
    };
  } catch (error) {
    console.error("Failed to summarize books backup data", error);
    return { ...base, parseError: true };
  }
}

/** Mirrors the original buildFullBackup() backup-file shape (version 4). */
export function buildFullBackup(state: AppState) {
  const allPages = collectAllPagesData();
  return {
    ...state,
    _allPages: allPages,
    _localStorage: allPages,
    _decodedLocalStorage: collectDecodedAllPagesData(allPages),
    _backupMeta: { books: buildBooksBackupMeta() },
    _backupVersion: 4,
    _exportedAt: new Date().toISOString(),
  };
}

export function downloadBackupFile(state: AppState, filename: string): void {
  const blob = new Blob([JSON.stringify(buildFullBackup(state), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
