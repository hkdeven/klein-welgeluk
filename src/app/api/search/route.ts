import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    })
  : null;

const one = (rel: any) => (Array.isArray(rel) ? rel[0] : rel) || {};

// Strip HTML so comment/brief matches show clean text.
const stripHtml = (s?: string) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// A short snippet centered on the first match, so the user sees why it matched.
const snippet = (text: string, q: string, len = 90) => {
  const clean = stripHtml(text);
  const i = clean.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return clean.slice(0, len);
  const start = Math.max(0, i - 30);
  return (start > 0 ? "…" : "") + clean.slice(start, start + len) + (clean.length > start + len ? "…" : "");
};

export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const raw = (req.nextUrl.searchParams.get("q") || "").trim();
    const isGuest = req.nextUrl.searchParams.get("guest") === "1";
    // Sanitize for the PostgREST `or` filter (commas/parens/percent are operators).
    const q = raw.replace(/[%,()*]/g, " ").trim();
    if (q.length < 2) {
      return NextResponse.json({ results: [], counts: {} });
    }
    const like = `%${q}%`;

    // Milestones/decisions/snags are hidden from guests in the UI, so skip them.
    const guestSkip = Promise.resolve({ data: [] as any[] });

    const [pagesR, photosR, docsR, commentsR, milestonesR, decisionsR, snagsR] = await Promise.all([
      supabase
        .from("pages")
        .select("id, title, slug, brief")
        .or(`title.ilike.${like},brief.ilike.${like}`)
        .limit(8),
      supabase
        .from("photos")
        .select("id, caption, category, page_id, page:page_id(title, slug)")
        .ilike("caption", like)
        .order("created_at", { ascending: false })
        .limit(6),
      // Documents are hidden from guests everywhere, so skip them for guests.
      isGuest
        ? Promise.resolve({ data: [] as any[] })
        : supabase
            .from("documents")
            .select("id, filename, caption, category, page:page_id(title, slug)")
            .or(`filename.ilike.${like},caption.ilike.${like}`)
            .order("created_at", { ascending: false })
            .limit(6),
      supabase
        .from("comments")
        .select("id, body, page_id, photo_id, author:author_id(short_name), page:page_id(title, slug)")
        .not("page_id", "is", null)
        .ilike("body", like)
        .order("created_at", { ascending: false })
        .limit(6),
      isGuest
        ? guestSkip
        : supabase
            .from("milestones")
            .select("id, title, page_id")
            .ilike("title", like)
            .limit(6),
      isGuest
        ? guestSkip
        : supabase
            .from("decisions")
            .select("id, title, detail, page_id")
            .or(`title.ilike.${like},detail.ilike.${like}`)
            .order("created_at", { ascending: false })
            .limit(6),
      isGuest
        ? guestSkip
        : supabase
            .from("snags")
            .select("id, title, note, page_id")
            .or(`title.ilike.${like},note.ilike.${like}`)
            .order("created_at", { ascending: false })
            .limit(6),
    ]);

    // These tables have no FK to pages, so resolve their page slugs manually.
    const pageIds = Array.from(
      new Set(
        [
          ...(milestonesR.data || []),
          ...(decisionsR.data || []),
          ...(snagsR.data || []),
        ]
          .map((r: any) => r.page_id)
          .filter(Boolean)
      )
    );
    const pageMap: Record<string, { title: string; slug: string }> = {};
    if (pageIds.length) {
      const { data: pm } = await supabase.from("pages").select("id, title, slug").in("id", pageIds);
      (pm || []).forEach((p: any) => (pageMap[p.id] = { title: p.title, slug: p.slug }));
    }

    const results: any[] = [];

    (pagesR.data || []).forEach((p: any) =>
      results.push({
        type: "page",
        id: p.id,
        title: p.title,
        subtitle: stripHtml(p.brief).slice(0, 80) || "Page",
        href: `/${p.slug}`,
      })
    );
    (photosR.data || []).forEach((p: any) => {
      const pg = one(p.page);
      results.push({
        type: "photo",
        id: p.id,
        title: p.caption || "Photo",
        subtitle: pg.title ? `in ${pg.title}` : "Photo",
        href: pg.slug ? `/${pg.slug}` : "/photos",
      });
    });
    (docsR.data || []).forEach((d: any) => {
      const pg = one(d.page);
      results.push({
        type: "document",
        id: d.id,
        title: d.filename,
        subtitle: [pg.title && `in ${pg.title}`, d.category].filter(Boolean).join(" · ") || "Document",
        href: pg.slug ? `/${pg.slug}` : "/documents",
      });
    });
    (commentsR.data || []).forEach((c: any) => {
      const pg = one(c.page);
      results.push({
        type: "comment",
        id: c.id,
        title: snippet(c.body, q),
        subtitle: `${one(c.author).short_name || "Someone"}${pg.title ? ` on ${pg.title}` : ""}`,
        href: pg.slug ? `/${pg.slug}#comments` : "#",
      });
    });
    (milestonesR.data || []).forEach((m: any) => {
      const pg = pageMap[m.page_id];
      results.push({
        type: "milestone",
        id: m.id,
        title: m.title,
        subtitle: pg?.title ? `in ${pg.title}` : "Milestone",
        href: pg?.slug ? `/${pg.slug}` : "/overview",
      });
    });
    (decisionsR.data || []).forEach((d: any) => {
      const pg = pageMap[d.page_id];
      const inDetail = d.detail && stripHtml(d.detail).toLowerCase().includes(q.toLowerCase());
      results.push({
        type: "decision",
        id: d.id,
        title: d.title,
        subtitle:
          (inDetail ? snippet(d.detail, q, 60) : pg?.title ? `in ${pg.title}` : "Decision"),
        href: pg?.slug ? `/${pg.slug}` : "/overview",
      });
    });
    (snagsR.data || []).forEach((s: any) => {
      const pg = pageMap[s.page_id];
      const inNote = s.note && stripHtml(s.note).toLowerCase().includes(q.toLowerCase());
      results.push({
        type: "snag",
        id: s.id,
        title: s.title,
        subtitle: inNote ? snippet(s.note, q, 60) : pg?.title ? `in ${pg.title}` : "Snag",
        href: pg?.slug ? `/${pg.slug}` : "#",
      });
    });

    const counts = {
      page: (pagesR.data || []).length,
      photo: (photosR.data || []).length,
      document: (docsR.data || []).length,
      comment: (commentsR.data || []).length,
      milestone: (milestonesR.data || []).length,
      decision: (decisionsR.data || []).length,
      snag: (snagsR.data || []).length,
    };

    return NextResponse.json({ results, counts });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Search error:", msg);
    return NextResponse.json({ error: `Search error: ${msg}` }, { status: 500 });
  }
}
