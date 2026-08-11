import { describe, expect, it } from 'vitest';
import {
  adjacentPages,
  clampPage,
  faceItems,
  pageCount,
  resolveAxis,
  stepPage,
  swipeDelta,
} from './paging';

describe('pageCount', () => {
  it('reaches EVERY lot, not just six (doc 04 reject "only six lots reachable")', () => {
    expect(pageCount(24, 4)).toBe(6); // 24 lots at 4/face → 6 faces, all reachable
    expect(pageCount(0, 4)).toBe(1); // always at least one (empty) face
    expect(pageCount(3, 4)).toBe(1);
    expect(pageCount(5, 4)).toBe(2);
  });
  it('guards a zero page size', () => {
    expect(pageCount(10, 0)).toBe(0);
  });
});

describe('clampPage', () => {
  it('keeps a face index inside the row', () => {
    expect(clampPage(5, 3)).toBe(2);
    expect(clampPage(-2, 3)).toBe(0);
    expect(clampPage(1, 3)).toBe(1);
    expect(clampPage(0, 0)).toBe(0);
  });
});

describe('stepPage', () => {
  it('wraps around the ends by default (Rubik rotation)', () => {
    expect(stepPage(2, 1, 3)).toBe(0);
    expect(stepPage(0, -1, 3)).toBe(2);
  });
  it('clamps when wrap is disabled', () => {
    expect(stepPage(2, 1, 3, false)).toBe(2);
    expect(stepPage(0, -1, 3, false)).toBe(0);
  });
});

describe('faceItems', () => {
  const items = [0, 1, 2, 3, 4, 5, 6];
  it('returns the slice for a face', () => {
    expect(faceItems(items, 0, 3)).toEqual([0, 1, 2]);
    expect(faceItems(items, 1, 3)).toEqual([3, 4, 5]);
    expect(faceItems(items, 2, 3)).toEqual([6]);
  });
});

describe('adjacentPages', () => {
  it('preloads only the neighbours', () => {
    expect(adjacentPages(1, 3)).toEqual({ prev: 0, next: 2 });
    expect(adjacentPages(0, 3)).toEqual({ prev: 2, next: 1 });
  });
});

describe('resolveAxis (direction lock)', () => {
  it('locks nothing until past the threshold — a tap does not rotate', () => {
    expect(resolveAxis(4, 3)).toBeNull();
  });
  it('vertical intent yields to page scroll', () => {
    expect(resolveAxis(5, 40)).toBe('vertical');
  });
  it('horizontal intent rotates the row', () => {
    expect(resolveAxis(40, 5)).toBe('horizontal');
  });
});

describe('swipeDelta', () => {
  it('advances forward on a committed left drag', () => {
    expect(swipeDelta(-100, 300)).toBe(1);
  });
  it('goes back on a committed right drag', () => {
    expect(swipeDelta(100, 300)).toBe(-1);
  });
  it('ignores a drag below the commit threshold', () => {
    expect(swipeDelta(-40, 300)).toBe(0);
  });
});
