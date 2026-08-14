# Singha Auctions V3 — UI/UX + Outstanding-Gap Audit

_Audit-before-coding ledger for the UI/UX + Outstanding Gap Completion pass. Written
from a fresh read of the real code on `main` (FE `c37f1f9`, BE `8a03629`), not from
prior "DONE" labels. Each item is classified **DO_NOW** (this pass), **POST_PILOT**
(evidence-led / deferred by design), or **OWNER_ONLY** (credential/infra/irreversible)._

## The core finding (reframes the whole pass)

The deployed site looks like V2 **because every V3 experience flag defaults OFF**, so
the owner's screenshots show the V2 fallbacks. A large, genuinely-premium V3 surface set
already exists in code (design tokens, `FeaturedReel`, the `FlowCanvas` 2-D catalogue,
`DiscoverDeck`, `BidBattle`, gesture bid, engagement centre, dashboard command-centre) —
but it is invisible in review because:

1. **`v3VisualArchitecture` is a dead flag** — it is declared but gates nothing. There is
   no master switch and no preview configuration to let the owner see V3.
2. Several surfaces have **real defects** that would embarrass a flags-ON review (below).
3. **V3-1 "design system + visual shell" is genuinely incomplete** — most notably there is
   **no mobile navigation at all**, and no overlay/sheet primitive layer.

So this pass is NOT "repaint V2". It is: (a) make V3 reviewable via a safe preview switch,
(b) complete the real V3-1 shell, (c) fix the specific defects, (d) close the safe backend
code gaps — then prove it with a screenshot matrix.

---

## A. Design system + global shell (V3-1) — **the mandatory piece**

| #   | Item                                                                          | Finding                                                                                                                                                                                                           | Class                         |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| A1  | **Mobile navigation**                                                         | `Header` primary nav is `hidden md:flex` with **no hamburger/drawer**. On phones all top-level nav disappears (only the Sell CTA remains). Single biggest shell defect.                                           | **DO_NOW**                    |
| A2  | **Overlay primitive layer**                                                   | No `Sheet`/`Drawer`/`Modal`/`Dialog`/`Toast`/`Popover` anywhere in `@singha/ui`. A premium shell (mobile nav, filters, command surfaces) needs at least a focus-trapped `Sheet`.                                  | **DO_NOW**                    |
| A3  | **`v3VisualArchitecture` master switch**                                      | Flag is dead (gates nothing). Wire it to the elevated shell chrome so it has real effect and is part of the review set.                                                                                           | **DO_NOW**                    |
| A4  | **Preview / review configuration**                                            | No way to turn V3 on for owner review. Add a production-safe `NEXT_PUBLIC_V3_PREVIEW` env + a `?v3=on/off` review cookie that overlays all V3 flags ON. Defaults stay OFF in prod; fully reversible.              | **DO_NOW**                    |
| A5  | **Shell chrome states**                                                       | No `loading.tsx` / `error.tsx` / `not-found.tsx` at the app root; no skip-link/focus management.                                                                                                                  | **DO_NOW**                    |
| A6  | **Motion vocabulary + reduced-motion completeness**                           | Motion is bespoke CSS keyframes (good reduced-motion CSS block + `useReducedMotion` hook), but reduced-motion is **not honoured** in `GestureBidControl` or `CompactLotCell`; no shared reveal-on-scroll utility. | **DO_NOW**                    |
| A7  | **Primitive breadth**                                                         | Only Button/Card/Chip/Logo are shared primitives; Input/Field, Skeleton, Badge, Tabs, Spinner are CSS-only or ad-hoc. Add the few the V3 surfaces actually need.                                                  | **DO_NOW (targeted)**         |
| A8  | **Type/spacing scale tokens**                                                 | Colours/fonts tokenised; no modular type/space/z-index scale. Introduce a light scale + section scaffold.                                                                                                         | **DO_NOW (light)**            |
| A9  | **Two visual languages** (angular HUD vs premium public) coexist unreconciled | Keep both but document the boundary: HUD = operator/live surfaces; `card-premium` = public buyer surfaces.                                                                                                        | **DO_NOW (document + apply)** |
| A10 | Light theme / theme-switch infra                                              | `<html class="dark">` hardcoded. A light mode is out of scope for the pilot (dark cinematic is the brief).                                                                                                        | **POST_PILOT**                |

## B. Homepage — cinematic recomposition

