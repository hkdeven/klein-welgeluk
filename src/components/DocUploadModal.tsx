"use client";

import { useEffect, useRef, useState } from "react";

export const DOC_CATEGORIES = ["building", "services", "exterior", "quotes"];

export interface DocItem {
  file: File;
  filename: string;
}

interface DocUploadModalProps {
  open: boolean;
  defaultCategory?: string;
  onClose: () => void;
  onSubmit: (items: DocItem[], category: string, description: string) => Promise<void> | void;
}

const baseName = (n: string) => n.replace(/\.[^.]+$/, "");
const extOf = (n: string) => (n.includes(".") ? n.slice(n.lastIndexOf(".")) : "");

export default function DocUploadModal({
  open,
  defaultCategory = "building",
  onClose,
  onSubmit,
}: DocUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [customCat, setCustomCat] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFiles([]);
      setName("");
      setCategory(defaultCategory || "building");
      setCustomCat("");
      setDescription("");
    }
  }, [open, defaultCategory]);

  if (!open) return null;

  const effectiveCat =
    category === "__new__" ? customCat.trim().toLowerCase() : category;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !effectiveCat) return;
    const items: DocItem[] = files.map((f) => ({
      file: f,
      filename:
        files.length === 1 && name.trim() ? name.trim() + extOf(f.name) : f.name,
    }));
    setBusy(true);
    try {
      await onSubmit(items, effectiveCat, description);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Upload document{files.length > 1 ? "s" : ""}</h3>

        <label>File{files.length > 1 ? "s" : ""}</label>
        <div className="doc-file-row">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="doc-file-pill"
          >
            {files.length ? "+ Add more" : "+ Choose files"}
          </button>
          {files.map((f, i) => (
            <span className="doc-file-chip" key={`${f.name}-${i}`}>
              {f.name}
              <span
                className="x"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ✕
              </span>
            </span>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files || []);
            if (!fs.length) return;
            setFiles((prev) => [...prev, ...fs]);
            if (files.length === 0 && fs.length === 1) setName(baseName(fs[0].name));
            else setName("");
            e.target.value = "";
          }}
        />

        {files.length === 1 && (
          <>
            <label>File name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Document name"
            />
          </>
        )}

        <label>
          Category <span style={{ color: "var(--brass)" }}>*</span>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          {DOC_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
          <option value="__new__">+ New category…</option>
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
          placeholder="e.g. Hansgrohe catalogue for reference"
        />

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={!files.length || !effectiveCat || busy}
            className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Uploading…" : `Upload${files.length > 1 ? ` ${files.length}` : ""}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-[#D7DECF] rounded py-2 text-[13px] text-sage hover:bg-whitewash"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
