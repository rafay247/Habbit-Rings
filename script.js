const STORAGE_KEY = "habit-rings-data-v1";
const DATA_VERSION_KEY = "habit-rings-data-version";
const DEFAULT_REMINDER_TIME = "20:00";
const IDB_NAME = "habit-rings-db";
const IDB_STORE = "kv";
const IDB_STATE_KEY = "state";
const AUTO_BACKUP_ENABLED_KEY = "habit-rings-auto-backup-enabled";
const AUTO_BACKUP_LAST_DATE_KEY = "habit-rings-auto-backup-last-date";

function openPersistenceDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
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

async function saveStateToIndexedDb(stateObj) {
  try {
    const db = await openPersistenceDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
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

async function loadStateFromIndexedDb() {
  try {
    const db = await openPersistenceDb();
    if (!db) return null;
    const raw = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_STATE_KEY);
      req.onsuccess = () => resolve(req.result || null);
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

function defaultState() {
  return {
    habits: [
      {
        id: "h1",
        name: "Move 30 min",
        category: "Health",
        targetPerWeek: 3,
        subtasks: [],
        createdAt: todayISO()
      },
      {
        id: "h2",
        name: "Read 10 pages",
        category: "Learning",
        targetPerWeek: 4,
        subtasks: [],
        createdAt: todayISO()
      },
      {
        id: "h3",
        name: "Mindful check‑in",
        category: "Mind",
        targetPerWeek: 5,
        subtasks: [],
        createdAt: todayISO()
      }
    ],
    checkins: {},
    subcheckins: {},
    notes: [],
    notepadText: "",
    reminderTime: DEFAULT_REMINDER_TIME,
    remindersEnabled: true,
    theme: "dark"
  };
}

function normalizeParsedState(parsed) {
  if (!parsed || typeof parsed !== "object") return defaultState();
  if (!parsed.reminderTime) parsed.reminderTime = DEFAULT_REMINDER_TIME;
  if (parsed.remindersEnabled === undefined) parsed.remindersEnabled = true;
  if (!parsed.theme) parsed.theme = "dark";
  if (!parsed.notes) parsed.notes = [];
  if (typeof parsed.notepadText !== "string") parsed.notepadText = "";
  if (!parsed.subcheckins) parsed.subcheckins = {};
  if (Array.isArray(parsed.habits)) {
    parsed.habits.forEach((h) => {
      if (h.targetPerWeek == null) h.targetPerWeek = 3;
      if (h.description == null) h.description = "";
      if (!Array.isArray(h.subtasks)) h.subtasks = [];
    });
  }
  return parsed;
}

function todayISO(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  return d.toISOString().slice(0, 10);
}

function addDays(iso, offset) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offset));
  return todayISO(date);
}

function isSameYear(iso, year) {
  return Number(iso.slice(0, 4)) === year;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const DAILY_QUOTES = [
  "You may delay, but time will not. — Benjamin Franklin",
  "The accountability mirror doesn't lie. It's your first step towards growth.",
  "The hardest battle you will fight is the battle to be yourself in a world that is trying to make you like everyone else.",
  "Confidence comes not from always being right but from not fearing to be wrong. — Peter T. McIntyre",
  "We suffer more often in imagination than in reality. — Seneca",
  "You have power over your mind—not outside events. Realize this, and you will find strength. — Marcus Aurelius",
  "Argue for your limitations, and sure enough, they're yours. — Richard Bach",
  "Whether you think you can, or you think you can't—you're right. — Henry Ford",
  "No man is free who is not master of himself. — Epictetus",
  "To be honest, speak without identity. — Naval Ravikant",
  "First say to yourself what you would be; and then do what you have to do. — Epictetus",
  "Everything in life happens twice — first in your mind, and then in reality.",
  "Your 'why' is your fuel—it's what keeps you going when things get tough.",
  "Problem is the part of life and dealing it is the art of life.",
  "He who has a why to live for can bear almost any how. — Friedrich Nietzsche",
  "Desire is a contract that you make with yourself to be unhappy until you get what you want. — Naval Ravikant",
  "A fit body, a calm mind, a house full of love. These things cannot be bought—they must be earned. — Naval Ravikant",
  "Success is stumbling from failure to failure with no loss of enthusiasm. — Winston Churchill",
  "Do what you can, with what you have, where you are. — Theodore Roosevelt",
  "The greatest superpower is the ability to change yourself. — Naval Ravikant",
  "If you're going through hell, keep going. — Winston Churchill",
  "When you feel like giving up, remember you still have 60% of your strength left in you. Keep going.",
  "Raise your hand… now raise it a little higher. Then ask yourself — why didn't you give your 100% the first time?",
  "Discipline equals freedom. — Jocko Willink",
  "Motivation is what gets you started. Habit is what keeps you going. — Jim Ryun",
  "Don't stop when you're tired. Stop when you're done. — David Goggins",
  "Action is the foundational key to all success. — Pablo Picasso",
  "Knowing is not enough; we must apply. Willing is not enough; we must do. — Johann Wolfgang von Goethe",
  "Amateurs sit and wait for inspiration, the rest of us just get up and go to work. — Stephen King",
  "Waste no more time arguing what a good man should be. Be one. — Marcus Aurelius",
  "Inspiration is perishable. Act on it immediately. — Naval Ravikant",
  "Early progress is invisible.",
  "Every habit is a vote for the type of person you wish to be.",
  "There is no 'miracle moment.' Overnight success is usually the result of ten years of pushing the flywheel.",
  "Play iterated games. All the returns in life, whether in wealth, relationships, or knowledge, come from compound interest. — Naval Ravikant",
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit. — Will Durant",
  "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success. — Dwayne Johnson",
  "It does not matter how slowly you go as long as you do not stop. — Confucius",
  "Impatience with actions, patience with results. — Naval Ravikant",
  "The journey of a thousand miles begins with one step. — Lao Tzu",
  "Fall seven times and stand up eight. — Japanese Proverb",
  "Staying in denial may feel safe, but true growth begins when you step out of your comfort zone.",
  "What you're not changing, you're choosing. — Laurie Buchanan, PhD",
  "Procrastination is the thief of time. — Edward Young",
  "You may delay, but time will not. — Benjamin Franklin",
  "A year from now you may wish you had started today. — Karen Lamb",
  "Only put off until tomorrow what you are willing to die having left undone. — Pablo Picasso",
  "The scariest moment is always just before you start. — Stephen King",
  "The modern devil is cheap dopamine. — Naval Ravikant",
  "I find that the harder I work, the more luck I seem to have. — Thomas Jefferson",
  "Read what you love until you love to read. — Naval Ravikant",
  "Rich people focus on what they gain, not on what it costs.",
  "If you have the right people, you don't need to micromanage them. If you have the wrong people, the best strategy in the world won't save you.",
  "The best place to look for secrets is where no one else is looking—in the gaps between established disciplines.",
  "The most valuable businesses of the future will be the ones that solve problems in ways we haven't even imagined yet.",
  "Mediocrity hates excellence because excellence exposes mediocrity.",
  "Earn with your mind, not your time. — Naval Ravikant",
  "You're not going to get rich renting out your time. You must own equity to gain your financial freedom. — Naval Ravikant",
  "If you can't see yourself working with someone for life, don't work with them for a day. — Naval Ravikant",
  "Specific knowledge is found by pursuing your genuine curiosity and passion rather than whatever is hot right now. — Naval Ravikant",
  "Learn to sell. Learn to build. If you can do both, you will be unstoppable. — Naval Ravikant"
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeParsedState(JSON.parse(raw));
  } catch (e) {
    console.error("Failed to load state", e);
    return {
      habits: [],
      checkins: {},
      notes: [],
      reminderTime: DEFAULT_REMINDER_TIME,
      remindersEnabled: true,
      theme: "dark"
    };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(DATA_VERSION_KEY, String(Date.now()));
  saveStateToIndexedDb(state);
}

/** Full UI refresh after restore / cloud merge */
function refreshUIAfterStateImport() {
  renderTodayLabel();
  renderHabitsForSelectedDate();
  try {
    renderAnalytics();
  } catch (e) {
    console.error("renderAnalytics failed", e);
  }
  try {
    renderMatrix();
  } catch (e) {
    console.error("renderMatrix failed", e);
  }
  renderNotes();
  initReminders();
}

function applyParsedStateToApp(parsed) {
  const n = normalizeParsedState(parsed);
  if (!Array.isArray(n.habits) || !n.checkins) {
    console.error("Invalid state object");
    return;
  }
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, n);
  saveState(state);
  refreshUIAfterStateImport();
}

