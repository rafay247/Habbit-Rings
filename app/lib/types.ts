export interface Subtask {
  id: string;
  text: string;
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  description: string;
  targetPerWeek: number;
  priority: boolean;
  subtasks: Subtask[];
  createdAt?: string;
}

/** date(ISO) -> habitId -> true */
export type Checkins = Record<string, Record<string, boolean>>;
/** date(ISO) -> habitId -> subtaskId -> true */
export type Subcheckins = Record<string, Record<string, Record<string, boolean>>>;

export interface AppState {
  habits: Habit[];
  checkins: Checkins;
  subcheckins: Subcheckins;
  notes: unknown[];
  notepadText: string;
  reminderTime: string;
  remindersEnabled: boolean;
  theme: string;
  _version?: number;
}

export interface HabitStats {
  completed: number;
  consistency: number;
  longestStreak: number;
}

export interface Analytics {
  overallConsistency: number;
  longestEver: number;
  perHabitStats: Map<string, HabitStats>;
  best: (HabitStats & { id: string }) | null;
  worst: (HabitStats & { id: string }) | null;
  activeHabits: number;
  totalCheckins: number;
}
