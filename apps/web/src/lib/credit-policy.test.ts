import { describe, expect, it } from 'vitest';
import { capacityMultiple, previewCapacityMinor } from './credit-policy';

describe('credit policy preview (P1-09, non-authoritative)', () => {
  it('5% security → 20× capacity (LKR 500,000 → LKR 10,000,000)', () => {
    expect(capacityMultiple(500)).toBe(20);
    expect(previewCapacityMinor(500_000_00, 500)).toBe(10_000_000_00);
  });

  it('10% security → 5× capacity (LKR 500,000 → LKR 2,500,000)', () => {
    expect(capacityMultiple(1000)).toBe(10);
    expect(previewCapacityMinor(500_000_00, 1000)).toBe(5_000_000_00);
  });

  it('is safe for zero / negative / invalid inputs', () => {
    expect(previewCapacityMinor(0, 500)).toBe(0);
    expect(previewCapacityMinor(-1, 500)).toBe(0);
    expect(previewCapacityMinor(1000, 0)).toBe(0);
    expect(previewCapacityMinor(Number.NaN, 500)).toBe(0);
  });
});
