"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { usePages } from "@/hooks/usePages";

const mockUser = {
  id: "ddbabb8d-5d95-4b1d-8842-fd9fad9e50d6",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

export default function DocumentsPage() {
  const { pages } = usePages();
  const [editMode, setEditMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pageId, setPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!pages.length) return;

    const firstPageId = pages[0]?.id;
    if (!firstPageId) return;

    setPageId(firstPageId);

    const fetchDocuments = async () => {
      try {
        const res = await fetch(`/api/documents?page_id=${firstPageId}`);
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      }
    };
    fetchDocuments();
  }, [pages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pageId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("page_id", pageId);
      formData.append("user_id", mockUser.id);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");

      const doc = await res.json();
      setDocuments([...documents, doc]);
      alert("Document uploaded!");
      e.target.value = "";
    } catch (error) {
      alert("Error: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="shell">
      <Sidebar
        pages={pages}
        user={mockUser}
        editMode={editMode}
        onEditModeChange={setEditMode}
      />

      <div className="flex-1">
        <main>
          <div className="title-block">
            <h1>Documents</h1>
          </div>

          {/* Filter bar */}
          <div className="flex justify-between items-center mb-[18px] gap-4">
            <div className="flex gap-2">
              {["all", "building", "services", "exterior", "quotes"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-[13px] py-1 text-[11.5px] rounded-full border ${
                      selectedFilter === filter
                        ? "bg-bottle text-white border-bottle"
                        : "border-[#E5E1D3] text-sage"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              className="border border-[#D7DECF] rounded px-3 py-2 text-[13px] min-w-60"
            />
            <label className="text-sage text-[12px] underline cursor-pointer hover:text-bottle">
              {uploading ? "Uploading..." : "+ upload document"}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Document list */}
          <div className="bg-white rounded">
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="border border-[#ECE8DC] rounded p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded bg-bottle text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                      {doc.file_type?.toUpperCase() || "DOC"}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-[13px] text-pine">
                        {doc.filename}
                      </div>
                      <div className="text-[11px] text-sage">
                        {doc.caption && <span>{doc.caption}</span>}
                      </div>
                    </div>
                    <div className="text-[11px] text-mist">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-[#ECE8DC] rounded p-3">
                <p className="text-center text-sage text-[13px]">
                  No documents yet
                </p>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
