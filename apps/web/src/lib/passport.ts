/**
 * Member Passport lookup payload (Revision 06.1 P1-13).
 *
 * The Passport QR encodes ONLY an opaque, stable lookup reference — the public
 * Client ID behind a scheme prefix — never KYC documents, credit limits, phone,
 * email, flags, score or any private security detail. A staff scanner reads the
 * reference and resolves the customer through an authenticated backend lookup;
 * the code itself carries nothing sensitive if photographed.
 */
export const MEMBER_LOOKUP_PREFIX = 'SINGHA:M:';

/** Build the QR payload for a Client ID, or null when there is no reference. */
export function memberLookupPayload(clientReference: string | null | undefined): string | null {
  const ref = (clientReference ?? '').trim();
  if (!ref) return null;
  return `${MEMBER_LOOKUP_PREFIX}${ref}`;
}

/** Extract the Client ID a scanner read from a payload, or null if not ours. */
export function parseMemberLookupPayload(payload: string | null | undefined): string | null {
  const value = (payload ?? '').trim();
  if (!value.startsWith(MEMBER_LOOKUP_PREFIX)) return null;
  const ref = value.slice(MEMBER_LOOKUP_PREFIX.length).trim();
  return ref || null;
}
