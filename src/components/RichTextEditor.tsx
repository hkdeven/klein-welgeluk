"use client";

import { useEffect, useRef, useState } from "react";

interface MentionUser {
  id: string;
  short_name: string;
  display_name?: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  // When provided, typing "@" opens an autocomplete of these users.
  mentionUsers?: MentionUser[];
}

const TOOLBAR: { cmd: string; label: ReactToolbarLabel; title: string }[] = [
  { cmd: "bold", label: { tag: "b", text: "B" }, title: "Bold" },
  { cmd: "italic", label: { tag: "i", text: "I" }, title: "Italic" },
  { cmd: "strikeThrough", label: { tag: "s", text: "S" }, title: "Strikethrough" },
  { cmd: "insertUnorderedList", label: { tag: "span", text: "• List" }, title: "Bulleted list" },
  { cmd: "insertOrderedList", label: { tag: "span", text: "1. List" }, title: "Numbered list" },
];

type ReactToolbarLabel = { tag: "b" | "i" | "s" | "span"; text: string };

interface MentionState {
  items: MentionUser[];
  index: number;
  top: number;
  left: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something...",
  minHeight = 120,
  mentionUsers,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mention, setMention] = useState<MentionState | null>(null);

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

  // Text from the start of the editor up to the caret — works regardless of
  // whether the caret sits in a text node or the editable element itself
  // (the latter happens often on mobile and on the first character typed).
  const textBeforeCaret = (caret: Range) => {
    if (!ref.current) return "";
    const pre = document.createRange();
    pre.selectNodeContents(ref.current);
    pre.setEnd(caret.endContainer, caret.endOffset);
    return pre.toString();
  };

  // Look at the caret; if it sits in a "@query" token, open the autocomplete.
  const checkMention = () => {
    if (!mentionUsers || !mentionUsers.length || !ref.current) return setMention(null);
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return setMention(null);
    const caret = sel.getRangeAt(0);
    if (!ref.current.contains(caret.endContainer)) return setMention(null);
    const before = textBeforeCaret(caret);
    const m = before.match(/(^|\s)@(\w*)$/);
    if (!m) return setMention(null);
    const query = m[2].toLowerCase();
    const items = mentionUsers
      .filter(
        (u) =>
          u.short_name?.toLowerCase().startsWith(query) ||
          u.display_name?.toLowerCase().startsWith(query)
      )
      .slice(0, 6);
    if (!items.length) return setMention(null);
    const rect = caret.getBoundingClientRect();
    const base = ref.current.getBoundingClientRect();
    setMention({
      items,
      index: 0,
      top: (rect.bottom || base.bottom) + 4,
      left: rect.left || base.left,
    });
  };

  const insertMention = (user: MentionUser) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !ref.current) return;
    const caret = sel.getRangeAt(0);
    const before = textBeforeCaret(caret);
    const m = before.match(/@(\w*)$/);
    if (!m) return;
    const removeLen = m[0].length; // length of "@query"
    // Select the "@query" right before the caret and replace it — using the
    // Selection API so it works across text/element node boundaries.
    for (let i = 0; i < removeLen; i++) {
      (sel as Selection & { modify: (a: string, d: string, g: string) => void }).modify(
        "extend",
        "backward",
        "character"
      );
    }
    sel.deleteFromDocument();
    document.execCommand("insertText", false, `@${user.short_name} `);
    setMention(null);
    onChange(ref.current.innerHTML || "");
  };

  const handleInput = () => {
    onChange(ref.current?.innerHTML || "");
    checkMention();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!mention) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMention({ ...mention, index: (mention.index + 1) % mention.items.length });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMention({
        ...mention,
        index: (mention.index - 1 + mention.items.length) % mention.items.length,
      });
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(mention.items[mention.index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
    }
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
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMention(null), 150)}
      />

      {mention && (
        <ul
          className="mention-menu"
          style={{ position: "fixed", top: mention.top, left: mention.left }}
        >
          {mention.items.map((u, i) => (
            <li key={u.id}>
              <button
                type="button"
                className={i === mention.index ? "active" : ""}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
              >
                <b>@{u.short_name}</b>
                {u.display_name && u.display_name !== u.short_name && (
                  <span> · {u.display_name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
