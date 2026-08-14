# Singha Auctions V3 — Final GO / NO_GO

_Autonomous self-review per pack doc 15. Reviewed assuming the implementation is wrong
until proven otherwise. Generated 2026-08-14._

## Verdict: **GO_FOR_CONTROLLED_PILOT**

The V3 **build track is complete and verified end-to-end**, and the non-negotiable
integrity properties — auction concurrency/idempotency, member credit/security rules,
financial ledgers, authorization/AAL2, and Tier-A data boundaries — are **tested and
intact**. Full production **GO** is deliberately withheld pending owner-only items
(provider credentials, load/backup/observability drills, WCAG audit, source privacy).
All V3 experience flags ship **OFF by default**, so enabling the pilot is a controlled,
reversible, per-flag decision and production behaviour is unchanged until then.

Per pack doc 15, a build may be GO_FOR_CONTROLLED_PILOT while provider credentials and
post-pilot refinement remain incomplete — provided financial/auction/security integrity
is not waived. It is not: those are covered below.

## Versions

|                                            |                                                                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend `MUA1234/Auctions-New` `main`     | `bb8285c`                                                                                                                                             |
| Backend `LakshanV/Auctions-Backend` `main` | `e458ccc`                                                                                                                                             |
| Deployed / staging                         | Vercel (web) + Railway (api) track `main`; **deploy behind flags OFF**, enable one flag in staging to verify, then disable to prove rollback (doc 14) |

## Feature flags — all default **OFF** (server-controlled via `/feature-flags`)

`v3VisualArchitecture` · `flowMatrixV3` ✔ · `categoryOverlayV3` · `featuredReelV3` ✔ ·
`discoverV3` ✔ · `buyerTwinV3` ✔ · `gestureBidV3` ✔ · `bidBattleV3` ✔ · `engagementV3` ✔ ·
`dashboardV3Beta` ✔ · `liveV3` ✔ (✔ = experience built + gated + tested; OFF in prod).

## Migrations (additive-first, expand→migrate→verify; 19 total)

All applied cleanly to a real Postgres. V3 additions: `discovery_event` /
`buyer_twin_projection` / `recommendation_impression` (V3-5); `notification_preference` +
append-only `notification_delivery` (V3-6); `product_event` (V3-9). No destructive step;
no contract (drop) phase taken.

## Test command matrix + result

**Frontend** (`@singha/web`)

| Gate                            | Result                                                                  |
| ------------------------------- | ----------------------------------------------------------------------- |
| `typecheck` (tsc)               | ✅ green                                                                |
| `lint` (eslint)                 | ✅ 0 errors                                                             |
| `format:check` (prettier)       | ✅ clean                                                                |
| unit/component (`vitest`)       | ✅ **43** passed (10 files)                                             |
| `next build` (prod config)      | ✅ all routes incl. `/discover`, `/account/notifications`, `/dashboard` |
| bundle secret / source-map scan | ✅ clean — no server secrets, no public source maps                     |

**Backend** (`@singha/api` + packages) — unit

| Gate                                            | Result                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `format:check` / `lint` / `typecheck` / `build` | ✅ green (lint 0 errors)                                                                |
| unit (`vitest`)                                 | ✅ domain **90**, contracts **17**, api **21**, +config/observability/worker/test-utils |
| `contract:check` (public API drift)             | ✅ matches committed snapshot (synced to FE)                                            |

**Backend acceptance E2E** — all on a **real ephemeral Postgres**, all green

| Suite                             | Checks |     | Suite                            | Checks |
| --------------------------------- | ------ | --- | -------------------------------- | ------ |
| data-core                         | 17     |     | catalogue-v2 + watch             | all    |
| auction (incl. concurrency burst) | 19     |     | events-content                   | 12     |
| eoi                               | 19     |     | security                         | 11     |
| exchange                          | 20     |     | seller-org                       | 9      |
| commerce                          | 16     |     | member (credit/security)         | 65     |
| connect (BidIntent, rule 11)      | 11     |     | **discovery + Buyer Twin**       | **24** |
| ai (+ prompt-injection/boundary)  | 14     |     | **bid-battle rivalry**           | **17** |
| social + intelligence             | 9      |     | **engagement (DLQ/quiet/cap)**   | **14** |
| live (flag/realtime/video-indep.) | 17     |     | **catalogue scale (2,000 lots)** | 5      |

