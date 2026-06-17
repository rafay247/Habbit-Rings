"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavChips from "../components/NavChips";
import "./goals.css";

const STORAGE_KEY = "habit-rings-goals-v1";
const PERIODS = ["weekly", "monthly", "yearly"] as const;
type Period = (typeof PERIODS)[number];

interface Goal {
  id: string;
  title: string;
  description: string;
  period: Period;
  dueDate: string;
  current: number;
  target: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

function uid() {
  return "goal_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normalizeGoal(goal: Partial<Goal>): Goal {
  const target = Math.max(1, Number(goal.target || 1));
  const current = Math.max(0, Math.min(target, Number(goal.current || 0)));
  return {
    id: goal.id || uid(),
    title: String(goal.title || "Untitled goal"),
    description: String(goal.description || ""),
    period: (PERIODS as readonly string[]).includes(goal.period as string)
      ? (goal.period as Period)
      : "weekly",
    dueDate: String(goal.dueDate || ""),
    current,
    target,
    archived: Boolean(goal.archived),
    createdAt: goal.createdAt || new Date().toISOString(),
    updatedAt: goal.updatedAt || new Date().toISOString(),
  };
}

function loadGoals(): Goal[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeGoal) : [];
  } catch {
    return [];
  }
}

const isDone = (g: Goal) => g.current >= g.target;

function formatDate(iso: string) {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysRemaining(iso: string): number {
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(iso + "T00:00:00");
  return Math.round((dueDate.getTime() - startToday.getTime()) / 86400000);
}

function deadlineText(iso: string) {
  const days = daysRemaining(iso);
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  if (days > 1) return days + " days left";
  if (days === -1) return "1 day overdue";
  return Math.abs(days) + " days overdue";
}

function deadlineClass(iso: string): string {
  const days = daysRemaining(iso);
  if (days < 0) return "goal-deadline overdue";
  if (days <= 3) return "goal-deadline urgent";
  return "goal-deadline";
}

function extendDue(period: Period, fromIso: string): string {
  const base = fromIso ? new Date(fromIso + "T00:00:00") : new Date();
  if (period === "weekly") base.setDate(base.getDate() + 7);
  else if (period === "monthly") base.setMonth(base.getMonth() + 1);
  else if (period === "yearly") base.setFullYear(base.getFullYear() + 1);
  return base.toISOString().split("T")[0];
}

function sortByDays(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return daysRemaining(a.dueDate) - daysRemaining(b.dueDate);
  });
}

const PERIOD_LABEL: Record<Period, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const PERIOD_COLOR: Record<Period, string> = {
  weekly: "period-weekly",
  monthly: "period-monthly",
  yearly: "period-yearly",
};

