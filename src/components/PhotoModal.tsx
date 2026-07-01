"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";
import { labelFor } from "@/components/PhotoUploadModal";
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
  onClose: () => void;
  onCaptionSaved?: (id: string, caption: string) => void;
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
  onClose,
  onCaptionSaved,
  onReactionChange,
}: PhotoModalProps) {
  const user = useCurrentUser();
  const { signedIn } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [caption, setCaption] = useState(photo.caption || "");
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(photo.caption || "");
  const bodyRef = useRef<HTMLDivElement>(null);

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
              <div className="pm-name">{photo.uploader?.short_name || "—"}</div>
              <div className="pm-date">{shortDate(photo.created_at)}</div>
            </div>
            {photo.category && <span className="pm-cat">{labelFor(photo.category)}</span>}
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
                <b>{photo.uploader?.short_name || "—"}</b> {caption}
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
            <form className="pm-footer" onSubmit={addComment}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
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
