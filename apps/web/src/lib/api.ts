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

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message ?? detail?.title ?? `PATCH ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Like apiPost but for PUT; the thrown Error carries `.status` so callers can branch on 409. */
export async function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const err = new Error(detail?.message ?? `PUT ${path} -> ${res.status}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

// --- Seller Studio: server-resumable drafts + auction preferences (§25/§7) ---
export interface SellerDraftSummary {
  id: string;
  title: string | null;
  status: string;
  version: number;
  schemaVersion: number;
  updatedAt: string;
}
export interface SellerDraft extends SellerDraftSummary {
  payload: Record<string, unknown>;
  mediaState?: Record<string, unknown> | null;
  aiProvenance?: Record<string, unknown> | null;
}
type SellerDraftBody = {
  title?: string;
  payload: Record<string, unknown>;
  mediaState?: Record<string, unknown>;
  aiProvenance?: Record<string, unknown>;
  schemaVersion?: number;
  expectedVersion?: number;
};
export const listSellerDrafts = (token: string) =>
  apiGetAuthed<{ drafts: SellerDraftSummary[] }>('/seller/drafts', token);
export const getSellerDraft = (id: string, token: string) =>
  apiGetAuthed<SellerDraft>(`/seller/drafts/${id}`, token);
export const createSellerDraft = (body: SellerDraftBody, token: string) =>
  apiPost<SellerDraft>('/seller/drafts', body, token);
export const saveSellerDraft = (id: string, body: SellerDraftBody, token: string) =>
  apiPut<SellerDraft>(`/seller/drafts/${id}`, body, token);
export const archiveSellerDraft = (id: string, token: string) =>
  apiDelete<{ id: string; status: string }>(`/seller/drafts/${id}`, token);

export type SellerAuctionPreferenceBody = {
  openingBidMinor?: number;
  reserveMinor?: number;
  incrementMinor?: number;
  currency?: string;
  preferredOpenAt?: string;
  preferredCloseAt?: string;
  notes?: string;
};
export const setAuctionPreference = (
  listingId: string,
  body: SellerAuctionPreferenceBody,
  token: string,
) => apiPut(`/listings/${listingId}/auction-preference`, body, token);

// --- Photo-first AI Vision intake (§10/§12) — advisory, per-field provenance ---
export interface VisionFieldSuggestion {
  field: string;
  value: string | number | boolean | null;
  confidence: number;
  source: string;
  state: string;
}
export interface VisionCaptureRequirement {
  view: string;
  label: string;
  required: boolean;
  present: boolean;
  guidance?: string;
}
export interface VisionIssue {
  kind: string;
  imageRef?: string;
  message: string;
}
export interface VisionValuation {
  currency: string;
  lowMinor: number;
  expectedMinor: number;
  highMinor: number;
  confidence: number;
  comparableRefs: string[];
  factors: string[];
  assessedAt: string;
}
export interface VisionIntakeResult {
  runId: string;
  category?: { value: string; confidence: number; source: string };
  fields: VisionFieldSuggestion[];
  capture: VisionCaptureRequirement[];
  issues: VisionIssue[];
  valuation?: VisionValuation;
  advisory: boolean;
  model: string;
  provider: string;
  version: string;
  createdAt: string;
}
export type VisionIntakeBody = {
  category?: string;
  images: { storageKey?: string; url?: string; view?: string }[];
  attributes?: Record<string, unknown>;
  notes?: string;
};
export const requestVisionIntake = (body: VisionIntakeBody, token?: string) =>
  apiPost<VisionIntakeResult>('/ai/vision/intake', body, token);

/** Direct-to-storage upload grant (pack doc 08 upload pipeline). */
export interface UploadGrant {
  path: string;
  signedUrl: string;
  token: string;
  kind: string;
}

