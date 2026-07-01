"use client";

import { useCallback, useEffect, useState } from "react";
import PhotoUploadModal, {
  PHOTO_CATEGORIES,
  labelFor,
} from "@/components/PhotoUploadModal";
import { useToast } from "@/components/Toast";
import { useAuth, useCurrentUser } from "@/components/AuthProvider";
import PhotoModal from "@/components/PhotoModal";
import { useEditMode } from "@/components/EditModeContext";
import { uploadToStorage, sanitizeName } from "@/lib/upload";

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;
const photoUrlOf = (p: any) => p.external_url || storageUrl(`photos/${p.storage_path}`);

export default function PhotosPage() {
  const toast = useToast();
  const { canWrite, canUpload } = useAuth();
  const { editMode } = useEditMode();
  const user = useCurrentUser();

  const [pageId, setPageId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [modalPhoto, setModalPhoto] = useState<any | null>(null);
  const [reactionInfo, setReactionInfo] = useState<Record<string, { total: number; top: string }>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const isOwner = user.role === "owner";

  // Find-or-create a dedicated "photos" page so uploads here have a valid page_id.
  useEffect(() => {
    (async () => {
      try {
        const data = await fetch("/api/pages").then((r) => r.json());
        let page = (data.pages || []).find((p: any) => p.slug === "photos");
        if (!page) {
          const res = await fetch("/api/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Photos", slug: "photos" }),
          });
          if (res.ok) page = await res.json();
        }
        if (page) setPageId(page.id);
      } catch {
        /* ignore */
      }
      // All photos across the project.
      try {
        const d = await fetch("/api/photos").then((r) => r.json());
        setPhotos(d.photos || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Reaction + comment counts for the grid strips.
  const loadCounts = useCallback(() => {
    const ids = photos.map((p) => p.id);
    if (!ids.length) {
      setReactionInfo({});
      setCommentCounts({});
      return;
    }
    const q = ids.join(",");
    fetch(`/api/reactions?photo_ids=${q}`)
      .then((r) => r.json())
      .then((d) => {
        const acc: Record<string, { total: number; counts: Record<string, number> }> = {};
        (d.reactions || []).forEach((r: any) => {
          const e = acc[r.photo_id] || (acc[r.photo_id] = { total: 0, counts: {} });
          e.total++;
          e.counts[r.emoji] = (e.counts[r.emoji] || 0) + 1;
        });
        const out: Record<string, { total: number; top: string }> = {};
        Object.entries(acc).forEach(([pid, e]) => {
          const top = Object.entries(e.counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
          out[pid] = { total: e.total, top };
        });
        setReactionInfo(out);
      })
      .catch(() => {});
    fetch(`/api/comments?photo_ids=${q}`)
      .then((r) => r.json())
      .then((d) => {
        const cc: Record<string, number> = {};
        (d.comments || []).forEach((c: any) => {
          if (c.photo_id) cc[c.photo_id] = (cc[c.photo_id] || 0) + 1;
        });
        setCommentCounts(cc);
      })
      .catch(() => {});
  }, [photos]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const uploadPhoto = async (file: File, category: string, description: string) => {
    if (!pageId) throw new Error("Photos page not ready");
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
    if (!pageId) throw new Error("Photos page not ready");
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
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const photoCats = Array.from(
    new Set([...PHOTO_CATEGORIES, ...photos.map((p) => p.category).filter(Boolean)])
  );
  const visible =
    filter === "all" ? photos : photos.filter((p) => (p.category || "inspiration") === filter);

  return (
    <>
      <div className="title-block">
        <h1>Photos</h1>
      </div>

      <div className="flex justify-between items-center mb-[18px] gap-4 flex-wrap">
        {photos.length > 0 ? (
          <div className="pill-filters" style={{ margin: 0 }}>
            <span className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              All
            </span>
            {photoCats.map((c) => (
              <span key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>
                {labelFor(c)}
              </span>
            ))}
          </div>
        ) : (
          <span />
        )}
        {canUpload && (
          <button
            onClick={() => setModal(true)}
            className="text-sage text-[12px] underline cursor-pointer hover:text-bottle"
          >
            + upload photo
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="masonry">
          {visible.map((p: any) => {
            const url = photoUrlOf(p);
            const who = p.uploader?.short_name;
            const where = p.page?.title;
            const rc = reactionInfo[p.id];
            const cc = commentCounts[p.id] || 0;
            return (
              <div className="pin clickable" key={p.id} onClick={() => setModalPhoto(p)}>
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
                <div className="pin-strip">
                  {p.caption && <div className="cap">{p.caption}</div>}
                  <div className="meta">
                    <span>
                      {who || "—"}
                      {where ? ` · ${where}` : ""}
                    </span>
                    {cc > 0 && <span>💬 {cc}</span>}
                    {rc && rc.total > 0 && (
                      <span>
                        {rc.top} {rc.total}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="desc-text" style={{ color: "var(--mist)" }}>
          No photos yet.
        </p>
      )}

      <PhotoUploadModal
        open={modal}
        categories={photoCats}
        allowCustom={editMode}
        onClose={() => setModal(false)}
        uploadFile={uploadPhoto}
        addUrl={addPhotoUrl}
        onDone={(rows) => {
          setPhotos((prev) => [...rows, ...prev]);
          if (rows.length) toast.success(`Added ${rows.length} photo${rows.length === 1 ? "" : "s"}`);
        }}
      />

      {modalPhoto && (
        <PhotoModal
          photo={modalPhoto}
          url={photoUrlOf(modalPhoto)}
          canEdit={isOwner}
          onClose={() => setModalPhoto(null)}
          onCaptionSaved={(id, caption) =>
            setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)))
          }
          onReactionChange={loadCounts}
        />
      )}
    </>
  );
}
