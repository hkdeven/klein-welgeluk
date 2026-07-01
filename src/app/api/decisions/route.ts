import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
        global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
      })
    : null;

const missingTable = (msg: string) =>
  /decisions/i.test(msg) &&
  /(does not exist|could not find the table|schema cache)/i.test(msg);

// The decisions table has no FK constraints, so PostgREST can't embed related
// rows — join author + page names manually.
async function enrich(rows: any[]) {
  if (!supabase || !rows.length) return rows;
  const authorIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))];
  const pageIds = [...new Set(rows.map((r) => r.page_id).filter(Boolean))];
  const [uRes, pRes] = await Promise.all([
    authorIds.length
      ? supabase.from("users").select("id, short_name").in("id", authorIds)
      : Promise.resolve({ data: [] as any[] }),
    pageIds.length
      ? supabase.from("pages").select("id, title, slug").in("id", pageIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const uMap = Object.fromEntries((uRes.data || []).map((u: any) => [u.id, u]));
  const pMap = Object.fromEntries((pRes.data || []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    author: r.author_id ? { short_name: uMap[r.author_id]?.short_name } : null,
    page: r.page_id ? pMap[r.page_id] || null : null,
  }));
}

// ?page_id= for one page's decisions; omit for the whole-project roll-up.
export async function GET(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const page_id = new URL(request.url).searchParams.get("page_id");
    let q = supabase.from("decisions").select("*").order("created_at", { ascending: false });
    if (page_id) q = q.eq("page_id", page_id);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ decisions: await enrich(data || []) });
  } catch (error) {
    const msg = (error as Error).message;
    if (missingTable(msg)) return NextResponse.json({ decisions: [] });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const { title, detail, page_id, author_id } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("decisions")
      .insert([
        { title: title.trim(), detail: detail || null, page_id: page_id || null, author_id: author_id || null },
      ])
      .select("*")
      .single();
    if (error) throw error;
    const [enriched] = await enrich([data]);
    return NextResponse.json(enriched, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { error } = await supabase.from("decisions").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
