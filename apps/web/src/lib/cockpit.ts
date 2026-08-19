import { apiGetAuthed, apiPost } from './api';

/**
 * Singha Cockpit client (unified-identity + multi-currency correction pass). ONE adaptive,
 * authoritative read-model for the signed-in client — buying, selling, procurement, supply, account
 * health, a unified activity timeline, conversations and notifications for the SAME Customer ID.
 * Buyer/seller/supplier are capabilities, not accounts; the cockpit is never a source of truth and
 * holds no financial state of its own — every figure is read live from `/api/v2/me/cockpit`.
 *
 * Money is NEVER a bare number: each amount is `{ currency, exponent, minor }` where `minor` is a
 * precision-safe string in the currency's smallest unit, and per-currency facts are grouped in
 * `byCurrency[]` and never summed across currencies. `?org=<id>` selects an authorised organisation
 * context (personal by default); `?display=<CUR>` requests informational-only FX equivalents.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const V2 = `${API}/api/v2`;

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

async function v2Get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${V2}${path}`, {
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}
async function v2Post<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${V2}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

/** A single authoritative money amount. `minor` is a precision-safe string, never a JS number. */
export interface MoneyAmount {
  currency: string;
  exponent: number;
  minor: string;
}

/** One currency's row in a per-currency grouping (amounts are precision-safe strings). */
export interface CurrencyBucket {
  currency: string;
  exponent: number;
  [key: string]: string | number;
}

export interface Lot {
  listingId: string;
  reference: string;
  title: string;
  category: string;
}

export interface AttentionItem {
  kind: string;
  label: string;
  ref: string;
  at?: string | null;
}

export interface AccountHealth {
  context: {
    kind: 'personal' | 'organization';
    organizationId: string | null;
    organizationName: string | null;
  };
  status: 'clear' | 'attention';
  membershipStatus: string;
  kyc?: string;
  // Bid capacity is a personal, single-currency credit fact — null when there is no facility.
  bidCapacity: {
    currency: string;
    exponent: number;
    approvedMinor: string;
    committedMinor: string;
    availableMinor: string;
    hasFacility: boolean;
    expiresAt: string | null;
  } | null;
  security: { count: number; byCurrency: CurrencyBucket[] };
  amountsToPay: { count: number; overdueCount: number; byCurrency: CurrencyBucket[] };
  sellerProceeds: { pendingCount: number; byCurrency: CurrencyBucket[] };
  overdueActions: Array<{ kind: string; label: string; ref: string; amount?: MoneyAmount }>;
  // Optional, informational-only display-currency equivalents (binding:false). Never authoritative.
  display?: {
    currency: string;
    exponent: number;
    binding: false;
    asOf: string | null;
    stale: boolean;
    note: string;
    amountsToPayMinor: string;
    overdueMinor: string;
    sellerProceedsPendingMinor: string;
    sellerProceedsSettledMinor: string;
    rates: Array<{ from: string; rate: string }>;
  };
}

export interface AuctionLot extends Lot {
  auctionId: string;
  currentBidMinor: number;
  myMaxMinor: number;
  endsAt: string | null;
  currency: string;
  exponent: number;
}

export interface TimelineEntry {
  at: string;
  kind: string;
  group: string;
  title: string;
  refType: string;
  refId: string;
  listing?: Lot | null;
  amount?: MoneyAmount | null;
  status?: string | null;
}

export interface Timeline {
  context: 'personal' | 'organization';
  count: number;
  entries: TimelineEntry[];
}

export interface OrganizationMembership {
  organizationId: string;
  reference: string | null;
  legalName: string;
  role: string;
}

