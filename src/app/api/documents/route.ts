import { NextRequest, NextResponse } from "next/server";

// Mock data
const mockDocuments: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page_id = searchParams.get("page_id");
    const search = searchParams.get("search");
    const quotes = searchParams.get("quotes");

    let docs = mockDocuments;

    if (page_id) {
      docs = docs.filter((d: any) => d.page_id === page_id);
    }

    if (search) {
      docs = docs.filter(
        (d: any) =>
          d.filename.toLowerCase().includes(search.toLowerCase()) ||
          d.caption?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (quotes) {
      docs = docs.filter(
        (d: any) =>
          d.filename.toLowerCase().includes("quote") ||
          d.caption?.toLowerCase().includes("quote")
      );
    }

    return NextResponse.json({
      documents: docs,
      total: docs.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const page_id = formData.get("page_id") as string;
    const caption = formData.get("caption") as string;

    if (!file || !page_id) {
      return NextResponse.json(
        { error: "File and page_id are required" },
        { status: 400 }
      );
    }

    // In production, upload to Supabase Storage
    const newDocument = {
      id: Date.now().toString(),
      page_id,
      filename: file.name,
      storage_path: `documents/${page_id}/${Date.now()}_${file.name}`,
      file_size: file.size,
      file_type: file.type.split("/")[1] || "file",
      caption: caption || "",
      uploaded_by: "user_id",
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
