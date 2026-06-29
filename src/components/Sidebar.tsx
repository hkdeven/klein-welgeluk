"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface Page {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  children?: Page[];
}

interface SidebarProps {
  pages: Page[];
  // Whether the current user may create/delete pages. Defaults to true (single-owner app).
  canCreate?: boolean;
  // Delete controls only appear when the current page is in edit mode.
  editMode?: boolean;
}

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function Sidebar({ pages, canCreate = true, editMode = false }: SidebarProps) {
  const pathname = usePathname();
  const activeSlug = decodeURIComponent((pathname || "").replace(/^\//, ""));
  const isActive = (slug: string) => activeSlug === slug;

  const groups = pages.filter((p) => p.slug !== "overview");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addParentId, setAddParentId] = useState("");

  // A node is "on the active path" if the current page is it or nested under it.
  const onPath = (node: Page) =>
    activeSlug === node.slug || activeSlug.startsWith(node.slug + "/");

  const isOpen = (node: Page, depth: number) => {
    if (node.id in expanded) return expanded[node.id];
    return depth === 0 ? node.slug === "building" || onPath(node) : onPath(node);
  };

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // Flat list (all depths) for the "parent" picker.
  const flat: Page[] = [];
  const collect = (list: Page[]) =>
    list.forEach((n) => {
      flat.push(n);
      if (n.children) collect(n.children);
    });
  collect(groups);

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim()) return;
    const parent = flat.find((p) => p.id === addParentId);
    const slug = parent ? `${parent.slug}/${slugify(addTitle)}` : slugify(addTitle);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: addTitle, slug, parent_id: addParentId || null }),
      });
      if (res.ok) window.location.href = `/${slug}`;
    } catch {
      /* ignore */
    }
  };

  const deletePage = async (node: Page) => {
    const hasKids = (node.children?.length ?? 0) > 0;
    if (
      !confirm(
        `Delete "${node.title}"${hasKids ? " and all its sub-pages" : ""}? This cannot be undone.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/pages/${node.id}`, { method: "DELETE" });
      if (!res.ok) return;
      // If we're viewing the deleted page (or a descendant), go home; else refresh the tree.
      window.location.href = onPath(node) ? "/" : window.location.pathname;
    } catch {
      /* ignore */
    }
  };

  const renderNode = (node: Page, depth: number) => {
    const hasKids = (node.children?.length ?? 0) > 0;
    const open = isOpen(node, depth);
    const active = isActive(node.slug);
    return (
      <div key={node.id}>
        <div
          className={`flex items-center pr-2 ${
            active && depth > 0 ? "bg-[rgba(250,249,245,0.08)] border-l-2 border-brass" : "border-l-2 border-transparent"
          }`}
          style={{ paddingLeft: depth === 0 ? 22 : 22 + depth * 14 }}
        >
          {hasKids ? (
            <button
              onClick={() => toggle(node.id)}
              className="text-mist text-[10px] w-4 flex-shrink-0 text-left"
              title={open ? "Collapse" : "Expand"}
            >
              {open ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          <Link
            href={`/${node.slug}`}
            className={
              depth === 0
                ? `flex-1 py-[8px] text-[10.5px] tracking-[0.13em] uppercase font-semibold ${
                    active ? "text-white" : "text-mist hover:text-white"
                  }`
                : `flex-1 py-[8px] text-[13px] ${
                    active ? "text-white font-medium" : "text-[rgba(250,249,245,0.78)] hover:text-white"
                  }`
            }
          >
            {node.title}
          </Link>
          {canCreate && editMode && !hasKids && (
            <button
              onClick={() => deletePage(node)}
              title={`Delete ${node.title}`}
              className="text-[rgba(250,249,245,0.35)] hover:text-[#E6A0A0] text-[12px] px-1 flex-shrink-0"
            >
              ✕
            </button>
          )}
        </div>
        {open && hasKids && node.children!.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <nav className="ledger w-60 flex-shrink-0 fixed h-screen overflow-y-auto">
        <div className="logo-lockup">
          <div className="mono-badge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kw-monogram.png" alt="Klein Welgeluk" />
          </div>
          <div className="word">
            Klein
            <br />
            Welgeluk
            <small>build diary</small>
          </div>
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

        <div className="mt-[14px]">{groups.map((g) => renderNode(g, 0))}</div>

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
                      {"— ".repeat(p.slug.split("/").length - 1)}
                      {p.title}
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
