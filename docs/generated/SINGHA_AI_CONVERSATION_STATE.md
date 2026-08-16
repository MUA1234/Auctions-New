# Singha AI Conversation & Omnichannel Item Assistant — Running State

Programme state for the AI Conversation addendum (extends the CX Overhaul). A single shared
"Singha conversation brain" with multiple channel entrances — webchat · WhatsApp · voice/callback ·
human handoff — plus item-level "Ask Singha AI", AI-assisted discovery and non-binding
AI-assisted commercial-action preparation. Server-authoritative and anti-clone throughout.

Continues on `claude/new-session-at0qp4` in both repos, behind a new controlled-preview flag
(default OFF). Nothing binding is enabled; no live provider is called.

## Non-negotiables carried from the pack + addendum
- **One conversation brain, many entrances** — never separate isolated assistants per channel.
- **Server-authoritative.** The LLM interprets intent only; authoritative Singha services execute
  every fact (search, price, availability, offer/bid acceptance). The LLM is never the transaction
  authority. AI-prepared offers/bids are **non-binding intents** requiring the existing explicit
  confirmation + engine validation.
- **AI never invents** inventory, price, quantity, availability, closing time, status, shipping or
  seller identity — those come only from authoritative services.
- **Anti-clone / DTO privacy.** Item-context assembly, memory, identity resolution, orchestration,
  model routing, matching, tool-selection, prompts/policies stay **server-side**. Never expose
  reserve, proxy max, seller floor, competitor sealed offers, KYC, risk/fraud score, staff notes,
  valuations, routing/ranking weights. The browser gets only render-chat / send-message /
  customer-safe-response / authorised-channel-action.
- **Providers behind adapters** (channel + model), provider-neutral and replaceable, with
  deterministic fakes so nothing live is required to build/test.
- **Extend, don't duplicate** the existing `connect` (channel abstraction) and `ai` modules.

## Autonomous vs owner-gated boundary
**Built autonomously (this programme):** the full conversation-brain architecture, the Conversation
aggregate + persistence, server-side customer-safe item-context assembly, channel adapters
(webchat/WhatsApp/voice) with deterministic fakes, model-provider abstraction with a deterministic
fake interpreter, assistant orchestration calling authoritative tools, AI-assisted search +
non-binding commercial-action prep, security/privacy boundary + tests, and all gated FE surfaces
(site-wide webchat, item-level Ask Singha AI, channel choice, suggested prompts).

**Owner-only (escalate — do NOT attempt):** real WhatsApp Business API account + number;
telephony / AI-voice provider account; production LLM provider credentials; final public-launch
approval; legal/compliance wording; anything binding in production. These remain configuration +
adapters; the fakes stand in until the owner supplies accounts/keys.

## Phase plan (AIC-0 → AIC-7) — implement → test → self-review → correct → retest → commit → continue
- **AIC-0 — Recon** the existing `connect`/`ai`/`intelligence`/`identity`/`offers` infra → reuse map
  + genuine gap. (In progress.)
- **AIC-1 — Conversation brain core (backend).** Additive Prisma models (Conversation,
  ConversationMessage, ChannelEvent) + ConversationService (create/continue, preserve
  identity/context/history/language/intent/commercial-stage/next-action). Server-side customer-safe
  `ItemContext` assembly from listing/RFQ/supply. New flag `FEATURE_AI_CONVERSATION` (default off).
  Unit + integration tests.
- **AIC-2 — Channels + model provider (backend).** Extend the `connect` channel abstraction with
  webchat/WhatsApp/voice adapters + deterministic fakes; cross-channel continuity (one logical
  conversation across channel events); human-handoff context. Model-provider interface + a
  deterministic fake "intent interpreter" (never authoritative). Tests: continuity, replaceability.
