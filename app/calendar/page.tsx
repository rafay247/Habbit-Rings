"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavChips from "../components/NavChips";
import "./calendar.css";

const STORAGE_KEY = "habit-rings-calendar-selection-v1";
const MARKS_KEY = "habit-rings-calendar-x-marks-v1";
const EVENTS_KEY = "habit-rings-calendar-events-v1";

type ViewMode = "passed" | "full" | "current";
interface CalEvent {
  title: string;
  notes: string;
}
type EventsMap = Record<string, CalEvent>;

function loadMarkedDates(): Set<string> {
  try {
    const raw = localStorage.getItem(MARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function loadEvents(): EventsMap {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.entries(parsed || {}).reduce((acc: EventsMap, [iso, value]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return acc;
      const v = value as Partial<CalEvent>;
      const title = typeof v?.title === "string" ? v.title.trim() : "";
      const notes = typeof v?.notes === "string" ? v.notes.trim() : "";
      if (!title && !notes) return acc;
      acc[iso] = { title, notes };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function formatDateLabel(iso: string): string {
  if (!iso) return "None";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const realYear = today.getFullYear();
  const realMonth = today.getMonth();
  const isoToday = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const [ready, setReady] = useState(false);
  const [year, setYear] = useState(realYear);
  const [viewMode, setViewMode] = useState<ViewMode>("passed");
  const [selectedDate, setSelectedDate] = useState("");
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<EventsMap>({});

  const [titleInput, setTitleInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load
  useEffect(() => {
    setSelectedDate(localStorage.getItem(STORAGE_KEY) || "");
    setMarkedDates(loadMarkedDates());
    setEvents(loadEvents());
    setReady(true);
  }, []);

  // Persist selection
  useEffect(() => {
    if (!ready) return;
    if (selectedDate) localStorage.setItem(STORAGE_KEY, selectedDate);
    else localStorage.removeItem(STORAGE_KEY);
  }, [selectedDate, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(MARKS_KEY, JSON.stringify([...markedDates]));
  }, [markedDates, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events, ready]);

  // Sync form fields when selection / events change
  useEffect(() => {
    const ev = selectedDate ? events[selectedDate] : undefined;
    setTitleInput(ev?.title || "");
    setNotesInput(ev?.notes || "");
  }, [selectedDate, events]);

  const todayLabel = useMemo(
    () =>
      today.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [today]
  );

  const getVisibleMonths = (): number[] => {
    if (viewMode === "current") {
      if (year !== realYear) return [];
      return [realMonth];
    }
    if (viewMode === "full") return Array.from({ length: 12 }, (_, i) => i);
    if (year < realYear) return Array.from({ length: 12 }, (_, i) => i);
    if (year === realYear) return Array.from({ length: realMonth + 1 }, (_, i) => i);
    return [];
  };

  const months = getVisibleMonths();

  const selectionCopy = (() => {
    if (viewMode === "full") return "Showing the full year.";
    if (viewMode === "current")
      return year === realYear
        ? "Showing only the current month."
        : "Current month view is only available for the current year.";
    if (year < realYear) return "All months in this past year are visible.";
    if (year === realYear)
      return "Showing only months that have already passed or are current.";
    return "This is a future year. Click “Show full” to reveal all months.";
  })();

  // Days left
  const daysInMonth = new Date(realYear, realMonth + 1, 0).getDate();
  const daysLeftMonth = daysInMonth - today.getDate();
  const daysLeftYear = Math.round(
    (new Date(realYear, 11, 31).getTime() -
      new Date(realYear, realMonth, today.getDate()).getTime()) /
      86400000
  );
  const monthName = today.toLocaleDateString("en-US", { month: "long" });

  const todayEvent = events[isoToday];
  const todayEvents =
    todayEvent && (todayEvent.title || todayEvent.notes) ? [todayEvent] : [];

  const onDayClick = (iso: string) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      setSelectedDate(iso);
      clickTimer.current = null;
    }, 220);
  };

  const onDayDblClick = (iso: string) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setMarkedDates((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const saveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    const title = titleInput.trim();
    const notes = notesInput.trim();
    setEvents((prev) => {
      const next = { ...prev };
      if (!title && !notes) delete next[selectedDate];
      else next[selectedDate] = { title, notes };
      return next;
    });
  };

  const deleteEvent = () => {
    if (!selectedDate) return;
    setEvents((prev) => {
      const next = { ...prev };
      delete next[selectedDate];
      return next;
    });
  };

  const selectedEvent = selectedDate ? events[selectedDate] : undefined;
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="app-shell calendar-shell">
      <header className="app-header glass">
        <div className="header-primary">
          <div className="brand">
            <span className="brand-dot"></span>
            <span className="brand-name">Habit Rings</span>
          </div>
          <NavChips />
          <div className="header-meta">
            <span className="today-label">{todayLabel}</span>
          </div>
        </div>
      </header>

      <section className="calendar-hero glass">
        <div className="calendar-hero__top">
          <div className="calendar-hero__copy">
            <div className="calendar-hero__eyebrow">Separate Planning View</div>
            <h1>Year Calendar</h1>
          </div>
          <div className="calendar-hero__stats">
            <div className="calendar-status">
              <div className="calendar-status__label">Selected Day</div>
              <div className="calendar-status__value">{formatDateLabel(selectedDate)}</div>
            </div>
            <div className="calendar-status">
              <div className="calendar-status__label">Today&apos;s Events</div>
              <div className="calendar-status__value">{todayEvents.length}</div>
              <div className="calendar-status__list">
                {todayEvents.map((ev, i) => (
                  <div className="calendar-status__event" key={i}>
                    <div className="calendar-status__event-title">
                      {ev.title || "Untitled event"}
                    </div>
                    {ev.notes ? (
                      <div className="calendar-status__event-note">{ev.notes}</div>
                    ) : null}
                  </div>
                ))}
              </div>
              {todayEvents.length === 0 ? (
                <div className="calendar-status__empty">No events for today.</div>
              ) : null}
            </div>
            <div className="calendar-status">
              <div className="calendar-status__label">Days Left in Month</div>
              <div className="calendar-status__value" style={{ color: "var(--accent)" }}>
                {daysLeftMonth}
              </div>
              <div className="calendar-status__empty" style={{ marginTop: 6 }}>
                {daysLeftMonth === 0
                  ? `Last day of ${monthName}!`
                  : `days until end of ${monthName}`}
              </div>
            </div>
            <div className="calendar-status">
              <div className="calendar-status__label">Days Left in Year</div>
              <div className="calendar-status__value" style={{ color: "var(--gold)" }}>
                {daysLeftYear}
              </div>
              <div className="calendar-status__empty" style={{ marginTop: 6 }}>
                {daysLeftYear === 0
                  ? "Last day of the year!"
                  : `days until Dec 31, ${realYear}`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="calendar-toolbar glass">
        <div className="calendar-toolbar__group">
          <button className="calendar-btn" type="button" onClick={() => setYear((y) => y - 1)}>
            ← Year
          </button>
          <div className="calendar-year">{year}</div>
          <button className="calendar-btn" type="button" onClick={() => setYear((y) => y + 1)}>
            Year →
          </button>
        </div>
        <div className="calendar-toolbar__group">
          <button
            className={`calendar-btn${viewMode === "passed" ? " is-active" : ""}`}
            type="button"
            onClick={() => setViewMode("passed")}
          >
            Show passed
          </button>
          <button
            className={`calendar-btn${viewMode === "full" ? " is-active" : ""}`}
            type="button"
            onClick={() => setViewMode("full")}
          >
            Show full
          </button>
          <button
            className={`calendar-btn${viewMode === "current" ? " is-active" : ""}`}
            type="button"
            onClick={() => setViewMode("current")}
          >
            Current month
          </button>
          <button
            className={`calendar-btn${selectedDate ? " is-active" : ""}`}
            type="button"
            onClick={() => setSelectedDate("")}
          >
            Clear mark
          </button>
        </div>
        <div className="calendar-selection">{selectionCopy}</div>
      </section>

      <section className="calendar-event-panel glass">
        <div className="calendar-event-panel__top">
          <div>
            <div className="calendar-event-panel__title">
              {selectedDate
                ? `Event for ${formatDateLabel(selectedDate)}`
                : "Add event for a date"}
            </div>
          </div>
        </div>
        <form className="calendar-event-form" onSubmit={saveEvent}>
          <div className="calendar-event-form__row">
            <input
              className="calendar-input"
              type="text"
              maxLength={120}
              placeholder="Event title"
              autoComplete="off"
              disabled={!selectedDate}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
            />
            <button className="calendar-btn" type="submit" disabled={!selectedDate}>
              Save event
            </button>
            <button
              className="calendar-btn"
              type="button"
              onClick={deleteEvent}
              disabled={!(selectedEvent && (selectedEvent.title || selectedEvent.notes))}
            >
              Delete event
            </button>
          </div>
          <textarea
            className="calendar-textarea"
            maxLength={1000}
            placeholder="Add details, reminder text, agenda, or anything you want to see on that date..."
            disabled={!selectedDate}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
          />
          <div className="calendar-event-hint">
            {selectedDate ? "Edit the event for this date." : "Pick a date to start planning."}
          </div>
        </form>
      </section>

      <main className="calendar-grid">
        {months.length === 0 ? (
          <div className="calendar-empty">
            No months are visible in this mode for the selected year. Try{" "}
            <strong>Show full</strong> or switch back to the current year.
          </div>
        ) : (
          months.map((month) => {
            const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
              month: "long",
            });
            const firstWeekday = new Date(year, month, 1).getDay();
            const dim = new Date(year, month + 1, 0).getDate();
            const isCurrent = year === realYear && month === realMonth;
            return (
              <section
                className={`month-card${isCurrent ? " current-month" : ""}`}
                key={month}
              >
                <div className="month-card__name">{monthLabel}</div>
                <div className="month-card__hint">
                  {isCurrent ? "Current month" : "Month view"}
                </div>
                <div className="month-weekdays">
                  {weekdays.map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>
                <div className="month-days">
                  {Array.from({ length: firstWeekday }, (_, i) => (
                    <span className="day-pad" key={`pad-${i}`} />
                  ))}
                  {Array.from({ length: dim }, (_, i) => i + 1).map((day) => {
                    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                      day
                    ).padStart(2, "0")}`;
                    const classes = ["day-btn"];
                    if (iso === selectedDate) classes.push("selected");
                    if (markedDates.has(iso)) classes.push("marked-x");
                    if (events[iso]) classes.push("has-event");
                    if (iso === isoToday) classes.push("today");
                    return (
                      <button
                        key={iso}
                        className={classes.join(" ")}
                        type="button"
                        aria-label={iso}
                        onClick={() => onDayClick(iso)}
                        onDoubleClick={() => onDayDblClick(iso)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
