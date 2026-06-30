"use client";

import { useEffect, useRef, useState } from "react";

export const PHOTO_CATEGORIES = ["inspiration", "site", "reference", "progress"];
export const PHOTO_CATEGORY_LABELS: Record<string, string> = {
  inspiration: "Inspiration",
  site: "Site photos",
  reference: "Reference",
  progress: "Progress",
};

interface PhotoUploadModalProps {
  open: boolean;
  defaultCategory?: string;
  onClose: () => void;
  // Upload a single file; resolves to the created photo row.
  uploadFile: (file: File, category: string, description: string) => Promise<any>;
  // Optional: add by external URL.
  addUrl?: (url: string, category: string, description: string) => Promise<any>;
  // Called with all created rows once everything finished.
  onDone: (rows: any[]) => void;
}

export default function PhotoUploadModal({
  open,
  defaultCategory = "inspiration",
  onClose,
  uploadFile,
  addUrl,
  onDone,
}: PhotoUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFiles([]);
      setUrl("");
      setCategory(defaultCategory || "inspiration");
      setDescription("");
      setProgress(null);
      setError(null);
    }
  }, [open, defaultCategory]);

  if (!open) return null;

  const total = files.length + (url.trim() ? 1 : 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total === 0 || !category) return;
    setBusy(true);
    setError(null);
    const rows: any[] = [];
    const errs: string[] = [];
    let done = 0;
    for (const f of files) {
      setProgress({ i: ++done, n: total });
      try {
        rows.push(await uploadFile(f, category, description));
      } catch (err) {
        errs.push(`${f.name}: ${(err as Error).message}`);
      }
    }
    if (url.trim() && addUrl) {
      setProgress({ i: ++done, n: total });
      try {
        rows.push(await addUrl(url.trim(), category, description));
      } catch (err) {
        errs.push((err as Error).message);
      }
    }
    setBusy(false);
    setProgress(null);
    if (rows.length) onDone(rows);
    if (errs.length) {
      setError(
        errs[0] + (errs.length > 1 ? ` (and ${errs.length - 1} more failed)` : "")
      );
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Add photos</h3>

        {error && (
          <div
            style={{
              background: "#FBF3F3",
              border: "1px solid #E2C9C9",
              color: "#B5524F",
              fontSize: 12,
              borderRadius: 4,
              padding: "8px 10px",
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}

        <label>Photos (you can pick several)</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border border-[#D7DECF] rounded px-3 py-2 text-[13px] text-left text-sage hover:bg-whitewash"
        >
          {files.length ? `${files.length} file(s) selected` : "Choose photos…"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        {addUrl && (
          <>
            <label>…or paste an image URL (optional)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </>
        )}

        <label>
          Category <span style={{ color: "var(--brass)" }}>*</span>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          {PHOTO_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PHOTO_CATEGORY_LABELS[c] || c}
            </option>
          ))}
        </select>

        <label>Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. neutral tile palette we like"
        />

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={total === 0 || busy}
            className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? progress
                ? `Uploading ${progress.i} of ${progress.n}…`
                : "Uploading…"
              : `Add ${total || ""} photo${total === 1 ? "" : "s"}`.trim()}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 border border-[#D7DECF] rounded py-2 text-[13px] text-sage hover:bg-whitewash disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
