"use client";

import { useEffect, useMemo, useState } from "react";
import NavChips from "../components/NavChips";
import { SEEDED_WORDS } from "./seedWords";
import "./english.css";

const STORAGE_KEY = "habit-rings-english-revision-v1";
const ACTIVE_KEY = "habit-rings-english-active-section";

type SectionKey = "words" | "scenarios" | "modals" | "rules";
interface FieldDef {
  id: string;
  label: string;
  type: "input" | "textarea";
  placeholder: string;
  required?: boolean;
}
interface SectionDef {
  label: string;
  title: string;
  hint: string;
  empty: string;
  fields: FieldDef[];
  exampleFields?: FieldDef[];
}
type Entry = Record<string, string | number | boolean> & { id: string };

const sections: Record<SectionKey, SectionDef> = {
  words: {
    label: "Words",
    title: "Words",
    hint: "Add words quickly. Use the examples toggle only when you want to attach three revision sentences.",
    empty: "No words yet. Add a word and a short meaning.",
    fields: [
      { id: "word", label: "Word", type: "input", placeholder: "e.g. inevitable", required: true },
      { id: "meaning", label: "Meaning", type: "input", placeholder: "Short meaning in your own words", required: true },
    ],
    exampleFields: [
      { id: "sentence1", label: "Sentence 1", type: "input", placeholder: "Simple sentence" },
      { id: "sentence2", label: "Sentence 2", type: "input", placeholder: "Work or daily-life sentence" },
      { id: "sentence3", label: "Sentence 3", type: "input", placeholder: "A question or conversation sentence" },
    ],
  },
  scenarios: {
    label: "Scenario / Live conversation",
    title: "Scenario / Live conversation",
    hint: "Store useful real-life conversations: interviews, meetings, calls, shops, travel, or difficult moments.",
    empty: "No scenarios yet. Add a situation and the lines you want to revise.",
    fields: [
      { id: "scenario", label: "Scenario", type: "input", placeholder: "e.g. Asking for project deadline", required: true },
      { id: "conversation", label: "Conversation / script", type: "textarea", placeholder: "A: Could you clarify the deadline?\nB: We need it by Friday.", required: true },
      { id: "takeaway", label: "Useful phrase", type: "input", placeholder: "e.g. Could you clarify...?" },
    ],
  },
  modals: {
    label: "Modal Verbs",
    title: "Modal Verbs",
    hint: "Revise can, could, may, might, must, should, would, have to, and similar structures by use case.",
    empty: "No modal verbs yet. Add one modal pattern with its use and examples.",
    fields: [
      { id: "modal", label: "Modal / pattern", type: "input", placeholder: "e.g. should have + V3", required: true },
      { id: "use", label: "Use", type: "input", placeholder: "e.g. regret or criticism about the past", required: true },
      { id: "examples", label: "Examples", type: "textarea", placeholder: "I should have called earlier.", required: true },
    ],
  },
  rules: {
    label: "Rules",
    title: "Rules",
    hint: "Keep grammar rules short: the rule, one clear pattern, and a quick example for revision.",
    empty: "No rules yet. Add a grammar rule you want to revisit.",
    fields: [
      { id: "rule", label: "Rule name", type: "input", placeholder: "e.g. Present perfect for experience", required: true },
      { id: "pattern", label: "Pattern", type: "input", placeholder: "Subject + have/has + V3", required: true },
      { id: "note", label: "Explanation and example", type: "textarea", placeholder: "Use it for life experience without exact time.", required: true },
    ],
  },
};

const SECTION_KEYS = Object.keys(sections) as SectionKey[];
const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const normalizeText = (v: unknown) => (v || "").toString().trim();

type AppState = Record<SectionKey, Entry[]>;

function createWordEntry(seed: string[]): Entry {
  const [word, meaning, sentence1, sentence2, sentence3] = seed;
  return { id: uid(), done: false, createdAt: Date.now(), word, meaning, sentence1, sentence2, sentence3 };
}

function mergeSeededWords(value: AppState): AppState {
  const current = Array.isArray(value.words) ? value.words : [];
  const known = new Set(current.map((i) => normalizeText(i.word).toLowerCase()));
  const missing = SEEDED_WORDS.filter((s) => !known.has(s[0].toLowerCase())).map(createWordEntry);
  return { ...value, words: [...current, ...missing] };
}

