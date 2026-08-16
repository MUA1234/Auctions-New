# Singha CX Overhaul — Anti-Clone / IP Boundary Review (CX12)

Required output of CX pack doc 08. Objective: ensure copying Singha's public appearance is
**insufficient** to reproduce its real advantage — the proprietary server-side engines and the
confidential data they act on. Reviewed against the frontend at `MUA1234/Auctions-New` @
`e42dc2d` and the backend at `LakshanV/Auctions-Backend` @ `e5dceca`. No malicious anti-copy
tricks are used or recommended; this is about keeping crown jewels server-side and not leaking
confidential data.

## Verdict
The customer-experience overhaul is **presentation-only** on the frontend plus **one additive,
public-only backend read-model enrichment** (CX5). It introduced **no** client-side
reconstruction of proprietary logic and **no** new exposure of confidential data, and it
weakened **no** existing security control. Two genuine IP-posture gaps exist — both
**pre-existing** and **owner-only** — and are called out under "Owner actions" below.

## Crown jewels — confirmed SERVER-SIDE (frontend consumes decisions, never recomputes)
Verified the overhaul's surfaces call the server for every proprietary decision and only render
the returned result:
- **Transaction/operator/legal routing** → `POST /routing/resolve` (`lib/evolution-api.ts`);
  the FE renders the decision via the generic `RecordView` key/value display. No routing rules,
  weights or operator config live in the browser.
- **Fee / tax evaluation** → `POST /fees/compute`; result displayed, never recomputed client-side.
- **Payment route resolution + webhooks** → server (`operatorPayments` gated OFF in preview).
- **Offer evaluation / sealed-offer ranking + authorization** → server; the FE shows a
  ranked list as an *advisory recommendation only* and the buyer/seller awards **explicitly**
  (CX6 `ProcurementDetail`, sealed comparison) — no "cheapest auto-wins", no ranking algorithm
  in the client.
- **Buyer/supplier matching, pricing intelligence, fraud/risk, recommendation rules** → server;
  the FE surfaces only customer-safe outputs.
- **Auction authority + append-only ledgers** → server; the overhaul never lets the screen
  become the record (bid/buy/offer/tender panels only reflect server-accepted state).

Grep evidence: no `reserveMinor` / `proxyMax` / seller-floor / `riskScore` / `fraudScore` /
`staffNote` / routing-weight / fee-rule computation exists anywhere under `apps/web/src`.

## Confidential data — no new exposure
- **CX5 `GET /commercial-offers/mine` enrichment** adds only PUBLIC listing fields
  (title, publicRef, saleMethod, location, cover image key) — asserted by the backend unit
  spec that the projection selects no reserve/floor/proxy/competitor/KYC keys.
- **Command Centre + Singha ID passport (CX7)** show only customer-safe capability *states*
  (Verified / Under review / Action needed / Not started) and never internal risk scores, staff
  notes, raw capability enum codes, or private evidence (D-CX-4).
- **Sealed offers**: pre-reveal shows counts only; full proposals appear only after the
  server-authorized reveal. The overhaul added no pre-reveal leak.
- **Microcopy sweep (CX11)** removed raw DB ids, enum strings and raw API error text
  (`METHOD /path -> status`) from customer surfaces — a net *reduction* in internal leakage.

## Classification of significant new/redesigned CX functions
| Function / surface | Class |
|---|---|
| Living Background, homepage recomposition, Explore filters/card, Wanted/Supply/Command-Centre/Singha-ID/lot-detail UI, local-site copy | PUBLIC PRESENTATION |
| `GET /api/v2/catalogue*`, `GET /commercial-offers/mine` (+CX5 listing context), dashboard/singha-id read-models the FE consumes | PUBLIC CONTRACT (customer-safe DTOs) |
| Routing / fees / payments / sealed ranking / matching / pricing / risk / auction engine | SERVER-SIDE PROPRIETARY (unchanged; FE calls + displays) |
| Reserve, proxy max, seller floor, KYC evidence, risk/fraud scores, competitor offers, staff notes, settlement internals | CONFIDENTIAL DATA (never sent to the customer FE; unchanged) |
| Operator Control Centre, node console, routing/fee/risk config | OPERATOR-ONLY (RBAC/MFA-gated; untouched by the overhaul) |

## Security-regression check (overhaul must not weaken these)
Unchanged by the overhaul: RBAC, MFA/AAL gating, signed/authorized media access, webhook
signature verification, payment idempotency, append-only audit + financial ledgers,
sealed-offer privacy, rate limits, and the strict CSP/security headers in
`apps/web/next.config.mjs`. The Living Background deliberately self-hosts its image derivatives
to satisfy `img-src 'self'`; no external hosts, inline scripts, or source maps were added
(`next.config.mjs` keeps source maps and `x-powered-by` off).

