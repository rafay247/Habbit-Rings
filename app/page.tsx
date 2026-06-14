"use client";

import { HabitProvider, useHabits } from "./lib/HabitContext";
import Dashboard from "./components/Dashboard";

function Gate() {
  const { ready } = useHabits();
  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--text-muted)",
        }}
      >
        Loading your habits…
      </div>
    );
  }
  return <Dashboard />;
}

export default function Home() {
  return (
    <HabitProvider>
      <Gate />
    </HabitProvider>
  );
}
