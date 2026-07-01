import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyUsers } from "@/lib/notify";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
  : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Fetch error: ${msg}` }, { status: 500 });
  }
}

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

    // Snapshot current tags/creator so we can notify only the newly-added people.
    const { data: before } = await supabase
      .from("calendar_events")
      .select("tagged_user_ids, created_by")
      .eq("id", params.id)
      .single();
    const prevTags: string[] = before?.tagged_user_ids || [];

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

    // Notify people newly tagged by this edit (author edits their own event).
    if (Array.isArray(data?.tagged_user_ids)) {
      const added = (data.tagged_user_ids as string[]).filter(
        (id) => !prevTags.includes(id)
      );
      if (added.length) {
        await notifyUsers(
          added.map((uid) => ({
            user_id: uid,
            actor_id: before?.created_by || data.created_by,
            type: "event_tagged" as const,
            title: "You were tagged in an event",
            body: data.title,
            link: `/calendar?event=${data.id}`,
            ref_id: data.id,
          }))
        );
      }
    }

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
