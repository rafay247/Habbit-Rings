"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavChips from "../components/NavChips";
import "./notes.css";

const STORAGE_KEY = "habit-rings-vibe-notes";

type ColorKey = "sand" | "sage" | "sky" | "rose" | "mist";
const PALETTE: Record<ColorKey, { bg: string; bar: string; txt: string; pin: string }> = {
  sand: { bg: "#E8D9C5", bar: "#C9B89A", txt: "#2E2318", pin: "rgba(160,110,60,0.55)" },
  sage: { bg: "#C8DBC9", bar: "#96C09A", txt: "#1A2E1C", pin: "rgba(60,140,75,0.5)" },
  sky: { bg: "#BFCFE0", bar: "#7AAACF", txt: "#0E2035", pin: "rgba(50,120,200,0.5)" },
  rose: { bg: "#E8CDD6", bar: "#C898AA", txt: "#350D1C", pin: "rgba(190,60,95,0.45)" },
  mist: { bg: "#CECDDF", bar: "#9E9CC5", txt: "#1C183A", pin: "rgba(100,95,190,0.5)" },
};

interface ChecklistItem {
  text: string;
  done: boolean;
}
interface Note {
  id: string;
  title: string;
  content: string;
  checklist: ChecklistItem[];
  color: ColorKey;
  pinned: boolean;
  mode: "prose" | "checklist";
  beastMode: boolean;
  beastDays: number;
  createdAt: number;
  updatedAt: number;
  order: number;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clampDays = (v: unknown) => {
  const d = Number(v);
  if (!Number.isFinite(d)) return 7;
  return Math.min(365, Math.max(1, Math.round(d)));
};

function normalizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const baseTime = Date.now();
  return raw.map((note: Record<string, unknown>, index) => {
    const createdAt = Number(note?.createdAt) || baseTime + index;
    const updatedAt = Number(note?.updatedAt) || createdAt;
    return {
      id: (note?.id as string) || uid(),
      title: typeof note?.title === "string" ? note.title : "",
      content: typeof note?.content === "string" ? note.content : "",
      checklist: Array.isArray(note?.checklist)
        ? (note.checklist as Record<string, unknown>[]).map((item) => ({
            text: typeof item?.text === "string" ? item.text : "",
            done: !!item?.done,
          }))
        : [],
      color: PALETTE[note?.color as ColorKey] ? (note.color as ColorKey) : "sand",
      pinned: !!note?.pinned,
      mode: note?.mode === "checklist" ? "checklist" : "prose",
      beastMode: !!note?.beastMode,
      beastDays: clampDays(note?.beastDays),
      createdAt,
      updatedAt,
      order: Number.isFinite(note?.order) ? Number(note.order) : index,
    };
  });
}

const isBeastDone = (n: Note) =>
  !!n.beastMode && n.checklist.length > 0 && n.checklist.every((i) => i.done);

function compareNotes(a: Note, b: Note) {
  const aHot = a.beastMode && !isBeastDone(a);
  const bHot = b.beastMode && !isBeastDone(b);
  if (Number(bHot) !== Number(aHot)) return Number(bHot) - Number(aHot);
  if (!!b.pinned !== !!a.pinned) return Number(b.pinned) - Number(a.pinned);
  if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
  return (b.updatedAt || 0) - (a.updatedAt || 0);
}

const stripHtml = (html: string) => {
  if (typeof document === "undefined") return html;
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || "";
};