## Security / IP result

- **Tier-A stays server-side:** auction acceptance/proxy-max, Buyer Twin weights, rivalry
  scoring, AI prompts/policy/routing, credit/exposure — none in the browser bundle
  (bundle scan clean; public DTOs audited).
- **Boundaries tested:** authz + AAL2 routes; IDOR/ownership; sanitized errors; CORS/CSP +
  security headers (`next.config.mjs`); rate limiting; replay/idempotency (bids); **no
  bidderId / proxy-max leakage** in Bid Battle; **AI prompt-injection + data-boundary
  redaction** refuses & audits, free text can never place a bid (rule 11).
- Backend security E2E 11/11.

## Load / performance result

- **Verified:** large-catalogue cursor at **2,000 lots** — every lot reachable, no repeats,
  clean termination (root-caused + fixed the AuctionFlow keyset regression → offset cursor);
  auction **concurrency** — an 8-bid row-locked burst yields exactly one accepted price move,
  zero 5xx; realtime SSE fan-out (shared, not per-viewer polling).
- **Outstanding (owner/infra drill):** production-scale throughput/soak, engagement-queue
  burst at volume, DB-pool saturation ceilings. **Waiver:** deferred to controlled-pilot
  hardening; not fixed by raising thresholds.

## Backup / restore result

- **Outstanding (owner/infra):** independent backup + restore-to-isolated-env drill with
  bid/payment/settlement/audit integrity verification. Requires production-like copy +
  owner access. **Waiver:** must be completed before full public GO.

## Accessibility result

- **Verified:** reduced-motion honoured (FeaturedReel, Gesture Bid, Discover, sound/haptics);
  keyboard/focus + ARIA roles on new surfaces (radiogroup/switch/alert/status); gesture
  actions always have explicit button equivalents; no document horizontal overflow in the
  Flow Playwright checks.
- **Outstanding:** full WCAG-oriented audit across the whole critical-path matrix
  (360–1920px). **Waiver:** pilot-acceptable; complete before public GO.

## Unresolved owner actions (P0)

1. Make **both repos private** (Tier-A source is an IP/security exposure while public).
2. Resolve the **GitHub Actions billing/account lock** so remote security/CI scans run.
3. Confirm **branch protection** on `main` (both repos).
4. Provide a **Supabase test-user credential** → unlock authenticated Playwright E2E.
5. Provider credentials — **WhatsApp / SMS / email / push / AI / streaming (YouTube/IVS)** —
   to activate Connect / Engagement / AI / Social / Live beyond the credential-free fakes.
6. Backup/restore drill, production-scale load, and WCAG audit (above).

_(Resolved this session: GitHub App `contents: write` on the backend repo — pushes now work.)_

## Known waivers (acceptable for controlled pilot, not for public GO)

- All external providers run on **fakes/mocks** until credentials arrive (adapters are
  swap-in; no service change needed).
- Public repo → **source-privacy risk recorded** (doc 12) until repos are private.
- Load/backup/WCAG drills deferred (above).
- Post-pilot refinements documented per phase: Social explicit approval state; Intelligence
  materialized projections + sell-through; AI translation; distinct auctioneer/clerk/producer
  Live consoles + multi-lot sequencing; dashboard funnel wiring (evidence-led in V3-11).

## Rollback (per release, doc 14)

Previous known-good SHA recorded; V3 flags default OFF (disable to instantly fall back to V2
experience — no redeploy); migrations are additive (no contract step taken), so app rollback
does not require data restoration. Data-restore trigger criteria: any bid/payment/settlement
integrity anomaly post-cutover.

---

**Bottom line:** ship to a **controlled pilot behind flags**. Auction, credit and security
integrity are proven; the remaining gates are owner-provisioned (credentials) or
infra-drills (load/backup/WCAG), none of which are waived for full GO.
