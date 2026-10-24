import { createClient } from "./supabase/server";

/**
 * Generate signed URLs for hotel photos (1 hour validity).
 * Access is governed by the storage RLS policies: only photos of
 * approved hotels (or the owner's own photos) can be signed.
 */
export async function getSignedPhotoUrls(
  paths: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const clean = paths.filter((p): p is string => !!p);
  const map = new Map<string, string>();
  if (clean.length === 0) return map;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("hotel-photos")
    .createSignedUrls(clean, 3600);
  if (error) return map;
  for (const item of data ?? []) {
    const entry = item as unknown as
      | { path: string; signedUrl?: string; error?: unknown }
      | undefined;
    if (entry?.path && !entry.error) {
      map.set(entry.path, entry.signedUrl ?? "");
    }
  }
  return map;
}
