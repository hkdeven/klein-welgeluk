"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface Page {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  children?: Page[];
}

interface SidebarProps {
  pages: Page[];
  // Whether the current user may create pages. Defaults to true (single-owner app).
  canCreate?: boolean;
}

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function Sidebar({ pages, canCreate = true }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (slug: string) => pathname === `/${slug}`;

  const groups = pages.filter((p) => p.slug !== "overview");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addParentId, setAddParentId] = useState("");

  // Default: Building expanded, others collapsed. Also expand whichever group
  // contains the page currently being viewed.
  useEffect(() => {
    if (initialized || groups.length === 0) return;
    const next: Record<string, boolean> = {};
    groups.forEach((g) => {
      const containsActive =
        pathname === `/${g.slug}` ||
        (g.children || []).some((c) => pathname === `/${c.slug}`);
      next[g.id] = g.slug === "building" || containsActive;
    });
    setExpanded(next);
    setInitialized(true);
  }, [groups, initialized, pathname]);

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // Flat list (groups + children) for the "parent" picker.
  const flat: Page[] = [];
  groups.forEach((g) => {
    flat.push(g);
    (g.children || []).forEach((c) => flat.push(c));
  });

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim()) return;
    const parent = flat.find((p) => p.id === addParentId);
    const slug = parent
      ? `${parent.slug}/${slugify(addTitle)}`
      : slugify(addTitle);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle,
          slug,
          parent_id: addParentId || null,
        }),
      });
      if (res.ok) {
        window.location.href = `/${slug}`;
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <nav className="ledger w-60 flex-shrink-0 fixed h-screen overflow-y-auto">
        <div className="house-name">
          Klein Welgeluk
          <small>build diary</small>
        </div>

        <div className="px-[22px]">
          {[
            { href: "/overview", label: "✦ Overview", slug: "overview" },
            { href: "/", label: "⌂ Home", slug: "" },
            { href: "/documents", label: "▤ Documents", slug: "documents" },
            { href: "/calendar", label: "◫ Calendar", slug: "calendar" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-[9px] px-[22px] py-[9px] text-[13px] ${
                isActive(l.slug)
                  ? "bg-[rgba(250,249,245,0.08)] border-l-2 border-brass text-white"
                  : "text-[rgba(250,249,245,0.82)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="mt-[14px]">
          {groups.map((group) => {
            const open = !!expanded[group.id];
            return (
              <div key={group.id}>
                <div className="flex items-center px-[22px] py-[8px]">
                  <button
                    onClick={() => toggle(group.id)}
                    className="text-mist text-[10px] w-4 flex-shrink-0 text-left"
                    title={open ? "Collapse" : "Expand"}
                  >
                    {open ? "▾" : "▸"}
                  </button>
                  <Link
                    href={`/${group.slug}`}
                    className={`flex-1 text-[10.5px] tracking-[0.13em] uppercase font-semibold ${
                      isActive(group.slug)
                        ? "text-white"
                        : "text-mist hover:text-white"
                    }`}
                  >
                    {group.title}
                  </Link>
                </div>

                {open &&
                  group.children?.map((child) => (
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
            );
          })}
        </div>

        {/* Single add-page action at the very end */}
        {canCreate && (
          <div className="mt-[18px] px-[22px]">
            {showAdd ? (
              <form onSubmit={submitAdd} className="space-y-2">
                <input
                  autoFocus
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="New page title"
                  className="w-full rounded px-2 py-1.5 text-[12px] text-pine"
                />
                <select
                  value={addParentId}
                  onChange={(e) => setAddParentId(e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-[12px] text-pine"
                >
                  <option value="">Top-level page</option>
                  {flat.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.parent_id ? `— ${p.title}` : p.title}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-brass text-white rounded py-1.5 text-[12px] font-medium"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="text-[rgba(250,249,245,0.6)] text-[12px] px-2"
                  >
                    cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="text-[rgba(250,249,245,0.7)] hover:text-white text-[12px]"
              >
                + Add page
              </button>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
