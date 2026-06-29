"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import { useEditMode } from "@/components/EditModeContext";
import EditBanner from "@/components/EditBanner";
import PageMedia from "@/components/PageMedia";
import { DOC_CATEGORIES } from "@/components/DocUploadModal";
import { useToast } from "@/components/Toast";
import { usePages, type Page } from "@/hooks/usePages";

const mockUser = {
  id: "ddbabb8d-5d95-4b1d-8842-fd9fad9e50d6",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

export default function DynamicPage() {
  const { pages, loading } = usePages();
  const toast = useToast();
  const { editMode } = useEditMode();
  const pathname = usePathname();
  const slug = decodeURIComponent((pathname || "").replace(/^\//, ""));

  const isOwner = mockUser.role === "owner";
  const canEdit = isOwner && editMode;

  // Flatten the full tree (any depth) so nested pages resolve.
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

  // Top-level ancestor → default document category for this page.
  const rootOf = (p: Page): Page => {
    let cur = p;
    while (cur.parent_id) {
      const par = all.find((x) => x.id === cur.parent_id);
      if (!par) break;
      cur = par;
    }
    return cur;
  };
  const rootSlug = page ? rootOf(page).slug : "";
  const defaultCategory = DOC_CATEGORIES.includes(rootSlug) ? rootSlug : "building";

  const [brief, setBrief] = useState("");
  const [savingBrief, setSavingBrief] = useState(false);
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
        const [cost, a, t, u] = await Promise.all([
          fetch(`/api/costing?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/assignments?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/tags?page_id=${pageId}`).then((r) => r.json()),
          fetch(`/api/users`).then((r) => r.json()),
        ]);
        if (!active) return;
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

  const assignedIds = assignments.map((a) => a.user_id);
  const availableUsers = users.filter((u) => !assignedIds.includes(u.id));

  return (
    <>
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
                  </div>
                </div>
              </div>

              {editMode && <EditBanner />}

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

              {/* Sub-pages — only when there are children */}
              {children.length > 0 && (
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

              {/* Documents, Photos, Comments (shared with Overview) */}
              <PageMedia pageId={pageId} user={mockUser} defaultCategory={defaultCategory} />
            </>
          )}
    </>
  );
}
