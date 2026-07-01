"use client";

import { useEffect, useState } from "react";

type Mode = "month" | "date" | "range";

const sortMs = (a: any, b: any) => {
  if (!a.milestone_date) return 1;
  if (!b.milestone_date) return -1;
  return a.milestone_date.localeCompare(b.milestone_date);
};

const fmtDay = (d: string, withYear = true) =>
  new Date(d).toLocaleDateString(
    undefined,
    withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" }
  );

const fmtMilestone = (m: any) => {
  if (!m.milestone_date) return "TBD";
  if (m.precision === "month") {
    return new Date(m.milestone_date).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  if (m.precision === "range" && m.end_date) {
    const sameYear =
      new Date(m.milestone_date).getFullYear() === new Date(m.end_date).getFullYear();
    return `${fmtDay(m.milestone_date, !sameYear)} – ${fmtDay(m.end_date)}`;
  }
  return fmtDay(m.milestone_date);
};

const DONE = { label: "done", dot: "#639922", bg: "#EAF3DE", fg: "#3B6D11" };
const NEXT = { label: "next", dot: "#B5824A", bg: "#FAEEDA", fg: "#854F0B" };
const NOW = { label: "in progress", dot: "#B5824A", bg: "#FAEEDA", fg: "#854F0B" };
const UPCOMING = { label: "upcoming", dot: "#D3D1C7", bg: "#F1EFE8", fg: "#5F5E5A" };
const TARGET = { label: "target", dot: "#D3D1C7", bg: "#F1EFE8", fg: "#5F5E5A" };

export default function MilestonesSection({
  canEdit,
  canDelete,
}: {
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    fetch("/api/milestones")
      .then((r) => r.json())
      .then((d) => setItems(d.milestones || []))
      .catch(() => {});
  }, []);

  const reset = () => {
    setTitle("");
    setMonth("");
    setStart("");
    setEnd("");
    setMode("month");
    setAdding(false);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    let milestone_date: string | null = null;
    let end_date: string | null = null;
    if (mode === "month") milestone_date = month ? `${month}-01` : null;
    else if (mode === "date") milestone_date = start || null;
    else {
      milestone_date = start || null;
      end_date = end || null;
    }
    const res = await fetch("/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, milestone_date, end_date, precision: mode }),
    });
    if (res.ok) {
      const m = await res.json();
      setItems((prev) => [...prev, m].sort(sortMs));
      reset();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Remove this milestone?")) return;
    setItems((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/milestones?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextId = items.find((m) => m.milestone_date && new Date(m.milestone_date) >= today)?.id;

  const statusOf = (m: any) => {
    if (!m.milestone_date) return TARGET;
    const s = new Date(m.milestone_date);
    s.setHours(0, 0, 0, 0);
    if (m.precision === "range" && m.end_date) {
      const eDate = new Date(m.end_date);
      eDate.setHours(0, 0, 0, 0);
      if (eDate < today) return DONE;
      if (s <= today && today <= eDate) return NOW;
      return m.id === nextId ? NEXT : UPCOMING;
    }
    if (s < today) return DONE;
    return m.id === nextId ? NEXT : UPCOMING;
  };

  const MODES: { key: Mode; label: string }[] = [
    { key: "month", label: "Month" },
    { key: "date", label: "Exact date" },
    { key: "range", label: "Range" },
  ];

  return (
    <div className="fold">
      <div className="fold-head" onClick={() => setOpen((o) => !o)}>
        <span className="chev">{open ? "▾" : "▸"}</span>
        <span className="fold-title">Milestones</span>
        <span className="fold-count">{items.length}</span>
        <span className="fold-lock">hidden from guests</span>
      </div>
      {open && (
        <div className="fold-body">
          {items.length === 0 ? (
            <div className="fold-empty">No milestones yet.</div>
          ) : (
            <div className="ms-line">
              {items.map((m) => {
                const st = statusOf(m);
                return (
                  <div className="ms-row" key={m.id}>
                    <span className="dot" style={{ background: st.dot }} />
                    <span className="date">{fmtMilestone(m)}</span>
                    <span className="label">{m.title}</span>
                    <span className="status" style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                    {canDelete && (
                      <button className="ms-del" onClick={() => del(m.id)}>
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {canEdit &&
            (adding ? (
              <form className="fold-form" onSubmit={add} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <input
                  autoFocus
                  placeholder="Milestone (e.g. Roof on)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="ms-modes">
                  {MODES.map((mm) => (
                    <button
                      type="button"
                      key={mm.key}
                      className={mode === mm.key ? "active" : ""}
                      onClick={() => setMode(mm.key)}
                    >
                      {mm.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {mode === "month" && (
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                  )}
                  {mode === "date" && (
                    <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  )}
                  {mode === "range" && (
                    <>
                      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                      <span style={{ color: "var(--mist)" }}>to</span>
                      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                    </>
                  )}
                  <button type="submit" className="save">
                    Add
                  </button>
                  <button type="button" className="cancel" onClick={reset}>
                    cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="fold-add" onClick={() => setAdding(true)}>
                + add milestone
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
