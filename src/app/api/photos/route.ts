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

    // Photos attached to snags live in the snag list, not the photo gallery.
    let excludeIds: string[] = [];
    try {
      const { data: sp } = await supabase
        .from("snags")
        .select("photo_id")
        .not("photo_id", "is", null);
      excludeIds = (sp || []).map((s: any) => s.photo_id).filter(Boolean);
    } catch {
      /* snags table/column may not exist yet */
    }

    let query = supabase
      .from("photos")
      .select("*, uploader:uploaded_by(short_name), page:page_id(title, slug)")
      .order("created_at", { ascending: false });

    if (page_id) {
      query = query.eq("page_id", page_id);
    }
    if (excludeIds.length) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: photos, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      photos: photos || [],
      total: photos?.length || 0,
    });
  } catch (error) {
    console.error("Photos fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

const IMG_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

// Fetch an external image and copy it into the photos bucket, so URL-added
// photos keep working when the source has hotlink protection or expires.
// Returns the storage path, or null if the source can't be fetched (in that
// case we fall back to storing the raw URL, the old behaviour).
async function importExternalImage(url: string, pageId: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
      },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) {
    throw new Error(
      "That link isn't a direct image. Right-click the picture and choose 'Copy image address', then paste that."
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return null;
  if (buf.length > 25 * 1024 * 1024) throw new Error("That image is too large (max 25MB)");
  const path = `photos/${pageId}/${Date.now()}_from-url.${IMG_EXT[type] || "jpg"}`;
  const { error } = await supabase!.storage
    .from("photos")
    .upload(path, buf, { contentType: type, upsert: false });
  if (error) return null;
  return path;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { page_id, external_url, storage_path, caption, category, uploaded_by } =
      await request.json();

    if (!page_id || (!external_url && !storage_path)) {
      return NextResponse.json(
        { error: "page_id and either external_url or storage_path are required" },
        { status: 400 }
      );
    }

    if (!uploaded_by) {
      return NextResponse.json(
        { error: "uploaded_by user ID is required" },
        { status: 400 }
      );
    }

    // URL-added photos: normalise the scheme, then try to import a copy into
    // storage. A non-image link is a hard error; an unreachable one falls back
    // to storing the URL as-is.
    let url: string | null = external_url || null;
    let path: string | null = storage_path || null;
    if (url && !path) {
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      try {
        const imported = await importExternalImage(url, page_id);
        if (imported) {
          path = imported;
          url = null;
        }
      } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 422 });
      }
    }

    const { data: newPhoto, error } = await supabase
      .from("photos")
      .insert([
        {
          page_id,
          external_url: url,
          storage_path: path,
          caption: caption || "",
          category: category || "inspiration",
          uploaded_by,
        },
      ])
      .select("*, uploader:uploaded_by(short_name), page:page_id(title, slug)")
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Photo create error:", msg);
    return NextResponse.json(
      { error: `Photo error: ${msg}` },
      { status: 500 }
    );
  }
}
