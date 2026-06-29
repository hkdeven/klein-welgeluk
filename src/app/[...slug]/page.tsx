"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/components/Toast";
import { usePages, type Page } from "@/hooks/usePages";

const mockUser = {
  id: "ddbabb8d-5d95-4b1d-8842-fd9fad9e50d6",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;

export default function DynamicPage() {
  const { pages, loading } = usePages();
  const toast = useToast();
  const [editMode, setEditMode] = useState(false);
  const pathname = usePathname();
  const slug = decodeURIComponent((pathname || "").replace(/^\//, ""));

  const isOwner = mockUser.role === "owner";
  // Editing affordances (assignees, tags, descriptions, costing) only show when
  // an owner has turned on edit mode.
  const canEdit = isOwner && editMode;

  // Flatten the full tree (any depth) so nested pages resolve, not just children.
  const all: Page[] = [];
  const collect = (list: Page[]) =>
    list.forEach((p) => {
      all.push(p);
      if (p.children) collect(p.children);
    });
  collect(pages);
  const page = all.find((p) => p.slug === slug);
  const parent = page?.parent_id ? all.find((p) => p.id === page.parent_id) : undefined;
  const children = page?.children || [];
  const pageId = page?.id ?? null;

  const [brief, setBrief] = useState("");
  const [savingBrief, setSavingBrief] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docCaption, setDocCaption] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [costing, setCosting] = useState({
    budgeted_amount: "",
    quote_received: "",
    actual_invoiced: "",
    notes: "",
  });
  const [costingOpen, setCostingOpen] = useState(false);
  const [savingCosting, setSavingCosting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setBrief(page?.brief || "");
  }, [page?.id, page?.brief]);

  useEffect(() => {
    if (!pageId) return;
    let active = true;
    (async () => {
      try {
        const [c, p, d, cost, a, t, u] = await Promise.all([
          fetch(`/api/comments?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/photos?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/documents?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/costing?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/assignments?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/tags?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/users`).then((r) => r.json()),
        ]);
        if (!active) return;
        setComments(c.comments || []);
        setPhotos(p.photos || []);
        setDocuments(d.documents || []);
        setAssignments(a.assignments || []);
        setTags(t.tags || []);
        setUsers(u.users || []);
        if (cost.costing) {
          setCosting({
            budgeted_amount: cost.costing.budgeted_amount || "",
            quote_received: cost.costing.quote_received || "",
            actual_invoiced: cost.costing.actual_invoiced || "",
            notes: cost.costing.notes || "",
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId]);

  const saveBrief = async () => {
    if (!pageId) return;
    setSavingBrief(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (!res.ok) throw new Error("Failed to save brief");
      toast.success("Brief saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingBrief(false);
    }
  };

  const saveCosting = async () => {
    if (!pageId) return;
    setSavingCosting(true);
    try {
      const res = await fetch("/api/costing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, ...costing }),
      });
      if (!res.ok) throw new Error("Failed to save costing");
      toast.success("Costing saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingCosting(false);
    }
  };

  const assignUser = async (userId: string) => {
    if (!pageId || !userId) return;
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, user_id: userId }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      const created = await res.json();
      setAssignments([...assignments.filter((a) => a.user_id !== userId), created]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const unassignUser = async (userId: string) => {
    if (!pageId) return;
    try {
      const res = await fetch(`/api/assignments?page_id=${pageId}&user_id=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unassign");
      setAssignments(assignments.filter((a) => a.user_id !== userId));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const addTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId || !newTag.trim()) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, name: newTag }),
      });
      if (!res.ok) throw new Error("Failed to add tag");
      const tag = await res.json();
      if (!tags.some((t) => t.id === tag.id)) setTags([...tags, tag]);
      setNewTag("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const removeTag = async (tagId: string) => {
    if (!pageId) return;
    try {
      const res = await fetch(`/api/tags?page_id=${pageId}&tag_id=${tagId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove tag");
      setTags(tags.filter((t) => t.id !== tagId));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId || !newComment.replace(/<[^>]*>/g, "").trim()) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, body: newComment, author_id: mockUser.id }),
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

  const uploadPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pageId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("page_id", pageId);
      formData.append("uploaded_by", mockUser.id);
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
          uploaded_by: mockUser.id,
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

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pageId) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("page_id", pageId);
      formData.append("user_id", mockUser.id);
      formData.append("caption", docCaption);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload document");
      setDocuments([...documents, await res.json()]);
      setDocCaption("");
      e.target.value = "";
      toast.success("Document uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingDoc(false);
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

  const assignedIds = assignments.map((a) => a.user_id);
  const availableUsers = users.filter((u) => !assignedIds.includes(u.id));
  // Sub-pages are created from the sidebar now; only list them here when they exist.
  const showSubPages = children.length > 0;

  return (
    <div className="shell">
      <Sidebar pages={pages} />

      <div className="flex-1">
        <Topbar user={mockUser} editMode={editMode} onEditModeChange={setEditMode} />
        <main>
          {loading ? (
            <p className="text-sage">Loading...</p>
          ) : !page ? (
            <div className="title-block">
              <h1>Page not found</h1>
            </div>
          ) : (
            <>
              <div className="breadcrumb">
                <a href="/">Home</a>
                {parent && (
                  <>
                    <span className="sep">/</span>
                    <a href={`/${parent.slug}`}>{parent.title}</a>
                  </>
                )}
                <span className="sep">/</span>
                {page.title}
              </div>

              <div className="title-block">
                <div>
                  <h1>{page.title}</h1>
                  <div className="title-meta">
                    {children.length} sub-page{children.length === 1 ? "" : "s"}
                    <span className="dot">·</span>
                    <a href="#comments">
                      {comments.length} comment{comments.length === 1 ? "" : "s"}
                    </a>
                  </div>
                </div>
              </div>

              {/* Assigned + Tags */}
              <div className="meta-row">
                <div className="meta-field">
                  <span className="label">Assigned to</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {assignments.map((a) => (
                      <span className="person-chip" key={a.user_id}>
                        <span className="av">
                          {a.user?.short_name?.charAt(0).toUpperCase() || "?"}
                        </span>
                        {a.user?.short_name || "User"}
                        {canEdit && (
                          <span
                            className="x"
                            style={{ cursor: "pointer" }}
                            onClick={() => unassignUser(a.user_id)}
                          >
                            ✕
                          </span>
                        )}
                      </span>
                    ))}
                    {assignments.length === 0 && (
                      <span className="add-link">no one assigned</span>
                    )}
                    {canEdit && availableUsers.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => assignUser(e.target.value)}
                        className="border border-[#D7DECF] rounded px-2 py-1 text-[12px] text-sage"
                      >
                        <option value="">+ assign</option>
                        {availableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="meta-field">
                  <span className="label">Tags</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {tags.map((t) => (
                      <span className="tag-chip" key={t.id}>
                        {t.name}
                        {canEdit && (
                          <span
                            style={{ cursor: "pointer", marginLeft: 6, color: "var(--mist)" }}
                            onClick={() => removeTag(t.id)}
                          >
                            ✕
                          </span>
                        )}
                      </span>
                    ))}
                    {tags.length === 0 && !canEdit && (
                      <span className="add-link">no tags</span>
                    )}
                    {canEdit && (
                      <form onSubmit={addTag} style={{ display: "inline-flex", gap: 4 }}>
                        <input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="+ add tag"
                          className="border border-[#D7DECF] rounded px-2 py-1 text-[12px]"
                          style={{ width: 100 }}
                        />
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* Brief */}
              <h2 className="section-h">Brief</h2>
              {canEdit ? (
                <>
                  <RichTextEditor
                    value={brief}
                    onChange={setBrief}
                    placeholder="Describe the scope and decisions for this area..."
                  />
                  <button
                    onClick={saveBrief}
                    disabled={savingBrief}
                    className="post-btn"
                    style={{ marginTop: 10 }}
                  >
                    {savingBrief ? "Saving..." : "Save brief"}
                  </button>
                </>
              ) : brief ? (
                <div className="rich-text desc-text" dangerouslySetInnerHTML={{ __html: brief }} />
              ) : (
                <p className="desc-text" style={{ color: "var(--mist)" }}>
                  No brief yet.
                </p>
              )}

              {/* Costing — accordion, collapsed by default */}
              <div className="costing">
                <div
                  className="costing-head"
                  style={{ cursor: "pointer" }}
                  onClick={() => setCostingOpen((o) => !o)}
                >
                  <span className="chev">{costingOpen ? "▾" : "▸"}</span> Costing details
                  <span className="lock">hidden from guests</span>
                </div>
                {costingOpen && (
                  <div className="costing-body">
                    {(
                      [
                        ["budgeted_amount", "Budgeted amount"],
                        ["quote_received", "Quote received"],
                        ["actual_invoiced", "Actual invoiced"],
                      ] as const
                    ).map(([key, label]) => (
                      <div className="costing-field" key={key}>
                        <label>{label}</label>
                        {canEdit ? (
                          <input
                            className="val"
                            value={costing[key]}
                            placeholder="click to type"
                            onChange={(e) => setCosting({ ...costing, [key]: e.target.value })}
                          />
                        ) : (
                          <span className="val">{costing[key] || "—"}</span>
                        )}
                      </div>
                    ))}
                    <div className="costing-notes">
                      <label>Notes</label>
                      {canEdit ? (
                        <RichTextEditor
                          value={costing.notes}
                          onChange={(html) => setCosting({ ...costing, notes: html })}
                          placeholder="Free text — e.g. volume discount strategy..."
                          minHeight={70}
                        />
                      ) : costing.notes ? (
                        <div className="rich-text" dangerouslySetInnerHTML={{ __html: costing.notes }} />
                      ) : (
                        <p className="desc-text" style={{ color: "var(--mist)" }}>
                          No notes yet.
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={saveCosting}
                        disabled={savingCosting}
                        className="post-btn"
                        style={{ marginTop: 12 }}
                      >
                        {savingCosting ? "Saving..." : "Save costing"}
                      </button>
                    )}
                  </div>
                )}
              </div>

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
                    {doc.caption && <span className="caption-text">{doc.caption}</span>}
                  </div>
                  <div className="right">
                    {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                    <div>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="add-link"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                      >
                        delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                <input
                  value={docCaption}
                  onChange={(e) => setDocCaption(e.target.value)}
                  placeholder="Document description (optional)"
                  className="field-input"
                  style={{ marginBottom: 0, flex: 1 }}
                />
                <label className="post-btn" style={{ whiteSpace: "nowrap" }}>
                  {uploadingDoc ? "Uploading..." : "+ upload document"}
                  <input type="file" onChange={uploadDocument} className="hidden" />
                </label>
              </div>

              {/* Photo gallery */}
              <h2 className="section-h">Photo gallery</h2>
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
              {showLink && (
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
              <div className="masonry">
                {photos.map((p: any) => {
                  const url = p.external_url || storageUrl(`photos/${p.storage_path}`);
                  return (
                    <div className="pin" key={p.id}>
                      <img src={url} alt={p.caption || ""} />
                      {p.category && <span className="tag">{p.category}</span>}
                      <button className="del" onClick={() => deletePhoto(p.id)}>
                        delete
                      </button>
                      {p.caption && <div className="caption">{p.caption}</div>}
                    </div>
                  );
                })}
                <label className="pin add">
                  + add image
                  <input type="file" accept="image/*" onChange={uploadPhotoFile} className="hidden" />
                </label>
              </div>

              {/* Sub-pages — only when there are children (or in edit mode) */}
              {showSubPages && (
                <>
                  <h2 className="section-h">Sub-pages</h2>
                  <div className="sub-list">
                    {children.map((child) => (
                      <a key={child.id} href={`/${child.slug}`} className="sub-card-lg">
                        <div className="name">{child.title}</div>
                        {child.brief && (
                          <div
                            className="brief rich-text"
                            dangerouslySetInnerHTML={{ __html: child.brief }}
                          />
                        )}
                      </a>
                    ))}
                  </div>
                </>
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
                      <button className="del" onClick={() => deleteComment(c.id)}>
                        delete
                      </button>
                    </div>
                    <div className="txt rich-text" dangerouslySetInnerHTML={{ __html: c.body }} />
                  </div>
                </div>
              ))}
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
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
