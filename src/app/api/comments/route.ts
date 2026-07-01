import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyUsers, plainText, NotifInput } from "@/lib/notify";

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
    const photo_id = searchParams.get("photo_id");
    const photo_ids = searchParams.get("photo_ids");

    let q = supabase
      .from("comments")
      .select(`*, author:author_id(id, display_name, short_name, avatar_url, role)`)
      .order("created_at", { ascending: true });

    if (page_id) q = q.eq("page_id", page_id);
    else if (photo_id) q = q.eq("photo_id", photo_id);
    else if (photo_ids) q = q.in("photo_id", photo_ids.split(",").filter(Boolean));
    else return NextResponse.json({ error: "page_id, photo_id or photo_ids is required" }, { status: 400 });

    const { data: comments, error } = await q;
    if (error) throw error;

    return NextResponse.json({
      comments: comments || [],
      total: comments?.length || 0,
    });
  } catch (error) {
    const msg = (error as Error).message;
    // photo_id column may not exist yet — degrade so the photo view shows no comments.
    if (/photo_id/i.test(msg) && /(does not exist|could not find|schema cache)/i.test(msg)) {
      return NextResponse.json({ comments: [], total: 0 });
    }
    console.error("Comments fetch error:", msg);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
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

    const { page_id, photo_id, body, author_id, parent_comment_id } =
      await request.json();

    if (!body || !author_id || (!page_id && !photo_id)) {
      return NextResponse.json(
        { error: "body, author_id and one of page_id/photo_id are required" },
        { status: 400 }
      );
    }

    // Only include photo_id when present so page comments still insert if the
    // column hasn't been added yet.
    const row: Record<string, unknown> = {
      page_id: page_id || null,
      body,
      author_id,
      parent_comment_id: parent_comment_id || null,
    };
    if (photo_id) row.photo_id = photo_id;

    const { data: newComment, error } = await supabase
      .from("comments")
      .insert([row])
      .select(
        `
        *,
        author:author_id(id, display_name, short_name, avatar_url, role)
      `
      )
      .single();

    if (error) throw error;

    // Notify only for page-level comments (photo comments don't notify).
    if (page_id) try {
      const snippet = plainText(body).slice(0, 120);
      const [pageRes, assignRes, usersRes] = await Promise.all([
        supabase.from("pages").select("slug, title").eq("id", page_id).single(),
        supabase.from("assignments").select("user_id").eq("page_id", page_id),
        supabase.from("users").select("id, short_name"),
      ]);
      const slug = pageRes.data?.slug || "";
      const link = `/${slug}#comments`;

      // @mentions: match @token (case-insensitive) against users' short_name.
      const text = plainText(body);
      const tokens = new Set(
        (text.match(/@([a-z0-9_]+)/gi) || []).map((t) => t.slice(1).toLowerCase())
      );
      const mentioned = new Set(
        (usersRes.data || [])
          .filter((u: any) => u.short_name && tokens.has(u.short_name.toLowerCase()))
          .map((u: any) => u.id as string)
      );

      const assignees = (assignRes.data || []).map((a: any) => a.user_id as string);
      const recipients = new Set<string>([...assignees, ...mentioned]);
      recipients.delete(author_id);

      const notifs: NotifInput[] = [...recipients].map((uid) => {
        const isMention = mentioned.has(uid);
        return {
          user_id: uid,
          actor_id: author_id,
          type: isMention ? "mention" : "comment",
          title: isMention
            ? "You were mentioned in a comment"
            : `New comment on ${pageRes.data?.title || "a page"}`,
          body: snippet,
          link,
          ref_id: newComment.id,
        };
      });
      await notifyUsers(notifs);
    } catch (e) {
      console.error("Comment notify error:", (e as Error).message);
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Comment create error:", msg);
    return NextResponse.json(
      { error: `Comment error: ${msg}` },
      { status: 500 }
    );
  }
}
