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

    if (!page_id) {
      return NextResponse.json(
        { error: "page_id is required" },
        { status: 400 }
      );
    }

    const { data: comments, error } = await supabase
      .from("comments")
      .select(
        `
        *,
        author:author_id(id, display_name, short_name, avatar_url, role)
      `
      )
      .eq("page_id", page_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      comments: comments || [],
      total: comments?.length || 0,
    });
  } catch (error) {
    console.error("Comments fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
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

    const { page_id, body, author_id, parent_comment_id } =
      await request.json();

    if (!page_id || !body || !author_id) {
      return NextResponse.json(
        { error: "page_id, body, and author_id are required" },
        { status: 400 }
      );
    }

    const { data: newComment, error } = await supabase
      .from("comments")
      .insert([
        {
          page_id,
          body,
          author_id,
          parent_comment_id: parent_comment_id || null,
        },
      ])
      .select(
        `
        *,
        author:author_id(id, display_name, short_name, avatar_url, role)
      `
      )
      .single();

    if (error) throw error;

    // Notify: page assignees ("comment") and anyone @mentioned ("mention").
    try {
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
