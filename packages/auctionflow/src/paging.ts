/**
 * Pure paging + gesture maths for the AuctionFlow Rubik rows (consolidated pack
 * doc 04). Kept free of React/DOM so it is unit-testable in a node environment
 * and reusable by both the catalogue and the buyer command-centre.
 */

/** How many faces (pages) a row of `itemCount` needs at `pageSize` per face. */
export function pageCount(itemCount: number, pageSize: number): number {
  if (pageSize <= 0) return 0;
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

/** Clamp a page index into `[0, total - 1]` (total 0 ⇒ 0). */
export function clampPage(page: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(page, 0), total - 1);
}

/**
 * Step a page by `delta`. When `wrap` is true the ends wrap around (Rubik row
 * rotates past the last face back to the first); otherwise it clamps.
 */
export function stepPage(page: number, delta: number, total: number, wrap = true): number {
  if (total <= 0) return 0;
  if (!wrap) return clampPage(page + delta, total);
  return (((page + delta) % total) + total) % total;
}

/** The slice of items shown on a given face. */
export function faceItems<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

/**
 * The three faces a CubeRow keeps mounted: the current face plus its immediate
 * neighbours (doc 04 "preload only adjacent page"). Returns wrapped page indices
 * so a single-face row still has a valid prev/next for the transition surface.
 */
export function adjacentPages(page: number, total: number): { prev: number; next: number } {
  return { prev: stepPage(page, -1, total), next: stepPage(page, 1, total) };
}

export type GestureAxis = 'horizontal' | 'vertical' | null;

/**
 * Direction lock (doc 04 "vertical intent → normal page scroll, horizontal
 * intent → row rotation"). Returns null until the pointer has moved past
 * `threshold` on the dominant axis, so a tap or a tiny jitter locks nothing.
 */
export function resolveAxis(dx: number, dy: number, threshold = 12): GestureAxis {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < threshold && ay < threshold) return null;
  return ax >= ay ? 'horizontal' : 'vertical';
}

/**
 * Given a committed horizontal drag distance and the face width, how many faces
 * to advance and in which direction. A drag left (negative dx) advances forward.
 */
export function swipeDelta(dx: number, faceWidth: number, commitRatio = 0.25): number {
  if (faceWidth <= 0) return 0;
  if (Math.abs(dx) < faceWidth * commitRatio) return 0;
  return dx < 0 ? 1 : -1;
}
