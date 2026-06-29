"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type TabKey =
  | "dashboard"
  | "goals"
  | "notes"
  | "wall"
  | "books"
  | "english"
  | "technology"
  | "quotes";

// Dashboard is pinned and always present; it cannot be closed.
export const PINNED_TAB: TabKey = "dashboard";

export interface TabsContextValue {
  openTabs: TabKey[];
  activeTab: TabKey;
  /** Open (or focus, if already open) a tab and make it active. */
  openTab: (key: TabKey) => void;
  /** Close a tab. The pinned dashboard tab is ignored. */
  closeTab: (key: TabKey) => void;
  /** Focus an already-open tab without opening a new one. */
  setActive: (key: TabKey) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function TabsProvider({ children }: { children: ReactNode }) {
  const [openTabs, setOpenTabs] = useState<TabKey[]>([PINNED_TAB]);
  const [activeTab, setActiveTab] = useState<TabKey>(PINNED_TAB);

  // Refs mirror the latest state so closeTab can compute the next active tab
  // without nesting setState calls.
  const openTabsRef = useRef(openTabs);
  openTabsRef.current = openTabs;
  const activeRef = useRef(activeTab);
  activeRef.current = activeTab;

  const openTab = useCallback((key: TabKey) => {
    setOpenTabs((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setActiveTab(key);
  }, []);

  const closeTab = useCallback((key: TabKey) => {
    if (key === PINNED_TAB) return;
    const prev = openTabsRef.current;
    const idx = prev.indexOf(key);
    if (idx === -1) return;
    const next = prev.filter((k) => k !== key);
    setOpenTabs(next);
    if (activeRef.current === key) {
      // Focus the left neighbour, else the first remaining tab.
      setActiveTab(next[idx - 1] ?? next[0] ?? PINNED_TAB);
    }
  }, []);

  return (
    <TabsContext.Provider
      value={{ openTabs, activeTab, openTab, closeTab, setActive: setActiveTab }}
    >
      {children}
    </TabsContext.Provider>
  );
}

/** Returns the tabs controller, or null when rendered outside the shell. */
export function useTabs(): TabsContextValue | null {
  return useContext(TabsContext);
}
