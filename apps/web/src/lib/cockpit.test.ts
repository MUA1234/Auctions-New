import { describe, expect, it } from 'vitest';
import { formatAmount, formatBuckets, type CurrencyBucket } from './cockpit';

/**
 * Cockpit money formatting is precision-safe and per-currency (multi-currency correction pass):
 * amounts come as `{ currency, exponent, minor }` with `minor` a string, are formatted from the
 * canonical exponent (never `/100`), keep full precision beyond Number.MAX_SAFE_INTEGER, and are
 * NEVER summed across currencies.
 */
describe('formatAmount', () => {
  it('formats from the canonical exponent, not a hard-coded /100', () => {
    expect(formatAmount({ currency: 'LKR', exponent: 2, minor: '123456' })).toBe('LKR 1,234.56');
    // JPY is a zero-exponent currency — 5000 minor units are 5,000 yen, not 50.00.
    expect(formatAmount({ currency: 'JPY', exponent: 0, minor: '5000' })).toBe('JPY 5,000');
  });

  it('keeps full precision for values beyond Number.MAX_SAFE_INTEGER', () => {
    // 9_007_199_254_740_993 (> MAX_SAFE_INTEGER) would lose its last digit through a float.
    expect(formatAmount({ currency: 'USD', exponent: 2, minor: '900719925474099300' })).toBe(
      'USD 9,007,199,254,740,993.00',
    );
  });

  it('groups thousands and handles negatives and empties', () => {
    expect(formatAmount({ currency: 'AUD', exponent: 2, minor: '-250000' })).toBe('AUD -2,500.00');
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount({ currency: 'LKR', exponent: 2, minor: '0' })).toBe('LKR 0.00');
  });
});

describe('formatBuckets', () => {
  const rows: CurrencyBucket[] = [
    { currency: 'LKR', exponent: 2, total: '1000000', overdue: '0' },
    { currency: 'AUD', exponent: 2, total: '2000000', overdue: '2000000' },
    { currency: 'USD', exponent: 2, total: '3000000', overdue: '0' },
  ];

  it('renders each currency separately and NEVER sums across currencies', () => {
    const out = formatBuckets(rows, 'total');
    expect(out).toBe('LKR 10,000.00 · AUD 20,000.00 · USD 30,000.00');
    // The blended total (60,000) must never appear — currencies are not additive.
    expect(out).not.toContain('60,000');
  });

  it('omits zero rows for the requested key', () => {
    expect(formatBuckets(rows, 'overdue')).toBe('AUD 20,000.00');
  });

  it('returns an em dash for no activity', () => {
    expect(formatBuckets([], 'total')).toBe('—');
    expect(formatBuckets(undefined, 'total')).toBe('—');
  });
});