export default function NotesPage() {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentFilter, setCurrentFilter] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");

  // editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [editorColor, setEditorColor] = useState<ColorKey>("sand");
  const [editorPinned, setEditorPinned] = useState(false);
  const [editorMode, setEditorMode] = useState<"prose" | "checklist">("prose");
  const [beastMode, setBeastMode] = useState(false);
  const [beastDays, setBeastDays] = useState(7);
  const [clItems, setClItems] = useState<ChecklistItem[]>([]);
  const [beastHint, setBeastHint] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem(STORAGE_KEY);
      setNotes(normalizeNotes(r ? JSON.parse(r) : []));
    } catch {
      setNotes([]);
    }
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

  const filtered = useMemo(() => {
    let list = [...notes].sort(compareNotes);
    if (currentFilter === "pinned") list = list.filter((n) => n.pinned);
    else if (PALETTE[currentFilter as ColorKey])
      list = list.filter((n) => n.color === currentFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          stripHtml(n.content || "").toLowerCase().includes(q) ||
          (n.checklist || []).some((i) => i.text.toLowerCase().includes(q))
      );
    }
    return list;
  }, [notes, currentFilter, searchQ]);

  // ── Editor ──
  const openEditor = (id: string | null) => {
    const note = id ? notes.find((n) => n.id === id) : null;
    setEditingId(id);
    setTitle(note?.title || "");
    let color = note?.color || "sand";
    let pinned = !!note?.pinned;
    let mode = note?.mode || "prose";
    const bm = !!note?.beastMode;
    setBeastDays(clampDays(note?.beastDays));
    setBeastMode(bm);
    setBeastHint(false);
    if (bm) {
      pinned = true;
      mode = "checklist";
    }
    setEditorColor(color as ColorKey);
    setEditorPinned(pinned);
    setEditorMode(mode);
    setClItems(note?.checklist?.length ? note.checklist.map((i) => ({ ...i })) : []);
    setEditorOpen(true);
    // contentEditable populated after mount
    setTimeout(() => {
      if (contentRef.current) contentRef.current.innerHTML = note?.content || "";
      if (id) contentRef.current?.focus();
    }, 50);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const setMode = (mode: "prose" | "checklist") => {
    if (mode === "checklist") {
      // migrate prose text → checklist items
      const txt = contentRef.current?.innerText.trim() || "";
      if (txt && clItems.length === 0) {
        const lines = txt.split("\n").filter((l) => l.trim());
        setClItems(lines.map((l) => ({ text: l.trim(), done: false })));
        if (contentRef.current) contentRef.current.innerHTML = "";
      } else if (clItems.length === 0) {
        setClItems([{ text: "", done: false }]);
      }
      setEditorMode("checklist");
    } else {
      if (beastMode) return; // beast forces checklist
      setEditorMode("prose");
    }
  };

  const saveNote = () => {
    const t = title.trim();
    const finalMode = beastMode ? "checklist" : editorMode;
    const content =
      finalMode === "prose" ? (contentRef.current?.innerHTML.trim() || "") : "";
    const checklist =
      finalMode === "checklist"
        ? clItems.map((i) => ({ text: i.text.trim(), done: i.done })).filter((i) => i.text)
        : [];

    if (beastMode && !checklist.length) {
      setBeastHint(true);
      if (clItems.length === 0) setClItems([{ text: "", done: false }]);
      return;
    }
    if (!t && !content && !checklist.length) {
      closeEditor();
      return;
    }

    const pinned = beastMode ? true : editorPinned;
    setNotes((prev) => {
      if (editingId) {
        return prev.map((n) =>
          n.id === editingId
            ? {
                ...n,
                title: t,
                content,
                checklist,
                color: editorColor,
                pinned,
                mode: finalMode,
                beastMode,
                beastDays: clampDays(beastDays),
                updatedAt: Date.now(),
              }
            : n
        );
      }
      const samePinned = prev.filter((n) => !!n.pinned === pinned);
      const nextOrder = samePinned.length
        ? Math.max(...samePinned.map((n) => n.order ?? 0)) + 1
        : 0;
      return [
        ...prev,
        {
          id: uid(),
          title: t,
          content,
          checklist,
          color: editorColor,
          pinned,
          mode: finalMode,
          beastMode,
          beastDays: clampDays(beastDays),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: nextOrder,
        },
      ];
    });
    closeEditor();
  };

  const togglePin = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  const removeNote = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const toggleCardChecklist = (noteId: string, idx: number, checked: boolean) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const checklist = n.checklist.map((it, i) =>
          i === idx ? { ...it, done: checked } : it
        );
        return { ...n, checklist, updatedAt: n.beastMode ? Date.now() : n.updatedAt };
      })
    );
  };

  const fmt = (cmd: string) => {
    contentRef.current?.focus();
    document.execCommand(cmd, false);
  };

  // HTML5 drag reorder (desktop). Only when not filtered/searched.
  const canReorder = currentFilter === "all" || currentFilter === "pinned";
  const onDrop = (targetId: string) => {
    const fromId = dragId.current;
    dragId.current = null;
    if (!fromId || fromId === targetId || !canReorder) return;
    setNotes((prev) => {
      const from = prev.find((n) => n.id === fromId);
      const target = prev.find((n) => n.id === targetId);
      if (!from || !target || !!from.pinned !== !!target.pinned) return prev;
      // reorder within the sorted view, then renumber order for that pinned-group
      const sorted = [...prev].sort(compareNotes);
      const group = sorted.filter((n) => !!n.pinned === !!from.pinned);
      const fromIdx = group.findIndex((n) => n.id === fromId);
      const toIdx = group.findIndex((n) => n.id === targetId);
      const [moved] = group.splice(fromIdx, 1);
      group.splice(toIdx, 0, moved);
      const orderById = new Map(group.map((n, i) => [n.id, i]));
      return prev.map((n) =>
        orderById.has(n.id) ? { ...n, order: orderById.get(n.id)! } : n
      );
    });
  };

  const FILTERS: { key: string; label: string; dot?: string }[] = [
    { key: "all", label: "All" },
    { key: "pinned", label: "Pinned" },
    { key: "sand", label: "Sand", dot: "#C9B89A" },
    { key: "sage", label: "Sage", dot: "#96C09A" },
    { key: "sky", label: "Sky", dot: "#7AAACF" },
    { key: "rose", label: "Rose", dot: "#C898AA" },
    { key: "mist", label: "Mist", dot: "#9E9CC5" },
  ];

  const editorPalette = beastMode
    ? { bg: "#F1B8B8", bar: "#B91C1C", txt: "#3B0A0A" }
    : PALETTE[editorColor];

  return (
    <div className="app-shell notes-variant">
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

      <main id="notes-view">
        <div className="notes-top-bar">
          <div className="notes-wordmark">
            <div className="wordmark-text">
              <span className="wordmark-title">Notes</span>
            </div>
          </div>
          <button className="btn-new-note" onClick={() => openEditor(null)}>
            + New Note
          </button>
        </div>

        <div className="notes-stats-bar">
          <div className="notes-stat">
            <span className="notes-stat-value">{notes.length}</span>&nbsp;Notes
          </div>
          <div className="notes-stat">
            <span className="notes-stat-value">{notes.filter((n) => n.pinned).length}</span>
            &nbsp;Pinned
          </div>
          <div className="notes-stat">
            <span className="notes-stat-value">
              {notes.filter((n) => n.mode === "checklist").length}
            </span>
            &nbsp;Checklists
          </div>
        </div>

        <div className="notes-search-wrap">
          <input
            type="text"
            className="notes-search"
            placeholder="Search your notes…"
            autoComplete="off"
            spellCheck={false}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>

        <div className="notes-filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-chip${currentFilter === f.key ? " active" : ""}`}
              onClick={() => setCurrentFilter(f.key)}
            >
              {f.dot ? (
                <span
                  className="filter-dot"
                  style={{ background: f.dot, border: "1px solid rgba(0,0,0,0.12)" }}
                />
              ) : null}
              {f.label}
            </button>
          ))}
        </div>

        <div className="notes-masonry">
          {filtered.length === 0 ? (
            <div className="notes-empty-state">
              <h3>
                {searchQ || currentFilter !== "all" ? "No matching notes" : "No notes yet"}
              </h3>
              <p>
                {searchQ || currentFilter !== "all"
                  ? "Try a different filter or search."
                  : 'Tap "New Note" to capture your first thought.'}
              </p>
            </div>
          ) : (
            filtered.map((note) => {
              const beastDone = isBeastDone(note);
              const p = note.beastMode
                ? beastDone
                  ? { bg: "#BFE4C9", bar: "#2F9E5D", txt: "#102A19", pin: "rgba(30,112,62,0.55)" }
                  : { bg: "#F1B8B8", bar: "#B91C1C", txt: "#3B0A0A", pin: "rgba(143,28,28,0.62)" }
                : PALETTE[note.color] || PALETTE.sand;
              const dateStr = new Date(note.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              let beastMeta = "";
              if (note.beastMode) {
                const start = new Date(note.createdAt);
                start.setHours(0, 0, 0, 0);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const dayNum =
                  Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
                const total = clampDays(note.beastDays);
                beastMeta = beastDone
                  ? "✅ Todos complete"
                  : `🔥 ${dayNum > total ? `Complete (${total}/${total})` : `Day ${dayNum}/${total}`}`;
              }
              return (
                <div
                  key={note.id}
                  className={
                    "note-card" +
                    (note.pinned ? " pinned" : "") +
                    (note.beastMode ? " beast-mode" : "") +
                    (beastDone ? " beast-done" : "")
                  }
                  style={
                    {
                      background: p.bg,
                      color: p.txt,
                      ["--note-pin-color"]: p.pin,
                    } as React.CSSProperties
                  }
                  draggable={canReorder}
                  onDragStart={() => (dragId.current = note.id)}
                  onDragOver={(e) => {
                    if (dragId.current && canReorder) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(note.id);
                  }}
                >
                  <div className="note-card-bar" style={{ background: p.bar }} />
                  <div className="note-card-body" onClick={() => openEditor(note.id)}>
                    {note.title ? <div className="note-card-title">{note.title}</div> : null}
                    {note.beastMode ? <div className="beast-meta">{beastMeta}</div> : null}
                    {note.mode === "checklist" && note.checklist.length ? (
                      <ul className="note-checklist">
                        {note.checklist.map((item, idx) => (
                          <li
                            key={idx}
                            className={`note-checklist-item${item.done ? " checked" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleCardChecklist(note.id, idx, e.target.checked);
                              }}
                            />
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : note.content ? (
                      <div
                        className="note-card-content"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    ) : null}
                  </div>
                  <div className="note-card-footer">
                    <span className="note-card-date">{dateStr}</span>
                    <div className="note-card-actions">
                      <button
                        className={`note-action-btn${note.pinned ? " active" : ""}`}
                        title="Pin"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(note.id);
                        }}
                      >
                        📌
                      </button>
                      <button
                        className="note-action-btn"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor(note.id);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="note-action-btn"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNote(note.id);
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Editor overlay */}
      <div
        className={`note-editor-overlay${editorOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) saveNote();
        }}
      >
        <div className="note-editor-panel" style={{ background: editorPalette.bg, color: editorPalette.txt }}>
          <div className="note-editor-bar" style={{ background: editorPalette.bar }} />
          <div className="note-editor-body">
            <input
              type="text"
              className="note-editor-title"
              placeholder="Title"
              autoComplete="off"
              spellCheck={false}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {editorMode === "prose" && !beastMode ? (
              <div className="note-format-toolbar">
                <button className="fmt-btn" onMouseDown={(e) => { e.preventDefault(); fmt("bold"); }}>
                  <strong>B</strong>
                </button>
                <button className="fmt-btn" onMouseDown={(e) => { e.preventDefault(); fmt("italic"); }}>
                  <em>I</em>
                </button>
                <button className="fmt-btn" onMouseDown={(e) => { e.preventDefault(); fmt("underline"); }}>
                  <span style={{ textDecoration: "underline" }}>U</span>
                </button>
                <div className="fmt-sep" />
                <button className="fmt-btn" onMouseDown={(e) => { e.preventDefault(); fmt("insertUnorderedList"); }}>
                  • List
                </button>
                <button className="fmt-btn" onMouseDown={(e) => { e.preventDefault(); fmt("insertOrderedList"); }}>
                  1. List
                </button>
                <div className="fmt-sep" />
                <button className="fmt-btn" onMouseDown={(e) => { e.preventDefault(); fmt("removeFormat"); }}>
                  Clear
                </button>
              </div>
            ) : null}

            <div
              ref={contentRef}
              className="note-editor-content"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              data-placeholder="Write something…"
              style={{ display: editorMode === "checklist" ? "none" : undefined }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); fmt("bold"); }
                if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); fmt("italic"); }
                if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); fmt("underline"); }
              }}
            />

            <div style={{ display: editorMode === "checklist" ? "" : "none" }}>
              <ul className="note-editor-checklist">
                {clItems.map((item, idx) => (
                  <li className="note-editor-checklist-item" key={idx}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) =>
                        setClItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, done: e.target.checked } : it))
                        )
                      }
                    />
                    <input
                      type="text"
                      value={item.text}
                      placeholder="List item…"
                      spellCheck={false}
                      onChange={(e) =>
                        setClItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it))
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setClItems((prev) => [...prev, { text: "", done: false }]);
                        }
                        if (e.key === "Backspace" && !item.text && clItems.length > 1) {
                          e.preventDefault();
                          setClItems((prev) => prev.filter((_, i) => i !== idx));
                        }
                      }}
                    />
                    <button
                      className="remove-checklist-item"
                      onClick={() => setClItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="add-checklist-item-btn"
                onClick={() => setClItems((prev) => [...prev, { text: "", done: false }])}
              >
                + Add item
              </button>
            </div>
          </div>

          <div className="note-editor-footer">
            <div className="color-wash-row">
              {(Object.keys(PALETTE) as ColorKey[]).map((c) => (
                <div
                  key={c}
                  className={`color-swatch${editorColor === c ? " selected" : ""}`}
                  style={{ background: PALETTE[c].bg }}
                  title={c}
                  onClick={() => setEditorColor(c)}
                />
              ))}
            </div>
            <div className="editor-right-actions">
              <button
                className={`editor-mode-btn${editorMode === "checklist" ? " active" : ""}`}
                onClick={() => setMode(editorMode === "prose" ? "checklist" : "prose")}
              >
                Checklist
              </button>
              <label className={`editor-beast-control${beastMode ? " active" : ""}`}>
                <input
                  type="checkbox"
                  checked={beastMode}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setBeastMode(on);
                    setBeastHint(false);
                    if (on) {
                      setEditorPinned(true);
                      setMode("checklist");
                    }
                  }}
                />
                Beast mode
              </label>
              {beastMode ? (
                <input
                  className="editor-beast-days"
                  type="number"
                  min={1}
                  max={365}
                  value={beastDays}
                  onChange={(e) => setBeastDays(clampDays(e.target.value))}
                />
              ) : null}
              {beastHint ? (
                <span className="editor-beast-hint show">
                  Beast mode only allows todos. Add at least one todo item.
                </span>
              ) : null}
              <button
                className={`editor-icon-btn${editorPinned ? " active" : ""}`}
                title="Pin note"
                onClick={() => {
                  if (beastMode) return;
                  setEditorPinned((v) => !v);
                }}
              >
                📌
              </button>
              {editingId ? (
                <button
                  className="editor-icon-btn"
                  title="Delete note"
                  onClick={() => {
                    removeNote(editingId);
                    closeEditor();
                  }}
                >
                  🗑
                </button>
              ) : null}
              <button
                className="editor-save-btn"
                style={{ background: `${editorPalette.bar}99`, borderColor: editorPalette.bar }}
                onClick={saveNote}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
