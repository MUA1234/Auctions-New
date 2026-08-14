# Singha Auctions V3 — Program Status Log

_Snapshot: 2026-08-14. Both repos are on `main` and **pushed** to origin
(`MUA1234/Auctions-New`, `LakshanV/Auctions-Backend`). Everything V3 is
**feature-flagged OFF by default**, so production is unaffected until flags flip._

## Overall

|                           |                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase plan (V3-0 … V3-11) | **V3-0…V3-10 done** (build track complete); V3-11 is post-pilot by design                                                                                                             |
| Production readiness      | **GO_FOR_CONTROLLED_PILOT** — see `V3_FINAL_GO_NO_GO.md`                                                                                                                              |
| Heads                     | Both track `main`. Build-track tips: FE `edd2c44` · BE `3e01f9a`, with CI-formatting hygiene committed on top.                                                                        |
| Test posture              | FE 43 web unit + `next build` + bundle scan; BE domain 90 / api 21 / contracts 17; full acceptance E2E + catalogue scale (2,000 lots) green on real Postgres; `contract:check` green. |

The **build track is complete and verified**. Full public GO is withheld only for
owner-provisioned items (provider credentials) and infra drills (load / backup-restore /
WCAG audit) — none of which waive auction/credit/security integrity (all tested).

---

## Phase-by-phase

### ✅ V3-0 — Baseline + outstanding closure — **DONE**

Commits: FE `e91a274`, BE `031fa02`.

- Fixed the CI-red Prettier failures (backend 3 files, frontend 7 files).
- Added the 11 V3 experience feature flags (server-controlled via `/feature-flags`, all default OFF)
  - frontend consumption (`lib/flags.ts`, `lib/use-flags.ts`).
- Wrote `V3_BASELINE.md` in both repos; confirmed AAL2 present (15 `@RequireAssurance` routes),
  demo auth fully removed.
- **Remaining (owner):** repos → private, Actions billing lock, branch protection.
- **Deferred (code):** remove frozen `apps/api`/`apps/worker` from FE (blocked — FE e2e still builds
  `@singha/api`; rewire first); generated OpenAPI→TS client.

### ✅ V3-1 — Design system + visual shell — **DONE (UI/UX pass)**

Completed in the UI/UX + outstanding-gap pass (see `V3_UIUX_COMPLETION_REPORT.md` and
`V3_UIUX_GAP_AUDIT.md`). The tokens/motion/emerald palette already existed; this pass built the
genuinely-missing shell:

- **`Sheet`** overlay primitive (`@singha/ui`) — focus-trapped, scroll-locking, reduced-motion safe.
- **Mobile navigation** — hamburger → `Sheet` drawer (the desktop nav was `hidden md:flex` with no
  mobile menu, so phones lost all navigation — the top shell defect, now fixed).
- **Scroll-aware `Header`** + a real, reversible effect for the previously-dead `v3VisualArchitecture`.
- **V3 preview switch** — `NEXT_PUBLIC_V3_PREVIEW` env + `?v3=on/off` cookie overlay every V3 flag ON
  for review without changing production defaults.
- App-root **loading / error / not-found** chrome; reduced-motion completeness; site-wide
  horizontal-overflow clip.

Proven by the Playwright screenshot matrix (7 widths, 11/11 green, no horizontal overflow).

### ✅ V3-2 — Ending Soon + Infinite Flow Canvas — **DONE**

Commits: BE `30418f5`, FE `8b776f1` (Ending Soon) + FE `31b0b78` (Flow Canvas).

- **Ending Soon default** enforced server-side (contract default `ending`, deadline-aware order across
  sale methods, open-only catalogue) + matching frontend default. Tests: contracts 17/17.
- **Infinite Flow Canvas** behind `flowMatrixV3`: 2-D matrix, mobile 4×4≈16, `CompactLotCell`,
  floating `CategoryOverlay`, per-band cursor + IO virtualization, direction-locked paging, no fake
  infinity. Unit 7/7 + **Playwright**: 390px→4 cols, 1440px→denser, no overflow.
- **Remaining refinements (non-blocking):** literal edge-hinged 3D fold (currently a bounded slide);
  cross-category Ending-Soon/Featured bands; full 8-width Playwright matrix.

