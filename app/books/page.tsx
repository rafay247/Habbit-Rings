"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavChips from "../components/NavChips";
import { SEED_DATA } from "./seedData";
import defaultBackup from "../lib/defaultBackup.json";
import "./books.css";

const STORAGE_KEY = "habit-rings-books-v4";
const CATEGORY_STORAGE_KEY = "habit-rings-books-categories-v1";
const MIGRATION_KEY = "habit-rings-books-migrated-v5";
const BOOKS_BACKUP_APPLIED_KEY = "habit-rings-books-v4-backup-applied";

interface Book {
  id: string;
  title: string;
  read: boolean;
  goat: boolean;
  moral: string;
}
interface Category {
  id: string;
  name: string;
  books: Book[];
}
type Section = "all" | "read" | "goat";
type BackupPayload = {
  _version?: number;
  _exportedAt?: string;
  _allPages?: Record<string, unknown>;
  _localStorage?: Record<string, unknown>;
};

const BOOKS_BACKUP = defaultBackup as BackupPayload;
const BOOKS_BACKUP_SIGNATURE = [
  BOOKS_BACKUP._version || "",
  BOOKS_BACKUP._exportedAt || "",
  String(BOOKS_BACKUP._allPages?.[STORAGE_KEY] || BOOKS_BACKUP._localStorage?.[STORAGE_KEY] || "").length,
].join(":");

const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function normalizeData(raw: unknown): Category[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((cat: Record<string, unknown>) => ({
      id: (cat.id as string) || uid(),
      name: typeof cat.name === "string" ? cat.name : "Unnamed",
      books: Array.isArray(cat.books)
        ? (cat.books as Record<string, unknown>[])
            .map((b) => ({
              id: (b.id as string) || uid(),
              title: typeof b.title === "string" ? b.title : "",
              read: !!b.read,
              goat: !!b.goat,
              moral: typeof b.moral === "string" ? b.moral : "",
            }))
            .filter((b) => b.title)
        : [],
    }))
    .filter((c) => c.name);
}

function seededData(): Category[] {
  return SEED_DATA.map((cat) => ({
    id: uid(),
    name: cat.name,
    books: cat.books.map((b) => ({
      id: uid(),
      title: b.title,
      read: !!b.read,
      goat: !!b.goat,
      moral: "",
    })),
  }));
}

function totalBooks(categories: Category[]): number {
  return categories.reduce((s, c) => s + c.books.length, 0);
}

function backupBooksData(): Category[] {
  const raw = BOOKS_BACKUP._allPages?.[STORAGE_KEY] || BOOKS_BACKUP._localStorage?.[STORAGE_KEY];
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return normalizeData(parsed);
  } catch {
    return [];
  }
}

function loadData(): Category[] {
  const backupData = backupBooksData();
  const backupTotal = totalBooks(backupData);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        const storedData = normalizeData(parsed);
        // Apply the bundled backup only once — the first time we encounter
        // stored data that predates this backup. After that, the user's saved
        // data is authoritative; never clobber their edits/deletions just
        // because their library has fewer books than the static seed.
        const applied = localStorage.getItem(BOOKS_BACKUP_APPLIED_KEY) === BOOKS_BACKUP_SIGNATURE;
        if (backupTotal > 0 && !applied) {
          return backupData;
        }
        return storedData;
      }
    }
  } catch {
    /* fall through to backup/seed */
  }
  if (backupData.length) return backupData;
  return seededData();
}

