"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavChips from "../components/NavChips";
import "./wall.css";

const STORAGE_KEY = "habit-rings-wall-notes-v1";
const CATEGORIES_KEY = "habit-rings-wall-categories-v1";
const ACTIVE_CAT_KEY = "habit-rings-wall-active-category-v1";

type StickStyle = "pin" | "tape";

interface WallNote {
  id: string;
  categoryId: string;
  text: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
  stick: StickStyle;
}

interface WallCategory {
  id: string;
  name: string;
  theme: number;
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

// Each category gets a distinct corkboard look so walls feel different.
const BOARD_THEMES = [
  { name: "Cork", base: "#c79a5b", speckle: "120, 80, 30", chip: "#c79a5b" },
  { name: "Slate", base: "#5a6470", speckle: "30, 40, 55", chip: "#5a6470" },
  { name: "Forest", base: "#5b8a5f", speckle: "25, 55, 30", chip: "#5b8a5f" },
  { name: "Plum", base: "#7a5a78", speckle: "50, 25, 50", chip: "#7a5a78" },
  { name: "Ocean", base: "#4f7d9c", speckle: "20, 45, 65", chip: "#4f7d9c" },
  { name: "Rose", base: "#b07a72", speckle: "70, 35, 30", chip: "#b07a72" },
];

const DEFAULT_CATEGORY_ID = "wall_cat_general";

function uid() {
  return "wall_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function catUid() {
  return "wall_cat_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normalize(note: Partial<WallNote>): WallNote {
  return {
    id: note.id || uid(),
    categoryId:
      typeof note.categoryId === "string" ? note.categoryId : DEFAULT_CATEGORY_ID,
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

function loadCategories(): WallCategory[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || "null");
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((c, i) => ({
        id: typeof c?.id === "string" ? c.id : catUid(),
        name: typeof c?.name === "string" && c.name.trim() ? c.name : "Untitled",
        theme: Number.isFinite(c?.theme) ? Number(c.theme) % BOARD_THEMES.length : i % BOARD_THEMES.length,
      }));
    }
  } catch {
    /* fall through to default */
  }
  return [{ id: DEFAULT_CATEGORY_ID, name: "General", theme: 0 }];
}

