"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/" },
  { label: "Goals", href: "/goals" },
  { label: "Notes", href: "/notes" },
  { label: "Calendar", href: "/calendar" },
  { label: "Books", href: "/books" },
  { label: "English", href: "/english" },
  { label: "Knowledge base", href: "/technology" },
  { label: "Quotes", href: "/quotes" },
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
  return (
    <nav className="header-nav">
      {NAV.map((n) => {
        const active = pathname === n.href;
        const ready = READY.has(n.href);
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
