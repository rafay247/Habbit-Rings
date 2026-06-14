"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useHabits } from "../lib/HabitContext";
import { todayISO, formatHumanDate } from "../lib/dateUtils";
import { computeAnalytics, computePeriodCompletion, isChecked } from "../lib/analytics";
import { getDailyQuote } from "../lib/quotes";
import HabitRow from "./HabitRow";
import HabitDialog from "./HabitDialog";
import Heatmap from "./Heatmap";
import FocusTimer from "./FocusTimer";
import CategoryChart from "./CategoryChart";
import NavChips from "./NavChips";

const Ring3D = dynamic(() => import("./Ring3D"), { ssr: false });
const AmbientBackground = dynamic(() => import("./AmbientBackground"), {
  ssr: false,
});

function ringColor(pct: number) {
  return pct >= 80 ? "#3fb950" : pct >= 40 ? "#e3b341" : "#56d364";
}

export default function Dashboard() {
  const prefersReducedMotion = useReducedMotion();
  const shellVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: prefersReducedMotion
        ? { duration: 0.01 }
        : { staggerChildren: 0.07, delayChildren: 0.08 },
    },
  };
  const cardVariants: Variants = {
    hidden: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 24, rotateX: -8, scale: 0.985 },
    show: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 120, damping: 18, mass: 0.8 },
    },
  };
  const riseVariants: Variants = {
    hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 150, damping: 18 },
    },
  };

  const {
    state,
    ready,
    selectedDate,
    setSelectedDate,
    heatmapYear,
    setHeatmapYear,
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
  } = useHabits();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [idInput, setIdInput] = useState("");

  const analytics = useMemo(() => computeAnalytics(state), [state]);
  const weekPct = useMemo(() => computePeriodCompletion(state, 7), [state]);
  const monthPct = useMemo(() => computePeriodCompletion(state, 30), [state]);
  const quote = useMemo(() => (ready ? getDailyQuote() : { text: "", author: "" }), [ready]);

  const today = todayISO();
  const consistency = analytics.overallConsistency;
  const streakPct = Math.min(100, (analytics.longestEver / 365) * 100);

  const bestHabit = analytics.best
    ? state.habits.find((h) => h.id === analytics.best!.id)
    : null;
  const worstHabit = analytics.worst
    ? state.habits.find((h) => h.id === analytics.worst!.id)
    : null;

  // Reminder banner: today, enabled, past reminder time, with unchecked habits.
  const showReminder = useMemo(() => {
    if (!state.remindersEnabled) return false;
    if (selectedDate !== today) return false;
    const [h, m] = (state.reminderTime || "20:00").split(":").map(Number);
    const now = new Date();
    const past = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
    if (!past) return false;
    return state.habits.some((habit) => !isChecked(state, habit.id, today));
  }, [state, selectedDate, today]);

  const openDialog = (id: string | null) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        importState(parsed);
        window.location.reload();
      } catch (err) {
        console.error("Restore failed", err);
        alert("Could not read that backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const todayLabel = `${formatHumanDate(selectedDate)} ${
    selectedDate === today ? "· Today" : ""
  }`;

  return (
    <>
      <AmbientBackground />
      <motion.div
        className="app-shell cinematic-shell"
        style={{ position: "relative", zIndex: 1 }}
        variants={shellVariants}
        initial="hidden"
        animate="show"
      >
        <motion.header
          className="app-header glass cinematic-panel"
          variants={cardVariants}
          whileHover={prefersReducedMotion ? undefined : { y: -2 }}
        >
          <motion.div className="header-primary" variants={riseVariants}>
            <div className="brand">
              <motion.span
                className="brand-dot"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { scale: [1, 1.45, 1], boxShadow: ["0 0 0 rgba(63,185,80,0)", "0 0 28px rgba(63,185,80,0.55)", "0 0 0 rgba(63,185,80,0)"] }
                }
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="brand-name">Habit Rings</span>
            </div>
            <NavChips />
            <div className="header-meta">
              <span className="today-label">{todayLabel}</span>
            </div>
          </motion.div>

          <motion.div className="header-quote-row" variants={shellVariants}>
            <motion.blockquote
              className="header-quote kinetic-tile"
              aria-live="polite"
              variants={riseVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -4, rotateX: 3, rotateY: -2 }}
            >
              <p className="header-quote__text">{quote.text}</p>
              <cite className="header-quote__cite">{quote.author}</cite>
            </motion.blockquote>

            <motion.section
              className="header-word kinetic-tile"
              aria-live="polite"
              variants={riseVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -4, rotateX: 3, rotateY: 2 }}
            >
              <div className="header-word__label">Word of the day</div>
              <div className="header-word__term">Open English</div>
              <div className="header-word__meaning">
                Add words in the English section to revise them here.
              </div>
              <ol className="header-word__sentences"></ol>
            </motion.section>

            <motion.div variants={riseVariants} whileHover={prefersReducedMotion ? undefined : { y: -4 }}>
              <FocusTimer />
            </motion.div>
          </motion.div>

          <motion.div className="header-secondary" variants={riseVariants}>
            <div className="rings">
              <motion.div
                className="ring kinetic-ring"
                data-ring="consistency"
                whileHover={prefersReducedMotion ? undefined : { y: -5, rotateX: 7, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Ring3D value={consistency} color={ringColor(consistency)} />
                <div className="ring-label">
                  <span className="ring-title">Consistency</span>
                  <span className="ring-value">{consistency}%</span>
                </div>
              </motion.div>
              <motion.div
                className="ring kinetic-ring"
                data-ring="streak"
                whileHover={prefersReducedMotion ? undefined : { y: -5, rotateX: 7, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Ring3D value={streakPct} color="#56d364" />
                <div className="ring-label">
                  <span className="ring-title">Longest Streak</span>
                  <span className="ring-value">{analytics.longestEver} days</span>
                </div>
              </motion.div>
              <motion.div
                className="ring kinetic-ring"
                data-ring="year"
                whileHover={prefersReducedMotion ? undefined : { y: -5, rotateX: 7, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Ring3D value={consistency} color="#56d364" />
                <div className="ring-label">
                  <span className="ring-title">365d Completion</span>
                  <span className="ring-value">{consistency}%</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.header>

        <motion.main className="app-main" variants={shellVariants}>
          <motion.section className="grid-lhs" variants={shellVariants}>
            <motion.section
              className="card glass card-today cinematic-panel"
              variants={cardVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -4, rotateX: 1.5 }}
            >
              <header className="card-header">
                <div>
                  <h2>Today&rsquo;s Habits</h2>
                  <p>Tap the checkboxes to log today&mdash;no dropdowns.</p>
                </div>
                <input
                  type="date"
                  className="date-picker"
                  aria-label="Select day"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || today)}
                />
              </header>

              <div className="habit-list">
                {state.habits.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                    No habits yet. Add your first with “+ New Habit”.
                  </p>
                ) : (
                  state.habits.map((habit) => (
                    <motion.div
                      key={habit.id}
                      variants={riseVariants}
                      whileHover={prefersReducedMotion ? undefined : { x: 4, scale: 1.005 }}
                    >
                      <HabitRow habit={habit} onEdit={openDialog} />
                    </motion.div>
                  ))
                )}
              </div>

              <footer className="card-footer">
                <motion.button className="btn btn-ghost" onClick={() => openDialog(null)} whileTap={{ scale: 0.96 }}>
                  + New Habit
                </motion.button>
                <motion.button className="btn btn-soft" onClick={() => resetDay(selectedDate)} whileTap={{ scale: 0.96 }}>
                  Clear today
                </motion.button>
              </footer>
            </motion.section>

            <motion.section
              className="card glass card-utilities cinematic-panel"
              variants={cardVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -4, rotateX: 1.5 }}
            >
              <header className="card-header">
                <div>
                  <h2>Reminders &amp; Backup</h2>
                  <p>Stay on track daily and keep your data safe.</p>
                </div>
              </header>

              <div className="utilities-section">
                <div className="utilities-column">
                  <h3 className="utilities-title">
                    Daily Reminders
                    <span className="pill small">📅 Auto daily check‑ins</span>
                  </h3>
                  <p className="card-copy">
                    Configure a default reminder time. If a habit is still
                    unchecked after that time, a subtle banner appears to nudge
                    you.
                  </p>
                  <div className="reminder-row">
                    <label htmlFor="reminder-time">Reminder time</label>
                    <input
                      type="time"
                      id="reminder-time"
                      value={state.reminderTime || "20:00"}
                      onChange={(e) => setReminderTime(e.target.value)}
                    />
                  </div>
                  <div
                    className="reminder-banner"
                    aria-live="polite"
                    style={{ display: showReminder ? "flex" : "none" }}
                  >
                    <span>🔔 You have unchecked habits for today.</span>
                  </div>
                </div>

                <div className="utilities-column">
                  <h3 className="utilities-title">
                    Cloud Sync
                    <span className="pill small">☁ Firebase</span>
                  </h3>
                  <p className="card-copy">
                    Sync your habits across devices in real-time using a shared
                    Sync ID.
                  </p>
                  <div className="firebase-sync-row">
                    <label className="auto-backup-toggle">
                      <input
                        type="checkbox"
                        checked={syncEnabled}
                        onChange={(e) => enableSync(e.target.checked)}
                      />
                      <span>Enable Cloud Sync</span>
                    </label>
                  </div>
                  <div
                    className="firebase-id-row"
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Your Sync ID (share across devices)
                    </label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <input
                        type="text"
                        placeholder="Auto-generated when you enable sync"
                        value={idInput || userId || ""}
                        onChange={(e) => setIdInput(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: "ui-monospace,monospace",
                          fontSize: 11,
                          padding: "7px 9px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          background: "var(--bg-raised)",
                          color: "var(--text)",
                        }}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <motion.button
                        className="btn btn-ghost btn-small"
                        disabled={!userId}
                        onClick={() => {
                          if (userId) navigator.clipboard?.writeText(userId);
                        }}
                        whileTap={{ scale: 0.96 }}
                      >
                        Copy ID
                      </motion.button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 2,
                      }}
                    >
                      <motion.button
                        className="btn btn-soft btn-small"
                        disabled={!syncEnabled}
                        onClick={() => {
                          if (idInput.trim()) setUserId(idInput.trim());
                          syncNow();
                        }}
                        whileTap={{ scale: 0.96 }}
                      >
                        ⟳ Sync Now
                      </motion.button>
                      <span className={`firebase-sync-status ${syncStatus.type}`}>
                        {syncStatus.msg}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="utilities-column">
                  <h3 className="utilities-title">
                    Data &amp; Backup
                    <span className="pill small">💾 Local &amp; file backup</span>
                  </h3>
                  <p className="card-copy">
                    All habits and check‑ins are stored locally in your browser.
                    You can also download a backup file and restore it later.
                  </p>
                  <div className="utilities-actions">
                    <motion.button
                      className="btn btn-soft"
                      onClick={() => downloadBackup("backup.json")}
                      whileTap={{ scale: 0.96 }}
                    >
                      Download backup
                    </motion.button>
                    <motion.button
                      className="btn btn-ghost"
                      onClick={() => fileInputRef.current?.click()}
                      whileTap={{ scale: 0.96 }}
                    >
                      Restore from file
                    </motion.button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json"
                      style={{ display: "none" }}
                      onChange={handleRestore}
                    />
                  </div>
                  <div className="auto-backup">
                    <div className="auto-backup-note">
                      File name: <code>backup.json</code>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          </motion.section>

          <motion.section className="grid-rhs" variants={shellVariants}>
            <motion.section
              className="card glass card-heatmap cinematic-panel"
              variants={cardVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -4, rotateX: 1.5 }}
            >
              <header className="card-header">
                <div className="card-header-main">
                  <h2>Heatmap</h2>
                  <span className="pill small">🔥 Streak tracker</span>
                </div>
                <div className="year-switcher">
                  <button
                    className="icon-btn"
                    aria-label="Previous year"
                    onClick={() => setHeatmapYear(heatmapYear - 1)}
                  >
                    ‹
                  </button>
                  <span className="year-label">{heatmapYear}</span>
                  <button
                    className="icon-btn"
                    aria-label="Next year"
                    onClick={() => setHeatmapYear(heatmapYear + 1)}
                  >
                    ›
                  </button>
                </div>
              </header>
              <Heatmap />
            </motion.section>

            <motion.section
              className="card glass card-kpi cinematic-panel"
              variants={cardVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -4, rotateX: 1.5 }}
            >
              <header className="card-header">
                <h2>Key Metrics</h2>
              </header>
              <div className="kpi-grid">
                <motion.div className="kpi kinetic-tile" variants={riseVariants} whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.02 }}>
                  <span className="kpi-label">Best Habit</span>
                  <span className="kpi-value">{bestHabit ? bestHabit.name : "–"}</span>
                  <span className="kpi-sub">
                    {analytics.best ? analytics.best.consistency.toFixed(0) : 0}%
                    consistency
                  </span>
                </motion.div>
                <motion.div className="kpi kinetic-tile" variants={riseVariants} whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.02 }}>
                  <span className="kpi-label">Worst Habit</span>
                  <span className="kpi-value">
                    {worstHabit ? worstHabit.name : "–"}
                  </span>
                  <span className="kpi-sub">
                    {analytics.worst ? analytics.worst.consistency.toFixed(0) : 0}%
                    consistency
                  </span>
                </motion.div>
                <motion.div className="kpi kinetic-tile" variants={riseVariants} whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.02 }}>
                  <span className="kpi-label">Active Habits</span>
                  <span className="kpi-value">{analytics.activeHabits}</span>
                  <span className="kpi-sub">Tracked this year</span>
                </motion.div>
                <motion.div className="kpi kinetic-tile" variants={riseVariants} whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.02 }}>
                  <span className="kpi-label">Total Check‑ins</span>
                  <span className="kpi-value">{analytics.totalCheckins}</span>
                  <span className="kpi-sub">Last 365 days</span>
                </motion.div>
                <motion.div className="kpi kinetic-tile" variants={riseVariants} whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.02 }}>
                  <span className="kpi-label">This Week</span>
                  <span className="kpi-value">{weekPct}%</span>
                  <span className="kpi-sub">Last 7 days</span>
                </motion.div>
                <motion.div className="kpi kinetic-tile" variants={riseVariants} whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.02 }}>
                  <span className="kpi-label">This Month</span>
                  <span className="kpi-value">{monthPct}%</span>
                  <span className="kpi-sub">Last 30 days</span>
                </motion.div>
              </div>
            </motion.section>

            <motion.section
              className="card glass card-categories cinematic-panel"
              variants={cardVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -4, rotateX: 1.5 }}
            >
              <header className="card-header">
                <h2>Category Performance</h2>
                <span className="pill small">📊 Last 365 days</span>
              </header>
              <CategoryChart state={state} perHabitStats={analytics.perHabitStats} />
            </motion.section>
          </motion.section>
        </motion.main>
      </motion.div>

      <HabitDialog
        editingId={editingId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