export default function WallPage() {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<WallNote[]>([]);
  const [categories, setCategories] = useState<WallCategory[]>([]);
  const [activeCat, setActiveCat] = useState<string>(DEFAULT_CATEGORY_ID);
  const [activeId, setActiveId] = useState<string | null>(null);
  // inline category editing state (window.prompt/confirm are unavailable here)
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // drag state kept in a ref so move/up handlers don't re-render per frame
  const drag = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const cats = loadCategories();
    setCategories(cats);
    setNotes(loadNotes());
    const storedActive = localStorage.getItem(ACTIVE_CAT_KEY);
    setActiveCat(
      storedActive && cats.some((c) => c.id === storedActive)
        ? storedActive
        : cats[0].id
    );
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }, [categories, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(ACTIVE_CAT_KEY, activeCat);
  }, [activeCat, ready]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCat) ?? categories[0],
    [categories, activeCat]
  );

  const theme = BOARD_THEMES[(activeCategory?.theme ?? 0) % BOARD_THEMES.length];

  const visibleNotes = useMemo(
    () => notes.filter((n) => n.categoryId === activeCat),
    [notes, activeCat]
  );

  const startAdd = () => {
    setConfirmDeleteId(null);
    setEditingId(null);
    setDraftName("");
    setAdding(true);
  };

  const commitAdd = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    const cat: WallCategory = {
      id: catUid(),
      name: trimmed,
      theme: categories.length % BOARD_THEMES.length,
    };
    setCategories((prev) => [...prev, cat]);
    setActiveCat(cat.id);
    setActiveId(null);
    setAdding(false);
    setDraftName("");
  };

  const startRename = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setConfirmDeleteId(null);
    setEditName(cat.name);
    setEditingId(id);
  };

  const commitRename = () => {
    const id = editingId;
    if (!id) return;
    const trimmed = editName.trim();
    if (trimmed) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
      );
    }
    setEditingId(null);
    setEditName("");
  };

  const cycleTheme = (id: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, theme: (c.theme + 1) % BOARD_THEMES.length } : c
      )
    );
  };

  const deleteCategory = (id: string) => {
    setConfirmDeleteId(null);
    setNotes((prev) => prev.filter((n) => n.categoryId !== id));
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) return prev; // never delete the last wall
      if (activeCat === id) setActiveCat(next[0].id);
      return next;
    });
  };

  const addNote = (color: string) => {
    const board = boardRef.current;
    const scrollTop = board?.scrollTop ?? 0;
    const scrollLeft = board?.scrollLeft ?? 0;
    // scatter new notes near the visible top-left with a little randomness
    const note: WallNote = normalize({
      categoryId: activeCat,
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

        <nav className="wall-cats glass">
          <div className="wall-cats__list">
            {categories.map((c) => {
              const t = BOARD_THEMES[c.theme % BOARD_THEMES.length];
              const isActive = c.id === activeCat;
              const isEditing = editingId === c.id;
              const isConfirming = confirmDeleteId === c.id;
              return (
                <div
                  key={c.id}
                  className={`wall-cat${isActive ? " is-active" : ""}`}
                >
                  {isEditing ? (
                    <input
                      className="wall-cat__input"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditName("");
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="wall-cat__pick"
                      onClick={() => {
                        setActiveCat(c.id);
                        setActiveId(null);
                      }}
                      onDoubleClick={() => startRename(c.id)}
                      title="Click to open · double-click to rename"
                    >
                      <span
                        className="wall-cat__dot"
                        style={{ background: t.chip }}
                      />
                      <span className="wall-cat__name">{c.name}</span>
                    </button>
                  )}
                  {isActive && !isEditing && (
                    <>
                      <button
                        type="button"
                        className="wall-cat__icon"
                        title="Change wall theme"
                        aria-label="Change wall theme"
                        onClick={() => cycleTheme(c.id)}
                      >
                        🎨
                      </button>
                      <button
                        type="button"
                        className="wall-cat__icon"
                        title="Rename wall"
                        aria-label="Rename wall"
                        onClick={() => startRename(c.id)}
                      >
                        ✎
                      </button>
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            className="wall-cat__icon wall-cat__icon--danger"
                            title="Confirm delete"
                            aria-label="Confirm delete"
                            onClick={() => deleteCategory(c.id)}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="wall-cat__icon"
                            title="Cancel"
                            aria-label="Cancel delete"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            ↩
                          </button>
                        </>
                      ) : (
                        categories.length > 1 && (
                          <button
                            type="button"
                            className="wall-cat__icon wall-cat__icon--danger"
                            title="Delete wall"
                            aria-label="Delete wall"
                            onClick={() => setConfirmDeleteId(c.id)}
                          >
                            ✕
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {adding && (
              <div className="wall-cat is-active">
                <input
                  className="wall-cat__input"
                  autoFocus
                  placeholder="Wall name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitAdd}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitAdd();
                    if (e.key === "Escape") {
                      setAdding(false);
                      setDraftName("");
                    }
                  }}
                />
              </div>
            )}
          </div>
          {!adding && (
            <button
              type="button"
              className="wall-cat__add"
              onClick={startAdd}
              title="Add category"
            >
              + Add category
            </button>
          )}
        </nav>

        <div
          className="wall-board"
          ref={boardRef}
          style={
            {
              "--wall-cork": theme.base,
              "--wall-speckle": theme.speckle,
            } as React.CSSProperties
          }
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerDown={(e) => {
            if (e.target === boardRef.current) setActiveId(null);
          }}
        >
          {visibleNotes.length === 0 && (
            <div className="wall-empty">
              <div className="wall-empty__pin" />
              <p>This wall is empty.</p>
              <p className="wall-empty__hint">
                Pick a color above to pin your first note.
              </p>
            </div>
          )}

          {visibleNotes.map((note, i) => {
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
