"use client";

import { useState, useEffect } from "react";
import EditBanner from "@/components/EditBanner";
import DocUploadModal from "@/components/DocUploadModal";
import { useToast } from "@/components/Toast";
import { useEditMode } from "@/components/EditModeContext";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";
import { usePages } from "@/hooks/usePages";
import { uploadToStorage, sanitizeName } from "@/lib/upload";


const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

const BASE_FILTERS = ["building", "services", "exterior", "quotes"];

export default function DocumentsPage() {
  const { pages } = usePages();
  const toast = useToast();
  const { editMode } = useEditMode();
  const mockUser = useCurrentUser();
  const { canWrite, isGuest } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [documents, setDocuments] = useState<any[]>([]);
  const [pageId, setPageId] = useState<string | null>(null);
  const [docModal, setDocModal] = useState(false);

  // Show every document across the whole project, tagged with its source page.
  const loadDocuments = async () => {
    const res = await fetch(`/api/documents`);
    const data = await res.json();
    setDocuments(data.documents || []);
  };

  useEffect(() => {
    // Upload target: find-or-create a dedicated "documents" page (same pattern
    // as /photos). Falling back to pages[0] mis-attributed uploads to Building.
    (async () => {
      if (pages.length) {
        let docsPage = pages.find((p: any) => p.slug === "documents");
        if (!docsPage) {
          try {
            const res = await fetch("/api/pages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "Documents", slug: "documents" }),
            });
            if (res.ok) docsPage = await res.json();
          } catch {
            /* ignore */
          }
        }
        setPageId(docsPage?.id || null);
      }
      loadDocuments().catch(() => {});
    })();
  }, [pages]);

  const submitDoc = async (
    items: { file: File; filename: string }[],
    category: string,
    description: string
  ) => {
    if (!pageId) return;
    try {
      for (const { file, filename } of items) {
        // Upload straight to storage (no serverless body-size limit), then save metadata.
        const path = `documents/${pageId}/${Date.now()}_${sanitizeName(file.name)}`;
        await uploadToStorage("documents", path, file);
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_id: pageId,
            storage_path: path,
            filename,
            original_name: file.name,
            file_size: file.size,
            user_id: mockUser.id,
            category,
            caption: description,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Upload failed");
        }
      }
      await loadDocuments();
      setDocModal(false);
      toast.success(`Uploaded ${items.length} document${items.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDocuments(documents.filter((d: any) => d.id !== id));
      toast.success("Document deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Base categories plus any custom ones present on the loaded documents.
  const filters = [
    "all",
    ...Array.from(
      new Set([...BASE_FILTERS, ...documents.map((d: any) => d.category).filter(Boolean)])
    ),
  ];

  const visibleDocs =
    selectedFilter === "all"
      ? documents
      : documents.filter((d: any) => d.category === selectedFilter);

  if (isGuest) {
    return (
      <>
        <div className="title-block">
          <h1>Documents</h1>
        </div>
        <p className="desc-text" style={{ color: "var(--mist)" }}>
          Documents aren&apos;t available in guest view.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="title-block">
        <h1>Documents</h1>
      </div>

      {editMode && <EditBanner />}

          {/* Filter bar */}
          <div className="flex justify-between items-center mb-[18px] gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-[13px] py-1 text-[11.5px] rounded-full border whitespace-nowrap ${
                    selectedFilter === filter
                      ? "bg-bottle text-white border-bottle"
                      : "border-[#E5E1D3] text-sage"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            {canWrite && (
              <button
                onClick={() => setDocModal(true)}
                className="text-sage text-[12px] underline cursor-pointer hover:text-bottle"
              >
                + upload document
              </button>
            )}
          </div>

          {/* Document list */}
          {visibleDocs.length > 0 ? (
            visibleDocs.map((doc: any) => (
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
                    Uploaded by {doc.uploader?.short_name || "-"} · {shortDate(doc.created_at)}
                    {doc.page?.title && doc.page.slug !== "documents" && (
                      <>
                        {" · in "}
                        <a href={`/${doc.page.slug}`} className="underline hover:text-bottle">
                          {doc.page.title}
                        </a>
                      </>
                    )}
                    {doc.caption ? `: ${doc.caption}` : ""}
                  </span>
                </div>
                <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {doc.page?.title && doc.page.slug !== "documents" && (
                    <span className="tag-chip brass">{doc.page.title}</span>
                  )}
                  {doc.category && <span className="tag-chip">{doc.category}</span>}
                  {canWrite && (
                    <span className="del-badge" onClick={() => deleteDocument(doc.id)}>
                      ✕ remove
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="doc-row" style={{ justifyContent: "center", color: "var(--sage)" }}>
              No documents yet
            </div>
          )}
      <DocUploadModal
        open={docModal}
        defaultCategory="building"
        onClose={() => setDocModal(false)}
        onSubmit={submitDoc}
      />
    </>
  );
}
