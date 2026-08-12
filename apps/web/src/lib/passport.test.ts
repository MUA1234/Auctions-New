import { describe, expect, it } from 'vitest';
import { MEMBER_LOOKUP_PREFIX, memberLookupPayload, parseMemberLookupPayload } from './passport';

describe('member passport lookup payload (P1-13)', () => {
  it('encodes the Client ID behind the scheme prefix', () => {
    expect(memberLookupPayload('CUS-000123')).toBe(`${MEMBER_LOOKUP_PREFIX}CUS-000123`);
  });

  it('returns null for a missing / blank reference (no QR to render)', () => {
    expect(memberLookupPayload(null)).toBeNull();
    expect(memberLookupPayload(undefined)).toBeNull();
    expect(memberLookupPayload('   ')).toBeNull();
  });

  it('round-trips through the parser', () => {
    const payload = memberLookupPayload('CUS-987654')!;
    expect(parseMemberLookupPayload(payload)).toBe('CUS-987654');
  });

  it('rejects a payload that is not a Singha member reference', () => {
    expect(parseMemberLookupPayload('https://evil.example/steal')).toBeNull();
    expect(parseMemberLookupPayload('CUS-000123')).toBeNull(); // no prefix
    expect(parseMemberLookupPayload('')).toBeNull();
  });

  it('carries ONLY the reference — never sensitive member data', () => {
    const payload = memberLookupPayload('CUS-000123')!;
    // The entire payload is the prefix + the public Client ID and nothing else.
    expect(payload).toBe('SINGHA:M:CUS-000123');
    for (const forbidden of ['@', 'kyc', 'score', 'flag', 'limit', 'nic', 'passport']) {
      expect(payload.toLowerCase()).not.toContain(forbidden);
    }
  });
});
