# Habit Rings – Premium Habit Tracker

Single‑page habit tracker built with **HTML, CSS, and vanilla JavaScript**.

## Features

- **Real daily checkboxes**: Tap to log each habit per day (no dropdowns).
- **Local 365‑day history**: All check‑ins are stored in `localStorage`.
- **Reliability mirror**: Data is also mirrored to **IndexedDB** and recovered on startup if needed.
- **GitHub‑style heatmap**: Visual calendar with intensity based on how many habits you complete.
- **Streak analytics**: Per‑habit streaks plus **longest streak ever**.
- **Consistency scores**: Overall and per‑habit consistency over the last 365 days.
- **Category charts**: Lightweight category performance bars (Health / Mind / Work / Learning / Custom).
- **Best vs worst habit KPIs**: Quick view of your top and weakest habits.
- **Daily reminder banner**: Choose a time; after that, unchecked habits trigger an in‑app reminder.
- **Apple‑style premium UI**: Glassmorphism, soft shadows, SF‑style typography, dark appearance.
- **Mobile‑friendly layout**: Responsive cards and compressed heatmap on small screens.

## Getting started

1. Open `index.html` in your browser (no build step or backend needed).
2. Use the default habits or add your own with **+ New Habit**.
3. Change the **date picker** to review or edit past days.
4. Use the **Daily Reminders** card to set your preferred reminder time.

## Data & persistence (local-only)

- **Same browser, same device:** Your habits live in `localStorage` and survive normal restarts.
- **Phone + computer:** Data is **not shared automatically** (no cloud/backend in this version).
- Use the built-in **Download backup** / **Restore from file** to move your data manually between devices.

## Manual backup

Use **Download backup** / **Restore from file** anytime — works even without any cloud setup.

