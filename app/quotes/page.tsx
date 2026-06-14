"use client";

import { useEffect, useMemo, useState } from "react";
import NavChips from "../components/NavChips";
import "./quotes.css";

const QUOTES_STORAGE_KEY = "habit-rings-custom-quotes";

interface Quote {
  text: string;
  author: string;
}

const DEFAULT_QUOTES: Quote[] = [
  { text: "The harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  {
    text: "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun",
  },
];

export default function QuotesPage() {
  const [ready, setReady] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>(DEFAULT_QUOTES);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setQuotes(parsed);
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

  const addQuote = () => {
    const t = text.trim();
    if (!t) return;
    setQuotes((prev) => [{ text: t, author: author.trim() }, ...prev]);
    setText("");
    setAuthor("");
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
    setQuotes((prev) =>
      prev.map((item, i) => (i === idx ? { text: newText, author: newAuthor } : item))
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
          </div>
          <button className="submit-quote-btn" onClick={addQuote}>
            Save Quote
          </button>
        </div>

        <div className="quotes-grid">
          {quotes.map((q, idx) => (
            <div className="quote-card" key={idx}>
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
        </div>
      </section>
    </div>
  );
}
