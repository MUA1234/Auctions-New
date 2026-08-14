# Singha Auctions V3 — Program Status Log

_Snapshot: 2026-08-14. Working repos (both on `main`, **NOT pushed** — per repo policy;
production still runs the pack baseline)._

- **Frontend** `MUA1234/Auctions-New` — pack baseline `17d45e7` (on origin) → local V3 work on top.
- **Backend** `LakshanV/Auctions-Backend` — pack baseline `1a10340` (on origin) → local V3 work on top.
- Everything V3 is **feature-flagged OFF by default**, so production is unaffected until flags flip.

## Overall

|                                 |                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Phase plan (V3-0 … V3-11)       | **~4.5 of 12 phases** substantially done                                      |
| Production readiness (GO/NO_GO) | **NO_GO** — owner P0s + hardening (V3-10) not done                            |
| Commits landed this program     | 6 frontend + 4 backend (all local)                                            |
| Test posture                    | all touched code has unit/component tests; backend migration real-DB-verified |

Progress is on the **build** track. It is **not** near production GO: the owner security P0s,
load/backup/observability drills (V3-10), and provider credentials are all outstanding by design.

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

### ⬜ V3-1 — Design system + visual shell — **NOT STARTED**

Tokens/motion/emerald palette already largely exist (pack says avoid another cosmetic pass); the
concrete V3 component families were built inside V3-2/3/4. A dedicated motion-vocabulary + shell pass
remains optional/low-priority.

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

Commits: BE `2777337` (engine + contracts) + `33bd0f3` (persistence + module) + BE (this
increment) discovery HTTP E2E; FE (this increment) Discover page + gating + Buyer Twin panel.

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
  Component test `DiscoverDeck.test.tsx` (7). Frontend gates green: typecheck, lint, 26 web tests,
  `next build` (route `/discover` present).
- **Remaining (non-blocking):** feed personalisation from bid/offer history via outbox/rebuild;
  authenticated Playwright path once a Supabase test credential is available (owner P0 #4).

### ✅ V3-6 — Bid Battle + Engagement Engine — **DONE**

Commits: BE `71d1263` (rivalry engine) + `8e6737e` (rivalry endpoint+E2E) + `8a82b52`
(engagement engine); FE `730c875` (Bid Battle strip) + this increment (engagement UI + sound).

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
  Battle. Preference centre at `/account/notifications`. FE sound + prefs tests (10).
- Gates green both repos: FE typecheck/lint/41 web tests/`next build`; BE domain 78,
  contracts 17, api 21, discovery/bid-battle/engagement E2E on real Postgres. Flags OFF.

### ⬜ V3-7 — Connect / AI / Social / Asset Intelligence — **NOT STARTED**

Credential-free provider adapters + contract tests first; activate with credentials later.

### ⬜ V3-7 — Connect / AI / Social / Asset Intelligence — **NOT STARTED**

Credential-free provider adapters + contract tests first; activate with credentials later.

### ⬜ V3-8 — Singha Live V3 — **NOT STARTED**

Event/live room/consoles, stream adapter + fakes, simulcast/recording hooks, canonical bid-state channel.

### ⬜ V3-9 — Customer dashboard pilot shell — **NOT STARTED**

V3 styling + state/action organisation + instrumentation (no category overlays).

### ⬜ V3-10 — Production hardening + GO/NO_GO — **NOT STARTED**

Full remote CI + security scans green, load/security/accessibility, backup-restore drill, observability,
migration/cutover rehearsal, rollback-flag test. Emits the final GO/NO_GO.

### ⬜ V3-11 — Trial-led dashboard refinement — **NOT STARTED (post-pilot)**

---

## Feature flags (all default OFF, server-controlled)

`v3VisualArchitecture` · `flowMatrixV3` ✔built · `categoryOverlayV3` (in Flow) · `featuredReelV3` ✔built ·
`discoverV3` (page pending) · `buyerTwinV3` · `bidBattleV3` · `gestureBidV3` ✔built · `engagementV3` ·
`dashboardV3Beta` · `liveV3`.

## 🚨 Owner P0s (block production GO — cannot be done by the agent)

1. Make **both repos private** (`MUA1234/Auctions-New`, `LakshanV/Auctions-Backend`).
2. Resolve the **GitHub Actions billing/account lock** (frontend) so security scans actually run.
3. Verify **branch protection** on `main` (both).
4. Provide a **Supabase test-user credential** to unlock authenticated Playwright e2e.
5. Later: provider credentials (WhatsApp/SMS/email/push/AI/streaming) for V3-6/7/8 activation.
6. **Push** is withheld pending owner go-ahead (repo policy).

## Verification summary (local, this program)

- Frontend: typecheck + lint + `next build` green each increment; unit/component **26 web tests**
  (incl. `DiscoverDeck` 7); Playwright suite **5 pass / 1 skip / 0 fail** (Flow canvas + critical
  flows + route protection).
- Backend: typecheck + build green; contracts **17/17**, domain **52/52**, api **21/21**; discovery
  HTTP E2E **24 checks** + Ending-Soon/discovery migrations **applied to a real ephemeral Postgres**.

## Immediate next step

V3-5 is complete (frontend Discover + backend discovery E2E landed and verified). Next is **V3-6 —
Bid Battle + Engagement Engine**: privacy-safe bidder aliases + a rebuildable, non-authoritative
rivalry projection from the immutable bid ledger (backend, Tier-A), then the `bidBattleV3` UI and the
`engagementV3` notification engine with provider fakes-first adapters.
