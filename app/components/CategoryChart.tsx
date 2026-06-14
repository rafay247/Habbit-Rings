"use client";

import type { AppState, HabitStats } from "../lib/types";

export default function CategoryChart({
  state,
  perHabitStats,
}: {
  state: AppState;
  perHabitStats: Map<string, HabitStats>;
}) {
  const totals: Record<string, number> = {};
  perHabitStats.forEach((stats, habitId) => {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const cat = habit.category || "Other";
    totals[cat] = (totals[cat] || 0) + stats.completed;
  });

  const categories = Object.keys(totals);
  if (categories.length === 0) {
    return (
      <div className="category-chart">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          No data yet. Start checking off habits.
        </div>
      </div>
    );
  }

  const max = Math.max(...Object.values(totals));

  return (
    <div className="category-chart">
      {categories.map((cat) => {
        const pct = max === 0 ? 0 : (totals[cat] / max) * 100;
        return (
          <div className="category-row" key={cat}>
            <div className="category-label">{cat}</div>
            <div className="category-bar-track">
              <div className="category-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="category-value">{totals[cat]}</div>
          </div>
        );
      })}
    </div>
  );
}