export interface Cockpit {
  identity: {
    customerId: string;
    clientReference: string | null;
    legalName: string | null;
    kycStatus: string;
    roles: Array<'buyer' | 'seller'>;
    emphasis: 'buyer' | 'seller' | 'both';
    capabilities: Array<{ capability: string; status: string }>;
  };
  context: {
    kind: 'personal' | 'organization';
    organizationId: string | null;
    organizationName: string | null;
  };
  organizations: OrganizationMembership[];
  accountHealth: AccountHealth;
  needsAttention: AttentionItem[];
  timeline: Timeline;
  buying: {
    summary: {
      activeBids: number;
      winning: number;
      outbid: number;
      watched: number;
      purchases: number;
    };
    activeBids: AuctionLot[];
    winning: AuctionLot[];
    outbid: AuctionLot[];
    won: AuctionLot[];
    watched: Array<Lot & { currentBidMinor: number | null; endsAt: string | null }>;
    offers: Array<Lot & { offerId: string; status: string; amount: MoneyAmount }>;
    eois: Array<Lot & { eoiId: string; status: string; amount: MoneyAmount | null }>;
    tenders: Array<Lot & { tenderId: string; amount: MoneyAmount }>;
    purchases: Array<Lot & { saleId: string; amount: MoneyAmount; at: string | null }>;
    invoices: Array<
      Lot & {
        invoiceId: string;
        number: string;
        status: string;
        amountDue: MoneyAmount;
        dueAt: string | null;
      }
    >;
  };
  selling: {
    summary: {
      activeListings: number;
      drafts: number;
      offersReceived: number;
      sales: number;
      // Per-currency pending proceeds (never a single cross-currency sum).
      pendingProceeds: CurrencyBucket[];
    };
    activeListings: Array<
      Lot & {
        status: string;
        saleMethod: string;
        currency: string;
        currentBidMinor: number | null;
        endsAt: string | null;
      }
    >;
    drafts: Array<{
      draftId: string;
      title: string | null;
      status: string;
      updatedAt: string | null;
    }>;
    offersReceived: Array<Lot & { offerId: string; status: string; amount: MoneyAmount }>;
    sales: Array<
      Lot & { saleId: string; amount: MoneyAmount; settled: boolean; at: string | null }
    >;
    settlements: Array<
      Lot & {
        settlementId: string;
        net: MoneyAmount;
        saleProceeds: MoneyAmount;
        commission: MoneyAmount;
        at: string | null;
      }
    >;
  };
  procurement: {
    requests: Array<{
      requestId: string;
      title: string;
      type: string;
      status: string;
      category: string | null;
      createdAt: string | null;
    }>;
  };
  supply: {
    programmes: Array<{
      programmeId: string;
      product: string;
      status: string;
      category: string | null;
      createdAt: string | null;
    }>;
  };
  conversations: {
    count: number;
    recent: Array<{ id: string; channel: string; status: string; updatedAt: string | null }>;
  };
  notifications: {
    recent: Array<{
      id: string;
      title: string;
      body: string;
      channel: string | null;
      status: string;
      at: string | null;
    }>;
  };
}

export interface CockpitAnswer {
  intent: string;
  reply: string;
  facts: Record<string, unknown>;
  disclaimer: string;
}

/**
 * Format one authoritative money amount precisely from its string minor units and canonical
 * exponent — never `Number(minor) / 100`. String maths keeps large values exact.
 */
export function formatAmount(m?: MoneyAmount | null): string {
  if (!m) return '—';
  return `${m.currency} ${minorToMajor(m.minor, m.exponent)}`;
}

/** Format a per-currency bucket for a given key, e.g. "LKR 10,000 · AUD 20,000". */
export function formatBuckets(rows: CurrencyBucket[] | undefined, key: string): string {
  const parts = (rows ?? [])
    .filter((r) => String(r[key] ?? '0') !== '0')
    .map((r) => `${r.currency} ${minorToMajor(String(r[key] ?? '0'), Number(r.exponent))}`);
  return parts.length ? parts.join(' · ') : '—';
}

/** Precision-safe minor→major string conversion with thousands grouping (no floating point). */
function minorToMajor(minor: string, exponent: number): string {
  const neg = minor.startsWith('-');
  const digits = (neg ? minor.slice(1) : minor).replace(/\D/g, '').padStart(exponent + 1, '0');
  const whole = digits.slice(0, digits.length - exponent) || '0';
  const frac = exponent > 0 ? digits.slice(digits.length - exponent) : '';
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = exponent > 0 ? `${grouped}.${frac}` : grouped;
  return neg ? `-${body}` : body;
}

export const fetchCockpit = (token: string, org?: string) =>
  v2Get<Cockpit>(withQuery('/me/cockpit', { org }), token);
export const fetchAccountHealth = (token: string, org?: string, display?: string) =>
  v2Get<AccountHealth>(withQuery('/me/cockpit/account-health', { org, display }), token);
export const fetchTimeline = (token: string, org?: string) =>
  v2Get<Timeline>(withQuery('/me/cockpit/timeline', { org }), token);
export const askCockpit = (token: string, question: string, org?: string) =>
  v2Post<CockpitAnswer>(withQuery('/me/cockpit/ask', { org }), { question }, token);

// Re-export the shared authed helpers so pages can also hit v1 routes (list actions etc.).
export { apiGetAuthed, apiPost };
