"use client";

import { useEffect, useMemo, useState } from "react";
import NavChips from "../components/NavChips";
import "./quotes.css";

const QUOTES_STORAGE_KEY = "habit-rings-custom-quotes";
const DEFAULT_CATEGORY = "General";

interface Quote {
  text: string;
  author: string;
  category: string;
}

const DEFAULT_QUOTES: Quote[] = [
  {
    text: "The harder I work, the more luck I seem to have.",
    author: "Thomas Jefferson",
    category: "Hard Work",
  },
  {
    text: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
    category: "Success",
  },
  {
    text: "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun",
    category: "Motivation",
  },
];

// Older stored quotes may not have a category — normalize on load.
function normalizeQuote(raw: unknown): Quote | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Partial<Quote>;
  if (typeof q.text !== "string") return null;
  return {
    text: q.text,
    author: typeof q.author === "string" ? q.author : "",
    category:
      typeof q.category === "string" && q.category.trim()
        ? q.category.trim()
        : DEFAULT_CATEGORY,
  };
}

const ALL_FILTER = "All";

export default function QuotesPage() {
  const [ready, setReady] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>(DEFAULT_QUOTES);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL_FILTER);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map(normalizeQuote)
            .filter((q): q is Quote => q !== null);
          setQuotes(normalized);
        }
      }
    } catch {
      /* keep defaults */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
  }, [quotes, ready]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((q) => set.add(q.category || DEFAULT_CATEGORY));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [quotes]);

  const visibleQuotes = useMemo(() => {
    if (activeCategory === ALL_FILTER) {
      return quotes.map((q, idx) => ({ q, idx }));
    }
    return quotes
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => (q.category || DEFAULT_CATEGORY) === activeCategory);
  }, [quotes, activeCategory]);

  const addQuote = () => {
    const t = text.trim();
    if (!t) return;
    setQuotes((prev) => [
      {
        text: t,
        author: author.trim(),
        category: category.trim() || DEFAULT_CATEGORY,
      },
      ...prev,
    ]);
    setText("");
    setAuthor("");
    setCategory("");
  };

  const deleteQuote = (idx: number) => {
    if (!confirm("Delete this quote?")) return;
    setQuotes((prev) => prev.filter((_, i) => i !== idx));
  };

  const editQuote = (idx: number) => {
    const q = quotes[idx];
    const newText = prompt("Edit quote:", q.text);
    if (newText === null) return;
    const newAuthor = prompt("Edit author:", q.author) ?? "";
    const newCategory = prompt("Edit category:", q.category) ?? "";
    setQuotes((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              text: newText,
              author: newAuthor,
              category: newCategory.trim() || DEFAULT_CATEGORY,
            }
          : item
      )
    );
  };

  return (
    <div className="app-shell quotes-shell">
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

      <section className="quotes-hero glass">
        <div className="quotes-hero__copy">
          <span className="tech-chip">Inspiration Library</span>
          <h1>Quotes &amp; Wisdom</h1>
        </div>
      </section>

      <section className="quotes-workspace glass">
        <div className="add-quote-form">
          <div className="form-header">Add New Quote</div>
          <div className="inputs-row">
            <textarea
              className="quote-input"
              placeholder="Enter quote text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <input
              className="author-input"
              placeholder="Author (optional)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <input
              className="category-input"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="quote-category-options"
            />
            <datalist id="quote-category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <button className="submit-quote-btn" onClick={addQuote}>
            Save Quote
          </button>
        </div>

        <div className="category-filter">
          <button
            className={`category-chip${
              activeCategory === ALL_FILTER ? " category-chip--active" : ""
            }`}
            onClick={() => setActiveCategory(ALL_FILTER)}
          >
            All
            <span className="category-chip__count">{quotes.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`category-chip${
                activeCategory === c ? " category-chip--active" : ""
              }`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
              <span className="category-chip__count">
                {quotes.filter((q) => (q.category || DEFAULT_CATEGORY) === c).length}
              </span>
            </button>
          ))}
        </div>

        <div className="quotes-grid">
          {visibleQuotes.map(({ q, idx }) => (
            <div className="quote-card" key={idx}>
              <span className="quote-category">{q.category || DEFAULT_CATEGORY}</span>
              <div className="quote-text">&ldquo;{q.text}&rdquo;</div>
              <div className="quote-author">— {q.author || "Unknown"}</div>
              <div className="quote-actions">
                <button className="quote-btn" onClick={() => editQuote(idx)}>
                  Edit
                </button>
                <button
                  className="quote-btn quote-btn--delete"
                  onClick={() => deleteQuote(idx)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {visibleQuotes.length === 0 && (
            <div className="quotes-empty">No quotes in this category yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
