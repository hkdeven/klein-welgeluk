// Build an image URL. Photos in Supabase Storage are served directly from the public
// object URL (no paid image transform service). External URLs are returned untouched.
// `width` and `quality` are kept so existing callers don't need to change.
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;

export interface PhotoLike {
  external_url?: string | null;
  storage_path?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function photoSrc(p: PhotoLike | null | undefined, _width?: number, _quality = 68): string {
  if (!p) return "";
  if (p.external_url) return p.external_url;
  if (!p.storage_path) return "";
  return `${BASE}/object/public/photos/${p.storage_path}`;
}
