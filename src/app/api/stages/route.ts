import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const page_id = searchParams.get("page_id");
    const ids = searchParams.get("ids");

    // Current stage name for many pages at once (for cards).
    if (ids) {
      const arr = ids.split(",").filter(Boolean);
      const { data, error } = await supabase
        .from("stages")
        .select("page_id, name")
        .in("page_id", arr)
        .eq("is_current", true);
      if (error) throw error;
      const currents: Record<string, string> = {};
      (data || []).forEach((r: any) => (currents[r.page_id] = r.name));
      return NextResponse.json({ currents });
    }

    if (page_id) {
      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("page_id", page_id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return NextResponse.json({ stages: data || [] });
    }

    return NextResponse.json({ error: "page_id or ids required" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Add a stage at the end of a page's pipeline.
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { page_id, name } = await request.json();
    if (!page_id || !name?.trim()) {
      return NextResponse.json({ error: "page_id and name are required" }, { status: 400 });
    }
    const { data: existing } = await supabase
      .from("stages")
      .select("sort_order")
      .eq("page_id", page_id)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = existing && existing.length ? (existing[0].sort_order || 0) + 1 : 0;

    const { data, error } = await supabase
      .from("stages")
      .insert([{ page_id, name: name.trim(), sort_order: nextOrder }])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Set the current stage: marks one current and everything before it completed.
export async function PATCH(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { page_id, current_id } = await request.json();
    if (!page_id || !current_id) {
      return NextResponse.json({ error: "page_id and current_id are required" }, { status: 400 });
    }
    const { data: stages, error: selErr } = await supabase
      .from("stages")
      .select("id, sort_order")
      .eq("page_id", page_id);
    if (selErr) throw selErr;

    const cur = (stages || []).find((s: any) => s.id === current_id);
    if (!cur) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

    for (const s of stages || []) {
      await supabase
        .from("stages")
        .update({
          is_current: s.id === current_id,
          is_completed: s.sort_order < cur.sort_order,
        })
        .eq("id", s.id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
