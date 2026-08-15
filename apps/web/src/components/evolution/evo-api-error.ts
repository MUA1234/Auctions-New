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
