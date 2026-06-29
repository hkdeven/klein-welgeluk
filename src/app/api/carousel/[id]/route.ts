import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { data: photo } = await supabase
      .from("carousel_photos")
      .select("storage_path")
      .eq("id", params.id)
      .maybeSingle();

    if (photo?.storage_path) {
      await supabase.storage.from("photos").remove([photo.storage_path]);
    }

    const { error } = await supabase
      .from("carousel_photos")
      .delete()
      .eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    return NextResponse.json({ error: `Delete error: ${msg}` }, { status: 500 });
  }
}