- **AIC-3 — Assistant orchestration + tools (backend).** The brain: message + context → fake
  interpreter → authoritative Singha tools (catalogue search, item-context, non-binding offer/RFQ
  prep) → customer-safe response. AI-assisted search (interpret → catalogue-v2 executes, never
  invents). Commercial-action prep routes into the existing non-binding confirm flow. Tests.
- **AIC-4 — Security / privacy / anti-clone (backend).** DTO-privacy assertions (no
  reserve/proxy/competitor/KYC/risk/staff/weights via chat APIs); prompt-injection treated as
  untrusted (cannot override tool permissions/business rules); per-customer/anon rate limits +
  anti-enumeration; cross-customer conversation denial; operator-tool inaccessibility; audit /
  tool-call provenance. Versioned public conversation contract.
- **AIC-5 — Assistant surfaces (frontend).** Premium site-wide Singha webchat (integrated, mobile,
  page/item/customer-aware, gated) + capability-driven channel choice (Chat / WhatsApp / Call) +
  suggested contextual prompts. Item-level "Ask Singha AI" on listing detail (secondary to the
  primary transaction action), cards (compact), RFQ/supply. Passes a server context reference — no
  page scraping.
- **AIC-6 — AI discovery + assisted actions (frontend).** Natural-language discovery
  (interpret → authoritative results); non-binding offer/RFQ draft → explicit customer confirm →
  existing engine. Cross-channel continuation affordances (WhatsApp deep-link, Call-me request).
- **AIC-7 — Cross-channel E2E + security evidence + responsive QA (390/768/1440/1920) + anti-clone
  update + model/usage summary + docs + controlled-preview handoff.**

## AIC-0 — Recon findings (key correction: the brain partly EXISTS)
The "single conversation brain" is **not** greenfield. Already present and reusable:
- **Models** (`database/prisma/schema.prisma`): `Conversation` (1188), `Message` (1206, has a
  `payload Json?` column), `BidIntent` (1234, the non-binding intent pattern), `AiRun` (1265,
  `AiTaskType.assistant` exists; `subjectType/subjectId` can link a run to a conversation),
  `ExternalIdentity` (verified-only channel↔customer linkage).
- **ConnectService** (`connect/connect.service.ts`): inbound/send/setMode(AI↔human handoff)/
  `createBidIntent`+`confirmBidIntent` (rule 11 already implemented for bids — the two-step
  confirm pattern to reuse), behind `MockChannelProvider` (`channel.provider.ts`) — the
  adapter-swap seam for real WhatsApp/SMS/email.
- **AI safety kernel** (`packages/domain/.../ai/ai-safety.ts`): `guardAiRequest` (input ceiling +
  injection detection incl. `binding_action_via_freetext` & `tier_a_probe` + `redactContext`
  forbidden-key redaction). The customer assistant MUST reuse this, not reinvent it.
- **AiProvider/MockAiProvider** (`ai/ai.provider.ts`) + `AiService.assist()` (guard→provider→AiRun
  flow to mirror). **Authoritative search** = `catalogue-v2.service.ts` (`get()` is the customer-safe
  item projection; `list()`/`row()` for search — LLM emits structured params, never touches the DB).

**The genuine gap:** no AI↔Conversation wiring (AI never touches conversations); no item-context on
conversations; no customer-facing surface; and — the real blocker — **RBAC**: `Role.Customer` has
neither `AiUse` nor `ConnectOperate` (both staff-only), so `/ai/*` and `/connect/*` are staff
endpoints today. Also: the AI/Connect feature flags exist but are **decorative** (never enforced);
no rate-limiting on `/ai/*` or `/connect/*`; no voice channel in `ChannelType`; no FE chat UI or
`/connect`/`/ai` API client. Full detail: recon synthesis (AIC-0).