async function recoverStateFromIndexedDbIfNeeded() {
  const hasLocal = !!localStorage.getItem(STORAGE_KEY);
  if (hasLocal) return;
  const idbState = await loadStateFromIndexedDb();
  if (!idbState) return;
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, idbState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(DATA_VERSION_KEY, String(Date.now()));
  refreshUIAfterStateImport();
}

const state = loadState();

const els = {};

function cacheEls() {
  els.todayLabel = document.getElementById("today-label");
  els.quoteText = document.getElementById("quote-text");
  els.quoteAuthor = document.getElementById("quote-author");
  els.datePicker = document.getElementById("date-picker");
  els.habitList = document.getElementById("habit-list");
  els.addHabit = document.getElementById("add-habit");
  els.resetToday = document.getElementById("reset-today");
  els.consistencyScore = document.getElementById("consistency-score");
  els.longestStreak = document.getElementById("longest-streak");
  els.yearCompletion = document.getElementById("year-completion");
  els.rings = document.querySelectorAll(".ring");
  els.bestHabitName = document.getElementById("best-habit-name");
  els.bestHabitScore = document.getElementById("best-habit-score");
  els.worstHabitName = document.getElementById("worst-habit-name");
  els.worstHabitScore = document.getElementById("worst-habit-score");
  els.activeHabits = document.getElementById("active-habits");
  els.totalCheckins = document.getElementById("total-checkins");
  els.weekProgress = document.getElementById("week-progress");
  els.monthProgress = document.getElementById("month-progress");
  els.categoryChart = document.getElementById("category-chart");
  els.navDashboard = document.getElementById("nav-dashboard");
  els.navNotes = document.getElementById("nav-notes");
  els.dashboardView = document.getElementById("dashboard-view");
  els.notesView = document.getElementById("notes-view");
  els.premiumNotesEditor = document.getElementById("premium-notes-editor");
  els.noteColorPicker = document.getElementById("note-color-picker");
  els.editorToolBtns = document.querySelectorAll(".tool-btn");
  els.heatmap = document.getElementById("heatmap");
  els.heatmapYear = document.getElementById("heatmap-year");
  els.prevYear = document.getElementById("prev-year");
  els.nextYear = document.getElementById("next-year");
  els.reminderTime = document.getElementById("reminder-time");
  els.reminderBanner = document.getElementById("reminder-banner");
  els.jumpToToday = document.getElementById("jump-to-today");
  els.reminderToggle = document.getElementById("reminder-toggle");
  els.themeToggle = document.getElementById("theme-toggle");

  els.backupDownload = document.getElementById("backup-download");
  els.backupRestore = document.getElementById("backup-restore");
  els.backupFileInput = document.getElementById("backup-file-input");
  els.autoBackupEnabled = document.getElementById("auto-backup-enabled");
  els.autoBackupStatus = document.getElementById("auto-backup-status");

  els.habitDialog = document.getElementById("habit-dialog");
  els.habitDialogTitle = document.getElementById("habit-dialog-title");
  els.habitNameInput = document.getElementById("habit-name-input");
  els.habitCategoryInput = document.getElementById("habit-category-input");
  els.habitDescriptionInput = document.getElementById("habit-description-input");
  els.habitSubtasksInput = document.getElementById("habit-subtasks-input");
  els.habitTargetInput = document.getElementById("habit-target-input");
  els.deleteHabit = document.getElementById("delete-habit");
  els.saveHabit = document.getElementById("save-habit");
  els.habitPriorityInput = document.getElementById("habit-priority-input");
  els.habitCategorySuggestions = document.getElementById(
    "habit-category-suggestions"
  );
}

let ui = {
  selectedDate: todayISO(),
  heatmapYear: new Date().getFullYear(),
  editingHabitId: null
};

function formatHumanDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function renderTodayLabel() {
  const today = todayISO();
  const suffix = ui.selectedDate === today ? "Today" : "";
  els.todayLabel.textContent = `${formatHumanDate(ui.selectedDate)} ${
    suffix ? "· " + suffix : ""
  }`;
  els.datePicker.value = ui.selectedDate;
}

function ensureDateBucket(iso) {
  if (!state.checkins[iso]) state.checkins[iso] = {};
}

function isChecked(habitId, iso) {
  const bucket = state.checkins[iso];
  return !!(bucket && bucket[habitId]);
}

function setChecked(habitId, iso, value) {
  ensureDateBucket(iso);
  if (value) state.checkins[iso][habitId] = true;
  else delete state.checkins[iso][habitId];
}

function ensureSubcheckinsBucket(iso, habitId) {
  if (!state.subcheckins) state.subcheckins = {};
  if (!state.subcheckins[iso]) state.subcheckins[iso] = {};
  if (!state.subcheckins[iso][habitId]) state.subcheckins[iso][habitId] = {};
}

function isSubtaskChecked(habitId, subtaskId, iso) {
  const bucket = state.subcheckins?.[iso]?.[habitId];
  return !!(bucket && bucket[subtaskId]);
}