/** Ask the API for a signed direct-to-Supabase upload URL for an asset's media. */
export async function createUploadUrl(
  assetId: string,
  filename: string,
  token?: string,
  kind: 'image' | 'video' | 'document' = 'image',
  meta?: { contentType?: string; sizeBytes?: number },
): Promise<UploadGrant> {
  return apiPost<UploadGrant>(
    `/assets/${assetId}/media/upload-url`,
    { filename, kind, ...(meta ?? {}) },
    token,
  );
}

/**
 * AI Listing Assistant draft (pack doc 08/10). Derived content — never facts. Shape mirrors the
 * backend `POST /ai/listing-draft` response `draft` object exactly (title/description/highlights/
 * confidence) — the previous mismatch made every real call a 400.
 */
export interface AiListingDraft {
  title: string;
  description: string;
  highlights: string[];
  confidence: number;
}

/**
 * Best-effort AI draft from the seller's in-progress facts. Resolves null when the draft could not
 * be produced (no provider / not authorised), but — unlike before — the failure is LOGGED, never
 * silently swallowed (directive §11), so a contract break is diagnosable instead of invisible.
 */
export async function requestAiListingDraft(
  body: { category: string; attributes: Record<string, unknown>; notes?: string },
  token?: string,
): Promise<AiListingDraft | null> {
  try {
    const res = await apiPost<{ draft: AiListingDraft }>('/ai/listing-draft', body, token);
    return res.draft;
  } catch (err) {
    console.error('[ai/listing-draft] request failed:', err);
    return null;
  }
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
  listingId: string;
  status: string;
  currency: string;
  openingBidMinor: number;
  incrementMinor: number;
  currentBidMinor: number | null;
  startsAt: string;
  endsAt: string;
  extendedCount: number;
  bidCount: number;
  // Monotonic sequence from the engine (pack 01 doc 07) for realtime ordering.
  version: number;
  reserveMet?: boolean;
}

export interface LotDetail extends CatalogueLot {
  attributes: Record<string, unknown> | null;
  auction: AuctionState | null;
  /** §19 — customer-safe verified-seller signal, same lone boolean the v2 card carries. */
  seller?: { verified: boolean };
  shortDescription?: string;
  fullDescription?: string;
  location?: { city: string | null; region: string | null };
  media?: PublicMedia[];
  /**
   * Free-text pickup/collection hint (mirrors `Listing.collectionSummary`). CX8: unlike
   * `quantity`/`quantityUnitCode` (deliberately NOT added below — see next comment), this one
   * is confirmed already live on `GET /api/v2/catalogue/:id` by
   * `contracts/public-api.contract.json` (backend-generated from a real response, not
   * assumed) — genuinely returned today, just not previously typed here. Added additively so
   * the lot page can show a pickup line without touching the backend.
   */
  collectionSummary?: string | null;
  /** Free-text viewing/inspection hint (mirrors `Listing.inspectionSummary`) — same contract
   *  evidence as `collectionSummary` above. */
  inspectionSummary?: string | null;
  // `quantity` / `quantityUnitCode` intentionally NOT added: the same contract file has no
  // such keys for this endpoint (only `Asset.quantityAvailable`/`quantityUnitCode` exist on
  // the data model, unprojected by any endpoint yet — confirmed, not assumed). CX4 skips a
  // quantity+unit fact on the lot page rather than render a field the API doesn't expose.
}

/**
 * Public lot detail (pack doc 07). Prefers the enriched v2 detail (media,
 * descriptions, location); falls back to the v1 catalogue detail so the page
 * still renders against an older backend.
 */
export async function fetchLotDetail(id: string): Promise<LotDetail> {
  const v2 = await fetch(`${apiV2}/catalogue/${id}`, { cache: 'no-store' }).catch(() => null);
  if (v2?.ok) return v2.json() as Promise<LotDetail>;
  const res = await fetch(`${apiBase}/catalogue/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /catalogue/${id} -> ${res.status}`);
  return res.json() as Promise<LotDetail>;
}

export interface PlaceBidResult {
  youLead: boolean;
}

