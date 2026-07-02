"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";

// Full emoji picker (all emoji + search), loaded client-side only and on demand.
const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface Row {
  user_id: string;
  emoji: string;
}

export default function PhotoReactions({
  photoId,
  onChange,
}: {
  photoId: string;
  onChange?: () => void;
}) {
  const user = useCurrentUser();
  const { signedIn } = useAuth();
  const userId = user?.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);

  // Load the emoji dataset the first time the picker is opened.
  useEffect(() => {
    if (pickerOpen && !emojiData) {
      import("@emoji-mart/data").then((m) => setEmojiData(m.default)).catch(() => {});
    }
  }, [pickerOpen, emojiData]);

  useEffect(() => {
    let active = true;
    setPickerOpen(false);
    fetch(`/api/reactions?photo_id=${photoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setRows(d.reactions || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [photoId]);

  // A user may add several different emoji to one photo.
  const mine = new Set(rows.filter((r) => r.user_id === userId).map((r) => r.emoji));

  const grouped: Record<string, number> = {};
  rows.forEach((r) => (grouped[r.emoji] = (grouped[r.emoji] || 0) + 1));
  const ordered = Object.keys(grouped).sort((a, b) => grouped[b] - grouped[a]);

  const react = async (emoji: string) => {
    if (!signedIn || !userId) return;
    setPickerOpen(false);
    if (mine.has(emoji)) {
      setRows((prev) => prev.filter((r) => !(r.user_id === userId && r.emoji === emoji)));
      await fetch(
        `/api/reactions?photo_id=${photoId}&user_id=${userId}&emoji=${encodeURIComponent(emoji)}`,
        { method: "DELETE" }
      ).catch(() => {});
    } else {
      setRows((prev) => [...prev, { user_id: userId, emoji }]);
      await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_id: photoId, user_id: userId, emoji }),
      }).catch(() => {});
    }
    onChange?.();
  };

  return (
    <div className="photo-reactions">
      {ordered.map((emoji) => (
        <button
          key={emoji}
          onClick={() => react(emoji)}
          className={`react-chip ${mine.has(emoji) ? "mine" : ""}`}
          disabled={!signedIn}
        >
          <span>{emoji}</span>
          <span className="cnt">{grouped[emoji]}</span>
        </button>
      ))}

      {signedIn && (
        <div className="react-add-wrap">
          <button
            className="react-add"
            onClick={() => setPickerOpen((o) => !o)}
            aria-label="Add reaction"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="10" cy="10" r="7" />
              <path d="M7.5 9h.01M12.5 9h.01M7 12.5c.8.9 1.9 1.4 3 1.4s2.2-.5 3-1.4" />
            </svg>
            <span className="plus">+</span>
          </button>

          {pickerOpen && (
            <div className="react-picker" onClick={(e) => e.stopPropagation()}>
              <div className="quick">
                {QUICK.map((e) => (
                  <button key={e} onClick={() => react(e)}>
                    {e}
                  </button>
                ))}
              </div>
              {emojiData && (
                <EmojiPicker
                  data={emojiData}
                  onEmojiSelect={(e: any) => react(e.native)}
                  theme="light"
                  previewPosition="none"
                  searchPosition="sticky"
                  skinTonePosition="search"
                  dynamicWidth={true}
                  maxFrequentRows={1}
                  navPosition="top"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
