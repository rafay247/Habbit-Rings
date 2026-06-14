import { addDays, todayISO } from "./dateUtils";
import type { AppState, Analytics, Habit, HabitStats } from "./types";

export function isChecked(state: AppState, habitId: string, iso: string): boolean {
  const bucket = state.checkins[iso];
  return !!(bucket && bucket[habitId]);
}

export function isSubtaskChecked(
  state: AppState,
  habitId: string,
  subtaskId: string,
  iso: string
): boolean {
  const bucket = state.subcheckins?.[iso]?.[habitId];
  return !!(bucket && bucket[subtaskId]);
}

export function computeStreakForHabit(
  state: AppState,
  habitId: string,
  refDate: string
): number {
  let streak = 0;
  let cursor = refDate;
  while (isChecked(state, habitId, cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeLongestStreak(state: AppState, habitId: string): number {
  let longest = 0;
  const dates = Object.keys(state.checkins).sort();
  if (dates.length === 0) return 0;
  let current = 0;
  let prev: string | null = null;
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

export function computeAnalytics(state: AppState): Analytics {
  const today = todayISO();
  const yearAgo = addDays(today, -364);

  let totalPossible = 0;
  let totalCompleted = 0;
  const perHabitStats = new Map<string, HabitStats>();

  const daysRange: string[] = [];
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
    const consistency = totalPossible ? (completed / daysRange.length) * 100 : 0;
    const longestStreak = computeLongestStreak(state, habit.id);
    perHabitStats.set(habit.id, { completed, consistency, longestStreak });
  });

  const overallConsistency =
    totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  let longestEver = 0;
  perHabitStats.forEach((v) => {
    if (v.longestStreak > longestEver) longestEver = v.longestStreak;
  });

  let best: (HabitStats & { id: string }) | null = null;
  let worst: (HabitStats & { id: string }) | null = null;
  perHabitStats.forEach((value, id) => {
    if (best === null || value.consistency > best.consistency)
      best = { id, ...value };
    if (worst === null || value.consistency < worst.consistency)
      worst = { id, ...value };
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
    totalCheckins,
  };
}

export function computePeriodCompletion(state: AppState, daysBack: number): number {
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

export function computeHabitPeriodCompletion(
  state: AppState,
  habitId: string,
  daysBack: number
): number {
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

export function habitMeetsWeeklyTarget(state: AppState, habit: Habit): boolean {
  const target = habit.targetPerWeek || 0;
  if (target <= 0) return false;
  const today = todayISO();
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  const offsetToMonday = (dow + 6) % 7;
  let cursor = addDays(today, -offsetToMonday);
  let done = 0;
  for (let i = 0; i < 7; i++) {
    if (isChecked(state, habit.id, cursor)) done += 1;
    cursor = addDays(cursor, 1);
  }
  return done >= target;
}
