"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Page {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  children?: Page[];
}

interface SidebarProps {
  pages: Page[];
  user: {
    short_name: string;
    avatar_url?: string | null;
  };
  editMode?: boolean;
  onEditModeChange?: (enabled: boolean) => void;
}

export default function Sidebar({
  pages,
  user,
  editMode = false,
  onEditModeChange,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (slug: string) => {
    return pathname === `/${slug}`;
  };

  return (
    <div className="flex h-screen">
      <nav className="ledger w-60 flex-shrink-0 fixed h-screen overflow-y-auto">
        <div className="house-name">
          Klein Welgeluk
          <small>build diary</small>
        </div>

        <div className="px-[22px]">
          <Link
            href="/"
            className={`flex items-center gap-[9px] px-[22px] py-[9px] text-[13px] ${
              isActive("") ? "bg-[rgba(250,249,245,0.08)] border-l-2 border-brass text-white" : "text-[rgba(250,249,245,0.82)]"
            }`}
          >
            ⌂ Home
          </Link>
          <Link
            href="/documents"
            className={`flex items-center gap-[9px] px-[22px] py-[9px] text-[13px] ${
              isActive("documents") ? "bg-[rgba(250,249,245,0.08)] border-l-2 border-brass text-white" : "text-[rgba(250,249,245,0.82)]"
            }`}
          >
            ▤ Documents
          </Link>
          <Link
            href="/calendar"
            className={`flex items-center gap-[9px] px-[22px] py-[9px] text-[13px] ${
              isActive("calendar") ? "bg-[rgba(250,249,245,0.08)] border-l-2 border-brass text-white" : "text-[rgba(250,249,245,0.82)]"
            }`}
          >
            ◫ Calendar
          </Link>
        </div>

        <div className="mt-[14px]">
          {pages.map((page) => (
            <div key={page.id}>
              <div className="px-[22px] py-[8px] text-[10.5px] tracking-[0.13em] uppercase text-mist font-semibold mb-[6px]">
                {page.title}
              </div>
              {page.children?.map((child) => (
                <Link
                  key={child.id}
                  href={`/${child.slug}`}
                  className={`block px-[30px] py-[8px] text-[13px] ${
                    isActive(child.slug)
                      ? "bg-[rgba(250,249,245,0.08)] border-l-2 border-brass text-white font-medium"
                      : "text-[rgba(250,249,245,0.78)] border-l-2 border-transparent"
                  }`}
                >
                  {child.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <div className="flex-1 ml-60">
        <div className="topbar sticky top-0 z-40 bg-white border-b">
          <div className="text-[12px] text-sage"></div>
          <div className="flex items-center gap-[14px]">
            <button
              onClick={() => onEditModeChange?.(!editMode)}
              className={`flex items-center gap-[7px] border rounded-full py-1 px-3 font-mono text-[11px] ${
                editMode
                  ? "bg-bottle text-white border-bottle"
                  : "bg-white text-sage border-[#D7DECF]"
              }`}
            >
              <span>edit mode</span>
              <span>{editMode ? "on" : "off"}</span>
            </button>
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
      </div>
    </div>
  );
}
