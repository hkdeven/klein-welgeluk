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

    let query = supabase
      .from("photos")
      .select("*, uploader:uploaded_by(short_name), page:page_id(title, slug)")
      .order("created_at", { ascending: false });

    if (page_id) {
      query = query.eq("page_id", page_id);
    }

    const { data: photos, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      photos: photos || [],
      total: photos?.length || 0,
    });
  } catch (error) {
    console.error("Photos fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
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

    const { page_id, external_url, storage_path, caption, category, uploaded_by } =
      await request.json();

    if (!page_id || (!external_url && !storage_path)) {
      return NextResponse.json(
        { error: "page_id and either external_url or storage_path are required" },
        { status: 400 }
      );
    }

    if (!uploaded_by) {
      return NextResponse.json(
        { error: "uploaded_by user ID is required" },
        { status: 400 }
      );
    }

    const { data: newPhoto, error } = await supabase
      .from("photos")
      .insert([
        {
          page_id,
          external_url: external_url || null,
          storage_path: storage_path || null,
          caption: caption || "",
          category: category || "inspiration",
          uploaded_by,
        },
      ])
      .select("*, uploader:uploaded_by(short_name), page:page_id(title, slug)")
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Photo create error:", msg);
    return NextResponse.json(
      { error: `Photo error: ${msg}` },
      { status: 500 }
    );
  }
}
