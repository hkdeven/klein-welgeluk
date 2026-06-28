import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    } = await request.json();

    if (!title || !event_date || !event_type) {
      return NextResponse.json(
        { error: "Title, event_date, and event_type are required" },
        { status: 400 }
      );
    }

    const { data: newEvent, error } = await supabase
      .from("calendar_events")
      .insert([
        {
          title,
          event_date,
          event_time: event_time || null,
          end_date: end_date || null,
          event_type,
          description: description || "",
          page_id: page_id || null,
          created_by,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error("Calendar create error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
