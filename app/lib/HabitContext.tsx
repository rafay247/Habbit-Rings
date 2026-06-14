"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AppState, Habit } from "./types";
import {
  defaultState,
  loadState,
  persistLocal,
  saveStateToIndexedDb,
  loadStateFromIndexedDb,
  normalizeParsedState,
  downloadBackupFile,
  applyDefaultBackupData,
  restoreFullBackup,
} from "./storage";
import {
  STORAGE_KEY,
  DATA_VERSION_KEY,
  FIREBASE_SYNC_KEY,
  FIREBASE_USER_KEY,
} from "./constants";
import { todayISO, addDays } from "./dateUtils";
import {
  generateUserId,
  pushStateToFirebase,
  pullStateFromFirebase,
  startFirebaseListener,
} from "./firebase";

type SyncStatusType = "" | "ok" | "error" | "pending";

interface HabitContextValue {
  state: AppState;
  ready: boolean;
  selectedDate: string;
  setSelectedDate: (iso: string) => void;
  heatmapYear: number;
  setHeatmapYear: (y: number) => void;
  // mutators
  toggleHabit: (habit: Habit, iso: string, checked: boolean) => void;
  toggleSubtask: (habit: Habit, subtaskId: string, iso: string, checked: boolean) => void;
  saveHabit: (input: HabitInput, editingId: string | null) => void;
  deleteHabit: (id: string) => void;
  resetDay: (iso: string) => void;
  setReminderTime: (time: string) => void;
  importState: (parsed: unknown) => void;
  downloadBackup: (filename: string) => void;
  // firebase
  syncEnabled: boolean;
  userId: string | null;
  syncStatus: { msg: string; type: SyncStatusType };
  enableSync: (enabled: boolean) => void;
  setUserId: (id: string) => void;
  syncNow: () => void;
}

export interface HabitInput {
  name: string;
  category: string;
  description: string;
  subtaskTexts: string[];
  targetPerWeek: number;
  priority: boolean;
}

const HabitContext = createContext<HabitContextValue | null>(null);

