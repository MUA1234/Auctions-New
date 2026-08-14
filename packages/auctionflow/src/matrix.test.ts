import { describe, expect, it } from 'vitest';
import { matrixLayout, matrixPageSize, overlayReducer } from './matrix';
import { faceItems, pageCount } from './paging';

describe('Flow matrix layout (pack doc 08)', () => {
  it('hits the 4×4≈16 compact target on ordinary phones (390–430px)', () => {
    for (const w of [390, 414, 430]) {
      const l = matrixLayout(w);
      expect(l.columns).toBe(4);
      expect(l.rows).toBe(4);
      expect(matrixPageSize(l)).toBe(16);
    }
  });

  it('scales columns up on wider desktops within the pack ranges', () => {
    expect(matrixLayout(1024).columns).toBe(5);
    expect(matrixLayout(1280).columns).toBe(6);
    expect(matrixLayout(1440).columns).toBe(7);
    expect(matrixLayout(1680).columns).toBe(8);
    expect(matrixLayout(1920).columns).toBe(9);
    // Desktop keeps a multi-row band page.
    expect(matrixLayout(1920).rows).toBeGreaterThanOrEqual(2);
  });

  it('uses a tablet layout between 768 and 1023', () => {
    expect(matrixLayout(768)).toEqual({ columns: 4, rows: 3 });
  });

  it('never returns a zero page size (guards very small widths)', () => {
    expect(matrixPageSize(matrixLayout(320))).toBeGreaterThan(0);
  });

  it('composes with paging maths for a partial last matrix page', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const size = matrixPageSize(matrixLayout(390)); // 16
    expect(pageCount(items.length, size)).toBe(2); // 16 + 4
    expect(faceItems(items, 1, size)).toEqual([16, 17, 18, 19]); // partial last page
  });

  it('treats a band that fits one page as a single static face', () => {
    const size = matrixPageSize(matrixLayout(1920)); // 18
    expect(pageCount(10, size)).toBe(1); // sparse band → one static matrix page
  });
});

describe('category overlay state machine', () => {
  it('shows on band entry, hides on scroll, reappears on pause', () => {
    let s = overlayReducer('hidden', 'bandEnter');
    expect(s).toBe('visible');
    s = overlayReducer(s, 'scroll');
    expect(s).toBe('hidden');
    s = overlayReducer(s, 'pause');
    expect(s).toBe('visible');
  });
});
