"use client";

import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

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
  return (
    <div className="topbar sticky top-0 z-40 bg-white border-b border-[#ECE8DC]">
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
            className={`flex items-center gap-[7px] border rounded-full py-1 px-3 font-mono text-[11px] ${
              editMode
                ? "bg-bottle text-white border-bottle"
                : "bg-white text-sage border-[#D7DECF]"
            }`}
          >
            <span>edit mode</span>
            <span>{editMode ? "on" : "off"}</span>
          </button>
        )}
        <Link
          href="/profile"
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
        >
          <div className="w-7 h-7 rounded-full bg-bottle text-white text-[11px] font-semibold flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              user.short_name?.charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-sage text-[12px]">{user.short_name}</span>
        </Link>
      </div>
    </div>
  );
}
