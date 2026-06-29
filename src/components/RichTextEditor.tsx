"use client";

import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLBAR: { cmd: string; label: ReactToolbarLabel; title: string }[] = [
  { cmd: "bold", label: { tag: "b", text: "B" }, title: "Bold" },
  { cmd: "italic", label: { tag: "i", text: "I" }, title: "Italic" },
  { cmd: "strikeThrough", label: { tag: "s", text: "S" }, title: "Strikethrough" },
  { cmd: "insertUnorderedList", label: { tag: "span", text: "• List" }, title: "Bulleted list" },
  { cmd: "insertOrderedList", label: { tag: "span", text: "1. List" }, title: "Numbered list" },
];

type ReactToolbarLabel = { tag: "b" | "i" | "s" | "span"; text: string };

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something...",
  minHeight = 120,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value into the editor only when it differs (avoids cursor jumps while typing).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false);
    onChange(ref.current?.innerHTML || "");
  };

  const handleInput = () => {
    onChange(ref.current?.innerHTML || "");
  };

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {TOOLBAR.map(({ cmd, label, title }) => {
          const Tag = label.tag;
          return (
            <button
              key={cmd}
              type="button"
              title={title}
              className="rte-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(cmd)}
            >
              <Tag>{label.text}</Tag>
            </button>
          );
        })}
      </div>
      <div
        ref={ref}
        className="rte-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={handleInput}
      />
    </div>
  );
}
