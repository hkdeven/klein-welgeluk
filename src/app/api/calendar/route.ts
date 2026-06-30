import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const event_type = searchParams.get("event_type");
    const upcoming_for = searchParams.get("upcoming_for");

    // Events a given user is tagged in, happening within the next 7 days.
    if (upcoming_for) {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const weekStr = new Date(today.getTime() + 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .contains("tagged_user_ids", [upcoming_for])
        .gte("event_date", todayStr)
        .lte("event_date", weekStr)
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true });
      if (error) throw error;
      return NextResponse.json({ events: data || [] });
    }

    let query = supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });

    if (start_date) {
      query = query.gte("event_date", start_date);
    }

    if (end_date) {
      query = query.lte("event_date", end_date);
    }

    if (event_type && event_type !== "all") {
      query = query.eq("event_type", event_type);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      events: events || [],
      total: events?.length || 0,
    });
  } catch (error) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const {
      title,
      event_date,
      event_time,
      end_date,
      event_type,
      description,
      page_id,
      created_by,
      tagged_user_ids,
    } = await request.json();

    if (!title || !event_date || !event_type) {
      return NextResponse.json(
        { error: "Title, event_date, and event_type are required" },
        { status: 400 }
      );
    }

    if (!created_by) {
      return NextResponse.json(
        { error: "created_by user ID is required" },
        { status: 400 }
      );
    }

    const row: Record<string, unknown> = {
      title,
      event_date,
      event_time: event_time || null,
      end_date: end_date || null,
      event_type,
      description: description || "",
      page_id: page_id || null,
      created_by,
    };
    // Only send tags when present so untagged inserts still work if the
    // tagged_user_ids column hasn't been added yet.
    if (Array.isArray(tagged_user_ids) && tagged_user_ids.length) {
      row.tagged_user_ids = tagged_user_ids;
    }

    const { data: newEvent, error } = await supabase
      .from("calendar_events")
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error("Calendar create error:", error);
    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
