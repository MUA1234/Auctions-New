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

## Done
- _(AIC-0 recon in progress — findings + reuse map to be recorded here.)_
