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
  /snags/i.test(msg) && /(does not exist|could not find the table|schema cache)/i.test(msg);
const missingCol = (msg: string) =>
  /(fixed_at|fixed_by|photo_id)/i.test(msg) &&
  /(does not exist|could not find|schema cache)/i.test(msg);

// No FKs on snags, so join the "fixed by" user and the linked photo manually.
async function enrich(rows: any[]) {
  if (!supabase || !rows.length) return rows;
  const fixerIds = [...new Set(rows.map((r) => r.fixed_by).filter(Boolean))];
  const photoIds = [...new Set(rows.map((r) => r.photo_id).filter(Boolean))];
  const [uRes, pRes] = await Promise.all([
    fixerIds.length
      ? supabase.from("users").select("id, short_name").in("id", fixerIds)
      : Promise.resolve({ data: [] as any[] }),
    photoIds.length
      ? supabase
          .from("photos")
          .select(
            "id, storage_path, external_url, caption, category, created_at, uploaded_by, uploader:uploaded_by(short_name, avatar_url)"
          )
          .in("id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const uMap = Object.fromEntries((uRes.data || []).map((u: any) => [u.id, u]));
  const pMap = Object.fromEntries((pRes.data || []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    fixer: r.fixed_by ? { short_name: uMap[r.fixed_by]?.short_name } : null,
    photo: r.photo_id ? pMap[r.photo_id] || null : null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const page_id = new URL(request.url).searchParams.get("page_id");
    if (!page_id) return NextResponse.json({ error: "page_id is required" }, { status: 400 });
    const { data, error } = await supabase
      .from("snags")
      .select("*")
      .eq("page_id", page_id)
      .order("is_fixed", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ snags: await enrich(data || []) });
  } catch (error) {
    const msg = (error as Error).message;
    if (missingTable(msg)) return NextResponse.json({ snags: [] });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const { page_id, title, note } = await request.json();
    if (!page_id || !title?.trim()) {
      return NextResponse.json({ error: "page_id and title are required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("snags")
      .insert([{ page_id, title: title.trim(), note: note || null }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const { id, is_fixed, photo_id, user_id } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (is_fixed !== undefined) {
      patch.is_fixed = !!is_fixed;
      patch.fixed_at = is_fixed ? new Date().toISOString() : null;
      patch.fixed_by = is_fixed ? user_id || null : null;
    }
    if (photo_id !== undefined) patch.photo_id = photo_id || null;

    let { data, error } = await supabase
      .from("snags")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    // Fall back to just the fixed flag if the new columns aren't there yet.
    if (error && missingCol(error.message)) {
      ({ data, error } = await supabase
        .from("snags")
        .update({ is_fixed: !!is_fixed })
        .eq("id", id)
        .select()
        .single());
    }
    if (error) throw error;
    return NextResponse.json((await enrich([data]))[0]);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { error } = await supabase.from("snags").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
