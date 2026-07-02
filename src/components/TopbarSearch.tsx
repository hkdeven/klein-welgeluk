"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type ResultType =
  | "page"
  | "milestone"
  | "decision"
  | "snag"
  | "photo"
  | "document"
  | "comment";

type Result = {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_META: Record<string, { label: string; bg: string; fg: string }> = {
  page: { label: "Page", bg: "#D8E9E6", fg: "#2E5852" },
  milestone: { label: "Milestone", bg: "#E7E0EE", fg: "#4E3A63" },
  decision: { label: "Decision", bg: "#F3E4CC", fg: "#6E4E22" },
  snag: { label: "Snag", bg: "#FAECE7", fg: "#993C1D" },
  photo: { label: "Photo", bg: "#E3ECE0", fg: "#3D5A3F" },
  document: { label: "Doc", bg: "#DCE6EE", fg: "#2F4A63" },
  comment: { label: "Comment", bg: "#F1EFE8", fg: "#5F5E5A" },
};
const GROUP_ORDER: ResultType[] = [
  "page",
  "milestone",
  "decision",
  "snag",
  "photo",
  "document",
  "comment",
];
const GROUP_LABEL: Record<string, string> = {
  page: "Pages",
  milestone: "Milestones",
  decision: "Decisions",
  snag: "Snags",
  photo: "Photos",
  document: "Documents",
  comment: "Comments",
};

// Highlight the matched substring in a label.
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="search-mark">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function TopbarSearch() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = `/api/search?q=${encodeURIComponent(term)}${isGuest ? "&guest=1" : ""}`;
        const d = await fetch(url).then((r) => r.json());
        setResults(d.results || []);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, isGuest]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Global "/" and Cmd/Ctrl+K to focus search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (r: Result) => {
      setOpen(false);
      setQuery("");
      setResults([]);
      router.push(r.href);
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  const showPanel = open && query.trim().length >= 2;
  const q = query.trim();
  let flatIndex = -1;

  return (
    <div className="topbar-search" ref={boxRef}>
      <div className="ts-field">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search"
          aria-label="Search"
          className="ts-input"
        />
        {query ? (
          <button className="ts-clear" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search">
            ×
          </button>
        ) : (
          <span className="ts-kbd" aria-hidden="true">/</span>
        )}
      </div>

      {showPanel && (
        <div className="ts-panel">
          {loading && results.length === 0 && <div className="ts-empty">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="ts-empty">No matches for “{q}”</div>
          )}
          {GROUP_ORDER.map((type) => {
            const group = results.filter((r) => r.type === type);
            if (!group.length) return null;
            return (
              <div key={type}>
                <div className="ts-group">{GROUP_LABEL[type]}</div>
                {group.map((r) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const meta = TYPE_META[r.type];
                  return (
                    <button
                      key={r.id}
                      className={`ts-row ${idx === active ? "active" : ""}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(r)}
                    >
                      <span className="ts-ic" style={{ background: meta.bg, color: meta.fg }} aria-hidden="true" />
                      <span className="ts-text">
                        <span className="ts-title"><Highlight text={r.title} q={q} /></span>
                        <span className="ts-sub">{r.subtitle}</span>
                      </span>
                      <span className="ts-tag" style={{ color: meta.fg }}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {results.length > 0 && (
            <div className="ts-foot">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span style={{ marginLeft: "auto" }}>{results.length} result{results.length === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
