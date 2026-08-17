import type { PublicMedia } from './api';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET ?? 'singha-media';

/**
 * Resolve a media `storageKey` to a browser-loadable URL. Original media is
 * immutable and served from object storage (pack rule 4); the backend hands us
 * an opaque key. Absolute URLs and data URIs pass through untouched; bare keys
 * become a Supabase public-object URL. Returns null when there is nothing to
 * show so callers can fall back to a placeholder.
 */
export function mediaUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;
  if (/^(https?:|data:|blob:)/.test(storageKey)) return storageKey;
  const key = storageKey.replace(/^\/+/, '');
  // Self-hosted demo imagery lives in the app's own `public/demo/…` and is served same-origin —
  // it never goes to object storage. This keeps the demo dataset renderable without a configured
  // Supabase bucket; production media (bare keys) still resolve to the object-storage URL below.
  if (key.startsWith('demo/')) return `/${key}`;
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${key}`;
}

/** Best cover URL for a lot from its (optional) cover media. */
export function coverUrl(cover: PublicMedia | null | undefined): string | null {
  return mediaUrl(cover?.storageKey);
}
