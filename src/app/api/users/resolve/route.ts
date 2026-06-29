import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Maps an authenticated email to a row in the `users` table, creating a
// collaborator row on first sign-in so inserts (author_id etc.) stay valid.
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { email, display_name } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const { data: existing, error: selErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing) return NextResponse.json(existing);

    const name = (display_name as string) || email.split("@")[0];
    const shortName = name.split(" ")[0];
    const { data: created, error: insErr } = await supabase
      .from("users")
      .insert([{ email, display_name: name, short_name: shortName, role: "collaborator" }])
      .select()
      .single();
    if (insErr) throw insErr;

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("User resolve error:", msg);
    return NextResponse.json({ error: `Resolve error: ${msg}` }, { status: 500 });
  }
}