export default function BooksPage() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [section, setSection] = useState<Section>("all");
  const [readFilter, setReadFilter] = useState("all");
  const [goatFilter, setGoatFilter] = useState("all");
  const [catInput, setCatInput] = useState("");
  const [bookInput, setBookInput] = useState("");
  const [search, setSearch] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);

  const [moral, setMoral] = useState<{ catId: string; bookId: string; title: string; text: string } | null>(null);

  const dragCat = useRef<string | null>(null);
  const dragBook = useRef<string | null>(null);

  useEffect(() => {
    // One-time migration cleanup for old category/tab keys; book data now comes from the backup payload.
    if (!localStorage.getItem(MIGRATION_KEY)) {
      try {
        localStorage.removeItem(CATEGORY_STORAGE_KEY);
        localStorage.removeItem("habit-rings-books-tabs-v2");
      } catch {
        /* ignore */
      }
      localStorage.setItem(MIGRATION_KEY, "1");
    }
    const d = loadData();
    setData(d);
    setActiveTab(d[0]?.id || "");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(BOOKS_BACKUP_APPLIED_KEY, BOOKS_BACKUP_SIGNATURE);
  }, [data, ready]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    []
  );

  const totalBooks = data.reduce((s, c) => s + c.books.length, 0);
  const totalRead = data.reduce((s, c) => s + c.books.filter((b) => b.read).length, 0);
  const totalGoat = data.reduce((s, c) => s + c.books.filter((b) => b.goat).length, 0);
  const totalUnread = totalBooks - totalRead;

  const activeCat = data.find((c) => c.id === activeTab) || null;

  // ── mutators ──
  const updateBook = (catId: string, bookId: string, patch: Partial<Book>) =>
    setData((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, books: c.books.map((b) => (b.id === bookId ? { ...b, ...patch } : b)) }
          : c
      )
    );

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = catInput.trim();
    if (!name) return;
    const cat = { id: uid(), name, books: [] };
    setData((prev) => [...prev, cat]);
    setActiveTab(cat.id);
    setCatInput("");
  };

  const deleteCategory = (id: string) => {
    const cat = data.find((c) => c.id === id);
    if (!cat) return;
    const msg =
      cat.books.length > 0
        ? `Delete "${cat.name}"? It has ${cat.books.length} book${cat.books.length > 1 ? "s" : ""}. This cannot be undone.`
        : `Delete "${cat.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    setData((prev) => prev.filter((c) => c.id !== id));
    if (activeTab === id) {
      const remaining = data.filter((c) => c.id !== id);
      setActiveTab(remaining[0]?.id || "");
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategory({ id: cat.id, name: cat.name });
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
  };

  const saveCategoryName = () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return;
    setData((prev) =>
      prev.map((cat) => (cat.id === editingCategory.id ? { ...cat, name } : cat))
    );
    setEditingCategory(null);
  };

  const addBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCat) return;
    const title = bookInput.trim();
    if (!title) return;
    setData((prev) =>
      prev.map((c) =>
        c.id === activeCat.id
          ? { ...c, books: [...c.books, { id: uid(), title, read: false, goat: false, moral: "" }] }
          : c
      )
    );
    setBookInput("");
  };

  const deleteBook = (catId: string, bookId: string) =>
    setData((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, books: c.books.filter((b) => b.id !== bookId) } : c))
    );

  const onDropCategory = (targetId: string) => {
    const src = dragCat.current;
    dragCat.current = null;
    if (!src || src === targetId) return;
    setData((prev) => {
      const next = [...prev];
      const from = next.findIndex((c) => c.id === src);
      const to = next.findIndex((c) => c.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const onDropBook = (targetId: string) => {
    const src = dragBook.current;
    dragBook.current = null;
    if (!src || src === targetId || !activeCat) return;
    setData((prev) =>
      prev.map((c) => {
        if (c.id !== activeCat.id) return c;
        const books = [...c.books];
        const from = books.findIndex((b) => b.id === src);
        const to = books.findIndex((b) => b.id === targetId);
        if (from < 0 || to < 0) return c;
        const [moved] = books.splice(from, 1);
        books.splice(to, 0, moved);
        return { ...c, books };
      })
    );
  };

  const saveMoral = () => {
    if (!moral) return;
    updateBook(moral.catId, moral.bookId, { moral: moral.text.trim() });
    setMoral(null);
  };

  // ── derived collections ──
  const allRead = data.flatMap((c) =>
    c.books.filter((b) => b.read).map((b) => ({ title: b.title, category: c.name, catId: c.id, bookId: b.id }))
  );
  const readCats = [...new Set(allRead.map((b) => b.category))];
  const readFiltered = readFilter === "all" ? allRead : allRead.filter((b) => b.category === readFilter);

  const allGoat = data.flatMap((c) =>
    c.books
      .filter((b) => b.goat)
      .map((b) => ({ title: b.title, category: c.name, catId: c.id, bookId: b.id, read: b.read, moral: b.moral }))
  );
  const goatCats = [...new Set(allGoat.map((b) => b.category))];
  const goatFiltered = goatFilter === "all" ? allGoat : allGoat.filter((b) => b.category === goatFilter);

  const searchTrim = search.trim().toLowerCase();
  const searchResults = searchTrim
    ? data.flatMap((c) =>
        c.books
          .filter((b) => b.title.toLowerCase().includes(searchTrim))
          .map((b) => ({ title: b.title, category: c.name, catId: c.id, bookId: b.id, read: b.read, goat: b.goat }))
      )
    : [];

  return (
    <div className="app-shell bklib-shell">
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

      <section className="bklib-hero glass">
        <div className="bklib-hero__copy">
          <span className="bklib-chip">Book Library</span>
          <h1>Books Library</h1>
        </div>
        <div className="bklib-hero__actions">
          <div className="bklib-top-tabs">
            <button
              className={`bklib-top-tab${section === "all" ? " active" : ""}`}
              type="button"
              onClick={() => setSection("all")}
            >
              <span className="bklib-top-tab__label">All Books</span>
              <span className="bklib-top-tab__value">{totalBooks}</span>
            </button>
            <button
              className={`bklib-top-tab${section === "read" ? " active" : ""}`}
              type="button"
              onClick={() => setSection("read")}
            >
              <span className="bklib-top-tab__label">Books Read</span>
              <span className="bklib-top-tab__value">{totalRead}</span>
            </button>
            <button
              className={`bklib-top-tab${section === "goat" ? " active" : ""}`}
              type="button"
              onClick={() => setSection("goat")}
            >
              <span className="bklib-top-tab__label">GOAT Books</span>
              <span className="bklib-top-tab__value">{totalGoat}</span>
            </button>
            <div className="bklib-top-stat" aria-label="Unread books">
              <span className="bklib-top-stat__label">Unread Books</span>
              <span className="bklib-top-stat__value">{totalUnread}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ALL BOOKS */}
      <section className="bklib-workspace glass bklib-all-section" hidden={section !== "all"}>
        <div style={{ marginBottom: 16 }}>
          <div className={`library-search-wrapper${searchTrim ? " has-query" : ""}`}>
            <span className="library-search-icon">🔍</span>
            <input
              className="library-search-input"
              type="text"
              placeholder="Search your entire library…"
              autoComplete="off"
              spellCheck={false}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearch("");
              }}
            />
            <button className="library-search-clear" type="button" title="Clear search" onClick={() => setSearch("")}>
              ×
            </button>
          </div>
          {searchTrim ? (
            <div className="library-search-results">
              {searchResults.length === 0 ? (
                <div className="library-search-not-found">
                  <strong>&ldquo;{search.trim()}&rdquo;</strong> was not found in your library.
                </div>
              ) : (
                <>
                  <div className="library-search-result-header">
                    Found <span className="library-search-result-count">{searchResults.length}</span> book
                    {searchResults.length !== 1 ? "s" : ""}
                  </div>
                  {searchResults.map((b) => (
                    <div
                      className="library-search-result"
                      key={b.bookId}
                      onClick={() => {
                        setActiveTab(b.catId);
                        setSection("all");
                        setSearch("");
                      }}
                    >
                      <span className="library-search-result__icon">{b.read ? "✅" : "📖"}</span>
                      <div className="library-search-result__body">
                        <div className="library-search-result__title">{b.title}</div>
                        <div className="library-search-result__meta">{b.category}</div>
                      </div>
                      <div className="library-search-result__badges">
                        <span
                          className={`library-search-badge library-search-badge--${b.read ? "read" : "unread"}`}
                        >
                          {b.read ? "Read" : "Unread"}
                        </span>
                        {b.goat ? (
                          <span className="library-search-badge library-search-badge--goat">★ GOAT</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="bklib-layout">
          <div className="bklib-sidebar">
            <form className="bklib-category-form" onSubmit={addCategory}>
              <input
                className="bklib-category-input"
                type="text"
                maxLength={80}
                placeholder="Add new category"
                autoComplete="off"
                value={catInput}
                onChange={(e) => setCatInput(e.target.value)}
              />
              <button className="bklib-category-add" type="submit">
                Add Category
              </button>
            </form>
            <div className="bklib-tabs">
              {data.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "10px 4px", lineHeight: 1.6 }}>
                  No categories yet.
                  <br />
                  Add one above to get started.
                </div>
              ) : (
                data.map((cat) => (
                  <div
                    key={cat.id}
                    className={`bklib-tab-row${cat.id === activeTab ? " active" : ""}${
                      editingCategory?.id === cat.id ? " is-editing" : ""
                    }`}
                    draggable={!editingCategory}
                    onDragStart={() => {
                      if (!editingCategory) dragCat.current = cat.id;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDropCategory(cat.id);
                    }}
                  >
                    {editingCategory?.id === cat.id ? (
                      <form
                        className="bklib-tab-edit-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveCategoryName();
                        }}
                      >
                        <input
                          className="bklib-tab-edit-input"
                          type="text"
                          maxLength={80}
                          autoComplete="off"
                          value={editingCategory.name}
                          autoFocus
                          onChange={(e) =>
                            setEditingCategory((current) =>
                              current ? { ...current, name: e.target.value } : current
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEditCategory();
                            }
                          }}
                        />
                        <button className="bklib-tab-save" type="submit" title="Save category">
                          Save
                        </button>
                        <button
                          className="bklib-tab-cancel"
                          type="button"
                          title="Cancel edit"
                          onClick={cancelEditCategory}
                        >
                          ×
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          className="bklib-tab-open"
                          type="button"
                          title="Double-click to rename"
                          onClick={() => setActiveTab(cat.id)}
                          onDoubleClick={() => startEditCategory(cat)}
                        >
                          <span className="bklib-tab__label">{cat.name}</span>
                          <span className="bklib-tab__meta">{cat.books.length}</span>
                        </button>
                        <span className="bklib-tab__drag">::</span>
                        <button
                          className="bklib-tab-delete"
                          type="button"
                          aria-label={`Delete ${cat.name}`}
                          title="Delete category"
                          onClick={() => deleteCategory(cat.id)}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bklib-main">
            <div className="bklib-panel">
              <div className="bklib-panel-header">
                <h2>{activeCat ? activeCat.name : "Select a category"}</h2>
                <div className="bklib-meta">
                  {activeCat
                    ? `${activeCat.books.length} book${activeCat.books.length !== 1 ? "s" : ""} · ${
                        activeCat.books.filter((b) => b.read).length
                      } read`
                    : ""}
                </div>
              </div>
              <div className="bklib-book-list">
                {activeCat?.books.map((book) => (
                  <div
                    key={book.id}
                    className={`bklib-book-item${book.read ? " is-read" : ""}${book.goat ? " is-goat" : ""}`}
                    draggable
                    onDragStart={() => (dragBook.current = book.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDropBook(book.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      className="bklib-book-check"
                      checked={book.read}
                      aria-label="Mark as read"
                      title={book.read ? "Mark as unread" : "Mark as read"}
                      onChange={(e) => updateBook(activeCat.id, book.id, { read: e.target.checked })}
                    />
                    <div className="bklib-book-body">
                      <span className="bklib-book-title">{book.title}</span>
                      {book.moral ? <span className="bklib-book-moral-preview">{book.moral}</span> : null}
                    </div>
                    {book.read ? (
                      <button
                        className={`bklib-book-moral-btn${book.moral ? " has-moral" : ""}`}
                        title={book.moral ? "Edit moral" : "Add moral"}
                        onClick={() =>
                          setMoral({ catId: activeCat.id, bookId: book.id, title: book.title, text: book.moral })
                        }
                      >
                        {book.moral ? "📝" : "+ Moral"}
                      </button>
                    ) : null}
                    <button
                      className={`bklib-book-goat-btn${book.goat ? " active" : ""}`}
                      title={book.goat ? "Remove from GOAT" : "Add to GOAT"}
                      onClick={() => updateBook(activeCat.id, book.id, { goat: !book.goat })}
                    >
                      {book.goat ? "★" : "☆"}
                    </button>
                    <button
                      className="bklib-book-delete"
                      title="Remove book"
                      aria-label={`Remove ${book.title}`}
                      onClick={() => deleteBook(activeCat.id, book.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {activeCat ? (
                <form className="bklib-add-book-form" onSubmit={addBook}>
                  <input
                    className="bklib-read-input"
                    type="text"
                    maxLength={120}
                    placeholder="Add a book title…"
                    autoComplete="off"
                    value={bookInput}
                    onChange={(e) => setBookInput(e.target.value)}
                  />
                  <button className="bklib-read-add" type="submit">
                    + Add
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* READ BOOKS */}
      <section className="bklib-workspace glass bklib-read-section" hidden={section !== "read"}>
        <div className="bklib-read-header">
          <h2>Read Books</h2>
          <span className="bklib-meta">
            {allRead.length} book{allRead.length !== 1 ? "s" : ""} read
          </span>
        </div>
        <div className="bklib-read-filters">
          <button
            className={`bklib-read-filter${readFilter === "all" ? " active" : ""}`}
            onClick={() => setReadFilter("all")}
          >
            <span>All</span>
            <span className="bklib-read-filter__count">{allRead.length}</span>
          </button>
          {readCats.map((cat) => (
            <button
              key={cat}
              className={`bklib-read-filter${readFilter === cat ? " active" : ""}`}
              onClick={() => setReadFilter(cat)}
            >
              <span>{cat}</span>
              <span className="bklib-read-filter__count">
                {allRead.filter((b) => b.category === cat).length}
              </span>
            </button>
          ))}
        </div>
        <div className="bklib-read-grid">
          {readFiltered.length === 0 ? (
            <div className="bklib-read-empty">
              {readFilter === "all"
                ? "No books marked as read yet. Check the checkbox next to a book in the All Books tab."
                : `No read books in "${readFilter}".`}
            </div>
          ) : (
            readFiltered.map((b) => (
              <div className="bklib-read-item" key={b.bookId}>
                <div className="bklib-read-item__top">
                  <div className="bklib-read-item__info">
                    <span className="bklib-read-item__title">{b.title}</span>
                    <span className="bklib-read-item__cat">{b.category}</span>
                  </div>
                  <button
                    className="bklib-read-unmark"
                    type="button"
                    title="Mark as unread"
                    onClick={() => updateBook(b.catId, b.bookId, { read: false })}
                  >
                    ↩ Unread
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* GOAT BOOKS */}
      <section className="bklib-workspace glass bklib-read-section bklib-goat-section" hidden={section !== "goat"}>
        <div className="bklib-read-header">
          <h2>GOAT Books</h2>
          <span className="bklib-meta">
            {allGoat.length} GOAT book{allGoat.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="bklib-read-filters">
          <button
            className={`bklib-read-filter${goatFilter === "all" ? " active" : ""}`}
            onClick={() => setGoatFilter("all")}
          >
            <span>All</span>
            <span className="bklib-read-filter__count">{allGoat.length}</span>
          </button>
          {goatCats.map((cat) => (
            <button
              key={cat}
              className={`bklib-read-filter${goatFilter === cat ? " active" : ""}`}
              onClick={() => setGoatFilter(cat)}
            >
              <span>{cat}</span>
              <span className="bklib-read-filter__count">
                {allGoat.filter((b) => b.category === cat).length}
              </span>
            </button>
          ))}
        </div>
        <div className="bklib-read-grid">
          {goatFiltered.length === 0 ? (
            <div className="bklib-goat-empty">
              {goatFilter === "all"
                ? "No GOAT books yet. Tap the ☆ button beside any book to add it here."
                : `No GOAT books in "${goatFilter}".`}
            </div>
          ) : (
            goatFiltered.map((b) => (
              <div
                className="bklib-read-item clickable-goat"
                key={b.bookId}
                onClick={() => setMoral({ catId: b.catId, bookId: b.bookId, title: b.title, text: b.moral })}
              >
                <div className="bklib-read-item__top">
                  <div className="bklib-read-item__info">
                    <span className="bklib-read-item__title">★ {b.title}</span>
                    <span className="bklib-read-item__cat">
                      {b.category}
                      {b.read ? " · Read" : ""}
                    </span>
                  </div>
                  <button
                    className="bklib-read-unmark"
                    type="button"
                    title="Remove from GOAT"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBook(b.catId, b.bookId, { goat: false });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Moral editor overlay */}
      <div
        className={`moral-editor-overlay${moral ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMoral(null);
        }}
      >
        <div className="moral-editor-panel">
          <div className="moral-editor-header">
            <div className="moral-editor-label">📝 Moral / Key Lesson</div>
            <button className="moral-editor-close" type="button" aria-label="Close" onClick={() => setMoral(null)}>
              ×
            </button>
          </div>
          <div className="moral-editor-title">{moral?.title}</div>
          <textarea
            className="moral-editor-textarea"
            placeholder="What's the key lesson or moral from this book?"
            spellCheck={false}
            value={moral?.text || ""}
            onChange={(e) => setMoral((m) => (m ? { ...m, text: e.target.value } : m))}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                saveMoral();
              }
              if (e.key === "Escape") setMoral(null);
            }}
          />
          <div className="moral-editor-footer">
            <span className="moral-editor-hint">Ctrl+Enter to save</span>
            <div className="moral-editor-actions">
              <button className="moral-editor-btn moral-editor-btn--ghost" type="button" onClick={() => setMoral(null)}>
                Cancel
              </button>
              <button className="moral-editor-btn moral-editor-btn--primary" type="button" onClick={saveMoral}>
                Save Moral
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
