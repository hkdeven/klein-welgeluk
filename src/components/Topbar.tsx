"use client";

import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/components/AuthProvider";

interface TopbarProps {
  user: {
    short_name: string;
    avatar_url?: string | null;
  };
  editMode?: boolean;
  onEditModeChange?: (enabled: boolean) => void;
  onMenuClick?: () => void;
}

export default function Topbar({
  user,
  editMode = false,
  onEditModeChange,
  onMenuClick,
}: TopbarProps) {
  const { isGuest, signOut } = useAuth();
  return (
    <div className="topbar sticky top-0 z-40 bg-[#5c7a5e1f] border-b border-[#5c7a5e52]">
      {/* Always-present left slot so justify-between keeps controls on the right;
          the hamburger inside is only visible on mobile. */}
      <div className="flex items-center">
        {onMenuClick && (
          <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Menu">
            ☰
          </button>
        )}
      </div>
      <div className="flex items-center gap-[14px]">
        <NotificationBell />
        {onEditModeChange && (
          <button
            onClick={() => onEditModeChange(!editMode)}
            title={editMode ? "Edit mode on" : "Edit mode off"}
            aria-label={editMode ? "Edit mode on" : "Edit mode off"}
            className={`inline-flex items-center gap-[5px] rounded-full py-[4px] px-[10px] text-[11px] border ${
              editMode
                ? "bg-bottle text-white border-bottle"
                : "bg-[rgb(255_255_255_/_78%)] text-sage border-[#b7c4b6] hover:border-sage"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
              <path d="M13.5 6.5l4 4" />
            </svg>
            {editMode ? "Editing" : "Edit"}
          </button>
        )}
        {isGuest ? (
          // Guests have no profile page — show a plain label + a sign-out button.
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-bottle text-white text-[11px] font-semibold flex items-center justify-center overflow-hidden">
              {user.short_name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sage text-[12px]">{user.short_name}</span>
            <button
              onClick={signOut}
              className="text-bottle underline text-[12px] ml-1"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/profile"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          >
            <div className="w-7 h-7 rounded-full bg-bottle text-white text-[11px] font-semibold flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                user.short_name?.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-sage text-[12px]">{user.short_name}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
