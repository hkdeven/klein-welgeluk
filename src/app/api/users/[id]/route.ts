import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.role === "owner" || body.role === "collaborator") updates.role = body.role;
    if (typeof body.display_name === "string") updates.display_name = body.display_name;
    if (typeof body.short_name === "string") updates.short_name = body.short_name;
    if (typeof body.avatar_url === "string") updates.avatar_url = body.avatar_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `Update error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { error } = await supabase.from("users").delete().eq("id", params.id);
    if (error) {
      // Most likely the user has content (comments/uploads) referencing them.
      return NextResponse.json(
        {
          error:
            "Can't remove — this person has comments or uploads. Switch them to collaborator instead.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Delete error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