function starterState(): AppState {
  return {
    words: SEEDED_WORDS.map(createWordEntry),
    scenarios: [
      {
        id: uid(),
        done: false,
        createdAt: Date.now(),
        scenario: "Live meeting update",
        conversation:
          "A: Could you give me a quick update?\nB: I have finished the first part, but I need more time for testing.",
        takeaway: "Could you give me a quick update?",
      },
    ],
    modals: [
      {
        id: uid(),
        done: false,
        createdAt: Date.now(),
        modal: "could",
        use: "polite request or past ability",
        examples: "Could you review this sentence?\nWhen I was younger, I could memorize words quickly.",
      },
    ],
    rules: [
      {
        id: uid(),
        done: false,
        createdAt: Date.now(),
        rule: "Use examples, not only definitions",
        pattern: "Word + meaning + three sentences",
        note: "A word becomes easier to revise when it has context.",
      },
    ],
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return starterState();
    const loaded = SECTION_KEYS.reduce((acc, key) => {
      acc[key] = Array.isArray(parsed[key]) ? parsed[key] : [];
      return acc;
    }, {} as AppState);
    return mergeSeededWords(loaded);
  } catch {
    return starterState();
  }
}

const IconEye = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18" /><path d="M10.6 10.6a3 3 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a18.3 18.3 0 0 1-3.2 4.2" /><path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.2-.8" /></svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
const IconDelete = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

