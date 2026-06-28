import { NextRequest, NextResponse } from "next/server";

// Mock data
const mockEvents: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const event_type = searchParams.get("event_type");

    let events = mockEvents;

    if (start_date && end_date) {
      events = events.filter(
        (e: any) =>
          new Date(e.event_date) >= new Date(start_date) &&
          new Date(e.event_date) <= new Date(end_date)
      );
    }

    if (event_type && event_type !== "all") {
      events = events.filter((e: any) => e.event_type === event_type);
    }

    return NextResponse.json({
      events,
      total: events.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, event_date, event_time, end_date, event_type, description, page_id } = await request.json();

    if (!title || !event_date || !event_type) {
      return NextResponse.json(
        { error: "Title, event_date, and event_type are required" },
        { status: 400 }
      );
    }

    const newEvent = {
      id: Date.now().toString(),
      title,
      event_date,
      event_time: event_time || null,
      end_date: end_date || null,
      event_type,
      description: description || "",
      page_id: page_id || null,
      created_by: "user_id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
