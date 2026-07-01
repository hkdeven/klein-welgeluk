"use client";

import { useEffect, useState } from "react";
import { tagColor } from "@/lib/tagColor";

interface Props {
  pageId?: string; // page-specific; omit for the whole-project roll-up
  showSource?: boolean; // show the source-page tag (overview)
  canAdd?: boolean;
  canDelete?: boolean;
  authorId?: string;
  className?: string;
}

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

export default function DecisionLog({
  pageId,
  showSource,
  canAdd,
  canDelete,
  authorId,
  className,
}: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const q = pageId ? `?page_id=${pageId}` : "";
    fetch(`/api/decisions${q}`)
      .then((r) => r.json())
      .then((d) => setItems(d.decisions || []))
      .catch(() => {});
  }, [pageId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, detail, page_id: pageId || null, author_id: authorId }),
    });
    if (res.ok) {
      const d = await res.json();
      setItems((prev) => [d, ...prev]);
      setTitle("");
      setDetail("");
      setAdding(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Remove this decision?")) return;
    setItems((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/decisions?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className={`fold ${className || ""}`}>
      <div className="fold-head" onClick={() => setOpen((o) => !o)}>
        <span className="chev">{open ? "▾" : "▸"}</span>
        <span className="fold-title">Decision log</span>
        <span className="fold-count">{items.length}</span>
        <span className="fold-lock">hidden from guests</span>
      </div>
      {open && (
        <div className="fold-body">
          {items.length === 0 ? (
            <div className="fold-empty">No decisions logged yet.</div>
          ) : (
            items.map((d) => {
              const tc = showSource && d.page?.title ? tagColor(d.page.title) : null;
              return (
                <div className="dec-row" key={d.id}>
                  <div className="body">
                    <div className="d-title">
                      <b>{d.title}</b>
                    </div>
                    {d.detail && <div className="d-detail">{d.detail}</div>}
                    <div className="d-meta">
                      <span>
                        {d.author?.short_name || "—"} · {fmt(d.created_at)}
                      </span>
                      {tc && (
                        <span
                          style={{
                            background: tc.background,
                            color: tc.color,
                            borderColor: tc.borderColor,
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderRadius: 3,
                            padding: "0 6px",
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 10,
                          }}
                        >
                          {d.page.title}
                        </span>
                      )}
                    </div>
                  </div>
                  {canDelete && (
                    <button className="dec-del" onClick={() => del(d.id)}>
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
          {canAdd &&
            (adding ? (
              <form
                className="fold-form"
                onSubmit={add}
                style={{ flexDirection: "column", alignItems: "stretch" }}
              >
                <input
                  autoFocus
                  placeholder="What was decided?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  placeholder="Why / details (optional)"
                  rows={2}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="save">
                    Log decision
                  </button>
                  <button type="button" className="cancel" onClick={() => setAdding(false)}>
                    cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="fold-add" onClick={() => setAdding(true)}>
                + log a decision
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