## Done
- **AIC-0** — recon complete (above). Backend branch restarted from `origin/main`.
- **AIC-1 — DONE** (backend `ee7fe92`). Customer AI assistant vertical slice: new least-privilege
  `AiConverse` permission (Customer + Seller/SellerStaff; staff `AiUse`/`ConnectOperate` untouched),
  `FEATURE_AI_CONVERSATION` flag (default off, **enforced** before any DB access), server-side
  customer-safe `ItemContext` from `catalogue-v2.get()` via an explicit per-sale-kind allowlist
  (closed a real gap — the generic redactContext regex wouldn't strip sellerFloor/staffNote/
  competitor by name), `AssistantService` (guard→MockAiProvider→audited `AiRun`, **non-binding**,
  ownership-scoped 404-not-403, transactional), `/assistant/message` + `/assistant/conversations/:id`
  (`@Throttle` rate-limited). **No schema migration** (rides `Message.payload` + `AiRun.subject`).
  Lead-reviewed all five security invariants in-code. Gates green: `pnpm check` 13/13 (74 API unit
  tests, 17 new); contract clean (the apparent drift when run against the seeded preview DB is a
  data/formatting artifact — AIC-1 never touched `public-api.contract.json`); new live `e2e-assistant`
  suite (27 checks, flag on + off).

