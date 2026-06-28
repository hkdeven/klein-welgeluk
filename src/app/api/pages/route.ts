import { NextRequest, NextResponse } from "next/server";

// Mock data - in production, this comes from Supabase
const mockPages = [
  {
    id: "1",
    title: "Building",
    slug: "building",
    parent_id: null,
    brief: "Main building structure",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Services",
    slug: "services",
    parent_id: null,
    brief: "Utilities and services",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Exterior",
    slug: "exterior",
    parent_id: null,
    brief: "Outdoor features",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      pages: mockPages,
      total: mockPages.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, parent_id, brief } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const newPage = {
      id: Date.now().toString(),
      title,
      slug: title.toLowerCase().replace(/\s+/g, "-"),
      parent_id: parent_id || null,
      brief: brief || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}
