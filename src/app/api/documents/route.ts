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
    const page_id = searchParams.get("page_id");
    const search = searchParams.get("search");
    const quotes = searchParams.get("quotes");

    let query = supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (page_id) {
      query = query.eq("page_id", page_id);
    }

    const { data: documents, error } = await query;

    if (error) throw error;

    let filtered = documents || [];

    if (search) {
      filtered = filtered.filter(
        (d: any) =>
          d.filename.toLowerCase().includes(search.toLowerCase()) ||
          d.caption?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (quotes) {
      filtered = filtered.filter(
        (d: any) =>
          d.filename.toLowerCase().includes("quote") ||
          d.caption?.toLowerCase().includes("quote")
      );
    }

    return NextResponse.json({
      documents: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Documents fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const page_id = formData.get("page_id") as string;
    const caption = formData.get("caption") as string;
    const user_id = formData.get("user_id") as string;

    if (!file || !page_id) {
      return NextResponse.json(
        { error: "File and page_id are required" },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `documents/${page_id}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, Buffer.from(fileBuffer), {
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // Create document record in database
    const { data: newDocument, error: dbError } = await supabase
      .from("documents")
      .insert([
        {
          page_id,
          filename: file.name,
          storage_path: filePath,
          file_size: file.size,
          file_type: file.name.split(".").pop() || "file",
          caption: caption || "",
          uploaded_by: user_id,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Document upload error:", msg);
    return NextResponse.json(
      { error: `Upload error: ${msg}` },
      { status: 500 }
    );
  }
}
