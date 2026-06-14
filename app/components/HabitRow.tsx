"use client";

import { useHabits } from "../lib/HabitContext";
import { addDays, todayISO } from "../lib/dateUtils";
import {
  isChecked,
  isSubtaskChecked,
  computeStreakForHabit,
  computeLongestStreak,
  computeHabitPeriodCompletion,
  habitMeetsWeeklyTarget,
} from "../lib/analytics";
import type { Habit } from "../lib/types";

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function HabitRow({
  habit,
  onEdit,
}: {
  habit: Habit;
  onEdit: (id: string) => void;
}) {
  const { state, selectedDate, toggleHabit, toggleSubtask } = useHabits();
  const iso = selectedDate;
  const subs = habit.subtasks || [];

  const checked = isChecked(state, habit.id, iso);
  const streak = computeStreakForHabit(state, habit.id, iso);
  const longest = computeLongestStreak(state, habit.id);
  const monthPct = computeHabitPeriodCompletion(state, habit.id, 30);
  const goalMet = habitMeetsWeeklyTarget(state, habit);

  const doneCount = subs.reduce(
    (sum, s) => sum + (isSubtaskChecked(state, habit.id, s.id, iso) ? 1 : 0),
    0
  );
  const visibleSubs = subs.filter((s) => !isSubtaskChecked(state, habit.id, s.id, iso));

  const target = habit.targetPerWeek || 0;
  const today = todayISO();

  return (
    <div className={`habit-row${habit.priority ? " habit-priority" : ""}`}>
      <div className="habit-main">
        <label className="checkbox-wrapper-31 habit-checkbox-label">
          <input
            type="checkbox"
            className="habit-checkbox"
            checked={checked}
            onChange={(e) => toggleHabit(habit, iso, e.target.checked)}
          />
          <svg viewBox="0 0 35.6 35.6" aria-hidden="true" focusable="false">
            <circle className="background" cx="17.8" cy="17.8" r="17.8"></circle>
            <circle className="stroke" cx="17.8" cy="17.8" r="14.37"></circle>
            <polyline
              className="check"
              points="11.78 18.12 15.55 22.23 25.17 12.87"
            ></polyline>
          </svg>
        </label>
        <div className="habit-text">
          <div className="habit-name">{habit.name}</div>
          <div className="habit-meta">
            <span className="pill habit-category">
              {target > 0
                ? `${habit.category || "General"} · ${target}×/week`
                : habit.category || "General"}
            </span>
            <span className="habit-streak-wrap">
              <span className="habit-streak habit-streak-current">
                {streak > 0 ? `🔥 ${streak}‑day streak` : "No streak yet"}
              </span>
              <span className="habit-streak-best">
                {longest > 0 ? `Best: ${longest} days` : ""}
              </span>
            </span>
            <span className="habit-goal-badge" hidden={!goalMet}>
              ✓ Goal met
            </span>
          </div>
          {habit.description ? (
            <div className="habit-description">{habit.description}</div>
          ) : null}

          {subs.length > 0 ? (
            <>
              <div
                className="habit-subtasks"
                aria-label="Subtasks"
                hidden={visibleSubs.length === 0}
              >
                {visibleSubs.map((s) => (
                  <label className="subtask-item" key={s.id}>
                    <input
                      type="checkbox"
                      className="subtask-checkbox"
                      checked={false}
                      onChange={(e) =>
                        toggleSubtask(habit, s.id, iso, e.target.checked)
                      }
                    />
                    <span>{s.text}</span>
                  </label>
                ))}
              </div>
              <div className="habit-subtask-progress">
                Done {doneCount}/{subs.length}
              </div>
            </>
          ) : null}

          <div className="habit-week-strip">
            {Array.from({ length: 7 }, (_, k) => 6 - k).map((back) => {
              const dIso = addDays(today, -back);
              const d = new Date(
                Date.UTC(
                  Number(dIso.slice(0, 4)),
                  Number(dIso.slice(5, 7)) - 1,
                  Number(dIso.slice(8, 10))
                )
              );
              const dow = d.getUTCDay();
              const labelIdx = dow === 0 ? 6 : dow - 1;
              const dayChecked = isChecked(state, habit.id, dIso);
              const cls = [
                "habit-week-day",
                dayChecked ? "habit-week-day--checked" : "",
                dIso === today ? "habit-week-day--today" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <span className={cls} key={dIso}>
                  {WEEK_LABELS[labelIdx]}
                </span>
              );
            })}
          </div>

          <div className="habit-progress">
            <div className="habit-progress-track">
              <div
                className="habit-progress-fill"
                style={{ width: `${monthPct}%` }}
              />
            </div>
            <span className="habit-progress-label">
              {monthPct > 0 ? `${monthPct}% this month` : "No check‑ins this month"}
            </span>
          </div>
        </div>
      </div>
      <button
        className="icon-btn ghost habit-edit"
        title="Edit habit"
        onClick={() => onEdit(habit.id)}
      >
        ⋯
      </button>
    </div>
  );
}
