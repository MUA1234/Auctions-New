import { describe, expect, it } from 'vitest';
import { cycleViewMode, isViewMode, VIEW_MODES } from './index';

describe('catalogue view mode', () => {
  it('cycles cube -> grid -> list -> cube', () => {
    expect(cycleViewMode('cube')).toBe('grid');
    expect(cycleViewMode('grid')).toBe('list');
    expect(cycleViewMode('list')).toBe('cube');
  });

  it('validates raw values and offers all three modes (docs/13)', () => {
    expect(isViewMode('cube')).toBe(true);
    expect(isViewMode('mosaic')).toBe(false);
    expect(VIEW_MODES).toEqual(['cube', 'grid', 'list']);
  });
});