function setSubtaskChecked(habitId, subtaskId, iso, value) {
  ensureSubcheckinsBucket(iso, habitId);
  if (value) state.subcheckins[iso][habitId][subtaskId] = true;
  else delete state.subcheckins[iso][habitId][subtaskId];
}

function syncHabitCompletionFromSubtasks(habit, iso) {
  const subs = Array.isArray(habit.subtasks) ? habit.subtasks : [];
  if (subs.length === 0) return;

  let anyDone = false;
  for (const s of subs) {
    if (isSubtaskChecked(habit.id, s.id, iso)) {
      anyDone = true;
      break;
    }
  }

  ensureDateBucket(iso);
  if (anyDone) state.checkins[iso][habit.id] = true;
  else delete state.checkins[iso][habit.id];
}

function syncSubtasksFromHabitChecked(habit, iso, checked) {
  const subs = Array.isArray(habit.subtasks) ? habit.subtasks : [];
  if (subs.length === 0) return;

  if (!checked) {
    // Clear all subtask completion for this habit/day.
    if (state.subcheckins?.[iso]?.[habit.id]) {
      delete state.subcheckins[iso][habit.id];
    }
    ensureDateBucket(iso);
    delete state.checkins[iso][habit.id];
    return;
  }

  // On: mark all subtasks as done for this day.
  for (const s of subs) {
    setSubtaskChecked(habit.id, s.id, iso, true);
  }
  syncHabitCompletionFromSubtasks(habit, iso);
}

function renderHabitsForSelectedDate() {
  if (!els.habitList) return;
  els.habitList.innerHTML = "";
  const tpl = document.getElementById("habit-row-template");
  const iso = ui.selectedDate;
  let didMigrateSubcheckins = false;
  state.habits.forEach((habit, index) => {
    const frag = tpl.content.cloneNode(true);
    const row = frag.querySelector(".habit-row");
    const checkbox = row.querySelector(".habit-checkbox");
    const nameEl = row.querySelector(".habit-name");
    const catEl = row.querySelector(".habit-category");
    const streakCurrentEl = row.querySelector(".habit-streak-current");
    const streakBestEl = row.querySelector(".habit-streak-best");
    const editBtn = row.querySelector(".habit-edit");
    const progressFill = row.querySelector(".habit-progress-fill");
    const progressLabel = row.querySelector(".habit-progress-label");
    const weekStrip = row.querySelector(".habit-week-strip");
    const goalBadge = row.querySelector(".habit-goal-badge");
    const descEl = row.querySelector(".habit-description");
    const subtasksEl = row.querySelector(".habit-subtasks");
    const subtaskProgressEl = row.querySelector(
      ".habit-subtask-progress"
    );

    row.dataset.habitId = habit.id;
    row.dataset.index = String(index);
    row.draggable = true;

    if (habit.priority) {
      row.classList.add("habit-priority");
    }

    nameEl.textContent = habit.name;
    const target = habit.targetPerWeek || 0;
    catEl.textContent =
      target > 0
        ? `${habit.category || "General"} · ${target}×/week`
        : habit.category || "General";
    checkbox.checked = isChecked(habit.id, iso);

    const subs = Array.isArray(habit.subtasks) ? habit.subtasks : [];
    // Migration: if old data says habit is done but subcheckins are empty,
    // mark the first subtask done for this day so the UI rule stays consistent.
    if (subs.length > 0) {
      const subBucket = state.subcheckins?.[iso]?.[habit.id];
      const hasAnySub = !!(subBucket && Object.keys(subBucket).length > 0);
      if (checkbox.checked && !hasAnySub) {
        setSubtaskChecked(habit.id, subs[0].id, iso, true);
        didMigrateSubcheckins = true;
      }

      syncHabitCompletionFromSubtasks(habit, iso);
      checkbox.checked = isChecked(habit.id, iso);
    }

    const streak = computeStreakForHabit(habit.id, ui.selectedDate);
    const longest = computeLongestStreak(habit.id);
    if (streakCurrentEl) {
      streakCurrentEl.textContent =
        streak > 0 ? `🔥 ${streak}‑day streak` : "No streak yet";
    }
    if (streakBestEl) {
      streakBestEl.textContent =
        longest > 0 ? `Best: ${longest} days` : "";
    }

    if (descEl) {
      const desc = habit.description || "";
      descEl.textContent = desc;
      descEl.hidden = !desc;
    }

    if (subtasksEl) {
      subtasksEl.innerHTML = "";
      if (subs.length > 0) {
        if (subtaskProgressEl) {
          const doneCount = subs.reduce((sum, s) => {
            return sum + (isSubtaskChecked(habit.id, s.id, iso) ? 1 : 0);
          }, 0);
          const totalCount = subs.length;
          subtaskProgressEl.textContent = `Done ${doneCount}/${totalCount}`;
          subtaskProgressEl.setAttribute(
            "aria-label",
            `Subtasks done: ${doneCount} of ${totalCount}`
          );
          subtaskProgressEl.hidden = false;
        }

        // Show only unfinished subtasks for the selected day.
        const visibleSubs = subs.filter(
          (s) => !isSubtaskChecked(habit.id, s.id, iso)
        );

        if (visibleSubs.length === 0) {
          subtasksEl.hidden = true;
        } else {
          for (const s of visibleSubs) {
            const item = document.createElement("label");
            item.className = "subtask-item";

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "subtask-checkbox";
            cb.checked = false;

            cb.addEventListener("change", () => {
              setSubtaskChecked(habit.id, s.id, iso, cb.checked);
              syncHabitCompletionFromSubtasks(habit, iso);
              saveState(state);
              renderHabitsForSelectedDate();
              try {
                renderAnalytics();
              } catch (err) {
                console.error("renderAnalytics failed", err);
              }
              maybeShowReminderBanner();
            });

            const text = document.createElement("span");
            text.textContent = s.text;

            item.appendChild(cb);
            item.appendChild(text);
            subtasksEl.appendChild(item);
          }
        }
      } else {
        subtasksEl.hidden = true;
        if (subtaskProgressEl) subtaskProgressEl.hidden = true;
      }
    }

    const monthPct = computeHabitPeriodCompletion(habit.id, 30);
    if (progressLabel && progressFill) {
      progressLabel.textContent =
        monthPct > 0 ? `${monthPct}% this month` : "No check‑ins this month";
      progressFill.style.width = "0";
      requestAnimationFrame(() => {
        progressFill.style.width = `${monthPct}%`;
      });
    }

    if (weekStrip) {
      weekStrip.innerHTML = "";
      const today = todayISO();
      const labels = ["M", "T", "W", "T", "F", "S", "S"];
      const todaysIndex = new Date().getDay(); // 0 = Sun
      for (let i = 6; i >= 0; i--) {
        const iso = addDays(today, -i);
        const d = new Date(
          Date.UTC(
            Number(iso.slice(0, 4)),
            Number(iso.slice(5, 7)) - 1,
            Number(iso.slice(8, 10))
          )
        );
        const dow = d.getDay(); // 0 Sun ... 6 Sat
        const labelIdx = dow === 0 ? 6 : dow - 1;
        const span = document.createElement("span");
        span.className = "habit-week-day";
        span.textContent = labels[labelIdx];
        const checked = isChecked(habit.id, iso);
        if (checked) span.classList.add("habit-week-day--checked");
        if (iso === today) span.classList.add("habit-week-day--today");
        weekStrip.appendChild(span);
      }
    }

    if (goalBadge) {
      const met = habitMeetsWeeklyTarget(habit);
      goalBadge.hidden = !met;
    }

    checkbox.addEventListener("change", () => {
      if (subs.length > 0) {
        syncSubtasksFromHabitChecked(habit, iso, checkbox.checked);
      } else {
        setChecked(habit.id, iso, checkbox.checked);
      }
      saveState(state);
      renderHabitsForSelectedDate();
      try {
        renderAnalytics();
      } catch (err) {
        console.error("renderAnalytics failed", err);
      }
      maybeShowReminderBanner();
    });

    editBtn.addEventListener("click", () => openHabitDialog(habit.id));

    row.addEventListener("dragstart", (e) => {
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", habit.id);
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
    });

    els.habitList.appendChild(frag);
  });

  if (didMigrateSubcheckins) {
    // Persist migration so streak/UI stay consistent on refresh.
    saveState(state);
  }
}

