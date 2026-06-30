import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      // Bypass Next's fetch cache so activity always reflects current data.
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    })
  : null;

// Related records come back as an object (to-one) — guard for array just in case.
const one = (rel: any) => (Array.isArray(rel) ? rel[0] : rel) || {};

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const [comments, photos, documents, events, pages] = await Promise.all([
      supabase
        .from("comments")
        .select("id, created_at, author:author_id(short_name), page:page_id(title, slug)")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("photos")
        .select("id, created_at, uploader:uploaded_by(short_name), page:page_id(title, slug)")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("documents")
        .select("id, filename, created_at, uploader:uploaded_by(short_name), page:page_id(title, slug)")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("calendar_events")
        .select("id, title, created_at, creator:created_by(short_name)")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("pages")
        .select("id, title, slug, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const items: any[] = [];

    (comments.data || []).forEach((c: any) =>
      items.push({
        id: `c_${c.id}`,
        type: "comment",
        refId: c.id,
        when: c.created_at,
        who: one(c.author).short_name || null,
        action: "commented on",
        target: one(c.page).title || "a page",
        slug: one(c.page).slug || null,
      })
    );
    (photos.data || []).forEach((p: any) =>
      items.push({
        id: `ph_${p.id}`,
        type: "photo",
        refId: p.id,
        when: p.created_at,
        who: one(p.uploader).short_name || null,
        action: "added a photo to",
        target: one(p.page).title || "a page",
        slug: one(p.page).slug || null,
      })
    );
    (documents.data || []).forEach((d: any) =>
      items.push({
        id: `d_${d.id}`,
        type: "document",
        refId: d.id,
        when: d.created_at,
        who: one(d.uploader).short_name || null,
        action: "uploaded a document to",
        target: one(d.page).title || "a page",
        slug: one(d.page).slug || null,
      })
    );
    (events.data || []).forEach((e: any) =>
      items.push({
        id: `e_${e.id}`,
        type: "event",
        refId: e.id,
        when: e.created_at,
        who: one(e.creator).short_name || null,
        action: "added a calendar event",
        target: e.title,
        slug: null,
      })
    );
    (pages.data || []).forEach((pg: any) =>
      items.push({
        id: `pg_${pg.id}`,
        type: "page",
        refId: pg.id,
        when: pg.created_at,
        who: null,
        action: "New page created:",
        target: pg.title,
        slug: pg.slug,
      })
    );

    items.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

    return NextResponse.json({ activity: items.slice(0, 50) });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Activity fetch error:", msg);
    return NextResponse.json({ error: `Activity error: ${msg}` }, { status: 500 });
  }
}
