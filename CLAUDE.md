# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Habit Rings" is a personal productivity suite — a **Next.js 16 (App Router,
TypeScript)** app at the repository root. It was migrated from an earlier vanilla
HTML/CSS/JS multi-page app (those `*.html`, `script.js`, and `style.css` files
were removed; recover from git history if ever needed).

The repo ships an `AGENTS.md` warning that this Next.js version may differ from
training data — consult `node_modules/next/dist/docs/` before using unfamiliar
APIs.

## Commands

```bash
npm install        # first time
npm run dev        # dev server (http://localhost:3000; pass -- -p PORT to change)
npm run build      # production build (also runs full TypeScript check)
npx tsc --noEmit   # typecheck only
```

There is no test suite or linter configured.

## Architecture

Every page is a client component (`"use client"`) — the app is entirely
client-side with no backend. Routes live under `app/<route>/page.tsx`, each
importing a colocated `<route>.css` extracted verbatim from the original page for
visual parity. Shared navigation is `app/components/NavChips.tsx` (a `READY` set
gates which routes are live).

### Dashboard data engine (`app/lib/`)
The habit tracker (home route) is the only page with the shared state engine:
- `HabitContext.tsx` — React context holding `AppState`, all mutators, and
  persistence. **Triple persistence**: `localStorage` (primary) → IndexedDB
  mirror (startup recovery) → optional Firebase Realtime DB sync (echo-loop guard
  + `_version`/`syncedAt` last-write-wins).
- `storage.ts` (load/save, IndexedDB, full JSON backup shape `_backupVersion: 4`
  with an `_allPages` snapshot), `analytics.ts` (streaks, consistency, heatmap
  levels), `firebase.ts`, `dateUtils.ts`, `quotes.ts`, `constants.ts`, `types.ts`.

### 3D (three.js via @react-three/fiber)
`app/components/Ring3D.tsx` (animated 3D progress rings) and
`AmbientBackground.tsx` (particle/wireframe backdrop). Both are loaded with
`next/dynamic` + `ssr: false` so they never block first paint and degrade
gracefully where WebGL is unavailable.

### Other pages
`goals`, `notes`, `calendar`, `books`, `english`, `technology`, `quotes` are
self-contained: each holds its own state and reads/writes its own `habit-rings-*`
`localStorage` key(s). Because those keys share the `habit-rings-` prefix, the
dashboard's backup/Firebase sync automatically captures every page's data.

## Conventions

- All persisted keys use the `habit-rings-` prefix. The Books page namespaces its
  CSS/markup as `bklib-` (it originally reused `quotes-*` class names, which would
  collide with the Quotes page once CSS is bundled globally) — keep new page CSS
  scoped/namespaced to avoid cross-route leakage.
- Rich-text editors (Notes, Knowledge base) use uncontrolled `contentEditable`
  refs + `document.execCommand`, matching the original behaviour; do not convert
  them to controlled inputs (it breaks the caret).
- Fonts (Inter, Lexend) are loaded via a `<link>` in `app/layout.tsx`.

## Migration notes (deviations from the original)

- Notes: desktop drag-reorder is preserved via HTML5 drag; the original's
  touch-pointer drag is not reimplemented. Card action icons use emoji.
- `backup-keeper.sh` at the repo root is an unrelated host-side backup helper.
