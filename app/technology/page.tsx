"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavChips from "../components/NavChips";
import "./technology.css";

const TECH_CATEGORIES_KEY = "habit-rings-tech-categories-v1";
const TECH_DOCS_KEY = "habit-rings-tech-docs-v1";
const TEXT_SIZE_OPTIONS = [12, 14, 16, 17, 18, 20, 22, 24, 28, 32, 40];

interface Category {
  id: string;
  title: string;
}
interface Subcategory {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}
interface Doc {
  title: string;
  content: string;
  subcategories: Subcategory[];
  activeSubcategoryId: string | null;
  updatedAt: number;
}
type DocsMap = Record<string, Doc>;

function escapeHtml(value: string) {
  if (typeof document === "undefined") return value;
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}
function normalizeSubcategories(value: unknown): Subcategory[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: Record<string, unknown>) => ({
      id: typeof item?.id === "string" ? item.id : "",
      title: typeof item?.title === "string" ? item.title.trim() : "",
      content: typeof item?.content === "string" ? item.content : "",
      updatedAt: typeof item?.updatedAt === "number" ? item.updatedAt : Date.now(),
    }))
    .filter((i) => i.id && i.title);
}
function getWordCountFromHtml(html: string) {
  if (typeof document === "undefined") return 0;
  const t = document.createElement("div");
  t.innerHTML = html || "";
  const text = (t.textContent || "").trim();
  return text ? text.split(/\s+/).length : 0;
}
function formatTimestamp(ts: number | null | undefined) {
  if (!ts) return "--";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(TECH_CATEGORIES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed) || !parsed.length) return [];
    return parsed
      .map((i: Record<string, unknown>) => ({
        id: typeof i?.id === "string" ? i.id : "",
        title: typeof i?.title === "string" ? i.title.trim() : "",
      }))
      .filter((i) => i.id && i.title);
  } catch {
    return [];
  }
}
function loadDocs(categories: Category[]): DocsMap {
  let parsed: Record<string, Record<string, unknown>> = {};
  try {
    const raw = localStorage.getItem(TECH_DOCS_KEY);
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }
  return categories.reduce((acc, category) => {
    const fallback = {
      title: category.title,
      content: `<h1>${escapeHtml(category.title)}</h1><p>Start documenting your information here.</p>`,
    };
    const current = parsed[category.id] || {};
    const subcategories = normalizeSubcategories(current.subcategories);
    const activeSubId =
      typeof current.activeSubcategoryId === "string" &&
      subcategories.some((s) => s.id === current.activeSubcategoryId)
        ? (current.activeSubcategoryId as string)
        : null;
    acc[category.id] = {
      title:
        typeof current.title === "string" && current.title.trim()
          ? (current.title as string)
          : fallback.title,
      content:
        typeof current.content === "string" && current.content.trim()
          ? (current.content as string)
          : fallback.content,
      subcategories,
      activeSubcategoryId: activeSubId,
      updatedAt: typeof current.updatedAt === "number" ? (current.updatedAt as number) : Date.now(),
    };
    return acc;
  }, {} as DocsMap);
}

