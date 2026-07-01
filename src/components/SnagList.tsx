"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/AuthProvider";
import PhotoModal from "@/components/PhotoModal";
import { uploadToStorage, sanitizeName } from "@/lib/upload";

const photoUrl = (p: any) =>
  p.external_url ||
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${p.storage_path}`;

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

interface Props {
  pageId: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function SnagList({ pageId, canEdit, canDelete }: Props) {
  const me = useCurrentUser();
  const isOwner = me.role === "owner";
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [modalPhoto, setModalPhoto] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/snags?page_id=${pageId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.snags || []))
      .catch(() => {});
  }, [pageId]);

  const openCount = items.filter((s) => !s.is_fixed).length;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/snags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id: pageId, title, note }),
    });
    if (res.ok) {
      const s = await res.json();
      setItems((prev) => [...prev, s]);
      setTitle("");
      setNote("");
      setAdding(false);
    }
  };

  const toggle = async (s: any) => {
    const nowFixed = !s.is_fixed;
    setItems((prev) =>
      prev.map((x) =>
        x.id === s.id
          ? {
              ...x,
              is_fixed: nowFixed,
              fixed_at: nowFixed ? new Date().toISOString() : null,
              fixer: nowFixed ? { short_name: me.short_name } : null,
            }
          : x
      )
    );
    await fetch("/api/snags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, is_fixed: nowFixed, user_id: me.id }),
    }).catch(() => {});
  };

  // Snag photos are real photo rows, so they open in the full viewer with comments.
  const attachPhoto = async (s: any, file: File) => {
    const path = `photos/${pageId}/snag_${s.id}_${Date.now()}_${sanitizeName(file.name)}`;
    await uploadToStorage("photos", path, file);
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id: pageId, storage_path: path, caption: s.title, uploaded_by: me.id }),
    });
    if (!res.ok) return;
    const photo = await res.json();
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, photo_id: photo.id, photo } : x)));
    await fetch("/api/snags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, photo_id: photo.id }),
    }).catch(() => {});
  };

  const del = async (id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/snags?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="fold">
      <div className="fold-head" onClick={() => setOpen((o) => !o)}>
        <span className="chev">{open ? "▾" : "▸"}</span>
        <span className="fold-title">Snag list</span>
        <span className="fold-count">{openCount} open</span>
        <span className="fold-lock">hidden from guests</span>
      </div>
      {open && (
        <div className="fold-body">
          {items.length === 0 ? (
            <div className="fold-empty">No snags logged — nice and clean.</div>
          ) : (
            items.map((s) => (
              <div className="snag-row" key={s.id}>
                <input
                  type="checkbox"
                  checked={s.is_fixed}
                  disabled={!canEdit}
                  onChange={() => toggle(s)}
                />
                <span className={`txt ${s.is_fixed ? "done" : ""}`}>
                  {s.title}
                  {s.note && <small> · {s.note}</small>}
                  {s.is_fixed && (
                    <em className="fixed-meta">
                      {" · fixed"}
                      {s.fixer?.short_name ? ` by ${s.fixer.short_name}` : ""}
                      {s.fixed_at ? ` · ${fmtDate(s.fixed_at)}` : ""}
                    </em>
                  )}
                </span>
                {s.photo ? (
                  <button className="snag-thumb" onClick={() => setModalPhoto(s.photo)} title="View photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl(s.photo)} alt="" />
                  </button>
                ) : (
                  canEdit && (
                    <label className="snag-cam" title="Attach photo">
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) attachPhoto(s, f);
                          e.target.value = "";
                        }}
                      />
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="14" height="10" rx="2" />
                        <circle cx="10" cy="11" r="2.4" />
                        <path d="M7.5 6l1.2-1.8h2.6L12.5 6" />
                      </svg>
                    </label>
                  )
                )}
                {canDelete && (
                  <button className="dec-del" onClick={() => del(s.id)}>
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
          {canEdit &&
            (adding ? (
              <form
                className="fold-form"
                onSubmit={add}
                style={{ flexDirection: "column", alignItems: "stretch" }}
              >
                <input
                  autoFocus
                  placeholder="Snag (e.g. chip in bath enamel)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  placeholder="Note / location (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="save">
                    Add snag
                  </button>
                  <button type="button" className="cancel" onClick={() => setAdding(false)}>
                    cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="fold-add" onClick={() => setAdding(true)}>
                + add snag
              </button>
            ))}
        </div>
      )}

      {modalPhoto && (
        <PhotoModal
          photo={modalPhoto}
          url={photoUrl(modalPhoto)}
          canEdit={isOwner}
          onClose={() => setModalPhoto(null)}
          onCaptionSaved={(id, caption) =>
            setItems((prev) =>
              prev.map((x) => (x.photo?.id === id ? { ...x, photo: { ...x.photo, caption } } : x))
            )
          }
        />
      )}
    </div>
  );
}
