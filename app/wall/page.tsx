"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavChips from "../components/NavChips";
import "./wall.css";

const STORAGE_KEY = "habit-rings-wall-notes-v1";

type StickStyle = "pin" | "tape";

interface WallNote {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
  stick: StickStyle;
}

const COLORS = [
  { name: "Sunshine", value: "#ffe066" },
  { name: "Blush", value: "#ff9eb5" },
  { name: "Sky", value: "#8ecbff" },
  { name: "Mint", value: "#9bf0c0" },
  { name: "Tangerine", value: "#ffb86b" },
  { name: "Lavender", value: "#cdb4ff" },
];

const PIN_COLORS = ["#e5484d", "#3fb950", "#3b82f6", "#e3b341", "#a855f7"];

function uid() {
  return "wall_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normalize(note: Partial<WallNote>): WallNote {
  return {
    id: note.id || uid(),
    text: typeof note.text === "string" ? note.text : "",
    x: Number.isFinite(note.x) ? Number(note.x) : 40,
    y: Number.isFinite(note.y) ? Number(note.y) : 40,
    color: typeof note.color === "string" ? note.color : COLORS[0].value,
    rotation: Number.isFinite(note.rotation) ? Number(note.rotation) : 0,
    stick: note.stick === "tape" ? "tape" : "pin",
  };
}

function loadNotes(): WallNote[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

export default function WallPage() {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<WallNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // drag state kept in a ref so move/up handlers don't re-render per frame
  const drag = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setNotes(loadNotes());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, ready]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const addNote = (color: string) => {
    const board = boardRef.current;
    const scrollTop = board?.scrollTop ?? 0;
    const scrollLeft = board?.scrollLeft ?? 0;
    // scatter new notes near the visible top-left with a little randomness
    const note: WallNote = normalize({
      text: "",
      x: scrollLeft + 60 + Math.round(Math.random() * 120),
      y: scrollTop + 60 + Math.round(Math.random() * 80),
      color,
      rotation: Math.round((Math.random() - 0.5) * 10),
      stick: Math.random() > 0.5 ? "pin" : "tape",
    });
    setNotes((prev) => [...prev, note]);
    setActiveId(note.id);
  };

  const updateText = (id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const bringToFront = (id: string) => {
    setNotes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (!target) return prev;
      return [...prev.filter((n) => n.id !== id), target];
    });
  };

  const onPointerDown = (e: React.PointerEvent, note: WallNote) => {
    // don't start a drag from the textarea or action buttons
    const target = e.target as HTMLElement;
    if (target.closest(".wall-note__body") || target.closest(".wall-note__btn")) {
      setActiveId(note.id);
      bringToFront(note.id);
      return;
    }
    e.preventDefault();
    const board = boardRef.current;
    const rect = board?.getBoundingClientRect();
    const px = e.clientX - (rect?.left ?? 0) + (board?.scrollLeft ?? 0);
    const py = e.clientY - (rect?.top ?? 0) + (board?.scrollTop ?? 0);
    drag.current = {
      id: note.id,
      offsetX: px - note.x,
      offsetY: py - note.y,
      moved: false,
    };
    setActiveId(note.id);
    bringToFront(note.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const board = boardRef.current;
    const rect = board?.getBoundingClientRect();
    const px = e.clientX - (rect?.left ?? 0) + (board?.scrollLeft ?? 0);
    const py = e.clientY - (rect?.top ?? 0) + (board?.scrollTop ?? 0);
    d.moved = true;
    const nx = Math.max(0, px - d.offsetX);
    const ny = Math.max(0, py - d.offsetY);
    setNotes((prev) =>
      prev.map((n) => (n.id === d.id ? { ...n, x: nx, y: ny } : n))
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    drag.current = null;
  };

  return (
    <div className="app-shell wall-shell">
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

      <main className="wall-main">
        <section className="wall-toolbar glass">
          <div className="wall-toolbar__copy">
            <h1 className="wall-title">The Wall</h1>
            <p className="wall-subtitle">
              Stick a note, drag it anywhere, peel it off when you&apos;re done.
            </p>
          </div>
          <div className="wall-toolbar__actions">
            <span className="wall-palette-label">Add note</span>
            <div className="wall-palette">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="wall-swatch"
                  style={{ background: c.value }}
                  title={`Add ${c.name} note`}
                  aria-label={`Add ${c.name} note`}
                  onClick={() => addNote(c.value)}
                />
              ))}
            </div>
          </div>
        </section>

        <div
          className="wall-board"
          ref={boardRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerDown={(e) => {
            if (e.target === boardRef.current) setActiveId(null);
          }}
        >
          {notes.length === 0 && (
            <div className="wall-empty">
              <div className="wall-empty__pin" />
              <p>Your wall is empty.</p>
              <p className="wall-empty__hint">
                Pick a color above to pin your first note.
              </p>
            </div>
          )}

          {notes.map((note, i) => {
            const pinColor = PIN_COLORS[i % PIN_COLORS.length];
            return (
              <div
                key={note.id}
                className={`wall-note wall-note--${note.stick}${
                  activeId === note.id ? " is-active" : ""
                }`}
                style={{
                  left: note.x,
                  top: note.y,
                  background: note.color,
                  transform: `rotate(${note.rotation}deg)`,
                }}
                onPointerDown={(e) => onPointerDown(e, note)}
              >
                {note.stick === "pin" ? (
                  <span
                    className="wall-note__pin"
                    style={{ background: pinColor }}
                  />
                ) : (
                  <span className="wall-note__tape" />
                )}

                <button
                  type="button"
                  className="wall-note__btn wall-note__delete"
                  aria-label="Remove note"
                  title="Remove note"
                  onClick={() => deleteNote(note.id)}
                >
                  ✕
                </button>

                <textarea
                  className="wall-note__body"
                  placeholder="Write something…"
                  value={note.text}
                  onChange={(e) => updateText(note.id, e.target.value)}
                  onFocus={() => {
                    setActiveId(note.id);
                    bringToFront(note.id);
                  }}
                />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
