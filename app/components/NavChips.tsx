"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTabs, type TabKey } from "../lib/TabsContext";

const NAV = [
  { label: "Dashboard", href: "/", key: "dashboard" as TabKey },
  { label: "Goals", href: "/goals", key: "goals" as TabKey },
  { label: "Notes", href: "/notes", key: "notes" as TabKey },
  { label: "Calendar", href: "/calendar", key: "calendar" as TabKey },
  { label: "Books", href: "/books", key: "books" as TabKey },
  { label: "English", href: "/english", key: "english" as TabKey },
  { label: "Knowledge base", href: "/technology", key: "technology" as TabKey },
  { label: "Quotes", href: "/quotes", key: "quotes" as TabKey },
];

// Routes that have been migrated to the Next.js app. Others are shown but
// disabled until their phase lands.
const READY = new Set<string>([
  "/",
  "/goals",
  "/quotes",
  "/calendar",
  "/notes",
  "/english",
  "/technology",
  "/books",
]);

export default function NavChips() {
  const pathname = usePathname();
  // When rendered inside the tab shell, chips open/focus tabs instead of
  // navigating. Outside the shell (direct route visit) they fall back to links.
  const tabs = useTabs();

  return (
    <nav className="header-nav">
      {NAV.map((n) => {
        const ready = READY.has(n.href);

        if (tabs) {
          const active = tabs.activeTab === n.key;
          const className = `chip chip-outline${active ? " chip-active" : ""}`;
          if (!ready) {
            return (
              <button
                key={n.href}
                type="button"
                className={className}
                title="Coming soon"
                style={{ opacity: 0.55 }}
                disabled
              >
                {n.label}
              </button>
            );
          }
          return (
            <button
              key={n.href}
              type="button"
              className={className}
              onClick={() => tabs.openTab(n.key)}
            >
              {n.label}
            </button>
          );
        }

        const active = pathname === n.href;
        const className = `chip chip-outline${active ? " chip-active" : ""}`;
        if (!ready) {
          return (
            <a
              key={n.href}
              href="#"
              className={className}
              title="Coming soon"
              style={{ opacity: 0.55 }}
              onClick={(e) => e.preventDefault()}
            >
              {n.label}
            </a>
          );
        }
        return (
          <Link key={n.href} href={n.href} className={className}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