function computeStreakForHabit(habitId, refDate) {
  let streak = 0;
  let cursor = refDate;
  while (isChecked(habitId, cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function computeLongestStreak(habitId) {
  let longest = 0;
  const dates = Object.keys(state.checkins).sort();
  if (dates.length === 0) return 0;
  let current = 0;
  let prev = null;
  for (const iso of dates) {
    const bucket = state.checkins[iso];
    if (!bucket[habitId]) continue;
    if (!prev) {
      current = 1;
    } else {
      const nextOfPrev = addDays(prev, 1);
      if (nextOfPrev === iso) current += 1;
      else current = 1;
    }
    if (current > longest) longest = current;
    prev = iso;
  }
  return longest;
}

function daysBetween(a, b) {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  const daDate = new Date(Date.UTC(ya, ma - 1, da));
  const dbDate = new Date(Date.UTC(yb, mb - 1, db));
  const diff = dbDate - daDate;
  return Math.round(diff / 86400000);
}

function computeAnalytics() {
  const today = todayISO();
  const yearAgo = addDays(today, -364);

  let totalPossible = 0;
  let totalCompleted = 0;
  let perHabitStats = new Map();

  const daysRange = [];
  let cursor = yearAgo;
  while (cursor <= today) {
    daysRange.push(cursor);
    cursor = addDays(cursor, 1);
  }

  state.habits.forEach((habit) => {
    let completed = 0;
    daysRange.forEach((iso) => {
      const bucket = state.checkins[iso];
      if (bucket && bucket[habit.id]) completed += 1;
    });
    totalPossible += daysRange.length;
    totalCompleted += completed;
    const consistency = totalPossible
      ? (completed / daysRange.length) * 100
      : 0;

    const longestStreak = computeLongestStreak(habit.id);
    perHabitStats.set(habit.id, {
      completed,
      consistency,
      longestStreak
    });
  });

  const overallConsistency =
    totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  let longestEver = 0;
  perHabitStats.forEach((v) => {
    if (v.longestStreak > longestEver) longestEver = v.longestStreak;
  });

  let best = null;
  let worst = null;
  perHabitStats.forEach((value, id) => {
    if (best === null || value.consistency > best.consistency) {
      best = { id, ...value };
    }
    if (worst === null || value.consistency < worst.consistency) {
      worst = { id, ...value };
    }
  });

  const activeHabits = state.habits.length;

  const totalCheckins = Object.values(state.checkins).reduce(
    (sum, day) => sum + Object.values(day).length,
    0
  );

  return {
    overallConsistency,
    longestEver,
    perHabitStats,
    best,
    worst,
    activeHabits,
    totalCheckins
  };
}

function computePeriodCompletion(daysBack) {
  const today = todayISO();
  const start = addDays(today, -(daysBack - 1));
  const habitsCount = state.habits.length;
  if (habitsCount === 0) return 0;

  let possible = 0;
  let completed = 0;
  let cursor = start;
  while (cursor <= today) {
    possible += habitsCount;
    const bucket = state.checkins[cursor];
    if (bucket) completed += Object.values(bucket).length;
    cursor = addDays(cursor, 1);
  }
  if (possible === 0) return 0;
  return Math.round((completed / possible) * 100);
}

function computeHabitPeriodCompletion(habitId, daysBack) {
  const today = todayISO();
  const start = addDays(today, -(daysBack - 1));
  let possible = 0;
  let completed = 0;
  let cursor = start;
  while (cursor <= today) {
    possible += 1;
    const bucket = state.checkins[cursor];
    if (bucket && bucket[habitId]) completed += 1;
    cursor = addDays(cursor, 1);
  }
  if (possible === 0) return 0;
  return Math.round((completed / possible) * 100);
}

function habitMeetsWeeklyTarget(habit) {
  const target = habit.targetPerWeek || 0;
  if (target <= 0) return false;
  const today = todayISO();
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const offsetToMonday = (dow + 6) % 7;
  let cursor = addDays(today, -offsetToMonday);
  let done = 0;
  for (let i = 0; i < 7; i++) {
    if (isChecked(habit.id, cursor)) done += 1;
    cursor = addDays(cursor, 1);
  }
  return done >= target;
}

function renderDailyQuote() {
  if (!els.quoteText) return;
  const index = dayOfYear(new Date()) % DAILY_QUOTES.length;
  const raw = DAILY_QUOTES[index];
  const sep = " — ";
  const pos = raw.indexOf(sep);
  if (pos !== -1) {
    els.quoteText.textContent = raw.slice(0, pos).trim();
    if (els.quoteAuthor) els.quoteAuthor.textContent = raw.slice(pos + sep.length).trim();
  } else {
    els.quoteText.textContent = raw;
    if (els.quoteAuthor) els.quoteAuthor.textContent = "";
  }
}

function renderNotes() {
  // Deprecated UI component, stubbed for backward compatibility.
}

function refreshCategorySuggestions() {
  if (!els.habitCategorySuggestions) return;
  const set = new Set();
  state.habits.forEach((h) => {
    if (h.category) set.add(h.category);
  });
  ["Health", "Mind", "Work", "Learning"].forEach((c) => set.add(c));

  els.habitCategorySuggestions.innerHTML = "";
  Array.from(set)
    .sort()
    .forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      els.habitCategorySuggestions.appendChild(opt);
    });
}

/** 30-day matrix UI not present in current layout; keep as no-op for analytics. */
function renderMatrix() {}

function setRingProgress(ringName, percentage) {
  const ring = document.querySelector(`.ring[data-ring="${ringName}"]`);
  if (!ring) return;
  const fg = ring.querySelector(".ring-fg");
  const circumference = 2 * Math.PI * 50;
  const pct = Math.max(0, Math.min(100, percentage));
  const dash = (pct / 100) * circumference;
  fg.style.strokeDasharray = `${dash} ${circumference}`;
  if (ringName === "consistency") {
    fg.style.stroke =
      pct >= 80
        ? "var(--accent-green)"
        : pct >= 40
        ? "var(--accent-orange)"
        : "var(--accent)";
  }
}

function renderAnalytics() {
  if (!els.consistencyScore) return;
  const {
    overallConsistency,
    longestEver,
    perHabitStats,
    best,
    worst,
    activeHabits,
    totalCheckins
  } = computeAnalytics();

  els.consistencyScore.textContent = `${overallConsistency}%`;
  els.longestStreak.textContent = `${longestEver} days`;
  els.yearCompletion.textContent = `${overallConsistency}%`;

  setRingProgress("consistency", overallConsistency);
  setRingProgress("streak", Math.min(100, (longestEver / 365) * 100));
  setRingProgress("year", overallConsistency);

  if (best && state.habits.length > 0) {
    const habit = state.habits.find((h) => h.id === best.id);
    els.bestHabitName.textContent = habit ? habit.name : "–";
    els.bestHabitScore.textContent = `${best.consistency.toFixed(
      0
    )}% consistency`;
  } else {
    els.bestHabitName.textContent = "–";
    els.bestHabitScore.textContent = "0% consistency";
  }

  if (worst && state.habits.length > 0) {
    const habit = state.habits.find((h) => h.id === worst.id);
    els.worstHabitName.textContent = habit ? habit.name : "–";
    els.worstHabitScore.textContent = `${worst.consistency.toFixed(
      0
    )}% consistency`;
  } else {
    els.worstHabitName.textContent = "–";
    els.worstHabitScore.textContent = "0% consistency";
  }

  els.activeHabits.textContent = String(activeHabits);
  els.totalCheckins.textContent = String(totalCheckins);

  const weekPct = computePeriodCompletion(7);
  const monthPct = computePeriodCompletion(30);
  els.weekProgress.textContent = `${weekPct}%`;
  els.monthProgress.textContent = `${monthPct}%`;

  refreshCategorySuggestions();

  renderCategoryChart(perHabitStats);
  renderHeatmap(ui.heatmapYear);
  renderMatrix();
  renderNotes();
}

function renderCategoryChart(perHabitStats) {
  if (!els.categoryChart) return;
  els.categoryChart.innerHTML = "";
  const totals = {};
  perHabitStats.forEach((stats, habitId) => {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const cat = habit.category || "Other";
    if (!totals[cat]) totals[cat] = 0;
    totals[cat] += stats.completed;
  });

  const categories = Object.keys(totals);
  if (categories.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No data yet. Start checking off habits.";
    empty.style.fontSize = "12px";
    empty.style.color = "var(--text-muted)";
    els.categoryChart.appendChild(empty);
    return;
  }

  const max = Math.max(...Object.values(totals));
  categories.forEach((cat) => {
    const row = document.createElement("div");
    row.className = "category-row";

    const label = document.createElement("div");
    label.className = "category-label";
    label.textContent = cat;

    const track = document.createElement("div");
    track.className = "category-bar-track";

    const fill = document.createElement("div");
    fill.className = "category-bar-fill";
    const pct = max === 0 ? 0 : (totals[cat] / max) * 100;
    requestAnimationFrame(() => {
      fill.style.width = `${pct}%`;
    });

    track.appendChild(fill);

    const value = document.createElement("div");
    value.className = "category-value";
    value.textContent = totals[cat];

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);

    els.categoryChart.appendChild(row);
  });
}