- **AIC-2 — DONE** (backend `ac29ebc`). Cross-channel continuity + the "Chat now / WhatsApp /
  Call me" channel-request flow — **no schema migration**. A continuity token (opaque base64url
  link, unsigned by design) lets one logical conversation span web→WhatsApp→voice; the
  continuation ingress (`ConnectService.inboundContinuation`) attaches to the origin conversation
  ONLY after re-resolving the caller's verified `ExternalIdentity` and matching it to the origin's
  own stored `customerId` (token never trusted for identity — an intercepted token can't hijack).
  `POST /assistant/channel-request` is capability-gated (`assistantChannels`, default `['web']`;
  WhatsApp/voice OFF), WhatsApp = a deep-link via the shared `MockChannelProvider`, voice = a
  non-binding callback request. Human-handoff context via `ConnectService.conversation()`
  (message payload + derived `handoffSummary`). Voice modeled as a `Message.payload` event (no
  `ChannelType.voice` until real telephony). Lead-reviewed all five invariants (esp. the
  continuation-ingress identity check). `pnpm check` 13/13 (97 API tests, +23), zero `database/`
  change; `e2e-assistant-channels` idempotent ×2 + regression clean.

**→ The backend "single conversation brain" (assistant + channels + continuity + handoff) is now
complete and shipped.**

- **AIC-3 — DONE** (backend `389333a`). AI-assisted search: `POST /assistant/search` — the model
  interprets NL into structured filters only; `sanitizeSearchFilters` re-validates every key
  against the same `catalogueQuerySchema` the public catalogue enforces (per-key, so one bad key
  can't wipe the valid ones), falling back to `{search: rawQuery}` if nothing survives;
  `CatalogueV2Service.list()` is the sole executor + result source (the model never invents).
  Guard-first (injection → safe empty + blocked `AiRun`), non-binding, no migration. `pnpm check`
  13/13 (119 API tests, +22); `e2e-assistant-search` 32/32.
- **AIC-4 — DONE**. Anti-clone / IP boundary review extended for the AI layer (addendum §17) →
  `SINGHA_CX_IP_BOUNDARY_REVIEW.md` ("AIC — AI Conversation … anti-clone extension"): classifies
  public UI / public contract / server-side orchestration / confidential prompts+data / operator
  tools / provider creds, and records the boundary controls (all server-enforced + tested). No new
  client-side leakage; the crown jewels (orchestration, prompts, matching/ranking) stay server-side.

- **AIC-5 — DONE** (frontend `Auctions-New`, branch `claude/new-session-at0qp4` — uncommitted,
  legible `git status`; the lead reviews + commits). The FE assistant surfaces: a new gated flag
  `aiConversation` (`apps/web/src/lib/flags.ts`, mirrors backend `FEATURE_AI_CONVERSATION`; rides
  the existing `?evo=on` / `NEXT_PUBLIC_EVO_PREVIEW` preview channel rather than a new one); a typed
  `/assistant/*` FE client (`lib/assistant-api.ts`) reusing the SAME `apiPost`/`apiGetAuthed`
  authed-fetch path every other authed surface uses (no new auth); `AssistantProvider`/
  `useAssistant` (shared open/seed context — a zero-DOM context wrapper, always mounted in the root
  layout so any surface can open the chat); `SinghaAssistant` — a Singha-styled floating launcher
  (gold, dock-aware on mobile via the SAME `neutralIaV1`-gated offset technique `LotStickyDock`
  uses) + a `@singha/ui` `Sheet` panel (bottom sheet on phones, slide-in on desktop) with a message
  list (customer/AI bubbles, a "…thinking" state, the conversation persisted across page reloads via
  `localStorage` + `GET /assistant/conversations/:id`), a suggested-prompts chip row, and a Chat
  now/WhatsApp/Call me channel row wired to `POST /assistant/channel-request`; a signed-out gate
  replaces the input (every route requires an authed `ai:converse` customer, enforced server-side);
  `AskSinghaButton` — a full labelled variant on the lot detail page (secondary to Bid/Buy/Offer,
  never competing with it) and a compact icon variant on `SaleCard` (a `role="button"` span, not a
  real `<button>` — the card is itself one big `<Link>`, and nesting a native interactive element
  inside an `<a>` is invalid HTML). `aiConversation` off renders nothing anywhere; production is
  untouched. Gates green: `pnpm run typecheck` / `lint` / `format:check` clean; `turbo run test`
  135/135 (16 new — launcher gating on/off, the signed-out gate, `AskSinghaButton` seeding +
  nested-in-link click/keyboard safety, provider state sharing, and the FE `/assistant/*` client's
  request shapes/URLs + `friendlyMessage` error mapping via mocked `fetch`); `check-routes.mjs` /
  `check-contracts.mjs` clean; `turbo run build` is blocked only by this sandbox's Google Fonts
  fetch (`next/font` → `fonts.googleapis.com`, pre-existing/unrelated to this change —
  `NODE_EXTRA_CA_CERTS` is set but Next's bundled font-fetcher doesn't honour it).

- **AIC-6 — DONE** (frontend `Auctions-New`, branch `claude/new-session-at0qp4` — uncommitted,
  legible `git status`; the lead reviews + commits). EXTENDS the AIC-5 surfaces in place — no new
  component tree, no new API client. Two non-binding additions to `SinghaAssistant.tsx`:
  1. **AI-assisted discovery (addendum §6/§11).** A "🔍 Find listings" composer toggle (a
     deliberate explicit mode, not free-text NL intent-detection — task pack: "pick the clean one;
     don't over-engineer intent detection") routes the next submit to the ALREADY-SHIPPED
     `assistantSearch` client instead of `askAssistant`. A find-request renders as a normal AI turn
     ("Here's what I found:" / an honest "I couldn't find anything matching that." on zero results)
     plus an inline result block: the validated `interpreted` filters as one subtle transparency
     line (e.g. "Machinery & Equipment · near Melbourne · ending soon", read straight off the
     existing category taxonomy — never invented) and up to 5 EXISTING compact `SaleCard`s inside
     the panel's own `ScrollX` rail (same horizontal-scroll idiom the suggestion-chip row already
     uses), so a wide result set never forces the chat panel itself to scroll sideways. Capped at 5
     client-side regardless of how many the server returns. Renders ONLY what the client response
     contains — no fabricated listings. A `refused:true` response (the boundary guard blocked the
     query) shows the identical fixed safe-refusal copy the ask flow shows for a blocked message —
     `assistantSearch`'s response carries no `reply` field at all on refusal, so the FE holds its
     own copy of the backend's `SAFE_REFUSAL` string for that one case.
  2. **Non-binding assisted action prep (addendum §12) — wiring only, no new binding path.** The
     existing customer-safe `suggestions` chips are now actionable: a fixed `ACTION_SUGGESTIONS`
     allowlist mirrors the backend's per-sale-method labels 1:1 ("Make an offer", "Buy now",
     "Register interest", "Submit a sealed tender", "Ask about bidding") and routes those five to
     the seeded listing's own `SalePanel`/`BidPanel` — `router.push('/lot/{id}#lot-action')`
     (reusing `LotStickyDock`'s existing scroll target, not a new one), or a close-and-scroll with
     no navigation if already on that lot. Every other suggestion (e.g. "Arrange inspection",
     "Shipping & collection", or the sale-method-less defaults) is UNCHANGED — still sent as a
     normal follow-up question to `askAssistant`. The assistant itself never imports or calls a
     bid/offer/EOI/tender client function — nothing a chip could route to is capable of submitting
     anything; the customer still confirms through the existing panel's own explicit-confirm step
     (pack rule 11). A doc comment on the routing helper states this invariant explicitly.
  Gated the same as everything else in this panel (`aiConversation`, off ⇒ unchanged). Gates green:
  `pnpm run typecheck` clean; `pnpm exec turbo run test --filter=@singha/web... --filter=@singha/auctionflow`
  145/145 (10 new, all in the extended `SinghaAssistant.test.tsx` — a find-request rendering result
  cards / capping at 5 / an honest empty state / the refusal-copy parity with the ask flow / an
  action chip navigating + calling no submit/offer/bid function / an already-on-the-lot
  close-and-scroll / a non-action chip staying on the ask flow / a defensive no-seeded-listing
  fallback); `pnpm run lint` and `pnpm run format:check` clean; `check-routes.mjs` /
  `check-contracts.mjs` clean (neither touched). `turbo run build` hits the SAME pre-existing
  sandbox block as AIC-5 (`next/font` → `fonts.googleapis.com`, `SELF_SIGNED_CERT_IN_CHAIN` in this
  sandbox's proxy) — unrelated to this change; `tsc --noEmit` across the whole app (which compiles
  every file, including these) is clean.

- **AIC-7 — DONE**. Cross-channel + full-stack acceptance QA + handoff. Stood up the full stack
  (Postgres 5433 + API :4000 with `FEATURE_AI_CONVERSATION=true` + Supabase stub + FE), signed in as
  a real seeded buyer, and drove the assistant end-to-end at 390/768/1440/1920 — live
  `/assistant/message` + `/assistant/search` round-trips, real AI-discovery result cards, suggestion
  chips, the find-mode composer, and the Chat/WhatsApp/Call row (evidence `scratchpad/aic7/`). Backend
  security/anti-invention/non-binding proven by the e2e suites (`e2e-assistant`, `-channels`,
  `-search`). **One genuine defect found + fixed** (`b84ce3b`): a pre-existing hydration mismatch
  (preview flags applied pre-mount) that crashed the Discover nav / assistant on a direct `?evo=on`
  production load — fixed at the root in `useFlags` (mount-gate the preview override); re-verified the
  launcher renders with zero hydration errors. Handoff + model/usage summary:
  `SINGHA_AI_CONVERSATION_HANDOFF.md`. Anti-clone: `SINGHA_CX_IP_BOUNDARY_REVIEW.md` (AIC section).

## Programme complete
**AIC-0 → AIC-7 are all shipped, security-reviewed and verified** on `claude/new-session-at0qp4`
(backend `ee7fe92`/`ac29ebc`/`389333a`; frontend `263be0a`/`3a53665`/`b84ce3b`; docs alongside). The
single Singha conversation brain — customer assistant, cross-channel continuity, WhatsApp/voice
channel requests, human handoff, AI-assisted search, and the premium webchat + item-level "Ask
Singha AI" + AI discovery — is complete behind the controlled preview, non-binding, with zero schema
migrations. Owner-gated remainder: the real WhatsApp / voice / LLM provider accounts (behind the
existing adapters) and the standing enablement/privacy actions.