const rid = (prefix: string) => prefix + Math.random().toString(36).slice(2, 9);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(defaultState);
  const [ready, setReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [heatmapYear, setHeatmapYear] = useState<number>(new Date().getFullYear());

  const [syncEnabled, setSyncEnabled] = useState(false);
  const [userId, setUserIdState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ msg: string; type: SyncStatusType }>({
    msg: "",
    type: "",
  });

  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreNextRemote = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);
  // Keep a live ref to state for async callbacks (firebase push).
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Persist: localStorage + IndexedDB + (debounced) Firebase ────────────────
  const persist = useCallback(
    (next: AppState, fromRemote = false) => {
      persistLocal(next);
      saveStateToIndexedDb(next);
      if (syncEnabled && userId && !fromRemote) {
        if (fbTimer.current) clearTimeout(fbTimer.current);
        fbTimer.current = setTimeout(() => {
          ignoreNextRemote.current = true;
          pushStateToFirebase(userId, next);
        }, 1500);
      }
    },
    [syncEnabled, userId]
  );

  // Apply a producer function: clone → mutate → set → persist.
  const mutate = useCallback(
    (producer: (draft: AppState) => void, fromRemote = false) => {
      setStateRaw((prev) => {
        const draft: AppState = structuredClone(prev);
        producer(draft);
        persist(draft, fromRemote);
        return draft;
      });
    },
    [persist]
  );

  // ── Initial load (client only) ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const appliedDefaultBackup = applyDefaultBackupData();
      let initial = loadState();
      if (!localStorage.getItem(STORAGE_KEY)) {
        const idb = await loadStateFromIndexedDb();
        if (idb) {
          initial = idb;
          persistLocal(initial);
        }
      }
      if (appliedDefaultBackup) {
        await saveStateToIndexedDb(initial);
      }

      const enabled = localStorage.getItem(FIREBASE_SYNC_KEY) === "1";
      const uid = localStorage.getItem(FIREBASE_USER_KEY);
      if (!cancelled) {
        setSyncEnabled(enabled);
        setUserIdState(uid);
      }

      // Startup pull: remote wins if newer.
      if (enabled && uid) {
        const remote = await pullStateFromFirebase(uid);
        if (remote && !cancelled) {
          const remoteV = remote._version || 0;
          const localV = initial._version || 0;
          if (remoteV >= localV) initial = remote;
          persistLocal(initial);
        }
      }

      if (!cancelled) {
        setStateRaw(initial);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Live listener while sync is on ──────────────────────────────────────────
  useEffect(() => {
    if (!ready || !syncEnabled || !userId) return;
    let active = true;
    (async () => {
      const unsub = await startFirebaseListener(userId, ({ state: remote }) => {
        if (ignoreNextRemote.current) {
          ignoreNextRemote.current = false;
          return;
        }
        setStateRaw(remote);
        persistLocal(remote);
        saveStateToIndexedDb(remote);
        setSyncStatus({ msg: "✓ Live update from another device", type: "ok" });
        setTimeout(() => setSyncStatus({ msg: "✓ Synced", type: "ok" }), 3000);
      });
      if (active) unsubRef.current = unsub;
      else unsub();
    })();
    return () => {
      active = false;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [ready, syncEnabled, userId]);

  // ── Mutators (ported from script.js) ────────────────────────────────────────
  const syncHabitFromSubtasks = (draft: AppState, habit: Habit, iso: string) => {
    const subs = habit.subtasks || [];
    if (subs.length === 0) return;
    const bucket = draft.subcheckins?.[iso]?.[habit.id];
    const anyDone = subs.some((s) => bucket && bucket[s.id]);
    if (!draft.checkins[iso]) draft.checkins[iso] = {};
    if (anyDone) draft.checkins[iso][habit.id] = true;
    else delete draft.checkins[iso][habit.id];
  };

  const toggleHabit = useCallback(
    (habit: Habit, iso: string, checked: boolean) => {
      mutate((draft) => {
        const subs = habit.subtasks || [];
        if (subs.length > 0) {
          if (!checked) {
            if (draft.subcheckins?.[iso]?.[habit.id]) delete draft.subcheckins[iso][habit.id];
            if (!draft.checkins[iso]) draft.checkins[iso] = {};
            delete draft.checkins[iso][habit.id];
          } else {
            if (!draft.subcheckins[iso]) draft.subcheckins[iso] = {};
            if (!draft.subcheckins[iso][habit.id]) draft.subcheckins[iso][habit.id] = {};
            for (const s of subs) draft.subcheckins[iso][habit.id][s.id] = true;
            syncHabitFromSubtasks(draft, habit, iso);
          }
        } else {
          if (!draft.checkins[iso]) draft.checkins[iso] = {};
          if (checked) draft.checkins[iso][habit.id] = true;
          else delete draft.checkins[iso][habit.id];
        }
      });
    },
    [mutate]
  );

  const toggleSubtask = useCallback(
    (habit: Habit, subtaskId: string, iso: string, checked: boolean) => {
      mutate((draft) => {
        if (!draft.subcheckins[iso]) draft.subcheckins[iso] = {};
        if (!draft.subcheckins[iso][habit.id]) draft.subcheckins[iso][habit.id] = {};
        if (checked) draft.subcheckins[iso][habit.id][subtaskId] = true;
        else delete draft.subcheckins[iso][habit.id][subtaskId];
        syncHabitFromSubtasks(draft, habit, iso);
      });
    },
    [mutate]
  );

  const saveHabit = useCallback(
    (input: HabitInput, editingId: string | null) => {
      mutate((draft) => {
        if (editingId) {
          const habit = draft.habits.find((h) => h.id === editingId);
          if (habit) {
            habit.name = input.name;
            habit.category = input.category;
            habit.description = input.description;
            habit.targetPerWeek = input.targetPerWeek;
            habit.priority = input.priority;
            const existing = habit.subtasks || [];
            habit.subtasks = input.subtaskTexts.map(
              (text) => existing.find((s) => s.text === text) || { id: rid("s"), text }
            );
          }
        } else {
          draft.habits.push({
            id: rid("h"),
            name: input.name,
            category: input.category,
            description: input.description,
            targetPerWeek: input.targetPerWeek,
            priority: input.priority,
            subtasks: input.subtaskTexts.map((text) => ({ id: rid("s"), text })),
            createdAt: todayISO(),
          });
        }
      });
    },
    [mutate]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      mutate((draft) => {
        draft.habits = draft.habits.filter((h) => h.id !== id);
        Object.values(draft.checkins).forEach((bucket) => delete bucket[id]);
        if (draft.subcheckins) {
          Object.values(draft.subcheckins).forEach((bucket) => {
            if (bucket && bucket[id]) delete bucket[id];
          });
        }
      });
    },
    [mutate]
  );

  const resetDay = useCallback(
    (iso: string) => {
      mutate((draft) => {
        const bucket = draft.checkins[iso];
        if (bucket) draft.habits.forEach((h) => delete bucket[h.id]);
        if (draft.subcheckins && draft.subcheckins[iso]) {
          draft.habits.forEach((h) => {
            if (draft.subcheckins[iso]) delete draft.subcheckins[iso][h.id];
          });
        }
      });
    },
    [mutate]
  );

  const setReminderTime = useCallback(
    (time: string) => mutate((draft) => { draft.reminderTime = time; }),
    [mutate]
  );

  const importState = useCallback(
    (parsed: unknown) => {
      const n = restoreFullBackup(parsed);
      setStateRaw(n);
      saveStateToIndexedDb(n);
      if (syncEnabled && userId) {
        ignoreNextRemote.current = true;
        pushStateToFirebase(userId, n);
      }
    },
    [syncEnabled, userId]
  );

  const downloadBackup = useCallback(
    (filename: string) => downloadBackupFile(stateRef.current, filename),
    []
  );

  // ── Firebase controls ───────────────────────────────────────────────────────
  const enableSync = useCallback((enabled: boolean) => {
    localStorage.setItem(FIREBASE_SYNC_KEY, enabled ? "1" : "0");
    setSyncEnabled(enabled);
    if (enabled) {
      let uid = localStorage.getItem(FIREBASE_USER_KEY);
      if (!uid) {
        uid = generateUserId();
        localStorage.setItem(FIREBASE_USER_KEY, uid);
      }
      setUserIdState(uid);
      setSyncStatus({ msg: "Sync enabled", type: "ok" });
    } else {
      setSyncStatus({ msg: "Sync disabled", type: "" });
    }
  }, []);

  const setUserId = useCallback((id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    localStorage.setItem(FIREBASE_USER_KEY, trimmed);
    setUserIdState(trimmed);
    setSyncStatus({ msg: "Sync ID set — syncing…", type: "pending" });
  }, []);

  const syncNow = useCallback(async () => {
    if (!userId) return;
    setSyncStatus({ msg: "Syncing…", type: "pending" });
    const remote = await pullStateFromFirebase(userId);
    if (remote) {
      const remoteV = remote._version || 0;
      const localV = stateRef.current._version || 0;
      if (remoteV > localV) {
        setStateRaw(remote);
        persistLocal(remote);
        saveStateToIndexedDb(remote);
        setSyncStatus({ msg: "✓ Pulled latest", type: "ok" });
        return;
      }
    }
    ignoreNextRemote.current = true;
    const ok = await pushStateToFirebase(userId, stateRef.current);
    setSyncStatus(
      ok ? { msg: "✓ Synced", type: "ok" } : { msg: "Sync failed", type: "error" }
    );
  }, [userId]);

  const value: HabitContextValue = {
    state,
    ready,
    selectedDate,
    setSelectedDate,
    heatmapYear,
    setHeatmapYear,
    toggleHabit,
    toggleSubtask,
    saveHabit,
    deleteHabit,
    resetDay,
    setReminderTime,
    importState,
    downloadBackup,
    syncEnabled,
    userId,
    syncStatus,
    enableSync,
    setUserId,
    syncNow,
  };

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits(): HabitContextValue {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error("useHabits must be used within HabitProvider");
  return ctx;
}

// Re-exported here so components import date helpers from one place.
export { todayISO, addDays };