export default function GoalsPage() {
  const [ready, setReady] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);

  // form state
  const [editId, setEditId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<Period>("weekly");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState<"active" | "done">("active");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGoals(loadGoals());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals, ready]);

  useEffect(() => {
    if (formOpen) setTimeout(() => titleRef.current?.focus(), 50);
  }, [formOpen]);

  // keep detail modal in sync when goals change
  useEffect(() => {
    if (detailGoal) {
      const updated = goals.find((g) => g.id === detailGoal.id);
      if (updated) setDetailGoal(updated);
    }
  }, [goals]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const shortTermGoals = sortByDays(
    goals.filter((g) => (g.period === "weekly" || g.period === "monthly") && !g.archived)
  );

  const longTermGoals = sortByDays(
    goals.filter((g) => g.period === "yearly" && !g.archived)
  );

  const resetForm = () => {
    setEditId("");
    setTitle("");
    setDescription("");
    setPeriod("weekly");
    setDue("");
    setStatus("active");
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setDetailGoal(null);
    setEditId(goal.id);
    setTitle(goal.title);
    setDescription(goal.description);
    setPeriod(goal.period);
    setDue(goal.dueDate);
    setStatus(isDone(goal) ? "done" : "active");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const now = new Date().toISOString();
    setGoals((prev) => {
      const existing = prev.find((g) => g.id === editId);
      if (existing) {
        return prev.map((g) =>
          g.id === editId
            ? {
                ...g,
                title: t,
                description: description.trim(),
                period,
                dueDate: due,
                current: status === "done" ? g.target : 0,
                updatedAt: now,
              }
            : g
        );
      }
      const newGoal: Goal = {
        id: uid(),
        title: t,
        description: description.trim(),
        period,
        dueDate: due,
        current: status === "done" ? 1 : 0,
        target: 1,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      return [newGoal, ...prev];
    });
    closeForm();
  };

  const toggleGoal = (goal: Goal, checked: boolean) => {
    const now = new Date().toISOString();
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? { ...g, current: checked ? g.target : 0, updatedAt: now }
          : g
      )
    );
  };

  const resetGoal = (goal: Goal) => {
    const now = new Date().toISOString();
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? { ...g, current: 0, updatedAt: now, dueDate: extendDue(g.period, g.dueDate) }
          : g
      )
    );
  };

  const deleteGoal = (goal: Goal) => {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    if (detailGoal?.id === goal.id) setDetailGoal(null);
  };

  return (
    <div className="app-shell goals-shell">
      <header className="app-header glass">
        <div className="header-primary">
          <div className="brand">
            <span className="brand-dot"></span>
            <span className="brand-name">Habit Rings</span>
          </div>
          <NavChips />
          <div className="header-meta">
            <span className="today-label">{todayLabel}</span>
          </div>
        </div>
      </header>

      <main className="goals-main">
        <section className="goals-top glass">
          <div className="goals-title-row">
            <h1 className="goals-title">Goals</h1>
            <button className="btn btn-primary" type="button" onClick={openAdd}>
              + Add Goal
            </button>
          </div>
          <div className="goals-legend">
            <span className="legend-item"><span className="legend-dot period-weekly-dot"></span>Weekly</span>
            <span className="legend-item"><span className="legend-dot period-monthly-dot"></span>Monthly</span>
            <span className="legend-item"><span className="legend-dot period-yearly-dot"></span>Yearly</span>
          </div>
        </section>

        <div className="goals-columns">
          <GoalSection
            title="Short Term"
            subtitle="Weekly & Monthly"
            goals={shortTermGoals}
            onView={setDetailGoal}
            onToggle={toggleGoal}
          />
          <GoalSection
            title="Long Term"
            subtitle="Yearly"
            goals={longTermGoals}
            onView={setDetailGoal}
            onToggle={toggleGoal}
          />
        </div>
      </main>

      {/* ── Add / Edit form modal ── */}
      {formOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="modal-box glass">
            <div className="modal-header">
              <h2 className="modal-title">{editId ? "Edit Goal" : "New Goal"}</h2>
              <button className="modal-close" type="button" onClick={closeForm} aria-label="Close">✕</button>
            </div>
            <form className="goal-modal-form" onSubmit={handleSubmit}>
              <label className="goal-field">
                Goal title
                <input
                  ref={titleRef}
                  className="goal-input"
                  type="text"
                  required
                  placeholder="What do you want to achieve?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="goal-field">
                Description
                <textarea
                  className="goal-input goal-textarea"
                  placeholder="Add details, motivation, or steps…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </label>
              <label className="goal-field">
                Time frame
                <select
                  className="goal-input"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                >
                  <option value="weekly">Weekly (Short Term)</option>
                  <option value="monthly">Monthly (Short Term)</option>
                  <option value="yearly">Yearly (Long Term)</option>
                </select>
              </label>
              <label className="goal-field">
                Due date
                <input
                  className="goal-input"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
              <label className="goal-field">
                Status
                <select
                  className="goal-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "done")}
                >
                  <option value="active">Active</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <div className="modal-actions">
                <button className="btn btn-ghost" type="button" onClick={closeForm}>Cancel</button>
                <button className="btn btn-primary" type="submit">
                  {editId ? "Save changes" : "Add goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      {detailGoal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetailGoal(null)}>
          <div className="modal-box modal-box--detail glass">
            <div className="modal-header">
              <span className={`period-badge ${PERIOD_COLOR[detailGoal.period]}`}>
                {PERIOD_LABEL[detailGoal.period]}
              </span>
              <button className="modal-close" type="button" onClick={() => setDetailGoal(null)} aria-label="Close">✕</button>
            </div>

            <div className="detail-title">{detailGoal.title}</div>

            {detailGoal.description && (
              <div className="detail-description">{detailGoal.description}</div>
            )}

            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Status</span>
                <span className={`detail-status-badge${isDone(detailGoal) ? " done" : ""}`}>
                  {isDone(detailGoal) ? "Completed" : "Active"}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Time frame</span>
                <span className="detail-meta-value">{PERIOD_LABEL[detailGoal.period]}</span>
              </div>
              {detailGoal.dueDate && (
                <>
                  <div className="detail-meta-item">
                    <span className="detail-meta-label">Due date</span>
                    <span className="detail-meta-value">{formatDate(detailGoal.dueDate)}</span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="detail-meta-label">Deadline</span>
                    <span className={deadlineClass(detailGoal.dueDate)}>
                      {deadlineText(detailGoal.dueDate)}
                    </span>
                  </div>
                </>
              )}
              <div className="detail-meta-item">
                <span className="detail-meta-label">Created</span>
                <span className="detail-meta-value">{formatDateTime(detailGoal.createdAt)}</span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Last updated</span>
                <span className="detail-meta-value">{formatDateTime(detailGoal.updatedAt)}</span>
              </div>
            </div>

            <div className="detail-toggle-row">
              <label className="detail-toggle-label">
                <input
                  type="checkbox"
                  className="goal-check"
                  checked={isDone(detailGoal)}
                  onChange={(e) => toggleGoal(detailGoal, e.target.checked)}
                />
                Mark as completed
              </label>
            </div>

            <div className="modal-actions detail-actions">
              {isDone(detailGoal) && (
                <button
                  className="btn btn-accent btn-small"
                  type="button"
                  onClick={() => resetGoal(detailGoal)}
                >
                  ↻ Reset & extend
                </button>
              )}
              <button
                className="btn btn-small danger"
                type="button"
                onClick={() => deleteGoal(detailGoal)}
              >
                Delete
              </button>
              <button
                className="btn btn-primary btn-small"
                type="button"
                onClick={() => openEdit(detailGoal)}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface GoalSectionProps {
  title: string;
  subtitle: string;
  goals: Goal[];
  onView: (g: Goal) => void;
  onToggle: (g: Goal, checked: boolean) => void;
}

function GoalSection({ title, subtitle, goals, onView, onToggle }: GoalSectionProps) {
  const active = goals.filter((g) => !isDone(g));
  const done = goals.filter((g) => isDone(g));

  return (
    <section className="goal-board card glass">
      <header className="goal-board-header">
        <div>
          <h2 className="goal-board-title">{title}</h2>
          <span className="goal-board-sub">{subtitle}</span>
        </div>
        <span className="goal-count">
          {active.length} active{done.length > 0 ? ` · ${done.length} done` : ""}
        </span>
      </header>
      <div className="goal-list">
        {goals.length === 0 ? (
          <div className="goals-empty">No goals yet.</div>
        ) : (
          <>
            {active.map((goal) => (
              <GoalItem key={goal.id} goal={goal} onView={onView} onToggle={onToggle} />
            ))}
            {done.length > 0 && active.length > 0 && (
              <div className="goal-section-divider">Completed</div>
            )}
            {done.map((goal) => (
              <GoalItem key={goal.id} goal={goal} onView={onView} onToggle={onToggle} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

interface GoalItemProps {
  goal: Goal;
  onView: (g: Goal) => void;
  onToggle: (g: Goal, checked: boolean) => void;
}

function GoalItem({ goal, onView, onToggle }: GoalItemProps) {
  const done = isDone(goal);
  return (
    <article className={`goal-item${done ? " done" : ""}`}>
      <input
        className="goal-check"
        type="checkbox"
        checked={done}
        aria-label="Mark goal done"
        onChange={(e) => onToggle(goal, e.target.checked)}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="goal-item-body"
        type="button"
        onClick={() => onView(goal)}
      >
        <span className={`period-badge ${PERIOD_COLOR[goal.period]}`}>
          {PERIOD_LABEL[goal.period]}
        </span>
        <span className="goal-name">{goal.title}</span>
        {goal.dueDate && !done && (
          <span className={`goal-item-days ${deadlineClass(goal.dueDate)}`}>
            {deadlineText(goal.dueDate)}
          </span>
        )}
      </button>
    </article>
  );
}
