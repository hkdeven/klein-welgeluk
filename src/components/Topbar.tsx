"use client";

import Link from "next/link";

interface TopbarProps {
  user: {
    short_name: string;
    avatar_url?: string | null;
  };
  editMode?: boolean;
  onEditModeChange?: (enabled: boolean) => void;
}

export default function Topbar({
  user,
  editMode = false,
  onEditModeChange,
}: TopbarProps) {
  return (
    <div className="topbar sticky top-0 z-40 bg-white border-b border-[#ECE8DC]">
      <div className="text-[12px] text-sage"></div>
      <div className="flex items-center gap-[14px]">
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
          <div className="w-7 h-7 rounded-full bg-bottle text-white text-[11px] font-semibold flex items-center justify-center">
            {user.short_name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sage text-[12px]">{user.short_name}</span>
        </Link>
      </div>
    </div>
  );
}
