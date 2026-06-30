import { supabaseClient } from "@/lib/supabase-client";

const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

export const sanitizeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

// Uploads a file straight from the browser to Supabase Storage via a one-time
// signed URL (no serverless body-size limit). Returns the object path (key).
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const res = await fetch("/api/storage/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Could not start upload");
  }
  const { token } = await res.json();

  const { error } = await supabaseClient.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw new Error(error.message);

  return path;
}

export const publicUrl = (bucket: string, path: string) =>
  `${PUBLIC_BASE}/${bucket}/${path}`;
