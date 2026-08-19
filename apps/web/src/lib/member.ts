import { apiGetAuthed, apiPost } from './api';

/**
 * Member identity / credit / security client (Revision 05). The customer self
 * view and the staff Member 360 are SEPARATE endpoints and SEPARATE types — the
 * self view never carries internal score, flags or staff notes (§13/§21).
 */

export interface BidCapacity {
  approvedMinor: number;
  committedMinor: number;
  availableMinor: number;
  currency: string;
  hasFacility: boolean;
}

export interface SecuritySummary {
  type: string;
  status: string;
  faceAmountMinor: number;
  currency: string;
  issuingBank: string | null;
  expiresAt: string | null;
}

export interface TemporaryAccess {
  scopeType: string;
  scopeId: string | null;
  expiresAt: string | null;
}

export interface MemberSelf {
  clientReference: string | null;
  legalName: string | null;
  roles: Array<'buyer' | 'seller'>;
  membership: { status: string; expiresAt: string | null };
  kycStatus: string;
  bidCapacity: BidCapacity;
  temporaryAccess: TemporaryAccess[];
  security: SecuritySummary[];
}

/** Customer's own member area — GET /api/v1/me/member. */
export async function fetchMemberSelf(token: string): Promise<MemberSelf> {
  return apiGetAuthed<MemberSelf>('/me/member', token);
}

// ---- Staff Member 360 -------------------------------------------------------

export interface StaffSecurity extends SecuritySummary {
  id: string;
  eligibleAmountMinor: number;
  eligibilityBps: number;
  guaranteeNumber: string | null;
  verifiedAt: string | null;
}

export interface StaffFlag {
  id: string;
  context: string;
  category: string;
  severity: string;
  status: string;
  reasonCode: string;
  title: string;
  privateNote: string | null;
  createdBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface StaffPerformance {
  context: string;
  score: number | null;
  band: string;
  ruleVersion: string;
  components: unknown;
  generatedAt: string;
}

/** A linked messaging-channel identity (WhatsApp/FB/etc.) — never replaces customer_id. */
export interface ChannelIdentity {
  channel: string;
  externalId: string;
  verifiedAt: string | null;
}

export interface Member360 {
  clientReference: string | null;
  customerId: string;
  legalName: string | null;
  // Folded in by the CRM completion pass (§3) — staff-only, masked in search, full here.
  contact: { email: string | null; phone: string | null };
  kycStatus: string;
  roles: Array<'buyer' | 'seller'>;
  organization: { reference: string | null; legalName: string } | null;
  membership: { status: string; activatedAt: string | null; expiresAt: string | null } | null;
  temporaryAccess: TemporaryAccess[];
  credit: {
    approvedLimitMinor: number;
    committedMinor: number;
    availableMinor: number;
    currency: string;
    hasFacility: boolean;
    expiresAt?: string | null;
  };
  security: StaffSecurity[];
  flags: StaffFlag[];
  performance: StaffPerformance[];
  // CRM strip (§3/§19) — channel identities + open tasks + recent internal notes. Staff-only.
  channels: ChannelIdentity[];
  crm: {
    openTasks: import('./crm').CrmTask[];
    recentNotes: import('./crm').CrmNote[];
  };
}

/** Staff Member 360 — GET /api/v1/members/:id/360 (requires member:read). */
export async function fetchMember360(token: string, customerId: string): Promise<Member360> {
  return apiGetAuthed<Member360>(`/members/${customerId}/360`, token);
}

// ---- Staff member search (Revision 06.2 §12/§13) ----------------------------

/** A summary row from staff member search — contact is MASKED (open the 360 for
 *  full detail); never carries internal score, flags or private docs. */
export interface MemberSearchResult {
  customerId: string;
  clientReference: string | null;
  legalName: string | null;
  emailMasked: string | null;
  phoneMasked: string | null;
  kycStatus: string;
  membershipStatus: string;
  roles: Array<'buyer' | 'seller'>;
  organization: { reference: string | null; legalName: string } | null;
}

export interface MemberSearchResponse {
  query: string;
  count: number;
  results: MemberSearchResult[];
}

/** Staff member search — GET /api/v1/members/search (requires member:read). */
export async function searchMembers(
  token: string,
  q: string,
  limit = 10,
): Promise<MemberSearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiGetAuthed<MemberSearchResponse>(`/members/search?${params.toString()}`, token);
}

// ---- Staff commands (thin wrappers; server enforces perms + AAL2) -----------

export interface OnsiteGrantInput {
  customerId: string;
  scopeType: 'platform' | 'event' | 'auction' | 'category';
  scopeId?: string;
  spotDepositMinor: number;
  requiredSecurityBps?: number;
  approvedLimitMinor?: number;
  expiresAt: string;
  reason?: string;
}

export async function grantTemporaryMembership(token: string, input: OnsiteGrantInput) {
  return apiPost('/members/temporary-grant', input, token);
}

export async function submitSecurityInstrument(
  token: string,
  input: {
    customerId: string;
    type: 'cash_deposit' | 'bank_guarantee' | 'spot_deposit';
    faceAmountMinor: number;
    currency?: string;
    issuingBank?: string;
    guaranteeNumber?: string;
    expiresAt?: string;
  },
) {
  return apiPost('/members/security', input, token);
}

export async function verifySecurityInstrument(
  token: string,
  id: string,
  input: { decision: 'verify' | 'reject'; eligibilityBps?: number; reason?: string },
) {
  return apiPost(`/members/security/${id}/verify`, input, token);
}

export async function approveCredit(
  token: string,
  input: {
    customerId: string;
    requiredSecurityBps?: number;
    approvedLimitMinor?: number;
    reason?: string;
  },
) {
  return apiPost('/members/credit/approve', input, token);
}
