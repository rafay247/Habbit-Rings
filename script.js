const STORAGE_KEY = "habit-rings-data-v1";
const DEFAULT_REMINDER_TIME = "20:00";

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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        habits: [
          {
            id: "h1",
            name: "Move 30 min",
            category: "Health",
            targetPerWeek: 3,
            createdAt: todayISO()
          },
          {
            id: "h2",
            name: "Read 10 pages",
            category: "Learning",
            targetPerWeek: 4,
            createdAt: todayISO()
          },
          {
            id: "h3",
            name: "Mindful check‑in",
            category: "Mind",
            targetPerWeek: 5,
            createdAt: todayISO()
          }
        ],
        checkins: {},
        notes: [],
        reminderTime: DEFAULT_REMINDER_TIME,
        remindersEnabled: true,
        theme: "dark"
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.reminderTime) parsed.reminderTime = DEFAULT_REMINDER_TIME;
    if (parsed.remindersEnabled === undefined) parsed.remindersEnabled = true;
    if (!parsed.theme) parsed.theme = "dark";
    if (!parsed.notes) parsed.notes = [];
    if (Array.isArray(parsed.habits)) {
      parsed.habits.forEach((h) => {
        if (h.targetPerWeek == null) h.targetPerWeek = 3;
        if (h.description == null) h.description = "";
      });
    }
    return parsed;
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
}

const state = loadState();

const els = {};

