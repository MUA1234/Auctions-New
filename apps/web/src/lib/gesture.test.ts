import { describe, expect, it } from 'vitest';
import { isRepriced, nextBidMinor, shouldCommitGesture } from './gesture';

describe('gesture bid maths (pack doc 12)', () => {
  it('computes the next valid bid', () => {
    expect(nextBidMinor(null, 100_000, 5_000)).toBe(100_000); // no bid yet → opening
    expect(nextBidMinor(200_000, 100_000, 5_000)).toBe(205_000); // current + increment
  });

  it('commits only on purposeful travel, not a short flick', () => {
    expect(shouldCommitGesture(300, 320)).toBe(true); // ~94% of the track
    expect(shouldCommitGesture(40, 320)).toBe(false); // short flick → snap back
    expect(shouldCommitGesture(320 * 0.82, 320)).toBe(true); // exactly at threshold
    expect(shouldCommitGesture(0, 320)).toBe(false);
    expect(shouldCommitGesture(300, 0)).toBe(false); // no track measured yet
  });

  it('detects a reprice so we never submit a surprise amount', () => {
    expect(isRepriced(205_000, 205_000)).toBe(false); // unchanged → safe to submit
    expect(isRepriced(205_000, 210_000)).toBe(true); // price moved during the swipe
  });
});
