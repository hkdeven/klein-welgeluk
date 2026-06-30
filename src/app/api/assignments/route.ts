import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
  : null;

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const page_id = searchParams.get("page_id");
    const user_id = searchParams.get("user_id");

    if (page_id) {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, user:user_id(id, display_name, short_name, role)")
        .eq("page_id", page_id);
      if (error) throw error;
      return NextResponse.json({ assignments: data || [] });
    }

    if (user_id) {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, page:page_id(id, title, slug, parent_id)")
        .eq("user_id", user_id);
      if (error) throw error;
      return NextResponse.json({ assignments: data || [] });
    }

    return NextResponse.json({ error: "page_id or user_id required" }, { status: 400 });
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
    const { page_id, user_id } = await request.json();
    if (!page_id || !user_id) {
      return NextResponse.json({ error: "page_id and user_id are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("assignments")
      .upsert({ page_id, user_id }, { onConflict: "page_id,user_id" })
      .select("*, user:user_id(id, display_name, short_name, role)")
      .single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Assign error: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const page_id = searchParams.get("page_id");
    const user_id = searchParams.get("user_id");
    if (!page_id || !user_id) {
      return NextResponse.json({ error: "page_id and user_id are required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("page_id", page_id)
      .eq("user_id", user_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Unassign error: ${msg}` }, { status: 500 });
  }
}