### ✅ V3-3 — Homepage cinematic rebuild — **DONE**

Commit: FE `3e62f1b`.

- `FeaturedReel` behind `featuredReelV3`: revolving perspective showcase, clickable, arrows/keyboard/
  drag, idle auto-revolve that pauses on hover/focus/touch/tab-hidden, reduced-motion off, no CLS.
- **Enabled web component testing** (testing-library + jsdom) — reused by later phases.
  `FeaturedReel.test.tsx` 5/5.

### ✅ V3-4 — Lot detail + Gesture Bid — **DONE (core)**

Commit: FE `ac3db28`.

- Deliberate **Gesture Bid** behind `gestureBidV3`: purposeful-travel swipe, exact-next-increment,
  first-use binding ack, reprice guard, idempotency key, server-authoritative. **Auction engine
  untouched** (backend already supported idempotency). Tests 19/19 (gesture maths + component).
- **Remaining refinement (visual, non-blocking):** V3 lot-page recomposition / mobile sticky action dock.

### ✅ V3-5 — Singha Discover + Buyer Twin — **DONE**

Commits: BE `2777337` (engine + contracts) + `33bd0f3` (persistence + module) + discovery HTTP E2E;
FE `9e8e991` (Discover page + gating + Buyer Twin panel).

- **DONE (backend):** deterministic, privacy-safe, Tier-A Buyer Twin engine (weights backend-only, no
  overfit, dislikes, reset, explanations, versioned). Additive Prisma migration
  (`discovery_event`, `buyer_twin_projection`, `recommendation_impression`) — **applied cleanly to real
  Postgres**. `DiscoveryModule`: `POST /discovery/events`, `GET /discovery/buyer-twin`, `POST
/discovery/preferences/reset`, `GET /discovery/feed` (unseen + ending-soon + affinity + diversity).
- **DONE (backend E2E):** `scripts/e2e-discovery.mjs` (`pnpm test:discovery`, folded into
  `test:acceptance`) — **24 checks green on a real ephemeral Postgres**: anonymous ending-soon feed,
  authed event write, safe Buyer Twin summary, reset semantics (watches/financial records survive), no
  Tier-A leakage, deterministic ordering, diversity cap, dislike exclusion, unseen behaviour, affinity.
- **DONE (frontend):** `/discover` page gated on `discoverV3` (safe fallback when OFF), flag-gated nav
  entry, `DiscoverDeck` swipe deck with loading/empty/**error+retry**/end-of-feed states (a swipe is
  never a bid), safe Buyer Twin "Why you're seeing this" panel + preference reset behind `buyerTwinV3`.
  Component test `DiscoverDeck.test.tsx` (7). Frontend gates green: typecheck, lint, web unit suite,
  `next build` (route `/discover` present).
