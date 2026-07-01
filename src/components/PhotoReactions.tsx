"use client";

import { useEffect, useState } from "react";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";

const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// A broad library for the "＋" picker (no dependency — a curated spread).
const LIBRARY = [
  "😀","😃","😄","😁","😊","🙂","😍","😘","😎","🤩","🥳","😇","🤗","🤔","😅","😂",
  "🤣","😉","😌","😴","😮","😯","😲","🙄","😬","😢","😭","😤","😱","🤯","🥺","😋",
  "👍","👎","👏","🙌","🤝","🙏","💪","✌️","🤞","👌","🤙","👋","🫶","🤟","☝️","✋",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💯","🔥","✨","⭐","🌟","🎉","🎊","🏆",
  "🏠","🏡","🏗️","🧱","🔨","🪚","🪜","🚧","🪵","🧰","🚪","🪟","🌿","🌳","🌞","👀",
];

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

  const myEmoji = rows.find((r) => r.user_id === userId)?.emoji;

  const grouped: Record<string, number> = {};
  rows.forEach((r) => (grouped[r.emoji] = (grouped[r.emoji] || 0) + 1));
  const ordered = Object.keys(grouped).sort((a, b) => grouped[b] - grouped[a]);

  const react = async (emoji: string) => {
    if (!signedIn || !userId) return;
    setPickerOpen(false);
    if (myEmoji === emoji) {
      setRows((prev) => prev.filter((r) => r.user_id !== userId));
      await fetch(`/api/reactions?photo_id=${photoId}&user_id=${userId}`, {
        method: "DELETE",
      }).catch(() => {});
    } else {
      setRows((prev) => [...prev.filter((r) => r.user_id !== userId), { user_id: userId, emoji }]);
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
          className={`react-chip ${myEmoji === emoji ? "mine" : ""}`}
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
              <div className="lib">
                {LIBRARY.map((e, i) => (
                  <button key={`${e}-${i}`} onClick={() => react(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
