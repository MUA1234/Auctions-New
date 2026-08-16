/**
 * Singha AI conversation assistant API client (AIC-5, docs/10 "Customer AI"). Mirrors the
 * convention in `./evolution-api`: thin typed functions over the shared `apiPost`/`apiGetAuthed`
 * helpers from `./api` — the SAME authed-fetch path every other authed surface uses (attaches
 * `authorization: Bearer <supabase-access-token>`, throws a legible `Error` on a non-2xx response
 * with the backend's `message`/`title` when present). Nothing here reinvents auth or error
 * handling — callers pair these with `friendlyMessage` (`./../components/evolution/evo-api-error`)
 * exactly like every other authed form in the app.
 *
 * Every route requires a signed-in customer with the `ai:converse` permission (granted to the
 * Customer/Seller roles server-side — never a client-side role check) and is gated server-side by
 * `FEATURE_AI_CONVERSATION` (default off): with the flag off every call below 404s, which the UI
 * never has to special-case because `SinghaAssistant` only mounts when the mirrored FE flag
 * `aiConversation` is on (see `./flags`).
 *
 * Non-binding (pack rule 11): nothing here ever places a bid/offer/EOI — `askAssistant` only
 * answers/suggests, `assistantSearch` only returns existing `CatalogueCardV2` catalogue cards, and
 * `assistantChannelRequest` only hands back a deep-link/callback intent.
 */
import { apiGetAuthed, apiPost, type CatalogueCardV2, type CatalogueQueryParams } from './api';

/** `POST /assistant/message` request body (`askAssistantSchema`). */
export interface AskAssistantRequest {
  /** Continue an existing, owned conversation; omit to start a new one. */
  conversationId?: string;
  /** Attaches the customer-safe item context for this message (server-assembled — the FE never
   *  sends listing facts itself, only the id it's asking about). */
  listingId?: string;
  /** The page URL the customer was on when they asked, for context only. */
  url?: string;
  message: string;
}

/**
 * `POST /assistant/message` response (`assistantAskResponseSchema`). `refused` is true when the
 * server-side boundary guard blocked the request (prompt injection / instruction override /
 * over-length) — `reply` is then a fixed safe message and `suggestions` is absent. `suggestions`
 * are customer-safe LABELS only (never actions/links) derived from the listing's sale method.
 */
export interface AskAssistantResponse {
  conversationId: string;
  reply: string;
  refused: boolean;
  suggestions?: string[];
}

export const askAssistant = (
  body: AskAssistantRequest,
  token: string,
): Promise<AskAssistantResponse> =>
  apiPost<AskAssistantResponse>('/assistant/message', body, token);

/** `POST /assistant/search` request body (`assistantSearchSchema`). Unlike `ask()`, a
 *  `conversationId` here must already exist — search never mints a fresh one. */
export interface AssistantSearchRequest {
  query: string;
  conversationId?: string;
}

/**
 * `POST /assistant/search` response. `interpreted` is the VALIDATED filter subset actually run
 * against the catalogue (the same field names `CatalogueQueryParams` accepts on `/api/v2/catalogue`
 * — the model interprets intent into filters only; it never ranks/paginates/invents inventory).
 * `results` are the existing, authoritative `CatalogueCardV2` cards — never a model-shaped item.
 */
export interface AssistantSearchResponse {
  query: string;
  interpreted: Partial<CatalogueQueryParams>;
  results: CatalogueCardV2[];
  total: number;
  refused: boolean;
}

export const assistantSearch = (
  body: AssistantSearchRequest,
  token: string,
): Promise<AssistantSearchResponse> =>
  apiPost<AssistantSearchResponse>('/assistant/search', body, token);

/** The only channels a customer may ask to continue on (mirrors `assistantRequestableChannelValues`
 *  — 'web' is this assistant's own channel and is never itself "requested"). */
export type AssistantChannel = 'whatsapp' | 'voice';

/** `POST /assistant/channel-request` request body (`assistantChannelRequestSchema`). Unlike
 *  `ask()`/`assistantSearch()`, `conversationId` is REQUIRED — there must already be a
 *  conversation to hand off. A channel not enabled server-side (config `assistantChannels`,
 *  default `['web']` only) throws a plain 400 the caller surfaces via `friendlyMessage`. */
export interface AssistantChannelRequestBody {
  conversationId: string;
  channel: AssistantChannel;
  phone?: string;
}

/** `deepLink` is set only for `channel:'whatsapp'`; `callbackRequested` only for `channel:'voice'`
 *  (always `true` there — a non-binding, nobody-really-calls-you-yet placeholder). `continuityToken`
 *  is always returned — an opaque link, never a credential, that resumes this same conversation. */
export interface AssistantChannelRequestResponse {
  channel: AssistantChannel;
  deepLink?: string;
  callbackRequested?: boolean;
  continuityToken: string;
}

export const assistantChannelRequest = (
  body: AssistantChannelRequestBody,
  token: string,
): Promise<AssistantChannelRequestResponse> =>
  apiPost<AssistantChannelRequestResponse>('/assistant/channel-request', body, token);

/** One message in a conversation — the customer-safe projection `GET /assistant/conversations/:id`
 *  returns (never `sender`/`providerMessageId`, internal channel plumbing). `direction` is
 *  `'inbound' | 'outbound'`; `provenance` is `'customer' | 'ai' | 'system'` — kept as plain
 *  `string` here (not a narrowed union) to stay forward-compatible the same way the rest of
 *  `./api`'s enum-ish fields do (e.g. `CatalogueLot.status`). */
export interface AssistantMessageView {
  id: string;
  direction: string;
  provenance: string;
  text: string;
  payload: unknown;
  createdAt: string;
}

export interface AssistantConversationView {
  id: string;
  status: string;
  aiMode: boolean;
  createdAt: string;
  updatedAt: string;
  messages: AssistantMessageView[];
}

export const getAssistantConversation = (
  id: string,
  token: string,
): Promise<AssistantConversationView> =>
  apiGetAuthed<AssistantConversationView>(`/assistant/conversations/${id}`, token);
