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

// Global key/value app settings. GET is public (degrades to {} if table missing);
// PATCH is owner-only.
export async function GET() {
  try {
    if (!supabase) return NextResponse.json({ settings: {} });
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error) return NextResponse.json({ settings: {} });
    const settings: Record<string, any> = {};
    (data || []).forEach((r: any) => (settings[r.key] = r.value));
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: {} });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { key, value, user_id } = await req.json();
    if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

    // Only owners may change settings.
    const { data: u } = await supabase.from("users").select("role").eq("id", user_id).single();
    if (!u || u.role !== "owner") {
      return NextResponse.json({ error: "Owners only" }, { status: 403 });
    }

    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