/**
 * Place a proxy bid. `idempotencyKey` makes a duplicate network retry safe — the
 * server dedups on (auctionId, idempotencyKey) so the same logical bid is never
 * recorded twice. `source` records how the bid was entered (e.g. gesture vs button).
 */
export async function placeBid(
  auctionId: string,
  body: { maxAmountMinor: number; idempotencyKey?: string; source?: string },
  token: string,
): Promise<PlaceBidResult> {
  return apiPost<PlaceBidResult>(`/auctions/${auctionId}/bids`, body, token);
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
  /**
   * §19 — customer-safe seller trust signal. `verified` is true when the seller behind the lot
   * has completed identity verification (backend derives it from the owner's KYC state and never
   * exposes the KYC value or the seller's identity). A lone boolean; optional + forward-compatible.
   */
  seller?: { verified: boolean };
  media: { cover?: PublicMedia; videoAvailable: boolean };
  commercial: CardCommercial;
  /**
   * Decimal-string quantity + unit code for commodity/bulk listings (quantity engine,
   * docs/singha-evolution/06 "DATA_LISTING_QUANTITY_CURRENCY"; mirrors
   * `Asset.quantityAvailable` / `Asset.quantityUnitCode`). Optional and forward-compatible:
   * the v2 catalogue LIST card does not project these yet (only the single-lot detail has
   * `attributes`), so the universal card (CX3) renders this tier only "when present" and
   * stays correct the moment the backend adds them additively.
   */
  quantity?: string | null;
  quantityUnitCode?: string | null;
  /**
   * Short free-text pickup/collection hint (mirrors `Listing.collectionSummary`, already
   * returned by the single-lot detail endpoint but not yet by the list card). Optional for
   * the same forward-compatible reason as `quantity` above — shown as a subtle logistics
   * hint only when present.
   */
  collectionSummary?: string | null;
  /**
   * RW4 — customer-safe logistics availability hints on the list card (mirror whether the listing
   * has a pickup / destination location set). Optional + forward-compatible like `quantity` above.
   */
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
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

/**
 * Query params accepted by the enriched v2 catalogue (mirrors the backend
 * `catalogueQuerySchema` / `catalogueRowQuerySchema` in `@singha/contracts`, pack 01 doc
 * 05/07). Shared by the full list and the single-category Rubik row — the row requires
 * `category` and the list has no `cursor`, but every field here is optional so one type
 * keeps both call sites key-name-safe without two near-identical interfaces. Fields stay
 * primitive (not string-literal unions) so UI state that has widened to plain `string`
 * (e.g. a `useState('ending')` sort) can still be passed straight through.
 */
export interface CatalogueQueryParams {
  category?: string;
  saleMethod?: string;
  status?: string;
  search?: string;
  /** Matches listing city/region, case-insensitive (server-side `contains`). */
  location?: string;
  featured?: boolean;
  /** Server-side: restricts to listings closing within 48h. Omit rather than send `false`
   *  — the backend's `z.coerce.boolean()` treats the STRING "false" as truthy. */
  endingSoon?: boolean;
  auctionEventId?: string;
  /** RW4 — price BAND in minor units, matched against whichever commercial figure a listing
   *  actually publishes (buy-now / unit / guide / live-or-opening bid). */
  minPriceMinor?: number;
  maxPriceMinor?: number;
  /** RW4 — quantity range + unit code (commodity/bulk). */
  minQuantity?: number;
  maxQuantity?: number;
  unit?: string;
  /** RW4 — logistics presence flags. Send `true` to filter; omit otherwise (like `endingSoon`,
   *  the backend's `z.coerce.boolean()` treats the STRING "false" as truthy). */
  pickup?: boolean;
  delivery?: boolean;
  /** §19 — restrict to lots whose seller is identity-verified. Send `true` to filter; omit
   *  otherwise (same `z.coerce.boolean()` "false"-is-truthy caveat as the flags above). */
  verifiedOnly?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
  /** Row endpoint only: opaque cursor from a previous `CatalogueRowResponse`. */
  cursor?: string;
}

/** Fetch the enriched catalogue with query params (server-side filter/paginate). */
export async function fetchCatalogueV2(params: CatalogueQueryParams): Promise<CatalogueResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v));
  const res = await fetch(`${apiV2}/catalogue?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /api/v2/catalogue -> ${res.status}`);
  return res.json() as Promise<CatalogueResponse>;
}