## Owner actions (owner-only — Claude cannot perform these)
1. **Both repositories are currently PUBLIC** (`LakshanV/Auctions-Backend` and
   `MUA1234/Auctions-New`, verified `private=false`). Doc 08: "repositories should be private
   where operationally possible." **The proprietary backend engines are therefore publicly
   readable in source.** Recommend making both repos **private** (GitHub → Settings → change
   visibility). This is the single highest-value anti-clone action and is entirely owner-side.
2. **Frozen backend copy inside the public frontend repo.** `MUA1234/Auctions-New` still carries
   a frozen pre-split copy of the backend (`apps/api`, `apps/worker`, `database`, `domain`,
   `observability`, `config` — see their `DEPRECATED.md`). While the repo is public this exposes
   backend logic a second time. Doc 08: "retire legacy backend code from the public frontend
   repo when safe/approved." Recommend removing the frozen copy once the owner confirms nothing
   still depends on it (the active `@singha/web` app does not — it depends only on
   `@singha/ui`, `@singha/contracts`, `@singha/auctionflow`; the repo-root typecheck was scoped
   to those in D-CX-3, so retiring the frozen copy is low-risk).
3. **Sensitive documents/media**: confirm that customer-visible document links on lot detail
   resolve through authorized/signed URLs (the public catalogue already filters to
   `visibility:public,status:ready` media; verify the same for downloadable documents before
   enabling any private/sensitive document type in production).

## Abuse-protection notes (no regression; owner to keep enforcing)
Listing/search enumeration stays server-paginated (the catalogue never dumps all inventory —
CX3 kept every filter server-side). Account/offer probing, document access and operator/node
configuration remain server-authorized and rate-limited (backend); the overhaul added no new
unauthenticated data path.

---

# AIC — AI Conversation & Omnichannel anti-clone extension (addendum §17)

Classifies the new AI conversation layer (AIC-0…AIC-3, backend `389333a`). Verdict: the valuable
AI capability is **server-side**; the browser receives only what it needs to render chat, send a
message, display a customer-safe response and invoke an authorised channel action. No proprietary
orchestration, prompts, memory, matching or ranking ships to the client.

| Function / surface | Class |
|---|---|
| Webchat UI + item-level "Ask Singha AI" + channel-choice (FE, AIC-5/6) | PUBLIC PRESENTATION |
| `POST /assistant/{message,search,channel-request}`, `GET /assistant/conversations/:id` request/response DTOs | PUBLIC CONTRACT (customer-safe: reply text, label-only suggestions, the customer-safe ItemContext, and search results that ARE the existing `CatalogueCardV2` cards) |
| Conversation orchestration, item-context assembly, NL→filter interpretation, continuity resolution, model routing/tiering | SERVER-SIDE PROPRIETARY (`AssistantService`, `ConnectService`, `ai-safety.ts`, `ai.search-interpreter.ts`) |
| Prompt templates / policies / injection heuristics / model-tier router | CONFIDENTIAL, server-only — `ai-safety.ts` is PURE Tier-A and "NEVER reach the browser bundle" (its own header); prompt bodies are never serialised |
| Reserve, proxy max, seller floor, KYC, risk/fraud score, staff notes, valuations, routing/ranking weights | CONFIDENTIAL DATA — never enters the assistant: the ItemContext is an explicit per-sale-kind **allowlist** off `CatalogueV2Service.get()`, `redactContext` is a second pass, and only `guard.safeContext` reaches the provider |
| Staff agent inbox (`/connect/*`, `ConnectOperate`) + staff AI copilot (`/ai/assist`, `AiUse`) | OPERATOR-ONLY (RBAC) — a customer holds only the new least-privilege `AiConverse`, never these |
| WhatsApp / voice / production LLM credentials | OWNER-ONLY, server-side; never in the FE bundle |

**LLM is never the transaction authority.** `guardAiRequest` refuses binding-via-free-text
(`binding_action_via_freetext`) and Tier-A probes (`tier_a_probe`); a bid/offer stays with the
existing engines behind explicit confirmation (the `createBidIntent`→`confirmBidIntent` two-step).
**AI-assisted search** emits only structured filters, re-validated per-key against the same
`catalogueQuerySchema` the public catalogue enforces; `CatalogueV2Service` is the sole executor and
result source — the model never invents inventory/price/availability, and no search/ranking logic
is reconstructed client-side.

**Boundary controls (all server-enforced, all covered by tests):** `FEATURE_AI_CONVERSATION` gate,
`AiConverse` permission, `@Throttle` rate limits, ownership scoping (404-not-403, anti-enumeration),
verified-`ExternalIdentity` identity resolution (continuity token is a link, never trusted for
authority), and an append-only `AiRun` provenance record per invocation (blocked requests included).

**Owner actions (unchanged from CX12 + addendum):** make both repos private (highest-value
anti-clone step — the server-side orchestration + prompts are the crown jewels and are only safe
while private); supply the real WhatsApp/voice/LLM provider credentials server-side (never client);
the D5 sealed-offer seller-RBAC decision is unrelated to this layer.
