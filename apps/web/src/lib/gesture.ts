/**
 * Pure helpers for deliberate Gesture Bidding (pack doc 12). Kept free of React/DOM
 * so the threshold/next-bid maths is unit-tested without a browser.
 */

/** The next valid bid (minor units): opening if no bid yet, else current + increment. */
export function nextBidMinor(
  currentBidMinor: number | null,
  openingBidMinor: number,
  incrementMinor: number,
): number {
  return currentBidMinor == null ? openingBidMinor : currentBidMinor + incrementMinor;
}

/**
 * Whether a swipe has travelled far enough to count as a deliberate bid. Completion
 * requires PURPOSEFUL TRAVEL (a large fraction of the track), not velocity — an
 * accidental short flick stays below the ratio and snaps back (pack doc 12).
 */
export function shouldCommitGesture(
  travelPx: number,
  trackPx: number,
  commitRatio = 0.82,
): boolean {
  if (trackPx <= 0 || travelPx <= 0) return false;
  return travelPx >= trackPx * commitRatio;
}

/**
 * Guard against submitting a "larger surprise amount" if the price moved during the
 * swipe (pack doc 12). Only commit when the amount the user began swiping on is still
 * the current next bid; otherwise the caller reprices and asks for a fresh swipe.
 */
export function isRepriced(amountAtStart: number, currentNextBid: number): boolean {
  return amountAtStart !== currentNextBid;
}

/** A fresh client intent id used as a bid idempotency key (dedups duplicate sends). */
export function newIntentId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `gb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}
