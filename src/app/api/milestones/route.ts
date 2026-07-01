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
  /milestones/i.test(msg) &&
  /(does not exist|could not find the table|schema cache)/i.test(msg);

export async function GET() {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const { data, error } = await supabase
      .from("milestones")
      .select("*")
      .order("milestone_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ milestones: data || [] });
  } catch (error) {
    const msg = (error as Error).message;
    if (missingTable(msg)) return NextResponse.json({ milestones: [] });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const { title, milestone_date, end_date, precision, page_id } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const base = {
      title: title.trim(),
      milestone_date: milestone_date || null,
      page_id: page_id || null,
    };
    let { data, error } = await supabase
      .from("milestones")
      .insert([{ ...base, end_date: end_date || null, precision: precision || null }])
      .select("*")
      .single();
    // If the end_date/precision columns haven't been added yet, store the basics
    // so month/date milestones still work (range/precision need the ALTER).
    if (error && /end_date|precision/i.test(error.message)) {
      ({ data, error } = await supabase.from("milestones").insert([base]).select("*").single());
    }
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
