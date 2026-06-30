"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const user = useCurrentUser();
  const { signedIn } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?user_id=${userId}`);
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      /* ignore */
    }
  }, [userId]);

  // Poll while signed in: on mount, every 60s, and when the tab regains focus.
  useEffect(() => {
    if (!signedIn || !userId) return;
    load();
    const t = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [signedIn, userId, load]);

  const togglePanel = async () => {
    const next = !open;
    setOpen(next);
    // Opening the panel marks everything read.
    if (next && unread > 0 && userId) {
      setUnread(0);
      setItems((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      );
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, all: true }),
        });
      } catch {
        /* ignore */
      }
    }
  };

  const openItem = (n: Notif) => {
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const wrapRef = useRef<HTMLDivElement>(null);

  if (!signedIn) return null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={togglePanel}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-8 h-8 text-sage hover:text-bottle"
      >
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 4.8-1.5 4.8h12s-1.5-1.3-1.5-4.8A4.5 4.5 0 0 0 10 2.5Z" />
          <path d="M8.5 15a1.6 1.6 0 0 0 3 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brass text-white text-[9px] font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="notif-panel absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto bg-white border border-[#ECE8DC] rounded-lg shadow-[0_8px_30px_rgba(43,64,48,0.18)] z-50">
            <div className="px-4 py-2.5 border-b border-[#ECE8DC] text-[11px] tracking-[0.1em] uppercase text-sage">
              Notifications
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-mist">
                Nothing yet
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => openItem(n)}
                      className={`w-full text-left px-4 py-3 border-b border-[#F2EFE6] hover:bg-whitewash flex gap-2.5 ${
                        n.read_at ? "" : "bg-[#FBF8F2]"
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          n.read_at ? "bg-transparent" : "bg-brass"
                        }`}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] font-medium text-pine">
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="block text-[12px] text-sage truncate">
                            {n.body}
                          </span>
                        )}
                        <span className="block text-[10.5px] text-mist mt-0.5">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
