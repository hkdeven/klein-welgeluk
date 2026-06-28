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

    const { data: pages, error } = await supabase
      .from("pages")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      pages: pages || [],
      total: pages?.length || 0,
    });
  } catch (error) {
    console.error("Pages fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
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

    const { title, parent_id, brief } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const slug = title.toLowerCase().replace(/\s+/g, "-");

    const { data: newPage, error } = await supabase
      .from("pages")
      .insert([
        {
          title,
          slug,
          parent_id: parent_id || null,
          brief: brief || "",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    console.error("Pages create error:", error);
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}
