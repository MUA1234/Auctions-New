const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Base URL of the Singha API (v1). Works on server and client (NEXT_PUBLIC_*). */
export const apiBase = `${API}/api/v1`;

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
