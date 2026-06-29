import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const page_id = formData.get("page_id") as string;
    const caption = formData.get("caption") as string;
    const uploaded_by = formData.get("uploaded_by") as string;

    if (!file || !page_id || !uploaded_by) {
      return NextResponse.json(
        { error: "file, page_id, and uploaded_by are required" },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = `photos/${page_id}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, Buffer.from(fileBuffer), {
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data: newPhoto, error: dbError } = await supabase
      .from("photos")
      .insert([
        {
          page_id,
          storage_path: filePath,
          external_url: null,
          caption: caption || "",
          category: "uploaded",
          uploaded_by,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Photo upload error:", msg);
    return NextResponse.json(
      { error: `Upload error: ${msg}` },
      { status: 500 }
    );
  }
}
