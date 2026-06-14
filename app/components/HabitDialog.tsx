"use client";

import { useEffect, useRef, useState } from "react";
import { useHabits } from "../lib/HabitContext";

export default function HabitDialog({
  editingId,
  open,
  onClose,
}: {
  editingId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { state, saveHabit, deleteHabit } = useHabits();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [subtasks, setSubtasks] = useState("");
  const [priority, setPriority] = useState(false);
  const [target, setTarget] = useState("3");

  // Load values whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const habit = editingId ? state.habits.find((h) => h.id === editingId) : null;
    setName(habit?.name ?? "");
    setCategory(habit?.category ?? "");
    setDescription(habit?.description ?? "");
    setSubtasks(habit?.subtasks?.map((s) => s.text).join("\n") ?? "");
    setPriority(habit?.priority ?? false);
    setTarget(String(habit?.targetPerWeek ?? 3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  const categories = Array.from(
    new Set(state.habits.map((h) => h.category).filter(Boolean))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsed = parseInt(target, 10);
    const targetPerWeek = Number.isNaN(parsed) ? 3 : Math.min(7, Math.max(1, parsed));
    const subtaskTexts = subtasks
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    saveHabit(
      {
        name: trimmed,
        category: category || "Other",
        description: description.trim(),
        subtaskTexts,
        targetPerWeek,
        priority,
      },
      editingId
    );
    onClose();
  };

  const handleDelete = () => {
    if (editingId) deleteHabit(editingId);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="habit-dialog"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="habit-dialog-panel">
        <form className="habit-dialog-body" noValidate onSubmit={handleSubmit}>
          <h3 id="habit-dialog-title">{editingId ? "Edit Habit" : "New Habit"}</h3>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Morning run"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Category</span>
            <input
              type="text"
              list="habit-category-suggestions"
              placeholder="e.g. Health, Mind, Work…"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="habit-category-suggestions">
              {categories.map((c) => (
                <option value={c} key={c} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <textarea
              rows={2}
              maxLength={140}
              placeholder="Short description or intention for this habit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Subtasks (one per line, optional)</span>
            <textarea
              rows={3}
              maxLength={400}
              placeholder={"e.g. Warm up\nWorkout\nCool down"}
              value={subtasks}
              onChange={(e) => setSubtasks(e.target.value)}
            />
          </label>
          <label
            className="field"
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <input
              type="checkbox"
              style={{ width: "max-content", margin: 0 }}
              checked={priority}
              onChange={(e) => setPriority(e.target.checked)}
            />
            <span>High Priority</span>
          </label>
          <label className="field">
            <span>Minimum times per week</span>
            <input
              type="number"
              min={1}
              max={7}
              step={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            {editingId ? (
              <button
                className="btn btn-ghost danger"
                type="button"
                onClick={handleDelete}
              >
                Delete
              </button>
            ) : null}
            <button className="btn btn-primary" type="submit">
              Save
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
