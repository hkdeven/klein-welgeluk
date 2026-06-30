import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
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
      .select("*");

    if (error) throw error;

    return NextResponse.json({ pages: pages || [] });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Pages fetch error:", msg);
    return NextResponse.json(
      { error: `Fetch error: ${msg}` },
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

    const { title, slug, parent_id, description } = await request.json();

    if (!title || !slug) {
      return NextResponse.json(
        { error: "title and slug are required" },
        { status: 400 }
      );
    }

    const { data: newPage, error } = await supabase
      .from("pages")
      .insert([
        {
          title,
          slug,
          parent_id: parent_id || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Page create error:", msg);
    return NextResponse.json(
      { error: `Create error: ${msg}` },
      { status: 500 }
    );
  }
}