function computeHeatmapLayout(containerWidth, dayCount) {
  const gap = 3;
  const minCell = 4;
  const maxCell = 11;
  let cols = Math.min(53, Math.max(1, dayCount));
  let cellPx = Math.floor((containerWidth - (cols - 1) * gap) / cols);
  while (cellPx < minCell && cols > 12) {
    cols -= 1;
    cellPx = Math.floor((containerWidth - (cols - 1) * gap) / cols);
  }
  cellPx = Math.max(minCell, Math.min(maxCell, cellPx));
  const totalW = cols * cellPx + (cols - 1) * gap;
  return { cols, cellPx, gap, totalW };
}

function renderHeatmap(year) {
  if (!els.heatmap) return;
  els.heatmapYear.textContent = String(year);
  els.heatmap.innerHTML = "";

  const yearStart = todayISO(new Date(Date.UTC(year, 0, 1)));
  const yearEnd = todayISO(new Date(Date.UTC(year, 11, 31)));

  const counts = {};
  Object.entries(state.checkins).forEach(([iso, habitsDone]) => {
    if (!isSameYear(iso, year)) return;
    counts[iso] = Object.values(habitsDone).length;
  });

  const days = [];
  let cursor = yearStart;
  while (cursor <= yearEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const wrap = els.heatmap.parentElement;
  let containerW = wrap?.clientWidth ?? 0;
  if (containerW < 48) {
    containerW = Math.round(window.innerWidth * 0.46);
  }
  const { cols, cellPx, gap, totalW } = computeHeatmapLayout(containerW, days.length);
  els.heatmap.style.gridTemplateColumns = `repeat(${cols}, ${cellPx}px)`;
  els.heatmap.style.gridAutoRows = `${cellPx}px`;
  els.heatmap.style.gap = `${gap}px`;
  els.heatmap.style.width = `${totalW}px`;

  const todayStr = todayISO();
  days.forEach((iso) => {
    const cell = document.createElement("div");
    const count = counts[iso] || 0;
    let level = 0;
    if (count <= 0) level = 0;
    else if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count === 3) level = 3;
    else if (count === 4) level = 4;
    else if (count === 5) level = 5;
    else if (count === 6) level = 6;
    else if (count === 7) level = 7;
    else level = 8;
    cell.className = `heatmap-cell level-${level}`;
    if (iso === todayStr) cell.classList.add("heatmap-cell--today");
    if (iso === ui.selectedDate) cell.classList.add("heatmap-cell--selected");
    cell.title = `${formatHumanDate(iso)} · ${count} habit${
      count === 1 ? "" : "s"
    }`;
    cell.addEventListener("click", () => {
      ui.selectedDate = iso;
      renderTodayLabel();
      renderHabitsForSelectedDate();
    });
    els.heatmap.appendChild(cell);
  });
}