- **Remaining (non-blocking):** feed personalisation from bid/offer history via outbox/rebuild;
  authenticated Playwright path once a Supabase test credential is available (owner P0 #4).

### ✅ V3-6 — Bid Battle + Engagement Engine — **DONE**

Commits: BE `71d1263` (rivalry engine) + `8e6737e` (rivalry endpoint+E2E) + `8a82b52`
(engagement engine); FE `730c875` (Bid Battle strip) + `81a2a1a` (engagement preference
centre + premium sound/haptics).

- **Bid Battle (behind `bidBattleV3`):** pure, rebuildable rivalry engine over the immutable
  bid ledger — leader/nearest-challenger, lead changes, comeback + you-outbid moments —
  with **privacy-safe aliases** (viewer = "You", never a bidderId/proxy max). `GET
/auctions/:id/rivalry` (404 when OFF). Frontend strip on the lot page. Domain 15 tests;
  HTTP E2E 17 checks (real proxy bidding, no PII leak, flag gate).
- **Engagement Engine (behind `engagementV3`):** Tier-A notification policy engine —
  transactional (mandatory, in-app floor) vs engagement (opt-in, category mutes, tz-aware
  quiet hours, per-day frequency cap), both **idempotent/de-duplicated**. Additive migration
  (`notification_preference` + append-only `notification_delivery` ledger). Service delivers
  with **retry → dead-letter** through a `NotificationProvider` adapter bound to a
  credential-free fake. API: GET/PUT preferences, GET notifications. Domain 11 tests; HTTP
  E2E 14 checks (opt-in, dedup, transactional bypass, quiet hours, cap, DLQ, flag gate).
- **Sound + haptics:** premium Web-Audio cue language (gavel/lead/outbid/countdown/win) +
  Vibration API, with On/Reduced/Off control, honouring reduced-motion; wired into Bid
  Battle. Preference centre at `/account/notifications`. FE sound + preference component tests.
- Gates green both repos (typecheck/lint/build/unit); BE discovery/bid-battle/engagement E2E
  on real Postgres. Flags OFF.

### ✅ V3-7 — Connect / AI / Social / Asset Intelligence — **DONE (core)**

Audit-first (extend, not duplicate): Connect, AI, Social and Intelligence modules already
existed with provider adapters + fakes and passing E2E (connect 11, ai 8→14, social-intel 9).
The genuine gap was AI prompt-safety, now closed (BE `a885bc2`).

- **Connect:** provider-adapter (`MessageChannelProvider`) + full **BidIntent** (model +
  contract + service): free text creates a non-binding intent; confirm goes through the
  authoritative `AuctionService.placeBid` with an idempotency key (rule 11). Already met.
- **AI Core (new):** Tier-A safety kernel (`packages/domain/.../ai/ai-safety.ts`) —
  prompt-injection detection, data-boundary context redaction (proxy-max/credit/score never
  cross), cheapest-capable **model-tier router** + private prompt/policy registry. Wired into
  `AiService.assist`: injections are refused + audited, never sent to a provider; free text
  can't place a bid. 12 domain tests + 6 new AI E2E checks.
- **Social:** `SocialPublisherProvider` + fake, campaign/publication models, draft→publish
  with audit + posting history; publish is permissioned (human-gated).
- **Asset Intelligence:** public `GET /intelligence/market-pulse` (homepage) + permissioned
  comparables/asset-insights/seller-intel; public vs internal split enforced. No Tier-A in
  the browser bundle (bundle scan clean).
- **Remaining refinements (non-blocking):** explicit Social approval state (`pending_approval`
  → `approved`); materialized/rebuildable Intelligence projections + sell-through; AI
  translation task. Documented for post-pilot.

### ✅ V3-8 — Singha Live V3 — **DONE (core)**

Commit: BE `fb77bc6`. Audit-first: the live module, mock stream adapter (`LiveStreamProvider`),
public room, YouTube-simulcast + recording hooks, and clerk floor-bid-through-the-engine
already existed and passed E2E; the gaps were flag enforcement + realtime.

- **liveV3 gate enforced:** the whole `/live` surface 404s when the flag is OFF (it was
  previously inert — always on). Same pattern as bidBattle/engagement.
- **Canonical live-room + realtime:** `GET /live/events/:id/room` = broadcast status +
  `videoAvailable` + the AUTHORITATIVE bid state from the auction engine (never a separate
  live-bid store) + monotonic `seq`. SSE `GET /live/events/:id/stream` gives a snapshot on
  connect then deduped frames → deterministic reconnect/resync, duplicate-safe.
- **Rule 12 held:** online + clerk-relayed floor bids all flow through the ONE row-locked
  engine ledger; the engine decides the winner. Video outage never corrupts bidding.
- E2E 17 checks on real Postgres (flag gate, live-room engine bid state, seq, SSE snapshot,
  video-outage independence, permissions).
- **Remaining (post-pilot):** distinct auctioneer/clerk/producer console roles; multi-lot
  current-lot sequencing wired to `AuctionEventLot`; real IVS/YouTube adapter.

### ✅ V3-9 — Customer dashboard pilot shell + instrumentation — **DONE (core)**

Commits: BE `b06d67e`, FE `1f3ed35`. The buyer command-centre dashboard already
existed (server projection `GET /api/v2/me/dashboard`: urgent strip + Watching/Winning/
Outbid/Payment status groups, realtime, **no catalogue category overlays** per doc 09).
This phase adds the pilot **instrumentation** the pack asks for.

- **Backend:** additive append-only `product_event` table + `POST /api/v2/me/analytics`
  (privacy-safe: surface/action/optional listing+funnel step, primitive metadata, no PII;
  signed-in or anonymous), gated on `dashboardV3Beta` (404 OFF). Contract with a strict
  surface enum. Applied to real Postgres.
- **Frontend:** `lib/analytics.ts` `useAnalytics().track` — a NO-OP until `dashboardV3Beta`
  is on — and a tiny `DashboardInstrumentation` firing "surface opened" on the command
  centre. Fire-and-forget (never affects UX). Component test (2).
- Gates green both repos. Flags default OFF.
- **Remaining (post-pilot, evidence-led per V3-11):** funnel wiring across Discover→watch→
  bid + notification return path; attention-state refinement; full browser-matrix visual
  pass (existing Playwright suite covers the critical flows).

### ✅ V3-10 — Production hardening + GO/NO_GO — **DONE (self-review)**

Ran the hardening review (pack doc 09/15). CI-equivalent gates green both repos
(format/lint/typecheck/build/unit); the **full backend acceptance E2E suite + scale (2,000
lots) pass on a real Postgres**; `contract:check` green (snapshot regenerated after the
scale fix, prettier-normalised, synced to FE); FE bundle secret/source-map scan clean.
Security E2E 11/11; auction concurrency + idempotency verified; Tier-A boundaries (rivalry
aliases, AI prompt injection/redaction, no proxy-max/PII leakage) tested. Produced
**`V3_FINAL_GO_NO_GO.md`** → **GO_FOR_CONTROLLED_PILOT**. Outstanding for full GO
(owner/infra, waived for pilot): provider credentials, production-scale load, backup/restore
drill, full WCAG audit, repo privacy.

### ⬜ V3-11 — Trial-led dashboard refinement — **NOT STARTED (post-pilot, by design)**

---

## Feature flags (all default OFF, server-controlled)

`v3VisualArchitecture` · `flowMatrixV3` · `categoryOverlayV3` (in Flow) · `featuredReelV3` ·
`discoverV3` · `buyerTwinV3` · `bidBattleV3` · `gestureBidV3` · `engagementV3` ·
`dashboardV3Beta` · `liveV3`. Every V3 experience is built, gated and tested; none is enabled
in production by this program.

## 🚨 Owner P0s (block production GO — cannot be done by the agent)

1. Make **both repos private** (`MUA1234/Auctions-New`, `LakshanV/Auctions-Backend`).
2. Resolve the **GitHub Actions billing/account lock** so remote security/CI scans (CodeQL) actually run.
3. Verify **branch protection** on `main` (both).
4. Provide a **Supabase test-user credential** to unlock authenticated Playwright e2e.
5. Provider credentials (WhatsApp/SMS/email/push/AI/streaming) to activate Connect / Engagement /
   AI / Social / Live beyond the credential-free fakes.
6. Backup/restore drill, production-scale load test, and full WCAG audit (per `V3_FINAL_GO_NO_GO.md`).

_(Resolved: GitHub App `contents: write` on the backend repo — pushes to `main` now work on both repos.)_

## Verification summary (local, this program)

- **Frontend:** typecheck + lint + `next build` green; **43 web unit/component tests** (10 files);
  Playwright Flow-canvas + critical-flow + route-protection suite green; bundle secret/source-map
  scan clean.
- **Backend:** format:check + lint + typecheck + build green; unit **domain 90 / api 21 /
  contracts 17**; the full acceptance E2E suite **+ catalogue scale (2,000 lots)** pass on a **real
  ephemeral Postgres**; `contract:check` (public-API drift) green and synced to the frontend.

## Immediate next step

Build track (V3-0…V3-10) is complete, pushed to `main`, and self-reviewed to
**GO_FOR_CONTROLLED_PILOT** (`V3_FINAL_GO_NO_GO.md`). No feature work is pending. What remains is
**owner-provisioned** (P0s above) and **post-pilot V3-11** (trial-led dashboard refinement,
evidence-led). Operationally: keep `main` green (CI / security / CodeQL), then enable one flag in
staging to verify and disable to prove rollback (doc 14) before any pilot.