| #   | Item                                                                               | Finding                                                                                                                                                                                                                                                    | Class      |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| B1  | **Hero fills the viewport**                                                        | Desktop hero leaves the right half empty (brief calls this out). Recompose to a two-column cinematic hero with a layered asset showcase; CSP-safe media (CSS/SVG depth + real featured-lot media only — `img-src` allows self/data/blob/Supabase). No CLS. | **DO_NOW** |
| B2  | **FeaturedReel is the default featured experience in review**                      | Already premium; ensure it is the visible surface when V3/preview is on (it is `featuredReelV3`-gated). Swap raw `<img>` backdrop for a safer treatment.                                                                                                   | **DO_NOW** |
| B3  | Featured event / categories / Market Pulse / trust / sell as one editorial journey | Currently stacked generic Cards; give them cinematic rhythm and depth.                                                                                                                                                                                     | **DO_NOW** |

## C. Catalogue — Infinite Flow as the dominant experience

| #   | Item                                              | Finding                                                                                                                                         | Class               |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| C1  | **`CompactLotCell` readability + density**        | Micro-typography (`text-[9px]`–`[11px]`); needs a legible premium compact cell. Target ~8–10 across desktop, ~4×4≈16 mobile (360–430px).        | **DO_NOW**          |
| C2  | **`categoryOverlayV3` not wired**                 | `CategoryOverlay` renders unconditionally inside `FlowCanvas`; the flag gates nothing. Wire it, and theme its hardcoded green→gold gradient.    | **DO_NOW**          |
| C3  | Floating overlay behaviour                        | Appears on band activation, fades on scroll, no flicker on horizontal paging; desktop + mobile variants. Mostly present — verify + refine.      | **DO_NOW**          |
| C4  | Sparse (1–2) / dense (2000) correctness           | No fake faces/arrows on sparse; all lots reachable + clean termination on dense (backend offset cursor already proven to 2000). Verify in Flow. | **DO_NOW (verify)** |
| C5  | Compress catalogue heading/search/filter controls | Inventory should start higher; compact/floating controls.                                                                                       | **DO_NOW**          |
| C6  | Literal edge-hinged 3D fold                       | Bounded slide today; a true fold is a refinement, not a blocker.                                                                                | **POST_PILOT**      |

## D. Lot detail — visual recomposition

| #   | Item                                    | Finding                                                                                                | Class      |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| D1  | **Media-led recomposition**             | Page shell is V2 two-column with `<dl>` fact tables. Make it media-led with clear bid/next-bid/status. | **DO_NOW** |
| D2  | **Mobile sticky action dock**           | Missing. Add a sticky bottom bid/watch dock on mobile.                                                 | **DO_NOW** |
| D3  | **BidBattle integrated, not bolted-on** | Currently a detached bordered strip under the bid panel; weave into the bid shell.                     | **DO_NOW** |
| D4  | Gesture Bid as one integrated control   | Sits as a parallel affordance over the classic form; keep both but present as one; add reduced-motion. | **DO_NOW** |

## E. Discover / Bid Battle / Engagement / Dashboard — fit the shell

| #   | Item                                                                       | Finding                                                                                                                                                                                                                                  | Class                         |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| E1  | **BuyerTwinPanel integrated with the deck**                                | Bolted-on `max-w-sm` card below the deck; compose into one Discover surface.                                                                                                                                                             | **DO_NOW**                    |
| E2  | **Premium dashboard shell**                                                | `dashboardV3Beta` gates only analytics; no distinct premium shell. Give the command-centre a premium personal-action treatment (Watching/Winning/Outbid/Won/Payment/Pickup). **No public-catalogue category overlays in the dashboard.** | **DO_NOW**                    |
| E3  | Engagement/notifications + sound premium treatment                         | Plain settings stack + utilitarian sound control; apply premium language.                                                                                                                                                                | **DO_NOW**                    |
| E4  | Discover feed personalisation from real bid/offer history (outbox/rebuild) | Safe, additive signal path; keep weights server-side, never authoritative.                                                                                                                                                               | **POST_PILOT** (evidence-led) |

## F. Live / Events

