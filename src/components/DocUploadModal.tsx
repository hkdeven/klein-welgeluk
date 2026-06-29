"use client";

import { useEffect, useRef, useState } from "react";

export const DOC_CATEGORIES = ["building", "services", "exterior", "quotes"];

interface DocUploadModalProps {
  open: boolean;
  defaultCategory?: string;
  onClose: () => void;
  onSubmit: (file: File, category: string, description: string) => Promise<void> | void;
}

export default function DocUploadModal({
  open,
  defaultCategory = "building",
  onClose,
  onSubmit,
}: DocUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset fields each time the modal opens.
  useEffect(() => {
    if (open) {
      setFile(null);
      setCategory(defaultCategory || "building");
      setDescription("");
    }
  }, [open, defaultCategory]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !category) return;
    setBusy(true);
    try {
      await onSubmit(file, category, description);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Upload document</h3>

        <label>File</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border border-[#D7DECF] rounded px-3 py-2 text-[13px] text-left text-sage hover:bg-whitewash"
        >
          {file ? file.name : "Choose a file…"}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <label>
          Category <span style={{ color: "var(--brass)" }}>*</span>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required>
          {DOC_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

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
            disabled={!file || busy}
            className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
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