/** One AuctionFlow/Rubik category row: independent cursor slice (pack 01 doc 05). */
export interface CatalogueRowResponse {
  category: string;
  items: CatalogueCardV2[];
  nextCursor: string | null;
  exhausted: boolean;
}

/**
 * Fetch a single category's Rubik row with its own cursor. Each band pages
 * independently, so every category item is reachable — not just the first
 * global catalogue page. Pass the previous `nextCursor` to load the next slice.
 */
export async function fetchCatalogueRow(
  params: CatalogueQueryParams,
): Promise<CatalogueRowResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v));
  const res = await fetch(`${apiV2}/catalogue/row?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /api/v2/catalogue/row -> ${res.status}`);
  return res.json() as Promise<CatalogueRowResponse>;
}

// --- Buyer command-centre projection (pack doc 05) -------------------------
export interface DashboardLot {
  listingId: string;
  reference: string;
  title: string;
  category: string;
  saleMethod: string;
  status: string;
  currency: string;
  amountMinor?: number | null;
  currentBidMinor?: number | null;
  endsAt?: string | null;
  deadlineAt?: string | null;
  note?: string;
}

export interface DashboardGroup {
  key: string;
  label: string;
  items: DashboardLot[];
}

export interface DashboardStrip {
  activeBids: number;
  winning: number;
  outbid: number;
  paymentDueMinor: number;
  readyForPickup: number;
  currency: string;
  bidLimitMinor?: number | null;
  depositBalanceMinor?: number | null;
}

export interface DashboardProjection {
  strip: DashboardStrip;
  groups: DashboardGroup[];
}

/**
 * Server command-centre projection (doc 05 `GET /api/v2/me/dashboard`). This is
 * a rebuildable read model, not customer truth. Resolves null when the backend
 * has not shipped the projection yet, so the dashboard can fall back to the
 * per-endpoint data it already has.
 */
