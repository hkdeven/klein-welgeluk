import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
    : null;

// List a user's latest notifications + their unread count.
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;

    const { count, error: cErr } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .is("read_at", null);
    if (cErr) throw cErr;

    return NextResponse.json({ notifications: data || [], unread: count || 0 });
  } catch (error) {
    const msg = (error as Error).message;
    // If the table doesn't exist yet, degrade gracefully so the bell just shows 0.
    if (
      /notifications/i.test(msg) &&
      /(does not exist|could not find the table|schema cache)/i.test(msg)
    ) {
      return NextResponse.json({ notifications: [], unread: 0 });
    }
    console.error("Notifications fetch error:", msg);
    return NextResponse.json({ error: `Fetch error: ${msg}` }, { status: 500 });
  }
}

// Mark notifications read. Body: { user_id, all?: true, ids?: string[] }.
export async function PATCH(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { user_id, ids, all } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    let q = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .is("read_at", null);
    if (!all && Array.isArray(ids) && ids.length) {
      q = q.in("id", ids);
    }
    const { error } = await q;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Notifications update error:", msg);
    return NextResponse.json({ error: `Update error: ${msg}` }, { status: 500 });
  }
}
