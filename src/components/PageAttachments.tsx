"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/components/Toast";

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;

interface PageAttachmentsProps {
  pageId: string | null;
  user: { id: string; short_name: string };
}

export default function PageAttachments({ pageId, user }: PageAttachmentsProps) {
  const toast = useToast();

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const [photos, setPhotos] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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
        /* ignore load errors */
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId]);

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId || !newComment.replace(/<[^>]*>/g, "").trim()) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: pageId,
          body: newComment,
          author_id: user.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setComments([...comments, await res.json()]);
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete comment");
      setComments(comments.filter((c) => c.id !== id));
      toast.success("Comment deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const addPhotoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success("Photo added");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const uploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId || !photoFile) return;
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("page_id", pageId);
      formData.append("uploaded_by", user.id);
      formData.append("caption", photoCaption);
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      setPhotos([...photos, await res.json()]);
      setPhotoFile(null);
      setPhotoCaption("");
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const deletePhoto = async (id: string) => {
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete photo");
      setPhotos(photos.filter((p) => p.id !== id));
      toast.success("Photo deleted");
    } catch (error) {
      toast.error((error as Error).message);
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
      formData.append("user_id", user.id);
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload document");
      setDocuments([...documents, await res.json()]);
      e.target.value = "";
      toast.success("Document uploaded");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      setDocuments(documents.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <>
      {/* Documents (shown above photos) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-fraunces text-[15px] font-medium text-bottle flex-1 flex items-center gap-[10px]">
            Documents
            <span className="flex-1 h-px bg-[#E5E1D3]"></span>
          </h2>
          <label className="text-sage text-[12px] underline cursor-pointer hover:text-bottle ml-4">
            {uploadingDoc ? "Uploading..." : "+ upload document"}
            <input
              type="file"
              onChange={uploadDocument}
              disabled={uploadingDoc}
              className="hidden"
            />
          </label>
        </div>
        <div className="space-y-2">
          {documents.length > 0 ? (
            documents.map((doc: any) => (
              <div
                key={doc.id}
                className="border border-[#ECE8DC] rounded p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded bg-bottle text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                  {doc.file_type?.toUpperCase() || "DOC"}
                </div>
                <a
                  href={storageUrl(`documents/${doc.storage_path}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 font-semibold text-[13px] text-pine hover:underline"
                >
                  {doc.filename}
                </a>
                <div className="text-[11px] text-mist">
                  {(doc.file_size / 1024).toFixed(1)} KB
                </div>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="text-mist hover:text-[#B5524F] text-[11px] underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div className="border border-[#ECE8DC] rounded p-3">
              <p className="text-center text-sage text-[13px]">No documents yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Photos */}
      <div className="mb-10">
        <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
          Photos
          <span className="flex-1 h-px bg-[#E5E1D3]"></span>
        </h2>
        <div className="bg-white border border-[#ECE8DC] rounded p-5 mb-4">
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {photos.map((p: any) => {
                const url =
                  p.external_url || storageUrl(`photos/${p.storage_path}`);
                return (
                  <div
                    key={p.id}
                    className="rounded overflow-hidden border border-[#ECE8DC]"
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={p.caption || ""}
                        className="w-full h-40 object-cover hover:opacity-80"
                      />
                    </a>
                    <div className="p-2 bg-whitewash">
                      {p.caption && (
                        <p className="text-[12px] text-sage mb-2">{p.caption}</p>
                      )}
                      <button
                        onClick={() => deletePhoto(p.id)}
                        className="text-mist hover:text-[#B5524F] text-[11px] underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sage text-[13px]">No photos yet</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form onSubmit={addPhotoUrl} className="space-y-3 bg-whitewash p-4 rounded">
            <h3 className="font-fraunces text-[13px] font-medium text-bottle">
              Add from URL
            </h3>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Photo URL"
              className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
            />
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
            />
            <button
              type="submit"
              className="w-full bg-bottle text-white py-2 rounded text-[13px] font-medium hover:opacity-90"
            >
              Add from URL
            </button>
          </form>

          <form onSubmit={uploadPhoto} className="space-y-3 bg-whitewash p-4 rounded">
            <h3 className="font-fraunces text-[13px] font-medium text-bottle">
              Upload a file
            </h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
            />
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
            />
            <button
              type="submit"
              disabled={!photoFile}
              className="w-full bg-bottle text-white py-2 rounded text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
            >
              Upload photo
            </button>
          </form>
        </div>
      </div>

      {/* Comments */}
      <div className="mb-10">
        <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
          Comments
          <span className="flex-1 h-px bg-[#E5E1D3]"></span>
        </h2>
        <div className="bg-white border border-[#ECE8DC] rounded p-5 mb-4">
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-bottle text-white text-xs flex items-center justify-center flex-shrink-0">
                    {c.author?.short_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-bottle">
                      {c.author?.short_name || "Unknown"}
                    </div>
                    <div
                      className="rich-text mt-1"
                      dangerouslySetInnerHTML={{ __html: c.body }}
                    />
                  </div>
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-mist hover:text-[#B5524F] text-[11px] underline cursor-pointer flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sage text-[13px]">No comments yet</p>
          )}
        </div>
        <form onSubmit={addComment} className="space-y-2">
          <RichTextEditor
            value={newComment}
            onChange={setNewComment}
            placeholder="Add a comment..."
            minHeight={80}
          />
          <button
            type="submit"
            className="bg-bottle text-white px-4 py-2 rounded text-[13px] font-medium hover:opacity-90"
          >
            Post comment
          </button>
        </form>
      </div>
    </>
  );
}
