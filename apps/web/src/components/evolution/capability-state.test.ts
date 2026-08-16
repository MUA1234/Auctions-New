import { describe, expect, it } from 'vitest';
import { capabilityHint, capabilityLabel, isExpiringSoon, passportState } from './capability-state';

/**
 * Focused unit tests for the CX7 Singha ID passport-state mapping — shared, security/trust
 * relevant logic (it decides what a customer is told about their own verification) consumed by
 * both `SinghaIdProfile` (the passport) and `ExchangeActivity` (the Command Centre's Documents
 * lane + "Needs your attention" verification items).
 */

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

describe('passportState', () => {
  it('maps an absent or "none" grant to "none" (Not started)', () => {
    expect(passportState(undefined)).toBe('none');
    expect(passportState(null)).toBe('none');
    expect(passportState('none')).toBe('none');
  });

  it('maps "verified" with no expiry, or a future expiry, to "verified"', () => {
    expect(passportState('verified')).toBe('verified');
    expect(passportState('verified', daysFromNow(30))).toBe('verified');
  });

  it('is case-insensitive on the raw status token', () => {
    expect(passportState('VERIFIED')).toBe('verified');
    expect(passportState('Rejected')).toBe('action');
  });

  it('demotes an expired "verified" grant to "action" — expiry overrides the raw status', () => {
    expect(passportState('verified', daysFromNow(-1))).toBe('action');
  });

  it('maps refused/withdrawn/lapsed statuses to "action" (customer must act)', () => {
    for (const s of ['rejected', 'declined', 'expired', 'revoked', 'lapsed', 'cancelled']) {
      expect(passportState(s)).toBe('action');
    }
  });

  it('maps an in-flight status to "review" (nothing for the customer to do yet)', () => {
    expect(passportState('pending')).toBe('review');
    expect(passportState('submitted')).toBe('review');
  });

  it('never overclaims or falsely alarms on an unrecognised status — defaults to "review"', () => {
    expect(passportState('some_future_backend_status')).toBe('review');
  });
});

describe('isExpiringSoon', () => {
  it('is false with no expiry at all', () => {
    expect(isExpiringSoon(null)).toBe(false);
    expect(isExpiringSoon(undefined)).toBe(false);
  });

  it('is true within the default 30-day window', () => {
    expect(isExpiringSoon(daysFromNow(10))).toBe(true);
  });

  it('is false once already expired — that is "action", a distinct state from "expiring"', () => {
    expect(isExpiringSoon(daysFromNow(-1))).toBe(false);
  });

  it('is false well beyond the window', () => {
    expect(isExpiringSoon(daysFromNow(400))).toBe(false);
  });
});

describe('capabilityLabel / capabilityHint', () => {
  it('gives every known capability a friendly, non-enum label', () => {
    expect(capabilityLabel('place_bid')).toBe('Bidding');
    expect(capabilityLabel('sell')).toBe('Selling');
  });

  it('falls back to a humanised label for an unknown capability — never a raw enum code', () => {
    expect(capabilityLabel('future_capability')).toBe('Future capability');
  });

  it('gives every known capability a plain one-line hint', () => {
    expect(capabilityHint('sell')).toMatch(/list items for sale/i);
    expect(capabilityHint('place_bid')).toMatch(/place bids/i);
  });
});
