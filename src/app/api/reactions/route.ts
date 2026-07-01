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
  /reactions/i.test(msg) &&
  /(does not exist|could not find the table|schema cache)/i.test(msg);

// Reactions for one photo (?photo_id=) or many (?photo_ids=a,b,c).
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const photo_id = searchParams.get("photo_id");
    const photo_ids = searchParams.get("photo_ids");

    let q = supabase.from("reactions").select("photo_id, user_id, emoji");
    if (photo_id) q = q.eq("photo_id", photo_id);
    else if (photo_ids) q = q.in("photo_id", photo_ids.split(",").filter(Boolean));
    else return NextResponse.json({ error: "photo_id or photo_ids required" }, { status: 400 });

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ reactions: data || [] });
  } catch (error) {
    const msg = (error as Error).message;
    if (missingTable(msg)) return NextResponse.json({ reactions: [] });
    console.error("Reactions fetch error:", msg);
    return NextResponse.json({ error: `Fetch error: ${msg}` }, { status: 500 });
  }
}

// Set (or change) a user's reaction on a photo — one reaction per user per photo.
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { photo_id, user_id, emoji } = await request.json();
    if (!photo_id || !user_id || !emoji) {
      return NextResponse.json(
        { error: "photo_id, user_id and emoji are required" },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("reactions")
      .upsert({ photo_id, user_id, emoji }, { onConflict: "photo_id,user_id" })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Reaction save error:", msg);
    return NextResponse.json({ error: `Save error: ${msg}` }, { status: 500 });
  }
}

// Remove a user's reaction from a photo.
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const photo_id = searchParams.get("photo_id");
    const user_id = searchParams.get("user_id");
    if (!photo_id || !user_id) {
      return NextResponse.json({ error: "photo_id and user_id are required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("photo_id", photo_id)
      .eq("user_id", user_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Delete error: ${msg}` }, { status: 500 });
  }
}