| #   | Item                                                                   | Finding                                                                                                                 | Class                           |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| F1  | **Live surface has no V3 path**                                        | `/live` is fully static V2; `liveV3` flag never wired on the FE. Give it a V3 room shell (uses existing SSE live-room). | **DO_NOW (FE shell)**           |
| F2  | **Distinct auctioneer / clerk / producer console roles + permissions** | Backend has a single `live:operate` permission. Add granular roles/permissions.                                         | **DO_NOW (backend)**            |
| F3  | **Multi-lot current-lot sequencing (`AuctionEventLot`)**               | No runtime `currentLotId`/advance/SOLD/PASS; `LiveEvent`↔`AuctionEventLot` not linked. Needs a migration.               | **DO_NOW (backend, contained)** |
| F4  | Real IVS/YouTube adapters                                              | Provider credentials required.                                                                                          | **OWNER_ONLY**                  |

## G. Connect / AI / Social / Asset Intelligence — safe code gaps

| #   | Item                                              | Finding                                                                                                                                                 | Class                    |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| G1  | **AI translation task/route**                     | `AiTaskType.translation` + registry policy already exist; no route/service/provider/contract. SMALL, no migration.                                      | **DO_NOW (backend)**     |
| G2  | **Social approval lifecycle**                     | States are `draft/scheduled/published/failed`; no `pending_approval`/`approved`, no approver separation, publish not approval-gated. Needs a migration. | **DO_NOW (backend)**     |
| G3  | **Asset Intelligence sell-through foundation**    | Only `salesCount/total/avg`; no sold÷offered. Add a live sell-through metric (offered denominator from passed-in/withdrawn).                            | **DO_NOW (live metric)** |
| G4  | Materialised/rebuildable Intelligence projections | Live-computed today; materialisation is a perf optimisation.                                                                                            | **POST_PILOT**           |
| G5  | Real prompt templates in the AI registry          | Registry stores policy metadata, not prompt bodies.                                                                                                     | **POST_PILOT**           |
| G6  | Feature-flag gates for Social/AI                  | Only Live is flag-gated; add `ensureEnabled()` where a V3 gate is wanted.                                                                               | **DO_NOW (targeted)**    |

## H. Contract path + duplicate legacy source

| #   | Item                                           | Finding                                                                                                                                                                                                                | Class                                |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| H1  | Generated backend→frontend contract/client     | A drift-checked shared `contracts/public-api.contract.json` already exists (BE emits, FE `check-contracts.mjs` validates field coverage, both in CI). This is the "authoritative generated path"; keep and rely on it. | **DO_NOW (document; already sound)** |
| H2  | Remove frozen `apps/api`/`apps/worker` from FE | Blocked: FE Playwright/tooling still builds `@singha/api`. Must prove zero runtime/test dependency and rewire before deleting (never delete-first).                                                                    | **POST_PILOT** (rewire first)        |

## I. Owner-only / infra (document, do not block)

Repos private · GitHub Actions billing lock (frontend) · branch protection · Supabase test
credential (authenticated Playwright) · WhatsApp/SMS/email/push/AI/streaming provider
credentials · production-scale load/soak · backup + isolated restore drill · external WCAG
audit · Hostinger production migration. — all **OWNER_ONLY**.

## J. Post-pilot / evidence-led (do not falsely mark complete)

V3-11 dashboard attention-state refinement · Discover→watch→bid→notification funnel tuning ·
recommendation tuning · high-volume engagement tuning. — all **POST_PILOT**.

---

## Execution order (impact-first)

1. **V3-1 shell foundation** (A1–A9): `Sheet` primitive → responsive `Header` + mobile drawer
   → `v3VisualArchitecture` wiring → preview switch (A4) → chrome states → motion/reduced-motion.
   _Unlocks owner review and fixes the top defect._
2. **Homepage** hero cinematic (B1–B3).
3. **Catalogue Flow** density + overlay wiring + controls (C1–C5).
4. **Lot detail** recomposition + sticky dock + BidBattle integration (D1–D4).
5. **Discover/Dashboard/Engagement/Live-FE** shell fit (E1–E3, F1).
6. **Backend safe gaps**: AI translation (G1) → Social approval (G2) → sell-through (G3) →
   Live roles + sequencing (F2–F3), each with E2E.
7. **Fixtures (2/16/80) + 7-width screenshot matrix** + self-review + corrections.
8. **Deliverables**: completion report, updated phase status, verdict.

Every change stays behind a flag or is a strict shell improvement; production defaults remain
OFF; each increment is committed, pushed, and kept CI-green.
