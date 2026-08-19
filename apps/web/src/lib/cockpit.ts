import { apiGetAuthed, apiPost } from './api';

/**
 * Singha Cockpit client (unified-identity pass). ONE adaptive, authoritative read-model for the
 * signed-in client — buying, selling, procurement, supply, account health, conversations and
 * notifications for the SAME Customer ID. Buyer/seller/supplier are capabilities, not accounts;
 * the cockpit is never a source of truth and holds no financial state of its own — every figure is
 * read live from `/api/v2/me/cockpit`. The base client points at `/api/v1`; the cockpit lives on
 * the absolute `/api/v2/me` path, so these helpers build that URL directly.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const V2 = `${API}/api/v2`;

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
  status: 'clear' | 'attention';
  currency: string;
  membershipStatus: string;
  kyc?: string;
  bidCapacity: {
    approvedMinor: number;
    committedMinor: number;
    availableMinor: number;
    hasFacility: boolean;
    expiresAt: string | null;
  };
  security: {
    verifiedMinor: number;
    count: number;
    instruments: Array<{
      type: string;
      status: string;
      faceAmountMinor: number;
      eligibleMinor: number;
      currency: string;
      expiresAt: string | null;
    }>;
  };
  amountsToPay: { count: number; totalMinor: number; overdueCount: number; overdueMinor: number };
  sellerProceeds: { pendingCount: number; pendingMinor: number; settledMinor: number };
  overdueActions: Array<{ kind: string; label: string; ref: string; amountMinor?: number }>;
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
  accountHealth: AccountHealth;
  needsAttention: AttentionItem[];
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
    offers: Array<Lot & { offerId: string; status: string; amountMinor: number; currency: string }>;
    eois: Array<Lot & { eoiId: string; status: string; amountMinor: number }>;
    tenders: Array<Lot & { tenderId: string; amountMinor: number }>;
    purchases: Array<
      Lot & { saleId: string; amountMinor: number; currency: string; at: string | null }
    >;
    invoices: Array<
      Lot & {
        invoiceId: string;
        number: string;
        status: string;
        amountDueMinor: number;
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
      pendingProceedsMinor: number;
    };
    activeListings: Array<
      Lot & {
        status: string;
        saleMethod: string;
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
    offersReceived: Array<
      Lot & { offerId: string; status: string; amountMinor: number; currency: string }
    >;
    sales: Array<
      Lot & {
        saleId: string;
        amountMinor: number;
        currency: string;
        settled: boolean;
        at: string | null;
      }
    >;
    settlements: Array<
      Lot & {
        settlementId: string;
        netMinor: number;
        saleProceedsMinor: number;
        commissionMinor: number;
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

export interface AuctionLot extends Lot {
  auctionId: string;
  currentBidMinor: number;
  myMaxMinor: number;
  endsAt: string | null;
  currency: string;
}

export interface CockpitAnswer {
  intent: string;
  reply: string;
  facts: Record<string, unknown>;
  disclaimer: string;
}

export const fetchCockpit = (token: string) => v2Get<Cockpit>('/me/cockpit', token);
export const fetchAccountHealth = (token: string) =>
  v2Get<AccountHealth>('/me/cockpit/account-health', token);
export const askCockpit = (token: string, question: string) =>
  v2Post<CockpitAnswer>('/me/cockpit/ask', { question }, token);

// Re-export the shared authed helpers so pages can also hit v1 routes (list actions etc.).
export { apiGetAuthed, apiPost };
