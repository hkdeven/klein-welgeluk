import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Whether a guest passcode has been set (for UI hints).
export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { count, error } = await supabase
      .from("guest_passcode")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ isSet: (count || 0) > 0 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Owners set/replace the guest passcode.
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { passcode, set_by } = await request.json();
    if (!passcode || passcode.length < 4) {
      return NextResponse.json(
        { error: "Passcode must be at least 4 characters" },
        { status: 400 }
      );
    }
    if (!set_by) {
      return NextResponse.json({ error: "set_by user id is required" }, { status: 400 });
    }

    // Single active passcode: clear any existing, then insert the new one.
    await supabase.from("guest_passcode").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error } = await supabase
      .from("guest_passcode")
      .insert([{ passcode_hash: hash(passcode), created_by: set_by }]);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Set error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
