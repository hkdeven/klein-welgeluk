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
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const patch: Record<string, unknown> = {};
    for (const key of [
      "title",
      "event_date",
      "event_time",
      "end_date",
      "event_type",
      "description",
      "page_id",
    ]) {
      if (key in body) patch[key] = body[key] === "" ? null : body[key];
    }
    // Title/type should never become null.
    if ("title" in body) patch.title = body.title;
    if ("event_type" in body) patch.event_type = body.event_type;
    if ("description" in body) patch.description = body.description || "";
    if (Array.isArray(body.tagged_user_ids)) {
      patch.tagged_user_ids = body.tagged_user_ids;
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .update(patch)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Calendar update error:", msg);
    return NextResponse.json({ error: `Update error: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Calendar delete error:", msg);
    return NextResponse.json(
      { error: `Delete error: ${msg}` },
      { status: 500 }
    );
  }
}
