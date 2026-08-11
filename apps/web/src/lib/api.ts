const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Base URL of the Singha API (v1). Works on server and client (NEXT_PUBLIC_*). */
export const apiBase = `${API}/api/v1`;
/** Enriched public catalogue (v2). */
export const apiV2 = `${API}/api/v2`;

export async function apiDelete<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiGetAuthed<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message ?? detail?.title ?? `POST ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface CatalogueLot {
  id: string;
  reference: string;
  title: string;
  category: string;
  saleMethod: string;
  status: string;
  currency: string;
  currentBidMinor: number | null;
  endsAt: string | null;
  auctionId: string | null;
  auctionStatus: string | null;
}

export interface AuctionState {
  id: string;
  status: string;
  currency: string;
  openingBidMinor: number;
  incrementMinor: number;
  currentBidMinor: number | null;
  startsAt: string;
  endsAt: string;
}

export interface LotDetail extends CatalogueLot {
  attributes: Record<string, unknown> | null;
  auction: AuctionState | null;
}

export interface MarketPulseCategory {
  category: string;
  salesCount: number;
  totalMinor: number;
  avgMinor: number;
}

export interface MarketPulse {
  windowDays: number;
  salesCount: number;
  totalMinor: number;
  categories: MarketPulseCategory[];
}

export interface MyEoi {
  id: string;
  listingId: string;
  status: string;
  amountMinor: number | null;
  currency: string;
}

export interface MyOffer {
  id: string;
  listingId: string;
  status: string;
  amountMinor: number;
  currency: string;
}

export interface SellerListing {
  id: string;
  publicRef: string;
  title: string | null;
  saleMethod: string;
  status: string;
  category: string;
  createdAt: string;
}

// --- Enriched v2 catalogue (consolidated pack docs 06/07) -------------------
export interface PublicMedia {
  id: string;
  kind: string;
  storageKey: string;
  caption?: string;
  width?: number;
  height?: number;
}

/** Sale-aware discriminated commercial payload. */
export type CardCommercial =
  | {
      kind: 'auction';
      currency: string;
      openingBidMinor: number | null;
      currentBidMinor: number | null;
      endsAt: string | null;
      extendedCount: number;
    }
  | {
      kind: 'eoi';
      currency: string;
      guidePriceMinor?: number;
      interestCount: number;
      closesAt: string | null;
    }
  | { kind: 'buy_now'; currency: string; priceMinor: number | null }
  | { kind: 'make_offer'; currency: string; guidePriceMinor?: number; offerCount: number }
  | {
      kind: 'sealed_tender';
      currency: string;
      guidePriceMinor?: number;
      submissionCount: number;
      closesAt: string | null;
    }
  | { kind: 'unknown'; currency: string };

export interface CatalogueCardV2 {
  id: string;
  reference: string;
  title: string;
  shortDescription?: string;
  category: string;
  location?: { city: string | null; region: string | null };
  saleMethod: string;
  status: string;
  featured: boolean;
  watchers: number;
  media: { cover?: PublicMedia; videoAvailable: boolean };
  commercial: CardCommercial;
  event?: {
    id: string;
    publicRef: string;
    title: string;
    eventType: string;
    status: string;
    lotSequence: number;
  };
}

export interface Facet {
  value: string;
  count: number;
}

export interface CatalogueResponse {
  items: CatalogueCardV2[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: { category: Facet[]; saleMethod: Facet[]; status: Facet[] };
}

export interface WatchedLot {
  listingId: string;
  reference: string;
  title: string;
  category: string;
  saleMethod: string;
  status: string;
  currency: string;
  currentBidMinor: number | null;
  endsAt: string | null;
}

/** Fetch the enriched catalogue with query params (server-side filter/paginate). */
export async function fetchCatalogueV2(
  params: Record<string, string | number | boolean | undefined>,
): Promise<CatalogueResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v));
  const res = await fetch(`${apiV2}/catalogue?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /api/v2/catalogue -> ${res.status}`);
  return res.json() as Promise<CatalogueResponse>;
}

export async function addWatch(listingId: string, token: string) {
  return apiPost('/watch', { listingId }, token);
}
export async function removeWatch(listingId: string, token: string) {
  return apiDelete(`/watch/${listingId}`, token);
}
export async function fetchMyWatch(token: string) {
  return apiGetAuthed<WatchedLot[]>('/watch', token);
}
