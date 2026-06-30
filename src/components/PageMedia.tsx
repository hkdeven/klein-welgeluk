"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import DocUploadModal from "@/components/DocUploadModal";
import PhotoUploadModal, {
  PHOTO_CATEGORIES,
  labelFor,
} from "@/components/PhotoUploadModal";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";
import { useEditMode } from "@/components/EditModeContext";
import { uploadToStorage, sanitizeName } from "@/lib/upload";

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

const photoUrlOf = (p: any) =>
  p.external_url || storageUrl(`photos/${p.storage_path}`);

interface PageMediaProps {
  pageId: string | null;
  user: { id: string; short_name: string };
  defaultCategory?: string;
}

export default function PageMedia({ pageId, user, defaultCategory }: PageMediaProps) {
  const toast = useToast();
  const { canWrite } = useAuth();
  const { editMode } = useEditMode();

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoFilter, setPhotoFilter] = useState("all");
  const [photoModal, setPhotoModal] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docModal, setDocModal] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string } | null>(null);
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);

  const loadDocuments = async (id: string) => {
    const d = await fetch(`/api/documents?page_id=${id}`).then((r) => r.json());
    setDocuments(d.documents || []);
  };

  useEffect(() => {
    if (!pageId) return;
    let active = true;
    (async () => {
      try {
        const [c, p, d] = await Promise.all([
          fetch(`/api/comments?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/photos?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/documents?page_id=${pageId}`).then((r) => r.json()),
        ]);
        if (!active) return;
        setComments(c.comments || []);
        setPhotos(p.photos || []);
        setDocuments(d.documents || []);
        // If we arrived via a notification link (#comments), scroll there once loaded.
        if (window.location.hash === "#comments") {
          setTimeout(
            () => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" }),
            250
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId]);

  // Team list for @mention autocomplete in the comment editor.
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setMentionUsers(d.users || []))
      .catch(() => {});
  }, []);

  // ---- Comments ----
  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId || !newComment.replace(/<[^>]*>/g, "").trim()) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, body: newComment, author_id: user.id }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setComments([...comments, await res.json()]);
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete comment");
      setComments(comments.filter((c) => c.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // ---- Photos (browser → storage direct upload) ----
  const uploadPhoto = async (file: File, category: string, description: string) => {
    if (!pageId) throw new Error("No page");
    const path = `photos/${pageId}/${Date.now()}_${sanitizeName(file.name)}`;
    await uploadToStorage("photos", path, file);
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        storage_path: path,
        caption: description,
        category,
        uploaded_by: user.id,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Could not save photo");
    }
    return res.json();
  };

  const addPhotoUrl = async (url: string, category: string, description: string) => {
    if (!pageId) throw new Error("No page");
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        external_url: url,
        caption: description,
        category,
        uploaded_by: user.id,
      }),
    });
    if (!res.ok) throw new Error("Could not add photo");
    return res.json();
  };

  const deletePhoto = async (id: string) => {
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete photo");
      setPhotos(photos.filter((p) => p.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // ---- Documents ----
  const submitDoc = async (file: File, category: string, description: string) => {
    if (!pageId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("page_id", pageId);
      formData.append("user_id", user.id);
      formData.append("category", category);
      formData.append("caption", description);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload document");
      await loadDocuments(pageId);
      setDocModal(false);
      toast.success("Document uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const photoCats = Array.from(
    new Set([...PHOTO_CATEGORIES, ...photos.map((p) => p.category).filter(Boolean)])
  );
  const visiblePhotos =
    photoFilter === "all"
      ? photos
      : photos.filter((p) => (p.category || "inspiration") === photoFilter);

  return (
    <>
      {/* Documents */}
      <h2 className="section-h">Documents</h2>
      {documents.map((doc: any) => (
        <div className="doc-row" key={doc.id}>
          <div className="ic">{doc.file_type?.toUpperCase()?.slice(0, 3) || "DOC"}</div>
          <div className="meta">
            <b>
              <a
                href={storageUrl(`documents/${doc.storage_path}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {doc.filename}
              </a>
            </b>
            <span>
              Uploaded by {doc.uploader?.short_name || "—"} · {shortDate(doc.created_at)}
              {doc.caption ? ` — ${doc.caption}` : ""}
            </span>
          </div>
          <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {doc.category && <span className="tag-chip">{doc.category}</span>}
            {canWrite && (
              <span className="del-badge" onClick={() => deleteDocument(doc.id)}>
                ✕ remove
              </span>
            )}
          </div>
        </div>
      ))}
      {canWrite && (
        <button
          className="doc-row"
          style={{ borderStyle: "dashed", color: "var(--sage)", justifyContent: "center", cursor: "pointer", width: "100%" }}
          onClick={() => setDocModal(true)}
        >
          + upload document
        </button>
      )}

      {/* Photos */}
      <div className="gallery-bar" style={{ alignItems: "baseline" }}>
        <h2 className="section-h" style={{ margin: "34px 0 0", flex: "0 0 auto" }}>
          Photo gallery
        </h2>
        {canWrite && (
          <button className="add-mini" onClick={() => setPhotoModal(true)}>
            + Add photos
          </button>
        )}
      </div>

      <div className="pill-filters" style={{ margin: "0 0 14px" }}>
        <span
          className={photoFilter === "all" ? "active" : ""}
          onClick={() => setPhotoFilter("all")}
        >
          All
        </span>
        {photoCats.map((c) => (
          <span
            key={c}
            className={photoFilter === c ? "active" : ""}
            onClick={() => setPhotoFilter(c)}
          >
            {labelFor(c)}
          </span>
        ))}
      </div>

      {visiblePhotos.length > 0 ? (
        <div className="masonry">
          {visiblePhotos.map((p: any) => {
            const url = photoUrlOf(p);
            const who = p.uploader?.short_name;
            return (
              <div
                className="pin clickable"
                key={p.id}
                onClick={() => setLightbox({ url, caption: p.caption })}
              >
                <img src={url} alt={p.caption || ""} />
                {p.category && <span className="tag">{labelFor(p.category)}</span>}
                {canWrite && editMode && (
                  <button
                    className="del-badge"
                    style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhoto(p.id);
                    }}
                  >
                    ✕
                  </button>
                )}
                {(p.caption || who) && (
                  <div className="caption">
                    {p.caption}
                    {who && (
                      <span className="by">
                        {p.caption ? ` — ${who}` : `added by ${who}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="desc-text" style={{ color: "var(--mist)" }}>
          No photos yet.
        </p>
      )}

      {/* Comments */}
      <h2 className="section-h" id="comments">
        Comments
      </h2>
      {comments.map((c: any) => (
        <div className="comment" key={c.id}>
          <div className="av" style={{ overflow: "hidden" }}>
            {c.author?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.author.avatar_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              c.author?.short_name?.charAt(0).toUpperCase() || "?"
            )}
          </div>
          <div className="comment-card">
            <div className="who">
              {c.author?.short_name || "Unknown"}
              {canWrite && (
                <button className="del" onClick={() => deleteComment(c.id)}>
                  delete
                </button>
              )}
            </div>
            <div className="txt rich-text" dangerouslySetInnerHTML={{ __html: c.body }} />
          </div>
        </div>
      ))}
      {canWrite ? (
        <form onSubmit={addComment} style={{ marginTop: 6 }}>
          <RichTextEditor
            value={newComment}
            onChange={setNewComment}
            placeholder="Add a comment... (type @ to mention)"
            minHeight={70}
            mentionUsers={mentionUsers}
          />
          <button type="submit" className="post-btn" style={{ marginTop: 10 }}>
            Post
          </button>
        </form>
      ) : (
        <p className="desc-text" style={{ color: "var(--mist)" }}>
          Guests can read comments but can&apos;t post.
        </p>
      )}

      <DocUploadModal
        open={docModal}
        defaultCategory={defaultCategory}
        onClose={() => setDocModal(false)}
        onSubmit={submitDoc}
      />

      <PhotoUploadModal
        open={photoModal}
        categories={photoCats}
        allowCustom={editMode}
        onClose={() => setPhotoModal(false)}
        uploadFile={uploadPhoto}
        addUrl={addPhotoUrl}
        onDone={(rows) => {
          setPhotos((prev) => [...prev, ...rows]);
          if (rows.length) toast.success(`Added ${rows.length} photo${rows.length === 1 ? "" : "s"}`);
        }}
      />

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.caption || ""} />
          {lightbox.caption && <div className="lb-cap">{lightbox.caption}</div>}
        </div>
      )}
    </>
  );
}
