/**
 * Map an evolution-api thrown Error to an operator-friendly message. The api client throws
 * `Error("<VERB> <path> -> <status>")` (or a backend message/title) on non-2xx. For operator
 * surfaces the two statuses that carry product meaning are 403 — the caller is not an operator
 * (the SERVER authorizes; there is no client-side role flag) — and 404 — the capability flag is
 * OFF. Anything else surfaces the raw message so a real failure is never hidden.
 */
export function statusOf(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/->\s*(\d{3})\b/);
  const code = match?.[1];
  return code ? Number(code) : null;
}

/** Operator-facing one-liner for a thrown api error (403 → not-operator, 404 → not-enabled). */
export function friendlyError(err: unknown): string {
  const status = statusOf(err);
  if (status === 403) return "You don't have operator access.";
  if (status === 404) return 'This capability is not enabled.';
  return err instanceof Error ? err.message : String(err);
}

/** A thrown-Error message that is nothing more than the api client's last-resort
 *  `METHOD /path -> status` string (no backend `message`/`title` was available to surface). */
const RAW_API_ERROR = /^[A-Z]+\s+\/\S*\s*->\s*\d{3}$/;

/**
 * Customer-facing one-liner for a thrown api error on a Wanted/RFQ or Supply Programme form.
 * Unlike `friendlyError` (operator-only 403/404 wording, used by Control Centre / Node Console —
 * unchanged, still exported above), this covers every status a signed-in buyer/supplier can hit
 * and only falls back to `fallback` when the message is still the raw `METHOD /path -> status`
 * string a mutation throws when the backend sent no legible `message`/`title` (CX audit finding
 * X7) — a real backend validation message (e.g. "Add a short title") is passed through unchanged
 * since it is already plain English.
 */
export function friendlyMessage(err: unknown, fallback: string): string {
  const status = statusOf(err);
  if (status === 401) return 'Please sign in again to continue.';
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return 'This isn’t available right now.';
  if (status === 429) return 'Too many attempts — please wait a moment and try again.';
  if (status != null && status >= 500) return 'Something went wrong on our side. Please try again.';
  const message = err instanceof Error ? err.message : String(err);
  if (!message || RAW_API_ERROR.test(message.trim())) return fallback;
  return message;
}
