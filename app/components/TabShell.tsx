"use client";

import { HabitProvider, useHabits } from "../lib/HabitContext";
import { TabsProvider, useTabs, PINNED_TAB, type TabKey } from "../lib/TabsContext";
import Dashboard from "./Dashboard";
import GoalsPage from "../goals/page";
import NotesPage from "../notes/page";
import WallPage from "../wall/page";
import BooksPage from "../books/page";
import EnglishPage from "../english/page";
import TechnologyPage from "../technology/page";
import QuotesPage from "../quotes/page";

// Dashboard depends on the habit engine; show a light loader inside its own
// tab until the engine is ready (the rest of the shell stays interactive).
function DashboardTab() {
  const { ready } = useHabits();
  if (!ready) {
    return (
      <div className="tab-loading" style={{ color: "var(--text-muted)" }}>
        Loading your habits…
      </div>
    );
  }
  return <Dashboard />;
}

interface TabDef {
  label: string;
  render: () => React.ReactNode;
}

const TAB_DEFS: Record<TabKey, TabDef> = {
  dashboard: { label: "Dashboard", render: () => <DashboardTab /> },
  goals: { label: "Goals", render: () => <GoalsPage /> },
  notes: { label: "Notes", render: () => <NotesPage /> },
  wall: { label: "Wall", render: () => <WallPage /> },
  books: { label: "Books", render: () => <BooksPage /> },
  english: { label: "English", render: () => <EnglishPage /> },
  technology: { label: "Knowledge base", render: () => <TechnologyPage /> },
  quotes: { label: "Quotes", render: () => <QuotesPage /> },
};

function HomeIcon() {
  return (
    <svg
      className="tab-home-icon"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function Shell() {
  const tabs = useTabs()!;

  return (
    <div className="tab-shell">
      <div className="tab-bar" role="tablist">
        {tabs.openTabs.map((key) => {
          const def = TAB_DEFS[key];
          const active = tabs.activeTab === key;
          const pinned = key === PINNED_TAB;
          return (
            <div
              key={key}
              role="tab"
              aria-selected={active}
              className={`tab${active ? " tab-active" : ""}${
                pinned ? " tab-pinned" : ""
              }`}
              onClick={() => tabs.setActive(key)}
            >
              {pinned && <HomeIcon />}
              <span className="tab-label">{def.label}</span>
              {!pinned && (
                <button
                  type="button"
                  className="tab-close"
                  aria-label={`Close ${def.label}`}
                  title={`Close ${def.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    tabs.closeTab(key);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="tab-bodies">
        {tabs.openTabs.map((key) => (
          <div
            key={key}
            className="tab-panel"
            role="tabpanel"
            style={{ display: tabs.activeTab === key ? "block" : "none" }}
          >
            {TAB_DEFS[key].render()}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TabShell() {
  return (
    <TabsProvider>
      <HabitProvider>
        <Shell />
      </HabitProvider>
    </TabsProvider>
  );
}
