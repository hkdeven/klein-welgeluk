"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";
import { labelFor, PHOTO_CATEGORIES } from "@/components/PhotoUploadModal";
import PhotoReactions from "@/components/PhotoReactions";

interface ModalPhoto {
  id: string;
  caption?: string | null;
  category?: string | null;
  created_at?: string;
  uploader?: { short_name?: string; avatar_url?: string | null } | null;
}

interface PhotoModalProps {
  photo: ModalPhoto;
  url: string;
  canEdit?: boolean;
  categories?: string[];
  onClose: () => void;
  onCaptionSaved?: (id: string, caption: string) => void;
  onCategorySaved?: (id: string, category: string) => void;
  onReactionChange?: () => void;
}

const shortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";

function Avatar({ name, url, size = 30 }: { name?: string; url?: string | null; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#2F4030",
        color: "#fff",
        fontSize: size < 28 ? 10 : 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flex: "none",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        (name?.charAt(0) || "?").toUpperCase()
      )}
    </span>
  );
}

export default function PhotoModal({
  photo,
  url,
  canEdit,
  categories = PHOTO_CATEGORIES,
  onClose,
  onCaptionSaved,
  onCategorySaved,
  onReactionChange,
}: PhotoModalProps) {
  const user = useCurrentUser();
  const { signedIn } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [caption, setCaption] = useState(photo.caption || "");
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(photo.caption || "");
  const [category, setCategory] = useState(photo.category || "");
  const [editingCat, setEditingCat] = useState(false);
  const [newTagMode, setNewTagMode] = useState(false);
  const [customCat, setCustomCat] = useState("");
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [mention, setMention] = useState<{ items: any[]; index: number; start: number } | null>(
    null
  );
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setMentionUsers(d.users || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/comments?photo_id=${photo.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setComments(d.comments || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [photo.id]);

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    setNewComment("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_id: photo.id, body: text, author_id: user.id }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 50);
      }
    } catch {
      /* ignore */
    }
  };

  // @mention autocomplete for the comment input.
  const onCommentChange = (value: string, caret: number) => {
    setNewComment(value);
    const before = value.slice(0, caret);
    const m = before.match(/(^|\s)@(\w*)$/);
    if (!m || !mentionUsers.length) return setMention(null);
    const q = m[2].toLowerCase();
    const items = mentionUsers
      .filter(
        (u) =>
          u.short_name?.toLowerCase().startsWith(q) ||
          u.display_name?.toLowerCase().startsWith(q)
      )
      .slice(0, 6);
    if (!items.length) return setMention(null);
    setMention({ items, index: 0, start: caret - m[2].length - 1 });
  };

  const pickMention = (u: any) => {
    if (!mention) return;
    const caret = inputRef.current?.selectionStart ?? newComment.length;
    const before = newComment.slice(0, mention.start);
    const after = newComment.slice(caret);
    const inserted = `@${u.short_name} `;
    setNewComment(before + inserted + after);
    setMention(null);
    const pos = before.length + inserted.length;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  };

  const onCommentKeyDown = (e: React.KeyboardEvent) => {
    if (!mention) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMention({ ...mention, index: (mention.index + 1) % mention.items.length });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMention({
        ...mention,
        index: (mention.index - 1 + mention.items.length) % mention.items.length,
      });
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pickMention(mention.items[mention.index]);
    } else if (e.key === "Escape") {
      setMention(null);
    }
  };

  const closeCatEditor = () => {
    setEditingCat(false);
    setNewTagMode(false);
    setCustomCat("");
  };

  const saveCategory = async (value: string) => {
    const cat = value.trim();
    closeCatEditor();
    if (!cat || cat === category) return;
    setCategory(cat);
    onCategorySaved?.(photo.id, cat);
    try {
      await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
    } catch {
      /* ignore */
    }
  };

  const saveCaption = async () => {
    setEditingCaption(false);
    setCaption(captionDraft);
    onCaptionSaved?.(photo.id, captionDraft);
    try {
      await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: captionDraft }),
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="pm-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={caption || ""} />
        </div>
        <div className="pm-panel">
          <div className="pm-head">
            <Avatar name={photo.uploader?.short_name} url={photo.uploader?.avatar_url} />
            <div style={{ minWidth: 0 }}>
              <div className="pm-name">{photo.uploader?.short_name || "-"}</div>
              <div className="pm-date">{shortDate(photo.created_at)}</div>
            </div>
            {editingCat && canEdit ? (
              <span className="pm-cat-edit">
                <select
                  autoFocus={!newTagMode}
                  value={newTagMode ? "__new__" : category}
                  onChange={(e) => {
                    if (e.target.value === "__new__") setNewTagMode(true);
                    else saveCategory(e.target.value);
                  }}
                >
                  {Array.from(new Set([...categories, ...(category ? [category] : [])])).map(
                    (c) => (
                      <option key={c} value={c}>
                        {labelFor(c)}
                      </option>
                    )
                  )}
                  <option value="__new__">+ New tag…</option>
                </select>
                {newTagMode && (
                  <input
                    autoFocus
                    type="text"
                    value={customCat}
                    placeholder="New tag"
                    onChange={(e) => setCustomCat(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveCategory(customCat);
                      if (e.key === "Escape") closeCatEditor();
                    }}
                    onBlur={() => saveCategory(customCat)}
                  />
                )}
                <button type="button" className="pm-cancel" onClick={closeCatEditor}>
                  cancel
                </button>
              </span>
            ) : canEdit ? (
              <button
                type="button"
                className="pm-cat pm-cat-btn"
                title="Change tag"
                onClick={() => setEditingCat(true)}
              >
                {category ? labelFor(category) : "+ tag"} ▾
              </button>
            ) : (
              category && <span className="pm-cat">{labelFor(category)}</span>
            )}
          </div>

          <div className="pm-body" ref={bodyRef}>
            {editingCaption ? (
              <div className="pm-caption-edit">
                <textarea
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="pm-caption-actions">
                  <button className="pm-save" onClick={saveCaption}>
                    Save
                  </button>
                  <button
                    className="pm-cancel"
                    onClick={() => {
                      setEditingCaption(false);
                      setCaptionDraft(caption);
                    }}
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : caption ? (
              <div className="pm-caption">
                <b>{photo.uploader?.short_name || "-"}</b> {caption}
                {canEdit && (
                  <button className="pm-edit" onClick={() => setEditingCaption(true)}>
                    edit
                  </button>
                )}
              </div>
            ) : canEdit ? (
              <div className="pm-caption">
                <button
                  className="pm-edit"
                  style={{ marginLeft: 0 }}
                  onClick={() => setEditingCaption(true)}
                >
                  + add caption
                </button>
              </div>
            ) : null}

            <div className="pm-comments">
              {comments.length === 0 ? (
                <div className="pm-empty">No comments yet.</div>
              ) : (
                comments.map((c) => (
                  <div className="pm-comment" key={c.id}>
                    <Avatar name={c.author?.short_name} url={c.author?.avatar_url} size={24} />
                    <div className="pm-comment-text">
                      <b>{c.author?.short_name || "Unknown"}</b> {c.body}
                      <span className="pm-comment-when">{shortDate(c.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pm-reactions-bar">
            <PhotoReactions photoId={photo.id} onChange={onReactionChange} />
          </div>

          {signedIn ? (
            <form className="pm-footer" onSubmit={addComment} style={{ position: "relative" }}>
              {mention && (
                <ul className="pm-mention">
                  {mention.items.map((u, i) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={i === mention.index ? "active" : ""}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickMention(u);
                        }}
                      >
                        <b>@{u.short_name}</b>
                        {u.display_name && u.display_name !== u.short_name && (
                          <span> · {u.display_name}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={inputRef}
                value={newComment}
                onChange={(e) => onCommentChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyDown={onCommentKeyDown}
                placeholder="Add a comment… (@ to tag)"
              />
              <button type="submit" disabled={!newComment.trim()}>
                Post
              </button>
            </form>
          ) : (
            <div className="pm-footer pm-footer-note">Guests can view but not comment or react.</div>
          )}
        </div>
      </div>
    </div>
  );
}
