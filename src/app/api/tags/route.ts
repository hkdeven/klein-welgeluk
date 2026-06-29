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
    const page_id = new URL(request.url).searchParams.get("page_id");

    if (page_id) {
      const { data, error } = await supabase
        .from("page_tags")
        .select("tag:tag_id(id, name)")
        .eq("page_id", page_id);
      if (error) throw error;
      const tags = (data || []).map((row: any) => row.tag).filter(Boolean);
      return NextResponse.json({ tags });
    }

    const { data, error } = await supabase.from("tags").select("*").order("name");
    if (error) throw error;
    return NextResponse.json({ tags: data || [] });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Fetch error: ${msg}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { page_id, name } = await request.json();
    if (!page_id || !name?.trim()) {
      return NextResponse.json({ error: "page_id and name are required" }, { status: 400 });
    }
    const clean = name.trim();

    // Find-or-create the tag by unique name.
    const { data: tag, error: tagErr } = await supabase
      .from("tags")
      .upsert({ name: clean }, { onConflict: "name" })
      .select()
      .single();
    if (tagErr) throw tagErr;

    // Link it to the page (idempotent).
    const { error: linkErr } = await supabase
      .from("page_tags")
      .upsert({ page_id, tag_id: tag.id }, { onConflict: "page_id,tag_id" });
    if (linkErr) throw linkErr;

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Tag error: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const page_id = searchParams.get("page_id");
    const tag_id = searchParams.get("tag_id");
    if (!page_id || !tag_id) {
      return NextResponse.json({ error: "page_id and tag_id are required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("page_tags")
      .delete()
      .eq("page_id", page_id)
      .eq("tag_id", tag_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Untag error: ${msg}` }, { status: 500 });
  }
}
