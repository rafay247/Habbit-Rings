# Habit Rings — Next.js + 3D

Personal productivity suite — a **Next.js (App Router, TypeScript)** app with
**three.js** 3D animated rings. Migrated from the original vanilla HTML/CSS/JS
multi-page app (now removed; recoverable from git history). The app lives at the
repository root.

## Run

```bash
npm install        # first time
npm run dev        # http://localhost:3000
npm run build      # production build (runs the full TypeScript check)
```

## Pages

| Route          | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `/`            | Dashboard — habit tracker, 3D animated rings, heatmap, KPIs      |
| `/goals`       | Weekly / monthly / yearly goals with drag-reorder               |
| `/notes`       | Rich-text + checklist notes, colors, pin, beast mode            |
| `/calendar`    | Year calendar with events and X-marks                           |
| `/books`       | Books library: categories, read/GOAT tracking, morals, search   |
| `/english`     | Revision bank: words, scenarios, modal verbs, grammar rules     |
| `/technology`  | Knowledge base — rich-text docs with categories/subcategories   |
| `/quotes`      | Custom quotes library                                            |

## Data & persistence

All data is stored client-side under `habit-rings-*` `localStorage` keys. The
dashboard additionally mirrors its state to **IndexedDB** (startup recovery) and
offers optional **Firebase Realtime Database** cross-device sync (echo-loop guard
+ `_version`/`syncedAt` last-write-wins). Because every page's keys share the
`habit-rings-` prefix, the dashboard's **Download / Restore backup** captures all
pages in a single `backup.json` (`_backupVersion: 4`, with an `_allPages`
snapshot).

## 3D (three.js via @react-three/fiber)

- `app/components/Ring3D.tsx` — each progress ring is a 3D torus whose glowing arc
  animates to its percentage and gently rotates.
- `app/components/AmbientBackground.tsx` — fixed full-screen particle field +
  wireframe blobs behind the UI.

Both are lazy-loaded (`next/dynamic`, `ssr: false`) so they never block first
paint and degrade gracefully where WebGL is unavailable.

## Structure

```
app/
  lib/         constants, types, dateUtils, storage, analytics, firebase,
               quotes, HabitContext (dashboard state + persistence)
  components/  Dashboard, HabitRow, HabitDialog, Heatmap, FocusTimer,
               CategoryChart, NavChips, Ring3D, AmbientBackground
  <route>/     goals, notes, calendar, books, english, technology, quotes
               (each: page.tsx + colocated <route>.css)
  page.tsx     HabitProvider + loading gate + Dashboard
  globals.css  the original style.css, reused verbatim for visual parity
```

`backup-keeper.sh` at the repo root is an unrelated host-side helper that keeps the
latest `backup*.json` from your Downloads folder.
