# Singha AI Conversation & Omnichannel Item Assistant — Owner Handoff

Owner-facing handoff for the AI Conversation addendum (extends the CX Overhaul). Everything is on
`claude/new-session-at0qp4` in both repos, behind a controlled preview (default OFF), non-binding,
with no live provider ever called. Server-authoritative and anti-clone throughout.

## What was built (all shipped + verified)
A single shared **"Singha conversation brain"** with multiple channel entrances — not separate
per-channel bots:
- **Customer AI assistant** (AIC-1, backend `ee7fe92`) — a signed-in customer can ask about a
  listing and get a safe, **non-binding** reply. Server-side customer-safe item-context (from the
  catalogue projection only), the reused AI safety guard (injection refusal + forbidden-key
  redaction), an audited `AiRun` per turn. New least-privilege `AiConverse` permission; enforced
  `FEATURE_AI_CONVERSATION` flag; ownership-scoped; rate-limited.
- **Cross-channel continuity + channel requests** (AIC-2, `ac29ebc`) — one logical conversation
  across web → WhatsApp → voice via a continuity token that is a *link, never an auth credential*
  (identity is always re-verified server-side against the origin conversation's owner). "Chat now /
  WhatsApp / Call me" is **capability-driven** (`ASSISTANT_CHANNELS`, default `web` only). Human
  handoff carries full context to a staff agent.
- **AI-assisted search** (AIC-3, `389333a`) — the model interprets a natural-language query into
  *structured filters only*, re-validated against the same catalogue schema; the authoritative
  `CatalogueV2Service` executes and is the sole source of results. The model never invents
  inventory/price/availability.
- **Anti-clone / IP review** (AIC-4) — see `SINGHA_CX_IP_BOUNDARY_REVIEW.md` ("AIC …" section):
  the crown jewels (orchestration, prompts/policies, matching/ranking, confidential data) stay
  server-side; the browser gets only render-chat / send-message / safe-response / channel-action.
- **Frontend surfaces** (AIC-5 `263be0a`, AIC-6 `3a53665`) — a premium, Singha-integrated
  **site-wide webchat** (gold dock-aware launcher + panel: message bubbles, suggested prompts,
  Chat/WhatsApp/Call, a sign-in gate when signed out), the item-level **"Ask Singha AI"** action
  (lot detail secondary + a compact card action, seeded with the listing context), **AI discovery**
  inside the chat (a "Find listings" mode → real catalogue result cards), and suggestion chips that
  route to the **existing** offer/bid panels — the assistant prepares/suggests, the customer
  confirms through the real engine. The assistant submits no binding action itself.

## How to turn it on (controlled preview)
**Backend** (Railway env, all default OFF): `FEATURE_AI_CONVERSATION=true`, and
`ASSISTANT_CHANNELS=web` (add `whatsapp`/`voice` only once you have those providers — see below).
Keep `FEATURE_OPERATOR_PAYMENTS` / `FEATURE_LOGISTICS_QUOTES` **false**.
**Frontend** (Vercel): the assistant rides the neutral-IA preview — per browser append `?evo=on`
(with `?v3=on` for the visual system), or set `NEXT_PUBLIC_EVO_PREVIEW=1` for the whole environment.
The new `aiConversation` FE flag is off by default and gated so production renders nothing until then.
A customer must be **signed in** to chat (the endpoints require the `AiConverse` permission, which
the `customer` role now carries).

## What stays owner-gated (escalation — not attempted here)
Only the **real provider accounts/keys**, which slot behind the existing adapters:
- **WhatsApp** — a WhatsApp Business API account + number, and a webhook-signature-verification
  adapter for inbound (the outbound send already goes through the swappable `MessageChannelProvider`;
  today it's `MockChannelProvider`).
- **AI voice / telephony** — a provider account for the "Call me" callback (today a recorded
  non-binding request; no `ChannelType.voice` until a real provider is wired).
- **Production LLM** — a real model behind `AiProvider` (today `MockAiProvider`, deterministic).
  The safety kernel (`ai-safety.ts`), prompts/policies and model-tier routing already sit
  server-side and stay there.
None of these are needed to run, test, or demo the preview — the deterministic fakes stand in.

## Non-binding guarantee
The LLM is never the transaction authority. `guardAiRequest` refuses binding-via-free-text and
Tier-A probes; a bid/offer stays with the existing engines behind explicit confirmation (the
`createBidIntent` → `confirmBidIntent` two-step, and the existing SalePanel/offer flow the assistant
navigates to). No `/assistant/*` path ever mutates commercial state.

## Model / usage optimisation (addendum §18)
- **Build-time cost routing:** recon and mechanical implementation were delegated to lower-cost
  (Sonnet) subagents against precise briefs; the strongest model was reserved for the architecture
  + security decisions (customer RBAC, the continuity-token trust model, DTO-privacy allowlist,
  the anti-clone classification) and for **reviewing every subagent's five security invariants**
  before commit. Decisions recorded in `SINGHA_CX_DECISIONS.md` (D-AIC-1…4) and the backend
  `docs/generated/DECISIONS.md` (D-0037…D-0054); routine work de-escalated after each hard call.
- **Runtime cost routing (in code):** `ai-safety.ts` `routeModelTier()` picks the cheapest capable
  tier per task (classification/extraction/translation/drafting → cheap; open-ended assistance /
  synthesis → strong). When a real model is wired, this seam routes each call to the right tier.

## Rollback
Flip `FEATURE_AI_CONVERSATION` off (backend) and/or clear the `NEXT_PUBLIC_EVO_PREVIEW` / `?evo`
preview (frontend) — the whole layer self-gates and vanishes with no deploy. No destructive
migration is involved (the entire layer added **zero** schema changes — it rides existing
`Conversation`/`Message`/`AiRun` columns).

## Acceptance & evidence (addendum §20)
- **Item context / webchat / search / commercial-safety / security** — proven by backend unit +
  live E2E suites: `scripts/e2e-assistant.mjs`, `e2e-assistant-channels.mjs`, `e2e-assistant-search.mjs`
  (privacy, injection refusal, non-binding, ownership 404, flag-off, cross-customer denial,
  continuity no-duplicate, anti-invention), plus 119 API + 145 web unit tests.
- **Responsive (390/768/1440/1920)** — the signed-in assistant captured end-to-end at the mandated
  widths (AIC-7); before/after and per-phase evidence indexed with the CX package.
<!-- AIC-7 responsive capture manifest appended after the full-stack QA run. -->
