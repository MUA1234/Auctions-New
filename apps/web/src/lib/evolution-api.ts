/**
 * Singha Evolution API client — typed calls for the E2–E13 backend capabilities the frontend
 * surfaces (commercial offers, currency/FX, logistics, procurement, supply, Singha ID, dashboard,
 * intelligence, control centre, satellite nodes). Mirrors the convention in `./api`: thin typed
 * functions over `apiGet`/`apiGetAuthed`/`apiPost`, non-2xx throws (message/title surfaced), reads
 * pass a Supabase bearer where the route requires auth. Every surface degrades gracefully when its
 * capability flag is OFF (the endpoint 404s → the caller shows a safe fallback).
 */
import { apiBase, apiGet, apiGetAuthed, apiPost } from './api';

/** PUT helper (api.ts keeps its PUT private); same auth + error contract as apiPost. */
async function apiPut<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message ?? detail?.title ?? `PUT ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const qs = (params: Record<string, string | number | undefined>): string => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

/* ------------------------------ E5 · Currency / FX ------------------------------ */

export interface FxCurrency {
  code: string;
  exponent: number;
}
export interface FxConversion {
  base: string;
  quote: string;
  amountMinor: number;
  convertedMinor: number;
  binding: false;
  stale: boolean;
  rate?: { rate?: string; asOf?: string } | null;
}
export const fetchCurrencies = () =>
  apiGet<{ currencies: FxCurrency[] }>('/fx/currencies').then((r) => r.currencies);
export const fxConvert = (base: string, quote: string, amountMinor: number) =>
  apiGet<FxConversion>(`/fx/convert${qs({ base, quote, amountMinor })}`);

/* ------------------------------ E4 · Commercial Offers ------------------------------ */

export interface OfferProposalInput {
  currency: string;
  totalPriceMinor?: number;
  unitPriceMinor?: number;
  quantity?: string;
  quantityUnitCode?: string;
  incoterm?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  validUntil?: string;
}
export interface OfferView {
  id: string;
  listingId: string;
  customerId: string;
  status: string;
  amountMinor: number | null;
  currency: string;
  sealed?: boolean;
  saleMethodCode?: string | null;
}
export interface SealedRankedOffer {
  rank: number;
  offerId: string;
  customerId?: string | null;
  amountMinor: number | null;
  currency?: string | null;
  revisionNumber?: number | null;
}
export interface SealedListingView {
  listingId: string;
  sealed: boolean;
  revealed?: boolean;
  participants?: number;
  offersReceived?: number;
  offers?: OfferView[] | SealedRankedOffer[];
}

export const submitCommercialOffer = (
  body: {
    listingId: string;
    sealed?: boolean;
    proposal: OfferProposalInput;
    saleMethodCode?: string;
  },
  token: string,
) => apiPost<OfferView>('/commercial-offers', body, token);
export const fetchMyCommercialOffers = (token: string) =>
  apiGetAuthed<OfferView[]>('/commercial-offers/mine', token);
export const withdrawCommercialOffer = (id: string, token: string) =>
  apiPost<OfferView>(`/commercial-offers/${id}/withdraw`, {}, token);
export const counterCommercialOffer = (
  id: string,
  body: { proposal: OfferProposalInput },
  token: string,
) => apiPost<OfferView>(`/commercial-offers/${id}/counter`, body, token);
export const acceptCommercialOffer = (id: string, token: string) =>
  apiPost<{ saleId?: string; sold?: boolean } & Record<string, unknown>>(
    `/commercial-offers/${id}/accept`,
    {},
    token,
  );
export const rejectCommercialOffer = (id: string, token: string) =>
  apiPost<OfferView>(`/commercial-offers/${id}/reject`, {}, token);
export const fetchOffersForListing = (listingId: string, token: string) =>
  apiGetAuthed<SealedListingView>(`/commercial-offers/listings/${listingId}`, token);
export const fetchListingParticipation = (listingId: string, token: string) =>
  apiGetAuthed<{ listingId: string; participants: number; offersReceived: number }>(
    `/commercial-offers/listings/${listingId}/participation`,
    token,
  );
export const revealSealedOffers = (listingId: string, token: string) =>
  apiPost<SealedListingView>(`/commercial-offers/listings/${listingId}/reveal`, {}, token);
export const awardSealedOffer = (listingId: string, selectedOfferId: string, token: string) =>
  apiPost<Record<string, unknown>>(
    `/commercial-offers/listings/${listingId}/award`,
    { selectedOfferId },
    token,
  );

/* ------------------------------ E7 · Logistics ------------------------------ */

export interface Incoterm {
  code: string;
  name?: string;
  freightArranger?: string;
  description?: string;
}
export interface LogisticsNode {
  id?: string;
  code?: string;
  name?: string;
  kind?: string;
  country?: string;
}
export interface LogisticsQuote {
  id: string;
  incoterm?: string;
  mode?: string;
  freightMinor?: number | null;
  currency?: string;
  freightResponsibility?: string;
  expiresAt?: string | null;
  [k: string]: unknown;
}
export interface Shipment {
  id: string;
  status?: string;
  events?: Array<{ status?: string; at?: string; note?: string }>;
  [k: string]: unknown;
}
export const fetchIncoterms = () =>
  apiGet<{ incoterms: Incoterm[] }>('/logistics/incoterms').then((r) => r.incoterms);
export const fetchLogisticsNodes = () =>
  apiGet<{ nodes: LogisticsNode[] }>('/logistics/nodes').then((r) => r.nodes);
export const requestLogisticsQuote = (body: Record<string, unknown>, token: string) =>
  apiPost<LogisticsQuote>('/logistics/quotes', body, token);
export const fetchLogisticsQuote = (id: string, token: string) =>
  apiGetAuthed<LogisticsQuote>(`/logistics/quotes/${id}`, token);
export const bookLogisticsQuote = (id: string, token: string) =>
  apiPost<{ booking?: unknown; shipment?: Shipment } & Record<string, unknown>>(
    `/logistics/quotes/${id}/book`,
    {},
    token,
  );
export const fetchShipment = (id: string, token: string) =>
  apiGetAuthed<Shipment>(`/logistics/shipments/${id}`, token);

/* ------------------------------ E9 · Procurement ------------------------------ */

export interface ProcurementRequest {
  id: string;
  type: string;
  status: string;
  title: string;
}
export interface RankedProposal {
  rank: number;
  proposalId: string;
  supplierCustomerId?: string | null;
  totalPriceMinor: number | null;
  currency?: string;
  incoterm?: string | null;
}
export interface ProcurementProposalsView {
  requestId: string;
  status: string;
  suppliers: number;
  pricedProposals: number;
  ranked: RankedProposal[];
}
export const createProcurementRequest = (
  body: {
    type: string;
    title: string;
    category?: string;
    specification?: string;
    quantity?: string;
    quantityUnitCode?: string;
    destinationCountry?: string;
    deliveryBy?: string;
    currency: string;
    paymentTerms?: string;
    submissionCloseAt?: string;
  },
  token: string,
) => apiPost<ProcurementRequest>('/procurement/requests', body, token);
export const fetchMyProcurementRequests = (token: string) =>
  apiGetAuthed<ProcurementRequest[]>('/procurement/requests/mine', token);
export const submitProcurementProposal = (
  requestId: string,
  body: { proposal: OfferProposalInput; notes?: string },
  token: string,
) =>
  apiPost<{ id: string; requestId: string; status: string }>(
    `/procurement/requests/${requestId}/proposals`,
    body,
    token,
  );
export const fetchProcurementProposals = (requestId: string, token: string) =>
  apiGetAuthed<ProcurementProposalsView>(`/procurement/requests/${requestId}/proposals`, token);
export const closeProcurementRequest = (requestId: string, token: string) =>
  apiPost<{ id: string; status: string }>(`/procurement/requests/${requestId}/close`, {}, token);
export const awardProcurementRequest = (
  requestId: string,
  selectedProposalId: string,
  token: string,
) =>
  apiPost<{ requestId: string; awardedProposalId: string; status: string }>(
    `/procurement/requests/${requestId}/award`,
    { selectedProposalId },
    token,
  );

/* ------------------------------ E10 · Supply Programmes ------------------------------ */

export interface SupplyProgrammeSummary {
  id: string;
  product: string;
  category?: string | null;
  status: string;
}
export interface SupplyRecommendation {
  programmeId: string;
  product: string;
  originCountry: string | null;
  indicativePriceMinor: number | null;
  leadTimeDays: number | null;
}
export const createSupplyProgramme = (body: Record<string, unknown>, token: string) =>
  apiPost<{ id: string; product: string; status: string }>('/supply/programmes', body, token);
export const fetchMySupplyProgrammes = (token: string) =>
  apiGetAuthed<SupplyProgrammeSummary[]>('/supply/programmes/mine', token);
export const setSupplyProgrammeStatus = (id: string, status: string, token: string) =>
  apiPost<{ id: string; status: string }>(`/supply/programmes/${id}/status`, { status }, token);
export const recommendSupply = (
  body: { category?: string; product?: string; quantityRequired?: string; originCountry?: string },
  token: string,
) =>
  apiPost<{ binding: false; count: number; recommendations: SupplyRecommendation[] }>(
    '/supply/recommend',
    body,
    token,
  );
export const attachPerishable = (
  body: {
    subjectType: 'supply_programme' | 'listing';
    subjectId: string;
    metadata: Record<string, unknown>;
  },
  token: string,
) =>
  apiPost<{ id: string; subjectType: string; subjectId: string }>(
    '/supply/perishable',
    body,
    token,
  );

/* ------------------------------ E11 · Singha ID ------------------------------ */

export interface SinghaProfile {
  customerId: string;
  countryResidency: string | null;
  displayCurrency: string | null;
  language: string | null;
  timezone: string | null;
  companyRoles: string[];
  notificationPrefs: Record<string, boolean>;
}
export interface CapabilityGrant {
  capability: string;
  status: string;
  expiresAt: string | null;
}
export interface CapabilityDecision {
  activity: string;
  requiredCapability: string | null;
  permitted: boolean;
  status: string;
  reason: string;
}
export const fetchSinghaProfile = (token: string) =>
  apiGetAuthed<SinghaProfile>('/singha-id/profile', token);
export const updateSinghaProfile = (body: Partial<SinghaProfile>, token: string) =>
  apiPut<{ customerId: string; updated: boolean }>('/singha-id/profile', body, token);
export const fetchCapabilities = (token: string) =>
  apiGetAuthed<CapabilityGrant[]>('/singha-id/capabilities', token);
export const requestCapability = (capability: string, token: string, evidenceRef?: string) =>
  apiPost<{ capability: string; status: string }>(
    '/singha-id/capabilities',
    { capability, evidenceRef },
    token,
  );
export const evaluateCapability = (activity: string, token: string) =>
  apiGetAuthed<CapabilityDecision>(`/singha-id/evaluate/${activity}`, token);
export const decideCapability = (
  body: {
    customerId: string;
    capability: string;
    decision: 'verified' | 'rejected';
    expiresAt?: string;
  },
  token: string,
) =>
  apiPost<{ customerId: string; capability: string; status: string }>(
    '/singha-id/capabilities/decide',
    body,
    token,
  );

/* ------------------------------ E11 · Dashboard + Control Centre ------------------------------ */

export interface StatusCount {
  status: string;
  count: number;
}
export interface DashboardSection {
  total: number;
  byStatus: StatusCount[];
}
export interface EvoDashboard {
  buying: { watching: number; offers: DashboardSection; procurementRequests: DashboardSection };
  selling: { supplyProgrammes: DashboardSection; procurementResponses: DashboardSection };
  verification: DashboardSection;
}
export interface ControlCentreOverview {
  operatorCode: string | null;
  counts: {
    operators: number;
    markets: number;
    routingRules: number;
    feeRules: number;
    paymentRoutes: number;
    supplyProgrammes: number;
    procurementRequests: number;
    pendingVerifications: number;
  };
  alerts: string[];
}
export const fetchEvoDashboard = (token: string) => apiGetAuthed<EvoDashboard>('/dashboard', token);
export const fetchControlCentre = (token: string, operatorCode?: string) =>
  apiGetAuthed<ControlCentreOverview>(`/control-centre/overview${qs({ operatorCode })}`, token);

/* ------------------------------ E12 · Intelligence ------------------------------ */

export interface MatchResult {
  programmeId: string;
  product: string | null;
  originCountry: string | null;
  score: number;
  factors: string[];
  indicativePriceMinor: number | null;
}
export interface PriceComparables {
  binding: false;
  count: number;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
  spreadMinor: number | null;
}
export interface RiskAssessment {
  binding: false;
  score: number;
  band: 'low' | 'medium' | 'high';
  flags: string[];
}
export const insightMatch = (
  body: { category?: string; product?: string; quantityRequired?: string; originCountry?: string },
  token: string,
) =>
  apiPost<{ binding: false; count: number; matches: MatchResult[] }>('/insight/match', body, token);
export const insightPricing = (body: { category?: string; product?: string }, token: string) =>
  apiPost<PriceComparables>('/insight/pricing/comparables', body, token);
export const insightCompareOffers = (
  body: {
    proposals: Array<{
      id: string;
      totalPriceMinor?: number;
      deliveryDays?: number;
      incoterm?: string;
    }>;
  },
  token: string,
) =>
  apiPost<{
    binding: false;
    ranked: Array<{
      id: string;
      headlineMinor: number | null;
      deliveryDays: number | null;
      incoterm: string | null;
    }>;
    cheapestId: string | null;
    fastestId: string | null;
  }>('/insight/offers/compare', body, token);
export const insightRisk = (
  body: {
    accountAgeDays: number;
    unverifiedHighValue?: boolean;
    rapidActions?: number;
    mismatchedCountry?: boolean;
    chargebackHistory?: boolean;
  },
  token: string,
) => apiPost<RiskAssessment>('/insight/risk', body, token);

/* ------------------------------ E6 · Routing / E8 · Fees / E8b · Payments (operator) ------------------------------ */

export const resolveRouting = (body: Record<string, unknown>, token: string) =>
  apiPost<Record<string, unknown>>('/routing/resolve', body, token);
export const computeFees = (body: Record<string, unknown>, token: string) =>
  apiPost<Record<string, unknown>>('/fees/compute', body, token);
export const resolvePaymentRoute = (body: Record<string, unknown>, token: string) =>
  apiPost<Record<string, unknown>>('/payments/resolve-route', body, token);

/* ------------------------------ E13 · Satellite Market Node ------------------------------ */

export interface NodePresentation {
  code: string;
  name: string;
  mode: string;
  verification: string;
  presets: {
    currency: string | null;
    language: string | null;
    country: string | null;
    marketId?: string | null;
  };
  capabilities: {
    browse: boolean;
    originateListings: boolean;
    takeOffers: boolean;
    runAuctions: boolean;
    acceptPayments: boolean;
  };
}
export interface NodeDiscovery {
  nodeCode: string;
  mode: string;
  presets: { currency: string | null; language: string | null; country: string | null };
  source: 'central';
  count: number;
  listings: Array<{ id: string; publicRef: string; title: string | null }>;
}
export const fetchNode = (code: string) => apiGet<NodePresentation>(`/nodes/${code}`);
export const fetchNodeDiscovery = (code: string) =>
  apiGet<NodeDiscovery>(`/nodes/${code}/discovery`);
export const originateOnNode = (
  code: string,
  capability: string,
  token: string,
  subjectRef?: string,
) =>
  apiPost<{
    nodeCode: string;
    originNode: string;
    capability: string;
    allowed: boolean;
    outcome: string;
    reason: string;
  }>(`/nodes/${code}/originate`, { capability, subjectRef }, token);
