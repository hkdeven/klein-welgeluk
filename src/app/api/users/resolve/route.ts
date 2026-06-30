import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
  : null;

// Invite-only: maps an authenticated email to an existing `users` row.
// Unknown emails are rejected (403) — an owner must add them first.
// Backfills the Google profile photo ONLY when the row has no avatar yet, so a
// user's own uploaded avatar is never overwritten on subsequent sign-ins.
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { email, avatar_url } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const { data: existing, error: selErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!existing) {
      return NextResponse.json(
        { error: "This account isn't on the team yet. Ask an owner to add you." },
        { status: 403 }
      );
    }

    // Backfill the avatar from Google only when the row has none — never clobber
    // an avatar the user has already set (e.g. their own uploaded photo).
    if (avatar_url && !existing.avatar_url) {
      const { data: updated, error: updErr } = await supabase
        .from("users")
        .update({ avatar_url })
        .eq("id", existing.id)
        .select()
        .single();
      if (!updErr && updated) return NextResponse.json(updated);
    }

    return NextResponse.json(existing);
  } catch (error) {
    const msg = (error as Error).message;
    console.error("User resolve error:", msg);
    return NextResponse.json({ error: `Resolve error: ${msg}` }, { status: 500 });
  }
}
