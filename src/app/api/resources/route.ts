import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRows, appendRow, sheetsConfigured } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

const DEFAULT_HEADERS = ["Name", "Category", "Contact", "Phone", "Email", "Website", "Notes"];
const norm = (h: string) => (h || "").trim().toLowerCase();

// GET — the Greyton Resources listings, parsed from the Sheet (header row → keys).
export async function GET() {
  try {
    if (!sheetsConfigured()) {
      return NextResponse.json({ resources: [], configured: false });
    }
    const rows = await getRows();
    if (!rows || rows.length === 0) {
      return NextResponse.json({ resources: [], configured: true });
    }
    const keys = (rows[0] || []).map(norm);
    const resources = rows
      .slice(1)
      .filter((r) => r.some((c) => (c || "").trim()))
      .map((r, i) => {
        const obj: Record<string, any> = { _row: i };
        keys.forEach((k, idx) => {
          if (k) obj[k] = (r[idx] || "").trim();
        });
        return obj;
      });
    return NextResponse.json({ resources, configured: true });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Resources GET error:", msg);
    return NextResponse.json({ resources: [], configured: true, error: msg }, { status: 200 });
  }
}

// POST — append a new listing to the Sheet (respects its column order). Non-guests only.
export async function POST(req: NextRequest) {
  try {
    if (!sheetsConfigured()) {
      return NextResponse.json({ error: "Google Sheets not configured" }, { status: 503 });
    }
    const body = await req.json();
    const { user_id } = body;
    if (!body.name?.trim() || !body.category?.trim()) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    // Guests may browse/search but not add.
    if (supabase && user_id) {
      const { data: u } = await supabase.from("users").select("role").eq("id", user_id).single();
      if (u?.role === "guest") {
        return NextResponse.json({ error: "Guests can't add listings" }, { status: 403 });
      }
    }

    // Build the row in the sheet's own column order.
    const headerRows = await getRows("A1:Z1");
    const header = (headerRows && headerRows[0]?.length ? headerRows[0] : DEFAULT_HEADERS).map(norm);
    const listing: Record<string, string> = {
      name: body.name.trim(),
      category: body.category.trim(),
      contact: (body.contact || "").trim(),
      phone: (body.phone || "").trim(),
      email: (body.email || "").trim(),
      website: (body.website || "").trim(),
      notes: (body.notes || "").trim(),
    };
    const row = header.map((k) => listing[k] ?? "");

    await appendRow(row);
    return NextResponse.json({ success: true, listing });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Resources POST error:", msg);
    return NextResponse.json({ error: `Could not add listing: ${msg}` }, { status: 500 });
  }
}
