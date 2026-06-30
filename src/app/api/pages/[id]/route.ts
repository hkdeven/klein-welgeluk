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
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { id } = params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string") updates.title = body.title;
    if (typeof body.slug === "string") updates.slug = body.slug;
    if (typeof body.brief === "string") updates.brief = body.brief;
    if ("parent_id" in body) updates.parent_id = body.parent_id || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("pages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Page update error:", msg);
    return NextResponse.json(
      { error: `Update error: ${msg}` },
      { status: 500 }
    );
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

    // Collect the whole subtree (any depth) and delete deepest-first so the
    // self-referential parent_id foreign key is never violated. Per-page
    // content (comments, photos, documents, costing, tags, assignments)
    // cascades automatically via its own ON DELETE CASCADE.
    const { data: allPages, error: fetchError } = await supabase
      .from("pages")
      .select("id, parent_id");
    if (fetchError) throw fetchError;

    const childrenOf: Record<string, string[]> = {};
    (allPages || []).forEach((p) => {
      if (p.parent_id) (childrenOf[p.parent_id] ||= []).push(p.id);
    });

    const subtree: { id: string; depth: number }[] = [];
    const walk = (nodeId: string, depth: number) => {
      subtree.push({ id: nodeId, depth });
      (childrenOf[nodeId] || []).forEach((c) => walk(c, depth + 1));
    };
    walk(id, 0);
    subtree.sort((a, b) => b.depth - a.depth);

    for (const node of subtree) {
      const { error } = await supabase.from("pages").delete().eq("id", node.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Page delete error:", msg);
    return NextResponse.json(
      { error: `Delete error: ${msg}` },
      { status: 500 }
    );
  }
}
