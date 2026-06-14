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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function deadlineText(iso: string) {
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(iso + "T00:00:00");
  const days = Math.round((dueDate.getTime() - startToday.getTime()) / 86400000);
  if (days === 0) return "due today";
  if (days === 1) return "1 day left";
  if (days > 1) return days + " days left";
  if (days === -1) return "1 day overdue";
  return Math.abs(days) + " days overdue";
}

function extendDue(period: Period, fromIso: string): string {
  const base = fromIso ? new Date(fromIso + "T00:00:00") : new Date();
  if (period === "weekly") base.setDate(base.getDate() + 7);
  else if (period === "monthly") base.setMonth(base.getMonth() + 1);
  else if (period === "yearly") base.setFullYear(base.getFullYear() + 1);
  return base.toISOString().split("T")[0];
}

export default function GoalsPage() {
  const [ready, setReady] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period>("weekly");

  // form state
  const [editId, setEditId] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState<"active" | "done">("active");
  const titleRef = useRef<HTMLInputElement>(null);

  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    setGoals(loadGoals());
    setReady(true);
  }, []);

  // Persist whenever goals change (after initial load).
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals, ready]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const visibleGoals = goals.filter(
    (g) => g.period === activePeriod && !g.archived
  );

  const resetForm = () => {
    setEditId("");
    setTitle("");
    setDue("");
    setStatus("active");
    titleRef.current?.focus();
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
        period: activePeriod,
        dueDate: due,
        current: status === "done" ? 1 : 0,
        target: 1,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      return [newGoal, ...prev];
    });
    resetForm();
  };

  const editGoal = (goal: Goal) => {
    setEditId(goal.id);
    setTitle(goal.title);
    setDue(goal.dueDate);
    setStatus(isDone(goal) ? "done" : "active");
    titleRef.current?.focus();
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
          ? {
              ...g,
              current: 0,
              updatedAt: now,
              dueDate: extendDue(g.period, g.dueDate),
            }
          : g
      )
    );
  };

  const deleteGoal = (goal: Goal) => {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    if (editId === goal.id) resetForm();
  };

  // ── Drag & drop reorder within the master array ──
  const onDrop = (targetId: string) => {
    const fromId = draggedId.current;
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;
    setGoals((prev) => {
      const fromIdx = prev.findIndex((g) => g.id === fromId);
      if (fromIdx < 0) return prev;
      const next = prev.slice();
      const [moved] = next.splice(fromIdx, 1);
      const targetIdx = next.findIndex((g) => g.id === targetId);
      if (targetIdx < 0) return prev;
      next.splice(targetIdx, 0, moved);
      return next;
    });
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
            <div className="goal-tabs" role="tablist" aria-label="Goal periods">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`chip chip-outline goal-tab${
                    activePeriod === p ? " chip-active" : ""
                  }`}
                  onClick={() => {
                    setActivePeriod(p);
                    resetForm();
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <form className="goal-form" onSubmit={handleSubmit}>
            <label className="goal-field">
              Goal
              <input
                ref={titleRef}
                className="goal-input"
                type="text"
                required
                placeholder="Add a goal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
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
            <button className="btn btn-primary" type="submit">
              {editId ? "Save" : "Add goal"}
            </button>
          </form>
        </section>

        <section className="goal-board card glass">
          <header className="goal-board-header">
            <h2 className="goal-board-title">
              {activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} Goals
            </h2>
            <span className="goal-count">
              {visibleGoals.length} goal{visibleGoals.length === 1 ? "" : "s"}
            </span>
          </header>
          <div className="goal-list">
            {visibleGoals.length === 0 ? (
              <div className="goals-empty">No goals yet.</div>
            ) : (
              visibleGoals.map((goal) => {
                const done = isDone(goal);
                const cls = [
                  "goal-item",
                  done ? "done" : "",
                  dragOverId === goal.id && draggedId.current !== goal.id
                    ? "drag-over"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <article
                    key={goal.id}
                    className={cls}
                    draggable
                    onDragStart={(e) => {
                      draggedId.current = goal.id;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", goal.id);
                    }}
                    onDragOver={(e) => {
                      if (!draggedId.current) return;
                      e.preventDefault();
                      if (goal.id !== draggedId.current) setDragOverId(goal.id);
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDrop(goal.id);
                    }}
                    onDragEnd={() => {
                      draggedId.current = null;
                      setDragOverId(null);
                    }}
                  >
                    <span className="goal-drag-handle" title="Drag to reorder">
                      ::
                    </span>
                    <input
                      className="goal-check"
                      type="checkbox"
                      checked={done}
                      aria-label="Mark goal done"
                      onChange={(e) => toggleGoal(goal, e.target.checked)}
                    />
                    <div className="goal-info">
                      <div className="goal-name">{goal.title}</div>
                      <div className="goal-meta">
                        {goal.dueDate ? (
                          <span>
                            Due {formatDate(goal.dueDate)} -{" "}
                            <span className="goal-deadline">
                              {deadlineText(goal.dueDate)}
                            </span>
                          </span>
                        ) : (
                          <span>No due date</span>
                        )}
                      </div>
                    </div>
                    <div className="goal-actions">
                      {done && (
                        <button
                          className="btn btn-small btn-accent"
                          type="button"
                          title="Reset goal and extend due date"
                          onClick={() => resetGoal(goal)}
                        >
                          ↻ Reset
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => editGoal(goal)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-small danger"
                        type="button"
                        onClick={() => deleteGoal(goal)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