export default function TechnologyPage() {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [docs, setDocs] = useState<DocsMap>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [catInput, setCatInput] = useState("");
  const [subInput, setSubInput] = useState("");
  const [textSize, setTextSize] = useState("17");
  const [selectionState, setSelectionState] = useState("Ready to document");

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragCat = useRef<string | null>(null);
  const dragSub = useRef<string | null>(null);

  // refs mirroring latest state for stable callbacks
  const docsRef = useRef(docs);
  docsRef.current = docs;
  const catRef = useRef(categories);
  catRef.current = categories;
  const titleRef = useRef(title);
  titleRef.current = title;
  const activeCatRef = useRef(activeCategoryId);
  activeCatRef.current = activeCategoryId;
  const activeSubRef = useRef(activeSubcategoryId);
  activeSubRef.current = activeSubcategoryId;

  useEffect(() => {
    const cats = loadCategories();
    const d = loadDocs(cats);
    setCategories(cats);
    setDocs(d);
    const firstCat = cats[0]?.id || null;
    setActiveCategoryId(firstCat);
    setActiveSubcategoryId(firstCat ? d[firstCat]?.activeSubcategoryId || null : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(TECH_CATEGORIES_KEY, JSON.stringify(categories));
  }, [categories, ready]);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(TECH_DOCS_KEY, JSON.stringify(docs));
  }, [docs, ready]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    []
  );

  const activeDoc = activeCategoryId ? docs[activeCategoryId] : null;
  const activeSub = activeDoc?.subcategories.find((s) => s.id === activeSubcategoryId) || null;

  // Populate the (uncontrolled) editor whenever the active doc/subcategory changes.
  useEffect(() => {
    if (!editorRef.current) return;
    const doc = activeCategoryId ? docs[activeCategoryId] : null;
    if (!doc) {
      editorRef.current.innerHTML = "";
      setTitle("");
      return;
    }
    const sub = doc.subcategories.find((s) => s.id === activeSubcategoryId);
    editorRef.current.innerHTML = sub ? sub.content : doc.content || "";
    setTitle(doc.title || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId, activeSubcategoryId, ready]);

  // Flush current editor content into docs state.
  const persistActiveDoc = useCallback(() => {
    const catId = activeCatRef.current;
    if (!catId) return;
    const html = editorRef.current?.innerHTML ?? "";
    const subId = activeSubRef.current;
    const t =
      titleRef.current.trim() ||
      catRef.current.find((c) => c.id === catId)?.title ||
      "Untitled Document";
    setDocs((prev) => {
      const existing =
        prev[catId] || { content: "", subcategories: [], activeSubcategoryId: null, updatedAt: Date.now() };
      const doc: Doc = {
        ...existing,
        title: t,
        subcategories: normalizeSubcategories(existing.subcategories),
        activeSubcategoryId: subId,
      };
      if (subId) {
        doc.subcategories = doc.subcategories.map((s) =>
          s.id === subId ? { ...s, content: html, updatedAt: Date.now() } : s
        );
      } else {
        doc.content = html;
        doc.updatedAt = Date.now();
      }
      return { ...prev, [catId]: doc };
    });
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persistActiveDoc, 180);
  }, [persistActiveDoc]);

  const focusEditor = () => editorRef.current?.focus();
  const exec = (cmd: string, value?: string) => {
    focusEditor();
    document.execCommand(cmd, false, value);
    scheduleSave();
  };

  const switchCategory = (id: string) => {
    if (id === activeCategoryId) return;
    persistActiveDoc();
    setActiveCategoryId(id);
    setActiveSubcategoryId(docs[id]?.activeSubcategoryId || null);
  };

  const switchSubcategory = (id: string | null) => {
    persistActiveDoc();
    setActiveSubcategoryId(id);
    if (activeCategoryId) {
      setDocs((prev) => ({
        ...prev,
        [activeCategoryId]: { ...prev[activeCategoryId], activeSubcategoryId: id },
      }));
    }
    setSelectionState(id ? "Sub-category selected" : "Main category selected");
  };

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const t = catInput.trim();
    if (!t) return;
    let id = slugify(t) || `category_${Date.now().toString(36)}`;
    let n = 2;
    while (categories.some((c) => c.id === id)) id = `${slugify(t)}_${n++}`;
    persistActiveDoc();
    setCategories((prev) => [...prev, { id, title: t }]);
    setDocs((prev) => ({
      ...prev,
      [id]: {
        title: t,
        content: `<h1>${escapeHtml(t)}</h1><p>Start documenting your information here.</p>`,
        subcategories: [],
        activeSubcategoryId: null,
        updatedAt: Date.now(),
      },
    }));
    setActiveCategoryId(id);
    setActiveSubcategoryId(null);
    setCatInput("");
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDocs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeCategoryId === id) {
      const remaining = categories.filter((c) => c.id !== id);
      setActiveCategoryId(remaining[0]?.id || null);
      setActiveSubcategoryId(null);
    }
  };

  const addSubcategory = () => {
    if (!activeCategoryId) return;
    const t = subInput.trim();
    if (!t) return;
    persistActiveDoc();
    let id = slugify(t) || `subcategory_${Date.now().toString(36)}`;
    const doc = docsRef.current[activeCategoryId];
    let n = 2;
    while ((doc?.subcategories || []).some((s) => s.id === id)) id = `${slugify(t)}_${n++}`;
    setDocs((prev) => {
      const d = prev[activeCategoryId];
      const sub: Subcategory = {
        id,
        title: t,
        content: `<h1>${escapeHtml(t)}</h1><p>Start documenting your information here.</p>`,
        updatedAt: Date.now(),
      };
      return {
        ...prev,
        [activeCategoryId]: {
          ...d,
          subcategories: [...normalizeSubcategories(d.subcategories), sub],
          activeSubcategoryId: id,
        },
      };
    });
    setActiveSubcategoryId(id);
    setSubInput("");
    setSelectionState("Sub-category added");
  };

  const deleteSubcategory = (id: string) => {
    if (!activeCategoryId) return;
    persistActiveDoc();
    setDocs((prev) => {
      const d = prev[activeCategoryId];
      return {
        ...prev,
        [activeCategoryId]: {
          ...d,
          subcategories: d.subcategories.filter((s) => s.id !== id),
          activeSubcategoryId: d.activeSubcategoryId === id ? null : d.activeSubcategoryId,
        },
      };
    });
    if (activeSubcategoryId === id) setActiveSubcategoryId(null);
    setSelectionState("Sub-category removed");
  };

  const onDropCategory = (targetId: string) => {
    const src = dragCat.current;
    dragCat.current = null;
    if (!src || src === targetId) return;
    setCategories((prev) => {
      const next = [...prev];
      const from = next.findIndex((c) => c.id === src);
      const to = next.findIndex((c) => c.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const onDropSubcategory = (targetId: string) => {
    const src = dragSub.current;
    dragSub.current = null;
    if (!src || src === targetId || !activeCategoryId) return;
    setDocs((prev) => {
      const d = prev[activeCategoryId];
      const subs = [...d.subcategories];
      const from = subs.findIndex((s) => s.id === src);
      const to = subs.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = subs.splice(from, 1);
      subs.splice(to, 0, moved);
      return { ...prev, [activeCategoryId]: { ...d, subcategories: subs } };
    });
  };

  // Derived KPIs
  const categoryTitle =
    categories.find((c) => c.id === activeCategoryId)?.title || "No category selected";
  const wordCount = getWordCountFromHtml(
    activeSub ? activeSub.content : activeDoc?.content || ""
  );
  const lastEdited = formatTimestamp(activeSub?.updatedAt || activeDoc?.updatedAt);

  const getDocWordCount = (doc?: Doc) => {
    if (!doc) return 0;
    return (
      getWordCountFromHtml(doc.content || "") +
      doc.subcategories.reduce((t, s) => t + getWordCountFromHtml(s.content || ""), 0)
    );
  };
  const getDocUpdatedAt = (doc?: Doc) => {
    if (!doc) return null;
    return Math.max(doc.updatedAt || 0, ...doc.subcategories.map((s) => s.updatedAt || 0));
  };

  return (
    <div className="app-shell tech-shell">
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

      <section className="tech-hero glass">
        <div className="tech-hero__copy">
          <span className="tech-chip">Knowledge System</span>
          <h1>Knowledge base</h1>
        </div>
        <div className="tech-kpis">
          <div className="tech-kpi">
            <div className="tech-kpi__label">Categories</div>
            <div className="tech-kpi__value">{categories.length}</div>
          </div>
          <div className="tech-kpi">
            <div className="tech-kpi__label">Words</div>
            <div className="tech-kpi__value">{wordCount}</div>
          </div>
          <div className="tech-kpi">
            <div className="tech-kpi__label">Last Edited</div>
            <div className="tech-kpi__value">{lastEdited}</div>
          </div>
        </div>
      </section>

      <section className="tech-workspace glass">
        <div className="tech-layout">
          <aside className="tech-sidebar">
            <div className="tech-panel">
              <h2>Categories</h2>
              <form className="tech-category-form" onSubmit={addCategory}>
                <input
                  className="tech-input"
                  type="text"
                  maxLength={80}
                  placeholder="Add category"
                  autoComplete="off"
                  value={catInput}
                  onChange={(e) => setCatInput(e.target.value)}
                />
                <button className="tech-add-btn" type="submit">
                  Add
                </button>
              </form>

              <div className="tech-categories">
                {categories.length === 0 ? (
                  <div className="tech-empty">No categories yet. Add one on the right.</div>
                ) : (
                  categories.map((cat) => {
                    const doc = docs[cat.id];
                    return (
                      <div
                        key={cat.id}
                        className={`tech-category${cat.id === activeCategoryId ? " is-active" : ""}`}
                        draggable
                        onDragStart={() => (dragCat.current = cat.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          onDropCategory(cat.id);
                        }}
                      >
                        <div className="tech-category__handle" aria-hidden="true">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <button
                          className="tech-category__open"
                          type="button"
                          onClick={() => switchCategory(cat.id)}
                        >
                          <span className="tech-category__title">{cat.title}</span>
                          <span className="tech-category__meta">
                            {getDocWordCount(doc)} words · {formatTimestamp(getDocUpdatedAt(doc))}
                          </span>
                        </button>
                        <button
                          className="tech-category__delete"
                          type="button"
                          aria-label={`Delete ${cat.title}`}
                          onClick={() => deleteCategory(cat.id)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <div className="tech-main">
            <div className="tech-doc">
              <div className="tech-doc__top">
                <input
                  className="tech-title-input"
                  type="text"
                  maxLength={120}
                  placeholder="Document title"
                  autoComplete="off"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    scheduleSave();
                  }}
                />

                <div className="tech-subcategory-row">
                  <span className="tech-subcategory-label">Sub-category</span>
                  <input
                    className="tech-subcategory-input"
                    type="text"
                    maxLength={48}
                    placeholder="Add badge"
                    autoComplete="off"
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubcategory();
                      }
                    }}
                  />
                  <button className="tech-subcategory-add" type="button" onClick={addSubcategory}>
                    Add
                  </button>
                </div>

                <div className="tech-subcategory-tabs">
                  {activeDoc ? (
                    <>
                      <button
                        className={`tech-subcategory-tab${!activeSubcategoryId ? " is-active" : ""}`}
                        type="button"
                        onClick={() => switchSubcategory(null)}
                      >
                        Main
                      </button>
                      {activeDoc.subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          className={`tech-subcategory-tab${sub.id === activeSubcategoryId ? " is-active" : ""}`}
                          type="button"
                          draggable
                          onClick={() => switchSubcategory(sub.id)}
                          onDragStart={() => (dragSub.current = sub.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            onDropSubcategory(sub.id);
                          }}
                        >
                          {sub.title}
                          <span
                            className="tech-subcategory-delete"
                            aria-label={`Delete ${sub.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubcategory(sub.id);
                            }}
                          >
                            ×
                          </span>
                        </button>
                      ))}
                    </>
                  ) : null}
                </div>

                <div className="tech-toolbar">
                  <select
                    className="tech-select"
                    onChange={(e) => exec("formatBlock", e.target.value)}
                    defaultValue="p"
                  >
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="blockquote">Quote</option>
                  </select>
                  <select
                    className="tech-select tech-select--size"
                    title="Text size"
                    value={textSize}
                    onChange={(e) => {
                      setTextSize(e.target.value);
                      focusEditor();
                      document.execCommand("fontSize", false, "7");
                      editorRef.current?.querySelectorAll('font[size="7"]').forEach((f) => {
                        const span = document.createElement("span");
                        span.innerHTML = (f as HTMLElement).innerHTML;
                        span.style.fontSize = `${e.target.value}px`;
                        f.replaceWith(span);
                      });
                      scheduleSave();
                    }}
                  >
                    {TEXT_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}px
                      </option>
                    ))}
                  </select>
                  <button className="tech-tool" type="button" onClick={() => exec("bold")}>
                    Bold
                  </button>
                  <button className="tech-tool" type="button" onClick={() => exec("italic")}>
                    Italic
                  </button>
                  <button className="tech-tool" type="button" onClick={() => exec("underline")}>
                    Underline
                  </button>
                  <button className="tech-tool" type="button" onClick={() => exec("insertUnorderedList")}>
                    Bullets
                  </button>
                  <button className="tech-tool" type="button" onClick={() => exec("insertOrderedList")}>
                    Numbers
                  </button>
                  <button
                    className="tech-tool"
                    type="button"
                    onClick={() => exec("hiliteColor", "rgba(63, 185, 80, 0.22)")}
                  >
                    Highlight
                  </button>
                  <button
                    className="tech-tool"
                    type="button"
                    onClick={() => {
                      const url = window.prompt("Enter link URL");
                      if (url) exec("createLink", url);
                    }}
                  >
                    Link
                  </button>
                  <button
                    className="tech-tool"
                    type="button"
                    onClick={() => exec("insertHTML", "<pre><code>Code snippet</code></pre>")}
                  >
                    Code Block
                  </button>
                  <button className="tech-tool" type="button" onClick={() => exec("insertHorizontalRule")}>
                    Divider
                  </button>
                  <button className="tech-tool" type="button" onClick={() => exec("removeFormat")}>
                    Clear
                  </button>
                  <button
                    className="tech-tool tech-tool--icon is-accent"
                    type="button"
                    aria-label="Undo"
                    onClick={() => exec("undo")}
                  >
                    ↶
                  </button>
                  <button
                    className="tech-tool tech-tool--icon is-accent"
                    type="button"
                    aria-label="Redo"
                    onClick={() => exec("redo")}
                  >
                    ↷
                  </button>
                </div>

                <div className="tech-doc__meta">
                  <span>
                    {activeSub ? `${categoryTitle} / ${activeSub.title}` : categoryTitle}
                  </span>
                  <span>{selectionState}</span>
                </div>
              </div>

              <div
                ref={editorRef}
                className="tech-editor"
                contentEditable
                suppressContentEditableWarning
                spellCheck
                data-placeholder="Start writing architecture notes, workflows, commands, API references, implementation guides, research findings, checklists, decisions, examples, and documentation here..."
                onInput={scheduleSave}
                onFocus={() => setSelectionState("Editing document")}
                onBlur={() => {
                  persistActiveDoc();
                  setSelectionState("Saved automatically");
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
