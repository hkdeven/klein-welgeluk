// Build an image URL. For photos stored in Supabase Storage we use the on-the-fly
// image transform endpoint to serve a resized/compressed version — much faster than
// the multi-MB originals. External URLs are returned untouched (can't transform).
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;

export interface PhotoLike {
  external_url?: string | null;
  storage_path?: string | null;
}

export function photoSrc(p: PhotoLike | null | undefined, width?: number, quality = 68): string {
  if (!p) return "";
  if (p.external_url) return p.external_url;
  if (!p.storage_path) return "";
  if (width) {
    // Bound the longest side to `width` and preserve aspect (resize=contain).
    // Width-only transforms on this project distort the height, so pass both.
    return `${BASE}/render/image/public/photos/${p.storage_path}?width=${width}&height=${width}&resize=contain&quality=${quality}`;
  }
  return `${BASE}/object/public/photos/${p.storage_path}`;
}