function openHabitDialog(habitId = null) {
  ui.editingHabitId = habitId;
  if (habitId) {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;
    els.habitDialogTitle.textContent = "Edit Habit";
    els.habitNameInput.value = habit.name;
    els.habitCategoryInput.value = habit.category;
    if (els.habitDescriptionInput) {
      els.habitDescriptionInput.value = habit.description || "";
    }
    if (els.habitSubtasksInput) {
      const subs = Array.isArray(habit.subtasks) ? habit.subtasks : [];
      els.habitSubtasksInput.value = subs.map((s) => s.text).join("\n");
    }
    if (els.habitTargetInput) {
      els.habitTargetInput.value =
        habit.targetPerWeek != null ? String(habit.targetPerWeek) : "3";
    }
    if (els.habitPriorityInput) {
      els.habitPriorityInput.checked = !!habit.priority;
    }
    els.deleteHabit.style.display = "inline-flex";
  } else {
    els.habitDialogTitle.textContent = "New Habit";
    els.habitNameInput.value = "";
    els.habitCategoryInput.value = "";
    if (els.habitDescriptionInput) {
      els.habitDescriptionInput.value = "";
    }
    if (els.habitSubtasksInput) {
      els.habitSubtasksInput.value = "";
    }
    if (els.habitTargetInput) {
      els.habitTargetInput.value = "3";
    }
    if (els.habitPriorityInput) {
      els.habitPriorityInput.checked = false;
    }
    els.deleteHabit.style.display = "none";
  }
  refreshCategorySuggestions();
  if (!els.habitDialog.open) {
    els.habitDialog.showModal();
  }
}

function closeHabitDialog() {
  const d = els.habitDialog;
  if (!d) return;
  try {
    if (d.open) d.close();
  } catch (e) {
    console.warn("habit dialog close", e);
  }
  if (d.hasAttribute("open")) d.removeAttribute("open");
  ui.editingHabitId = null;
}

function handleSaveHabit(ev) {
  ev.preventDefault();
  const name = els.habitNameInput.value.trim();
  if (!name) return;
  const category = els.habitCategoryInput.value || "Other";
  const description = (els.habitDescriptionInput?.value || "").trim();
  const subtasksRaw = (els.habitSubtasksInput?.value || "").trim();
  const subtaskTexts = subtasksRaw
    ? subtasksRaw
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  let targetPerWeek = 3;
  if (els.habitTargetInput) {
    const parsed = parseInt(els.habitTargetInput.value, 10);
    if (!Number.isNaN(parsed)) {
      targetPerWeek = Math.min(7, Math.max(1, parsed));
    }
  }

  const priority = els.habitPriorityInput ? els.habitPriorityInput.checked : false;

  if (ui.editingHabitId) {
    const habit = state.habits.find((h) => h.id === ui.editingHabitId);
    if (habit) {
      habit.name = name;
      habit.category = category;
      habit.description = description;
      habit.targetPerWeek = targetPerWeek;
      habit.priority = priority;

      const existing = Array.isArray(habit.subtasks) ? habit.subtasks : [];
      habit.subtasks = subtaskTexts.map((text) => {
        const match = existing.find((s) => s.text === text);
        return (
          match || {
            id: "s" + Math.random().toString(36).slice(2, 9),
            text
          }
        );
      });
    }
  } else {
    const id = "h" + Math.random().toString(36).slice(2, 9);
    const subtasks = subtaskTexts.map((text) => ({
      id: "s" + Math.random().toString(36).slice(2, 9),
      text
    }));
    state.habits.push({
      id,
      name,
      category,
      description,
      targetPerWeek,
      priority,
      subtasks,
      createdAt: todayISO()
    });
  }

  saveState(state);
  closeHabitDialog();
  requestAnimationFrame(() => {
    if (els.habitDialog?.open) closeHabitDialog();
  });
  renderHabitsForSelectedDate();
  try {
    renderAnalytics();
  } catch (err) {
    console.error("renderAnalytics failed", err);
  }
}

function handleDeleteHabit() {
  if (!ui.editingHabitId) return;
  const id = ui.editingHabitId;
  state.habits = state.habits.filter((h) => h.id !== id);
  Object.values(state.checkins).forEach((bucket) => {
    delete bucket[id];
  });
  if (state.subcheckins) {
    Object.values(state.subcheckins).forEach((bucket) => {
      if (bucket && bucket[id]) delete bucket[id];
    });
  }
  saveState(state);
  closeHabitDialog();
  requestAnimationFrame(() => {
    if (els.habitDialog?.open) closeHabitDialog();
  });
  renderHabitsForSelectedDate();
  try {
    renderAnalytics();
  } catch (err) {
    console.error("renderAnalytics failed", err);
  }
}

function handleResetToday() {
  const bucket = state.checkins[ui.selectedDate];
  if (!bucket) return;
  state.habits.forEach((h) => {
    delete bucket[h.id];
  });
  if (state.subcheckins && state.subcheckins[ui.selectedDate]) {
    state.habits.forEach((h) => {
      if (state.subcheckins[ui.selectedDate]) {
        delete state.subcheckins[ui.selectedDate][h.id];
      }
    });
  }
  saveState(state);
  renderHabitsForSelectedDate();
  try {
    renderAnalytics();
  } catch (err) {
    console.error("renderAnalytics failed", err);
  }
  maybeShowReminderBanner();
}