export default function EnglishPage() {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(() => ({ words: [], scenarios: [], modals: [], rules: [] }));
  const [activeSection, setActiveSection] = useState<SectionKey>("words");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openWordIds, setOpenWordIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [examplesOn, setExamplesOn] = useState(false);

  useEffect(() => {
    setState(loadState());
    const saved = localStorage.getItem(ACTIVE_KEY) as SectionKey | null;
    if (saved && sections[saved]) setActiveSection(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(ACTIVE_KEY, activeSection);
  }, [activeSection, ready]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    []
  );

  // Sync form fields when section/edit changes.
  useEffect(() => {
    const section = sections[activeSection];
    const editing = editingId ? state[activeSection].find((i) => i.id === editingId) : null;
    const next: Record<string, string> = {};
    section.fields.forEach((f) => (next[f.id] = String(editing?.[f.id] ?? "")));
    if (activeSection === "words") {
      section.exampleFields?.forEach((f) => (next[f.id] = String(editing?.[f.id] ?? "")));
      setExamplesOn(
        !!editing && ["sentence1", "sentence2", "sentence3"].some((k) => normalizeText(editing[k]))
      );
    }
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, editingId]);

  const section = sections[activeSection];
  const itemText = (item: Entry) => Object.values(item).join(" ").toLowerCase();
  const query = search.trim().toLowerCase();
  const items = (state[activeSection] || []).filter((i) => !query || itemText(i).includes(query));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setState((prev) => {
      const list = prev[activeSection];
      const base: Entry = editingId
        ? { ...(list.find((i) => i.id === editingId) as Entry) }
        : { id: uid(), done: false, createdAt: Date.now() };
      section.fields.forEach((f) => (base[f.id] = normalizeText(form[f.id])));
      if (activeSection === "words") {
        section.exampleFields?.forEach((f) => {
          base[f.id] = examplesOn ? normalizeText(form[f.id]) : "";
        });
      }
      base.updatedAt = Date.now();
      const nextList = editingId
        ? list.map((i) => (i.id === editingId ? base : i))
        : [base, ...list];
      return { ...prev, [activeSection]: nextList };
    });
    setEditingId(null);
  };

  const deleteItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      [activeSection]: prev[activeSection].filter((i) => i.id !== id),
    }));
    if (editingId === id) setEditingId(null);
  };

  const toggleWord = (id: string) =>
    setOpenWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderField = (f: FieldDef) =>
    f.type === "textarea" ? (
      <label className="english-field english-field--wide" key={f.id}>
        <span>{f.label}</span>
        <textarea
          className="english-textarea"
          placeholder={f.placeholder}
          required={f.required}
          value={form[f.id] || ""}
          onChange={(e) => setForm((p) => ({ ...p, [f.id]: e.target.value }))}
        />
      </label>
    ) : (
      <label className="english-field" key={f.id}>
        <span>{f.label}</span>
        <input
          className="english-input"
          type="text"
          placeholder={f.placeholder}
          required={f.required}
          value={form[f.id] || ""}
          onChange={(e) => setForm((p) => ({ ...p, [f.id]: e.target.value }))}
        />
      </label>
    );

  return (
    <div className="app-shell english-shell">
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

      <main className="english-main">
        <section className="english-hero glass">
          <div>
            <div className="english-eyebrow">Revision Lab</div>
            <h1>English practice</h1>
            <p>
              Build a personal revision bank for words, live conversations, modal verbs, and grammar
              rules.
            </p>
          </div>
          <div className="english-stats">
            {SECTION_KEYS.map((k) => (
              <div className="english-stat" key={k}>
                <span className="english-stat__label">{sections[k].label.split(" ")[0]}</span>
                <span className="english-stat__value">{state[k]?.length || 0}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="english-workspace glass">
          <aside className="english-sidebar">
            {SECTION_KEYS.map((k) => (
              <button
                key={k}
                className={`english-tab${k === activeSection ? " is-active" : ""}`}
                type="button"
                onClick={() => {
                  setActiveSection(k);
                  setEditingId(null);
                  setSearch("");
                }}
              >
                <span>{sections[k].label}</span>
                <span className="english-tab-count">{state[k]?.length || 0}</span>
              </button>
            ))}
          </aside>

          <section className="english-panel">
            <div className="english-panel__top">
              <div>
                <h2>{section.title}</h2>
                <p className="english-panel__hint">{section.hint}</p>
              </div>
              <input
                className="english-search"
                type="search"
                placeholder="Search revision..."
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <form className="english-form" onSubmit={submit}>
              {section.fields.map(renderField)}
              {activeSection === "words" ? (
                <>
                  <label className="english-example-toggle">
                    <input
                      type="checkbox"
                      checked={examplesOn}
                      onChange={(e) => setExamplesOn(e.target.checked)}
                    />
                    <span>Examples</span>
                  </label>
                  <button className="english-add" type="submit">
                    {editingId ? "Save" : "Add"}
                  </button>
                  {editingId ? (
                    <button
                      className="english-cancel-edit"
                      type="button"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <div className={`english-word-examples${examplesOn ? " is-open" : ""}`}>
                    {section.exampleFields?.map(renderField)}
                  </div>
                </>
              ) : (
                <>
                  <button className="english-add" type="submit">
                    {editingId ? "Save changes" : "Add to revision"}
                  </button>
                  {editingId ? (
                    <button
                      className="english-cancel-edit"
                      type="button"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </>
              )}
            </form>

            <div className={`english-list${activeSection === "words" ? " is-word-list" : ""}`}>
              {items.length === 0 ? (
                <div className="english-empty">{section.empty}</div>
              ) : activeSection === "words" ? (
                items.map((item) => {
                  const isOpen = openWordIds.has(item.id);
                  const hasExamples = ["sentence1", "sentence2", "sentence3"].some((k) =>
                    normalizeText(item[k])
                  );
                  return (
                    <article
                      className={`english-item english-word-row${isOpen ? " is-open" : ""}`}
                      key={item.id}
                    >
                      <div className="english-item__head">
                        <div className="english-word-summary">
                          <div className="english-item__title">{String(item.word)}</div>
                          <span className="english-item__tag">
                            {String(item.meaning || "Revision")}
                          </span>
                        </div>
                        <div className="english-actions">
                          {hasExamples ? (
                            <button
                              className="english-mini-btn"
                              type="button"
                              title={isOpen ? "Hide sentences" : "Show sentences"}
                              onClick={() => toggleWord(item.id)}
                            >
                              {isOpen ? <IconEyeOff /> : <IconEye />}
                            </button>
                          ) : null}
                          <button
                            className="english-mini-btn"
                            type="button"
                            title="Edit"
                            onClick={() => setEditingId(item.id)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            className="english-mini-btn"
                            type="button"
                            title="Delete"
                            onClick={() => deleteItem(item.id)}
                          >
                            <IconDelete />
                          </button>
                        </div>
                      </div>
                      <ol className="english-sentences">
                        {["sentence1", "sentence2", "sentence3"]
                          .filter((k) => normalizeText(item[k]))
                          .map((k) => (
                            <li key={k}>{String(item[k])}</li>
                          ))}
                      </ol>
                    </article>
                  );
                })
              ) : (
                items.map((item) => {
                  const [titleKey, tagKey, bodyKey] =
                    activeSection === "scenarios"
                      ? ["scenario", "takeaway", "conversation"]
                      : activeSection === "modals"
                      ? ["modal", "use", "examples"]
                      : ["rule", "pattern", "note"];
                  return (
                    <article className="english-item" key={item.id}>
                      <div className="english-item__head">
                        <div>
                          <div className="english-item__title">{String(item[titleKey])}</div>
                          <span className="english-item__tag">
                            {String(item[tagKey] || "Revision")}
                          </span>
                        </div>
                        <div className="english-actions">
                          <button
                            className="english-mini-btn"
                            type="button"
                            title="Edit"
                            onClick={() => setEditingId(item.id)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            className="english-mini-btn"
                            type="button"
                            title="Delete"
                            onClick={() => deleteItem(item.id)}
                          >
                            <IconDelete />
                          </button>
                        </div>
                      </div>
                      <div className="english-item__body">{String(item[bodyKey])}</div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