export async function fetchDashboard(token: string): Promise<DashboardProjection | null> {
  try {
    const res = await fetch(`${apiV2}/me/dashboard`, {
      cache: 'no-store',
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as DashboardProjection;
  } catch {
    return null;
  }
}

/**
 * SSE stream for the buyer command centre (pack doc 05 "realtime transitions",
 * doc 17). Pack FIX-11: the main bearer token is NEVER placed in the URL (it
 * would leak via logs, referrers and browser history). Instead we open the
 * stream with `fetch()` and send the token in the `Authorization` header, then
 * read the SSE body incrementally. `onFrame` is called with each parsed data
 * frame; the returned promise resolves when the stream ends or is aborted. On
 * any error the caller falls back to a poll, mirroring the auction `BidPanel`.
 */
export async function streamDashboard(
  token: string,
  onFrame: (data: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${apiV2}/me/dashboard/stream`, {
    headers: { authorization: `Bearer ${token}`, accept: 'text/event-stream' },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    // SSE events are separated by a blank line; a data payload is `data: ...`.
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = rawEvent
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('\n');
      if (data) onFrame(data);
    }
  }
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

// --- Singha Exchange: Buy Now / Make Offer / Sealed Tender (docs/07) ---------

/** Immediate purchase of a BUY_NOW listing. Server holds the price — no body. */
export async function buyNow(listingId: string, token: string) {
  return apiPost<{ listingId: string; status: string }>(
    `/exchange/listings/${listingId}/buy-now`,
    {},
    token,
  );
}

/** Place a private offer on a MAKE_OFFER listing (amount in minor units). */
export async function makeOffer(
  listingId: string,
  body: { amountMinor: number; currency?: string; note?: string },
  token: string,
) {
  return apiPost<MyOffer>(`/exchange/listings/${listingId}/offers`, body, token);
}

/** Submit one sealed tender bid before the deadline (amount in minor units). */
export async function submitTender(
  listingId: string,
  body: { amountMinor: number; currency?: string },
  token: string,
) {
  return apiPost<{ id: string; status: string }>(
    `/exchange/listings/${listingId}/tender-bids`,
    body,
    token,
  );
}

export async function fetchMyOffers(token: string) {
  return apiGetAuthed<MyOffer[]>('/exchange/offers/mine', token);
}
export async function withdrawOffer(offerId: string, token: string) {
  return apiPost<MyOffer>(`/exchange/offers/${offerId}/withdraw`, {}, token);
}

// --- Expression of Interest (docs/07) ---------------------------------------

export async function submitEoi(
  body: {
    listingId: string;
    amountMinor?: number | null;
    currency?: string;
    message?: string;
    conditions?: string;
  },
  token: string,
) {
  return apiPost<MyEoi>('/eoi', body, token);
}

export async function fetchMyEois(token: string) {
  return apiGetAuthed<MyEoi[]>('/eoi/mine', token);
}
export async function withdrawEoi(eoiId: string, token: string) {
  return apiPost<MyEoi>(`/eoi/${eoiId}/withdraw`, {}, token);
}

// --- Auction events (docs/06) ----------------------------------------------

export interface EventSummary {
  id: string;
  publicRef: string;
  title: string;
  eventType: string;
  status: string;
  startsAt: string | null;
  locationCity: string | null;
  liveEnabled: boolean;
  featured: boolean;
  lotCount: number;
}

export interface EventLot {
  sequence: number;
  lane: string | null;
  scheduledStart: string | null;
  listingId: string;
  reference: string;
  title: string;
  category: string;
  saleMethod: string;
  currentBidMinor: number | null;
}

export interface EventDetail extends Omit<EventSummary, 'lotCount'> {
  description: string | null;
  venue: string | null;
  lots: EventLot[];
}

export async function fetchEvents(featuredOnly = false): Promise<EventSummary[]> {
  return apiGet<EventSummary[]>(`/events${featuredOnly ? '?featured=true' : ''}`);
}

export async function fetchEvent(idOrRef: string): Promise<EventDetail> {
  return apiGet<EventDetail>(`/events/${idOrRef}`);
}

// --- Singha Discover + Buyer Twin (docs 06/11) ------------------------------

export interface DiscoverFeedItem {
  listingId: string;
  reference: string;
  title: string;
  category: string;
  saleMethod: string;
  currency: string;
  currentBidMinor: number | null;
  endsAt: string | null;
  coverStorageKey: string | null;
  reason: string | null;
}

/** Server-ranked Discover feed (public; personalised when signed in). */
export async function fetchDiscoverFeed(limit = 20): Promise<{ items: DiscoverFeedItem[] }> {
  return apiGet<{ items: DiscoverFeedItem[] }>(`/discovery/feed?limit=${limit}`);
}

/** Append a discovery signal. A swipe is NOT a bid/purchase (pack doc 11). */
export async function recordDiscoveryEvent(
  body: {
    listingId: string;
    eventType: string;
    sourceSurface?: string;
    bandContext?: string;
    anonymousSessionId?: string;
  },
  token?: string,
) {
  return apiPost('/discovery/events', body, token);
}

export async function resetDiscoveryPreferences(token: string) {
  return apiPost('/discovery/preferences/reset', {}, token);
}

/** Safe Buyer Twin summary — labels + bucketed confidence + explanations, no scores. */
export interface BuyerTwinSummary {
  version: number;
  topCategories: string[];
  dislikedCategories: string[];
  priceBandMinor: { min: number; max: number } | null;
  preferredSaleMethod: string | null;
  confidence: 'none' | 'low' | 'medium' | 'high';
  explanations: string[];
  builtAt: string | null;
}

export async function fetchBuyerTwin(token: string): Promise<BuyerTwinSummary> {
  return apiGetAuthed<BuyerTwinSummary>('/discovery/buyer-twin', token);
}

// --- Bid Battle rivalry (pack doc 05) ---------------------------------------
// Mirrors the backend `RivalryView` contract. The view is privacy-safe by
// construction: every participant is an alias and the caller is "You" — the
// backend never sends a bidderId or proxy maximum, so none can appear here.

export interface RivalryMoment {
  kind: 'lead_taken' | 'comeback' | 'you_outbid';
  who: string;
  sequence: number;
}

export interface RivalryView {
  auctionId: string;
  currentHighMinor: number | null;
  nextValidBidMinor: number | null;
  gapToNextMinor: number | null;
  activeBidderCount: number;
  totalBids: number;
  leadChanges: number;
  youAreLeading: boolean;
  leader: string | null;
  challenger: string | null;
  moments: RivalryMoment[];
}

/**
 * The safe Bid Battle rivalry view for an auction. Sends the bearer when signed in
 * so the caller is resolved to "You". Returns 404 (throws) when `bidBattleV3` is OFF
 * server-side — callers gate on the flag first, so that path is not normally hit.
 * Reading this never places a bid.
 */
export async function fetchRivalry(auctionId: string, token?: string): Promise<RivalryView> {
  return token
    ? apiGetAuthed<RivalryView>(`/auctions/${auctionId}/rivalry`, token)
    : apiGet<RivalryView>(`/auctions/${auctionId}/rivalry`);
}

// --- Engagement notification preferences + delivery (pack doc 05) -----------

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';

export interface NotificationPreferencesView {
  channels: Record<NotificationChannel, boolean>;
  engagementOptIn: boolean;
  quietHours: { start: string; end: string } | null;
  timezoneOffsetMinutes: number;
  frequencyCapPerDay: number;
  mutedCategories: string[];
}

export interface NotificationDeliveryView {
  id: string;
  eventType: string;
  classification: 'transactional' | 'engagement';
  channel: NotificationChannel | null;
  status: 'sent' | 'suppressed' | 'failed' | 'dead';
  suppressedReason: string | null;
  title: string;
  body: string;
  createdAt: string;
}

export async function fetchNotificationPreferences(token: string) {
  return apiGetAuthed<NotificationPreferencesView>('/engagement/preferences', token);
}

export async function updateNotificationPreferences(
  body: Partial<Omit<NotificationPreferencesView, 'channels'>> & {
    channels?: Partial<Record<NotificationChannel, boolean>>;
  },
  token: string,
) {
  return apiPatchLike<NotificationPreferencesView>('/engagement/preferences', body, token);
}

export async function fetchNotifications(token: string, limit = 30) {
  return apiGetAuthed<NotificationDeliveryView[]>(
    `/engagement/notifications?limit=${limit}`,
    token,
  );
}

/** PUT helper (the engagement preferences endpoint is idempotent PUT). */
async function apiPatchLike<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

// --- Dashboard-pilot product analytics (pack doc 09) ------------------------
// Privacy-safe: surface + action + optional listing/funnel step only. Best-effort
// (never throws, never blocks UX). Gated on dashboardV3Beta by the caller.
export async function recordProductEvent(
  body: {
    surface: string;
    action: string;
    listingId?: string;
    funnelStep?: string;
    anonymousSessionId?: string;
    metadata?: Record<string, string | number | boolean>;
  },
  token?: string,
): Promise<void> {
  try {
    await fetch(`${apiV2}/me/analytics`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* analytics is best-effort — a dropped event must never affect the UX */
  }
}
