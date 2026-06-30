"use client";

import { useEffect, useRef, useState } from "react";

export const PHOTO_CATEGORIES = ["inspiration", "site", "reference"];
export const PHOTO_CATEGORY_LABELS: Record<string, string> = {
  inspiration: "Inspiration",
  site: "Site photos",
  reference: "Reference",
};

export const labelFor = (c: string) =>
  PHOTO_CATEGORY_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1);

interface PhotoUploadModalProps {
  open: boolean;
  defaultCategory?: string;
  categories?: string[];
  allowCustom?: boolean;
  onClose: () => void;
  uploadFile: (file: File, category: string, description: string) => Promise<any>;
  addUrl?: (url: string, category: string, description: string) => Promise<any>;
  onDone: (rows: any[]) => void;
}

export default function PhotoUploadModal({
  open,
  defaultCategory = "inspiration",
  categories = PHOTO_CATEGORIES,
  allowCustom = false,
  onClose,
  uploadFile,
  addUrl,
  onDone,
}: PhotoUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [customCat, setCustomCat] = useState("");
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
      setCustomCat("");
      setDescription("");
      setProgress(null);
      setError(null);
    }
  }, [open, defaultCategory]);

  if (!open) return null;

  const total = files.length + (url.trim() ? 1 : 0);
  const effectiveCat = category === "__new__" ? customCat.trim() : category;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total === 0 || !effectiveCat) return;
    setBusy(true);
    setError(null);
    const rows: any[] = [];
    const errs: string[] = [];
    let done = 0;
    for (const f of files) {
      setProgress({ i: ++done, n: total });
      try {
        rows.push(await uploadFile(f, effectiveCat, description));
      } catch (err) {
        errs.push(`${f.name}: ${(err as Error).message}`);
      }
    }
    if (url.trim() && addUrl) {
      setProgress({ i: ++done, n: total });
      try {
        rows.push(await addUrl(url.trim(), effectiveCat, description));
      } catch (err) {
        errs.push((err as Error).message);
      }
    }
    setBusy(false);
    setProgress(null);
    if (rows.length) onDone(rows);
    if (errs.length) {
      setError(errs[0] + (errs.length > 1 ? ` (and ${errs.length - 1} more failed)` : ""));
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
          {categories.map((c) => (
            <option key={c} value={c}>
              {labelFor(c)}
            </option>
          ))}
          {allowCustom && <option value="__new__">+ New category…</option>}
        </select>
        {category === "__new__" && (
          <input
            type="text"
            value={customCat}
            onChange={(e) => setCustomCat(e.target.value)}
            placeholder="New category name"
            autoFocus
          />
        )}

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
            disabled={total === 0 || !effectiveCat || busy}
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
