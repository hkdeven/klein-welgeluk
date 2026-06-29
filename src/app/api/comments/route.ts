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
    const page_id = searchParams.get("page_id");

    if (!page_id) {
      return NextResponse.json(
        { error: "page_id is required" },
        { status: 400 }
      );
    }

    const { data: comments, error } = await supabase
      .from("comments")
      .select(
        `
        *,
        author:author_id(id, display_name, short_name, avatar_url, role)
      `
      )
      .eq("page_id", page_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      comments: comments || [],
      total: comments?.length || 0,
    });
  } catch (error) {
    console.error("Comments fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
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

    const { page_id, body, author_id, parent_comment_id } =
      await request.json();

    if (!page_id || !body || !author_id) {
      return NextResponse.json(
        { error: "page_id, body, and author_id are required" },
        { status: 400 }
      );
    }

    const { data: newComment, error } = await supabase
      .from("comments")
      .insert([
        {
          page_id,
          body,
          author_id,
          parent_comment_id: parent_comment_id || null,
        },
      ])
      .select(
        `
        *,
        author:author_id(id, display_name, short_name, avatar_url, role)
      `
      )
      .single();

    if (error) throw error;

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Comment create error:", msg);
    return NextResponse.json(
      { error: `Comment error: ${msg}` },
      { status: 500 }
    );
  }
}
