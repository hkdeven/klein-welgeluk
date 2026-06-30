"use client";

import { useEffect, useState } from "react";
import PhotoUploadModal, {
  PHOTO_CATEGORIES,
  labelFor,
} from "@/components/PhotoUploadModal";
import { useToast } from "@/components/Toast";
import { useAuth, useCurrentUser } from "@/components/AuthProvider";
import { useEditMode } from "@/components/EditModeContext";
import { uploadToStorage, sanitizeName } from "@/lib/upload";

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;
const photoUrlOf = (p: any) => p.external_url || storageUrl(`photos/${p.storage_path}`);

export default function PhotosPage() {
  const toast = useToast();
  const { canWrite } = useAuth();
  const { editMode } = useEditMode();
  const user = useCurrentUser();

  const [pageId, setPageId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string } | null>(null);

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
      <div className="gallery-bar">
        <div className="title-block" style={{ flex: 1, marginBottom: 0, borderBottom: "none" }}>
          <h1>Photos</h1>
        </div>
        {canWrite && (
          <button className="add-mini" onClick={() => setModal(true)}>
            + Add photos
          </button>
        )}
      </div>

      {photos.length > 0 && (
        <div className="pill-filters" style={{ margin: "4px 0 18px" }}>
          <span className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            All
          </span>
          {photoCats.map((c) => (
            <span key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>
              {labelFor(c)}
            </span>
          ))}
        </div>
      )}

      {visible.length > 0 ? (
        <div className="masonry">
          {visible.map((p: any) => {
            const url = photoUrlOf(p);
            const who = p.uploader?.short_name;
            const where = p.page?.title;
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
                <div className="caption">
                  {p.caption}
                  <span className="by">
                    {p.caption ? " — " : ""}
                    {who || "—"}
                    {where ? ` · ${where}` : ""}
                  </span>
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

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.caption || ""} />
          {lightbox.caption && <div className="lb-cap">{lightbox.caption}</div>}
        </div>
      )}
    </>
  );
}
