import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const ALLOWED_BUCKETS = ["photos", "documents"];

// Returns a one-time signed upload URL so the browser can send the file
// straight to Supabase Storage (bypasses the serverless body-size limit).
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const { bucket, path } = await request.json();
    if (!bucket || !path || !ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "bucket and path are required" }, { status: 400 });
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error) throw error;

    return NextResponse.json({ token: data.token, path: data.path });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("sign-upload error:", msg);
    return NextResponse.json({ error: `Upload setup failed: ${msg}` }, { status: 500 });
  }
}
