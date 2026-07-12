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

    const { searchParams } = new URL(request.url);
    const page_id = searchParams.get("page_id");
    const search = searchParams.get("search");
    const quotes = searchParams.get("quotes");

    let query = supabase
      .from("documents")
      .select("*, uploader:uploaded_by(short_name), page:page_id(title, slug)")
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

    let page_id: string;
    let caption: string;
    let user_id: string;
    let category: string | null;
    let displayName: string | undefined;
    let filePath: string;
    let fileSize: number;
    let originalName: string;

    if ((request.headers.get("content-type") || "").includes("application/json")) {
      // File was uploaded straight from the browser to storage (no serverless
      // body-size limit); this request only carries the metadata.
      const body = await request.json();
      page_id = body.page_id;
      caption = body.caption || "";
      user_id = body.user_id;
      category = body.category || null;
      displayName = (body.filename as string | undefined)?.trim() || undefined;
      filePath = body.storage_path;
      fileSize = Number(body.file_size) || 0;
      originalName = body.original_name || body.filename || "";

      if (!filePath || !page_id) {
        return NextResponse.json(
          { error: "storage_path and page_id are required" },
          { status: 400 }
        );
      }
    } else {
      // Legacy path: the file travels through this route. Vercel caps request
      // bodies at ~4.5MB, so large files must use the JSON/direct path above.
      const formData = await request.formData();
      const file = formData.get("file") as File;
      page_id = formData.get("page_id") as string;
      caption = (formData.get("caption") as string) || "";
      user_id = formData.get("user_id") as string;
      category = formData.get("category") as string | null;
      displayName = (formData.get("filename") as string | null)?.trim() || undefined;

      if (!file || !page_id) {
        return NextResponse.json(
          { error: "File and page_id are required" },
          { status: 400 }
        );
      }

      // Upload file to Supabase Storage (sanitize name; keys can't contain spaces/etc.)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      filePath = `documents/${page_id}/${Date.now()}_${safeName}`;

      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, Buffer.from(fileBuffer), {
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      fileSize = file.size;
      originalName = file.name;
    }

    // Create document record in database
    const record: Record<string, unknown> = {
      page_id,
      filename: displayName || originalName,
      storage_path: filePath,
      file_size: fileSize,
      file_type: originalName.split(".").pop() || "file",
      caption,
      uploaded_by: user_id,
    };
    if (category) record.category = category;

    let result = await supabase
      .from("documents")
      .insert([record])
      .select()
      .single();

    // If the optional `category` column hasn't been added to this database yet,
    // retry the insert without it so uploads still succeed.
    if (result.error && category) {
      const { category: _omit, ...withoutCategory } = record;
      result = await supabase
        .from("documents")
        .insert([withoutCategory])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Document upload error:", msg);
    return NextResponse.json(
      { error: `Upload error: ${msg}` },
      { status: 500 }
    );
  }
}
