"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import DocUploadModal from "@/components/DocUploadModal";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

interface PageMediaProps {
  pageId: string | null;
  user: { id: string; short_name: string };
  defaultCategory?: string;
}

export default function PageMedia({ pageId, user, defaultCategory }: PageMediaProps) {
  const toast = useToast();
  const { canWrite } = useAuth();

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docModal, setDocModal] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string } | null>(null);

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
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId]);

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

  // ---- Photos ----
  const uploadPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pageId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("page_id", pageId);
      formData.append("uploaded_by", user.id);
      formData.append("caption", photoCaption);
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload photo");
      setPhotos([...photos, await res.json()]);
      setPhotoCaption("");
      e.target.value = "";
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const addPhotoLink = async () => {
    if (!pageId || !photoUrl.trim()) return;
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: pageId,
          external_url: photoUrl,
          caption: photoCaption,
          category: "inspiration",
          uploaded_by: user.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to add photo");
      setPhotos([...photos, await res.json()]);
      setPhotoUrl("");
      setPhotoCaption("");
      setShowLink(false);
      toast.success("Photo added");
    } catch (err) {
      toast.error((err as Error).message);
    }
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
      <h2 className="section-h">Photo gallery</h2>
      {canWrite && (
        <div className="gallery-bar">
          <input
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="Photo description (optional)"
            className="field-input"
            style={{ marginBottom: 0, maxWidth: 320 }}
          />
          <div className="gallery-actions">
            <label style={{ cursor: "pointer" }}>
              + Upload
              <input type="file" accept="image/*" onChange={uploadPhotoFile} className="hidden" />
            </label>
            <span style={{ cursor: "pointer" }} onClick={() => setShowLink((s) => !s)}>
              + Add via link
            </span>
          </div>
        </div>
      )}
      {canWrite && showLink && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Image URL"
            className="field-input"
            style={{ marginBottom: 0 }}
          />
          <button className="post-btn" onClick={addPhotoLink}>
            Add
          </button>
        </div>
      )}
      {photos.length > 0 ? (
        <div className="masonry">
          {photos.map((p: any) => {
            const url = p.external_url || storageUrl(`photos/${p.storage_path}`);
            return (
              <div
                className="pin clickable"
                key={p.id}
                onClick={() => setLightbox({ url, caption: p.caption })}
              >
                <img src={url} alt={p.caption || ""} />
                {p.caption && <div className="caption">{p.caption}</div>}
                {canWrite && (
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
          <div className="av">{c.author?.short_name?.charAt(0).toUpperCase() || "?"}</div>
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
            placeholder="Add a comment..."
            minHeight={70}
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

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.caption || ""} />
          {lightbox.caption && <div className="lb-cap">{lightbox.caption}</div>}
        </div>
      )}
    </>
  );
}
