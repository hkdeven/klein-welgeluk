import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const page_id = new URL(request.url).searchParams.get("page_id");
    if (!page_id) {
      return NextResponse.json({ error: "page_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("costing")
      .select("*")
      .eq("page_id", page_id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ costing: data || null });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Costing fetch error:", msg);
    return NextResponse.json({ error: `Fetch error: ${msg}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { page_id, quote_received, budgeted_amount, actual_invoiced, notes } =
      await request.json();

    if (!page_id) {
      return NextResponse.json({ error: "page_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("costing")
      .upsert(
        {
          page_id,
          quote_received: quote_received || null,
          budgeted_amount: budgeted_amount || null,
          actual_invoiced: actual_invoiced || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Costing save error:", msg);
    return NextResponse.json({ error: `Save error: ${msg}` }, { status: 500 });
  }
}
