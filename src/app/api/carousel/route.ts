import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
  : null;

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("carousel_photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ photos: data || [] });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Fetch error: ${msg}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const caption = (formData.get("caption") as string) || "";
    const uploaded_by = formData.get("uploaded_by") as string;

    if (!file || !uploaded_by) {
      return NextResponse.json(
        { error: "file and uploaded_by are required" },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `carousel/${Date.now()}_${safeName}`;
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(key, Buffer.from(buffer), { contentType: file.type });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from("carousel_photos")
      .insert([{ storage_path: key, caption, uploaded_by }])
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Carousel upload error:", msg);
    return NextResponse.json({ error: `Upload error: ${msg}` }, { status: 500 });
  }
}
