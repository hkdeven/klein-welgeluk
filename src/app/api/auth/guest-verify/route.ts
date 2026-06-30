import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
  : null;

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { passcode } = await request.json();
    if (!passcode) {
      return NextResponse.json({ error: "Passcode required" }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from("guest_passcode")
      .select("passcode_hash")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (!row) {
      return NextResponse.json(
        { error: "Guest access hasn't been set up yet" },
        { status: 400 }
      );
    }

    if (hash(passcode) !== row.passcode_hash) {
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
    }

    return NextResponse.json({ success: true, role: "guest" });
  } catch (error) {
    return NextResponse.json(
      { error: `Verify error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