function cacheEls() {
  els.todayLabel = document.getElementById("today-label");
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
  els.notesInput = document.getElementById("notes-input");
  els.notesAdd = document.getElementById("notes-add");
  els.notesList = document.getElementById("notes-list");
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

  els.habitDialog = document.getElementById("habit-dialog");
  els.habitDialogTitle = document.getElementById("habit-dialog-title");
  els.habitNameInput = document.getElementById("habit-name-input");
  els.habitCategoryInput = document.getElementById("habit-category-input");
  els.habitDescriptionInput = document.getElementById("habit-description-input");
  els.habitTargetInput = document.getElementById("habit-target-input");
  els.deleteHabit = document.getElementById("delete-habit");
  els.saveHabit = document.getElementById("save-habit");
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

function renderHabitsForSelectedDate() {
  els.habitList.innerHTML = "";
  const tpl = document.getElementById("habit-row-template");
  state.habits.forEach((habit, index) => {
    const frag = tpl.content.cloneNode(true);
    const row = frag.querySelector(".habit-row");
    const checkbox = row.querySelector(".habit-checkbox");
    const nameEl = row.querySelector(".habit-name");
    const catEl = row.querySelector(".habit-category");
    const streakEl = row.querySelector(".habit-streak");
    const editBtn = row.querySelector(".habit-edit");
    const progressFill = row.querySelector(".habit-progress-fill");
    const progressLabel = row.querySelector(".habit-progress-label");
    const weekStrip = row.querySelector(".habit-week-strip");
    const goalBadge = row.querySelector(".habit-goal-badge");
    const descEl = row.querySelector(".habit-description");

    row.dataset.habitId = habit.id;
    row.dataset.index = String(index);
    row.draggable = true;

    nameEl.textContent = habit.name;
    const target = habit.targetPerWeek || 0;
    catEl.textContent =
      target > 0
        ? `${habit.category || "General"} · ${target}×/week`
        : habit.category || "General";
    checkbox.checked = isChecked(habit.id, ui.selectedDate);

    const streak = computeStreakForHabit(habit.id, ui.selectedDate);
    streakEl.textContent = streak > 0 ? `🔥 ${streak}‑day streak` : "No streak yet";

    if (descEl) {
      const desc = habit.description || "";
      descEl.textContent = desc;
      descEl.hidden = !desc;
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
      setChecked(habit.id, ui.selectedDate, checkbox.checked);
      saveState(state);
      renderAnalytics();
      maybeShowReminderBanner();
      renderHabitsForSelectedDate();
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

function renderNotes() {
  if (!els.notesList) return;
  els.notesList.innerHTML = "";
  const notes = state.notes || [];
  if (!notes.length) {
    const empty = document.createElement("p");
    empty.className = "card-copy notes-empty";
    empty.textContent = "No notes yet. Add your first reminder.";
    els.notesList.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const row = document.createElement("div");
    row.className = "note-row";

    const left = document.createElement("div");
    left.className = "note-main";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "note-checkbox";
    cb.checked = !!note.done;

    const text = document.createElement("div");
    text.className = "note-text";
    text.textContent = note.text;

    if (note.done) row.classList.add("note-row-done");

    cb.addEventListener("change", () => {
      note.done = cb.checked;
      saveState(state);
      renderNotes();
    });

    left.appendChild(cb);
    left.appendChild(text);

    const del = document.createElement("button");
    del.className = "icon-btn ghost note-delete";
    del.textContent = "✕";
    del.title = "Delete note";
    del.addEventListener("click", () => {
      state.notes = state.notes.filter((n) => n.id !== note.id);
      saveState(state);
      renderNotes();
    });

    row.appendChild(left);
    row.appendChild(del);
    els.notesList.appendChild(row);
  });
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

function renderHeatmap(year) {
  els.heatmapYear.textContent = String(year);
  els.heatmap.innerHTML = "";

  const yearStart = todayISO(new Date(Date.UTC(year, 0, 1)));
  const yearEnd = todayISO(new Date(Date.UTC(year, 11, 31)));

  const counts = {};
  Object.entries(state.checkins).forEach(([iso, habitsDone]) => {
    if (!isSameYear(iso, year)) return;
    counts[iso] = Object.values(habitsDone).length;
  });

  let max = 0;
  Object.values(counts).forEach((c) => {
    if (c > max) max = c;
  });

  const days = [];
  let cursor = yearStart;
  while (cursor <= yearEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  if (window.innerWidth <= 520) {
    els.heatmap.style.gridTemplateColumns = "repeat(26, 1fr)";
  } else {
    els.heatmap.style.gridTemplateColumns = "repeat(53, 1fr)";
  }

  days.forEach((iso) => {
    const cell = document.createElement("div");
    const count = counts[iso] || 0;
    let level = 0;
    if (count === 0) level = 0;
    else if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count <= 4) level = 3;
    else level = 4;
    cell.className = `heatmap-cell level-${level}`;
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
    if (els.habitTargetInput) {
      els.habitTargetInput.value =
        habit.targetPerWeek != null ? String(habit.targetPerWeek) : "3";
    }
    els.deleteHabit.style.display = "inline-flex";
  } else {
    els.habitDialogTitle.textContent = "New Habit";
    els.habitNameInput.value = "";
    els.habitCategoryInput.value = "";
    if (els.habitDescriptionInput) {
      els.habitDescriptionInput.value = "";
    }
    if (els.habitTargetInput) {
      els.habitTargetInput.value = "3";
    }
    els.deleteHabit.style.display = "none";
  }
  refreshCategorySuggestions();
  els.habitDialog.showModal();
}

function closeHabitDialog() {
  els.habitDialog.close();
  ui.editingHabitId = null;
}

function handleSaveHabit(ev) {
  ev.preventDefault();
  const name = els.habitNameInput.value.trim();
  if (!name) return;
  const category = els.habitCategoryInput.value || "Other";
  const description = (els.habitDescriptionInput?.value || "").trim();
   let targetPerWeek = 3;
  if (els.habitTargetInput) {
    const parsed = parseInt(els.habitTargetInput.value, 10);
    if (!Number.isNaN(parsed)) {
      targetPerWeek = Math.min(7, Math.max(1, parsed));
    }
  }

  if (ui.editingHabitId) {
    const habit = state.habits.find((h) => h.id === ui.editingHabitId);
    if (habit) {
      habit.name = name;
      habit.category = category;
      habit.description = description;
      habit.targetPerWeek = targetPerWeek;
    }
  } else {
    const id = "h" + Math.random().toString(36).slice(2, 9);
    state.habits.push({
      id,
      name,
      category,
      description,
      targetPerWeek,
      createdAt: todayISO()
    });
  }

  saveState(state);
  closeHabitDialog();
  renderHabitsForSelectedDate();
  renderAnalytics();
}

function handleDeleteHabit() {
  if (!ui.editingHabitId) return;
  const id = ui.editingHabitId;
  state.habits = state.habits.filter((h) => h.id !== id);
  Object.values(state.checkins).forEach((bucket) => {
    delete bucket[id];
  });
  saveState(state);
  closeHabitDialog();
  renderHabitsForSelectedDate();
  renderAnalytics();
}

function handleResetToday() {
  const bucket = state.checkins[ui.selectedDate];
  if (!bucket) return;
  state.habits.forEach((h) => {
    delete bucket[h.id];
  });
  saveState(state);
  renderHabitsForSelectedDate();
  renderAnalytics();
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

function applyTheme(theme) {
  const mode = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = mode;
  if (els.themeToggle) {
    const label = els.themeToggle.querySelector("[data-theme-label]");
    if (label) label.textContent = mode === "light" ? "Light" : "Dark";
    els.themeToggle.dataset.mode = mode;
  }
}

function initTheme() {
  if (!state.theme) state.theme = "dark";
  applyTheme(state.theme);
  if (els.themeToggle) {
    els.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      saveState(state);
      applyTheme(state.theme);
    });
  }
}

function initEvents() {
  els.datePicker.addEventListener("change", () => {
    ui.selectedDate = els.datePicker.value || todayISO();
    renderTodayLabel();
    renderHabitsForSelectedDate();
  });

  els.addHabit.addEventListener("click", () => openHabitDialog(null));
  els.resetToday.addEventListener("click", handleResetToday);

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

  if (els.notesAdd && els.notesInput) {
    const addHandler = () => {
      const text = els.notesInput.value.trim();
      if (!text) return;
      const note = {
        id: "n" + Math.random().toString(36).slice(2, 9),
        text,
        done: false,
        createdAt: todayISO()
      };
      if (!state.notes) state.notes = [];
      state.notes.unshift(note);
      els.notesInput.value = "";
      saveState(state);
      renderNotes();
    };

    els.notesAdd.addEventListener("click", addHandler);
    els.notesInput.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        addHandler();
      }
    });
  }

  els.prevYear.addEventListener("click", () => {
    ui.heatmapYear -= 1;
    renderHeatmap(ui.heatmapYear);
  });
  els.nextYear.addEventListener("click", () => {
    const currentYear = new Date().getFullYear();
    if (ui.heatmapYear < currentYear + 1) {
      ui.heatmapYear += 1;
      renderHeatmap(ui.heatmapYear);
    }
  });

  els.jumpToToday.addEventListener("click", () => {
    ui.selectedDate = todayISO();
    renderTodayLabel();
    renderHabitsForSelectedDate();
    els.reminderBanner.classList.remove("visible");
  });

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
        state.habits = parsed.habits;
        state.checkins = parsed.checkins || {};
        state.notes = Array.isArray(parsed.notes) ? parsed.notes : [];
        state.reminderTime = parsed.reminderTime || DEFAULT_REMINDER_TIME;
        state.remindersEnabled =
          parsed.remindersEnabled === undefined
            ? true
            : !!parsed.remindersEnabled;
        saveState(state);
        renderTodayLabel();
        renderHabitsForSelectedDate();
        renderAnalytics();
        renderNotes();
        initReminders();
      } catch (err) {
        console.error("Failed to restore backup", err);
        alert("Could not read this backup file.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  });

  els.habitDialog.addEventListener("close", () => {
    ui.editingHabitId = null;
  });
  els.saveHabit.addEventListener("click", handleSaveHabit);
  els.deleteHabit.addEventListener("click", handleDeleteHabit);

  const cancelButton = els.habitDialog.querySelector('button[value="cancel"]');
  if (cancelButton) {
    cancelButton.addEventListener("click", (e) => {
      e.preventDefault();
      closeHabitDialog();
    });
  }
}

function init() {
  cacheEls();
  // Re-sync notes from localStorage on load so they never appear missing after refresh
  try {
    const fresh = loadState();
    if (Array.isArray(fresh.notes)) state.notes = fresh.notes;
  } catch (e) {
    console.error("Re-load notes failed", e);
  }

  ui.selectedDate = todayISO();
  ui.heatmapYear = new Date().getFullYear();

  renderTodayLabel();
  renderHabitsForSelectedDate();

  try {
    renderAnalytics();
  } catch (e) {
    console.error("renderAnalytics failed", e);
  }

  initEvents();
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

document.addEventListener("DOMContentLoaded", init);