function parseReminderTime(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function isAfterReminderToday(reminderTime) {
  const now = new Date();
  const rt = parseReminderTime(reminderTime);
  if (!rt) return false;
  if (now.getHours() > rt.h) return true;
  if (now.getHours() < rt.h) return false;
  return now.getMinutes() >= rt.m;
}

function maybeShowReminderBanner() {
  const today = todayISO();
  const hasUnchecked =
    state.habits.length > 0 &&
    state.habits.some((h) => !isChecked(h.id, today));

  const shouldShow =
    state.remindersEnabled &&
    hasUnchecked &&
    isAfterReminderToday(state.reminderTime);

  if (shouldShow) {
    els.reminderBanner.classList.add("visible");
  } else {
    els.reminderBanner.classList.remove("visible");
  }
}

function initReminders() {
  els.reminderTime.value = state.reminderTime || DEFAULT_REMINDER_TIME;
  const span = els.reminderToggle.querySelector("[data-state]");
  span.textContent = state.remindersEnabled ? "On" : "Off";
  els.reminderToggle.dataset.active = state.remindersEnabled ? "true" : "false";

  els.reminderTime.addEventListener("change", () => {
    state.reminderTime = els.reminderTime.value || DEFAULT_REMINDER_TIME;
    saveState(state);
    maybeShowReminderBanner();
  });

  els.reminderToggle.addEventListener("click", () => {
    state.remindersEnabled = !state.remindersEnabled;
    saveState(state);
    span.textContent = state.remindersEnabled ? "On" : "Off";
    els.reminderToggle.dataset.active = state.remindersEnabled
      ? "true"
      : "false";
    maybeShowReminderBanner();
  });

  maybeShowReminderBanner();
  setInterval(maybeShowReminderBanner, 60 * 1000);
}

function initTheme() {
  // Single color scheme — no theme switching needed
}

function downloadBackupFile(filename) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
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

function maybeAutoBackupDownload() {
  if (!els.autoBackupEnabled || !els.autoBackupEnabled.checked) return;
  const today = todayISO();
  const last = localStorage.getItem(AUTO_BACKUP_LAST_DATE_KEY);
  if (last === today) return;

  downloadBackupFile("habit-rings-backup-latest.json");
  localStorage.setItem(AUTO_BACKUP_LAST_DATE_KEY, today);
  if (els.autoBackupStatus) {
    els.autoBackupStatus.textContent = `Auto backup downloaded (${today}).`;
  }
}

function initAutoBackupUI() {
  if (!els.autoBackupEnabled) return;
  const enabled = localStorage.getItem(AUTO_BACKUP_ENABLED_KEY) === "1";
  els.autoBackupEnabled.checked = enabled;
  if (els.autoBackupStatus) {
    els.autoBackupStatus.textContent = enabled
      ? "Auto backup is enabled."
      : "Auto backup is disabled.";
  }
  els.autoBackupEnabled.addEventListener("change", () => {
    const on = !!els.autoBackupEnabled.checked;
    localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, on ? "1" : "0");
    if (els.autoBackupStatus) {
      els.autoBackupStatus.textContent = on
        ? "Auto backup is enabled."
        : "Auto backup is disabled.";
    }
    if (on) maybeAutoBackupDownload();
  });
}

