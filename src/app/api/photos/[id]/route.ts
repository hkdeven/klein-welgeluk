import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } })
  : null;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const body = await request.json();
    const patch: Record<string, unknown> = {};
    if ("caption" in body) patch.caption = body.caption ?? "";
    if ("category" in body) patch.category = body.category || null;

    const { data, error } = await supabase
      .from("photos")
      .update(patch)
      .eq("id", params.id)
      .select("*, uploader:uploaded_by(short_name, avatar_url)")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Photo update error:", msg);
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

    const { id } = params;

    // Get photo to find storage path if it exists
    const { data: photo, error: fetchError } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete from storage if it has a storage path
    if (photo.storage_path) {
      await supabase.storage
        .from("photos")
        .remove([photo.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Photo delete error:", msg);
    return NextResponse.json(
      { error: `Delete error: ${msg}` },
      { status: 500 }
    );
  }
}