function initEvents() {
  if (els.datePicker) {
    els.datePicker.addEventListener("change", () => {
      ui.selectedDate = els.datePicker.value || todayISO();
      renderTodayLabel();
      renderHabitsForSelectedDate();
      renderHeatmap(ui.heatmapYear);
    });
  }

  if (els.addHabit) els.addHabit.addEventListener("click", () => openHabitDialog(null));
  if (els.resetToday) els.resetToday.addEventListener("click", handleResetToday);

  if (els.habitList) {
    els.habitList.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = els.habitList.querySelector(".habit-row.dragging");
      if (!dragging) return;
      const afterElement = Array.from(
        els.habitList.querySelectorAll(".habit-row:not(.dragging)")
      ).find((row) => {
        const rect = row.getBoundingClientRect();
        return e.clientY < rect.top + rect.height / 2;
      });
      if (!afterElement) {
        els.habitList.appendChild(dragging);
      } else {
        els.habitList.insertBefore(dragging, afterElement);
      }
    });

    els.habitList.addEventListener("drop", (e) => {
      e.preventDefault();
      const dragging = els.habitList.querySelector(".habit-row.dragging");
      if (!dragging) return;
      const id = dragging.dataset.habitId;
      const rows = Array.from(els.habitList.querySelectorAll(".habit-row"));
      const newIndex = rows.indexOf(dragging);
      const oldIndex = state.habits.findIndex((h) => h.id === id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const [moved] = state.habits.splice(oldIndex, 1);
        state.habits.splice(newIndex, 0, moved);
        saveState(state);
        renderHabitsForSelectedDate();
        renderAnalytics();
      }
    });
  }



  if (els.premiumNotesEditor) {
    // Load saved content
    els.premiumNotesEditor.innerHTML = typeof state.notepadText === 'string' ? state.notepadText : '';

    // Save on input
    els.premiumNotesEditor.addEventListener("input", () => {
      state.notepadText = els.premiumNotesEditor.innerHTML;
      saveState(state);
    });

    // Track the saved selection so we can restore it before executing commands
    let savedRange = null;

    function saveSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    }

    function restoreSelection() {
      if (!savedRange) {
        // If no saved range, move cursor to end of editor
        els.premiumNotesEditor.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(els.premiumNotesEditor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      els.premiumNotesEditor.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }

    // Save selection whenever user interacts with the editor
    els.premiumNotesEditor.addEventListener("mouseup", saveSelection);
    els.premiumNotesEditor.addEventListener("keyup", saveSelection);
    els.premiumNotesEditor.addEventListener("focus", saveSelection);

    // Formatting tools
    if (els.editorToolBtns) {
      els.editorToolBtns.forEach(btn => {
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent focus leaving editor
          restoreSelection();  // Put cursor back in editor
          const cmd = btn.dataset.cmd;
          const val = btn.dataset.val || null;
          document.execCommand(cmd, false, val);
          saveSelection(); // Save new selection after formatting
          // Trigger save
          state.notepadText = els.premiumNotesEditor.innerHTML;
          saveState(state);
        });
      });
    }

    if (els.noteColorPicker) {
      els.noteColorPicker.addEventListener("mousedown", () => {
        saveSelection();
      });
      els.noteColorPicker.addEventListener("input", (e) => {
        restoreSelection();
        document.execCommand("foreColor", false, e.target.value);
        saveSelection();
        state.notepadText = els.premiumNotesEditor.innerHTML;
        saveState(state);
      });
    }
  }

  if (els.prevYear) {
    els.prevYear.addEventListener("click", () => {
      ui.heatmapYear -= 1;
      renderHeatmap(ui.heatmapYear);
    });
  }
  if (els.nextYear) {
    els.nextYear.addEventListener("click", () => {
      const currentYear = new Date().getFullYear();
      if (ui.heatmapYear < currentYear + 1) {
        ui.heatmapYear += 1;
        renderHeatmap(ui.heatmapYear);
      }
    });
  }

  if (els.jumpToToday) {
    els.jumpToToday.addEventListener("click", () => {
      ui.selectedDate = todayISO();
      renderTodayLabel();
      renderHabitsForSelectedDate();
      renderHeatmap(ui.heatmapYear);
      els.reminderBanner.classList.remove("visible");
    });
  }

  if (els.backupDownload) {
    els.backupDownload.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = todayISO().replace(/-/g, "");
      a.href = url;
      a.download = `habit-rings-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (els.backupRestore && els.backupFileInput) {
    els.backupRestore.addEventListener("click", () => {
      els.backupFileInput.click();
    });

    els.backupFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed || typeof parsed !== "object") throw new Error("bad");
          if (!Array.isArray(parsed.habits) || !parsed.checkins) {
            throw new Error("missing keys");
          }
          applyParsedStateToApp(parsed);
        } catch (err) {
          console.error("Failed to restore backup", err);
          alert("Could not read this backup file.");
        } finally {
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    });
  }

  els.habitDialog.addEventListener("close", () => {
    ui.editingHabitId = null;
  });
  const habitDialogForm = els.habitDialog.querySelector("form");
  if (habitDialogForm && habitDialogForm.dataset.saveBound !== "1") {
    habitDialogForm.dataset.saveBound = "1";
    habitDialogForm.addEventListener("submit", handleSaveHabit);
  }
  els.deleteHabit.addEventListener("click", handleDeleteHabit);

  const cancelButton = els.habitDialog.querySelector('button[value="cancel"]');
  if (cancelButton) {
    cancelButton.addEventListener("click", (e) => {
      e.preventDefault();
      closeHabitDialog();
    });
  }

}

let heatmapRoTimer = null;
function initHeatmapResizeObserver() {
  const wrap = document.querySelector(".heatmap-scroll");
  if (!wrap || wrap.dataset.heatmapRo === "1") return;
  wrap.dataset.heatmapRo = "1";
  const ro = new ResizeObserver(() => {
    if (!els.heatmap) return;
    clearTimeout(heatmapRoTimer);
    heatmapRoTimer = setTimeout(() => renderHeatmap(ui.heatmapYear), 48);
  });
  ro.observe(wrap);
}

async function init() {
  cacheEls();
  await recoverStateFromIndexedDbIfNeeded();
  if (!localStorage.getItem(DATA_VERSION_KEY) && localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(DATA_VERSION_KEY, String(Date.now()));
  }
  // Re-sync notes from localStorage on load so they never appear missing after refresh
  try {
    const fresh = loadState();
    if (Array.isArray(fresh.notes)) state.notes = fresh.notes;
  } catch (e) {
    console.error("Re-load notes failed", e);
  }

  ui.selectedDate = todayISO();
  ui.heatmapYear = new Date().getFullYear();

  renderDailyQuote();
  renderTodayLabel();
  renderHabitsForSelectedDate();

  try {
    renderAnalytics();
  } catch (e) {
    console.error("renderAnalytics failed", e);
  }

  initEvents();
  initHeatmapResizeObserver();
  initReminders();
  initTheme();

  // Ensure matrix and notes render even if analytics failed earlier
  try {
    renderMatrix();
    renderNotes();
    // Defer notes render so DOM is fully ready (fixes notes disappearing on refresh)
    requestAnimationFrame(() => {
      if (els.notesList) renderNotes();
    });
  } catch (e) {
    console.error("renderMatrix/renderNotes failed", e);
  }

  initAutoBackupUI();
  maybeAutoBackupDownload();

  startDayChangeRefresh();
}

let dayChangeCheckInterval = null;

function startDayChangeRefresh() {
  let lastDate = todayISO();
  function checkDayChange() {
    const now = todayISO();
    if (now !== lastDate) {
      lastDate = now;
      location.reload();
    }
  }
  if (dayChangeCheckInterval) clearInterval(dayChangeCheckInterval);
  dayChangeCheckInterval = setInterval(checkDayChange, 60 * 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((e) => console.error("init failed", e));

  // ── Focus Timer ──────────────────────────────────
  const timerMinInput = document.getElementById("timer-minutes-input");
  const timerStartBtn = document.getElementById("timer-start-btn");
  const timerCancelBtn = document.getElementById("timer-cancel-btn");
  const timerResetBtn = document.getElementById("timer-reset-btn");
  const timerSetup = document.getElementById("timer-setup");
  const timerRunning = document.getElementById("timer-running");
  const timerDone = document.getElementById("timer-done");
  const timerCountdown = document.getElementById("timer-countdown");
  const sandTop = document.getElementById("sand-top");
  const sandBottom = document.getElementById("sand-bottom");
  const sandStream = document.getElementById("sand-stream");

  if (!timerMinInput || !timerStartBtn) return; // guard for notes page

  let tmInterval = null;
  let tmEndTime = 0;
  let tmTotalMs = 0;

  // ── Input validation ──
  timerMinInput.addEventListener("input", () => {
    let val = parseInt(timerMinInput.value, 10);
    if (val > 60) {
      timerMinInput.value = 60;
      val = 60;
    }
    timerStartBtn.disabled = !(val >= 1 && val <= 60);
  });

  // Prevent typing values > 60
  timerMinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !timerStartBtn.disabled) {
      timerStartBtn.click();
    }
  });

  // ── Start timer ──
  timerStartBtn.addEventListener("click", () => {
    const minutes = parseInt(timerMinInput.value, 10);
    if (minutes < 1 || minutes > 60) return;

    tmTotalMs = minutes * 60 * 1000;
    tmEndTime = Date.now() + tmTotalMs;

    // Switch UI state
    timerSetup.style.display = "none";
    timerRunning.style.display = "flex";
    timerDone.style.display = "none";

    // Start sand animation
    sandStream.classList.add("flowing");
    updateSandTimer(1); // start with full top

    tmInterval = setInterval(() => {
      const remaining = Math.max(0, tmEndTime - Date.now());
      const fraction = remaining / tmTotalMs; // 1 → 0

      // Update countdown text
      const totalSec = Math.ceil(remaining / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      timerCountdown.textContent =
        String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");

      // Update sand visuals
      updateSandTimer(fraction);

      if (remaining <= 0) {
        clearInterval(tmInterval);
        tmInterval = null;
        sandStream.classList.remove("flowing");
        onTimerComplete();
      }
    }, 250);
  });

  // ── Sand visual updater ──
  function updateSandTimer(fraction) {
    // fraction: 1 = full (start), 0 = empty (end)
    const topPct = Math.max(0, Math.min(100, fraction * 100));
    const bottomPct = Math.max(0, Math.min(100, (1 - fraction) * 100));
    if (sandTop) sandTop.style.height = topPct + "%";
    if (sandBottom) sandBottom.style.height = bottomPct + "%";
  }

  // ── Timer complete ──
  function onTimerComplete() {
    timerRunning.style.display = "none";
    timerDone.style.display = "flex";

    // Play a subtle completion sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, time, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.start(time);
        osc.stop(time + dur);
      };
      const now = ctx.currentTime;
      playTone(523.25, now, 0.15);       // C5
      playTone(659.25, now + 0.15, 0.15); // E5
      playTone(783.99, now + 0.3, 0.3);   // G5
    } catch (e) { /* audio not supported */ }
  }

  // ── Cancel timer ──
  timerCancelBtn.addEventListener("click", () => {
    if (tmInterval) {
      clearInterval(tmInterval);
      tmInterval = null;
    }
    sandStream.classList.remove("flowing");
    resetTimerUI();
  });

  // ── Reset after done ──
  timerResetBtn.addEventListener("click", () => {
    resetTimerUI();
  });

  function resetTimerUI() {
    timerSetup.style.display = "flex";
    timerRunning.style.display = "none";
    timerDone.style.display = "none";
    timerMinInput.value = "";
    timerStartBtn.disabled = true;
    timerCountdown.textContent = "00:00";
    updateSandTimer(1); // reset sand to full top
  }
});

