# Singha Auctions V3 — UI/UX + Outstanding-Gap Completion Report

_Autonomous UI/UX pass per the "V3 UI/UX + Outstanding Gap Completion" brief. Written
honestly against the real code and a real browser screenshot matrix — not from prior
"DONE" labels. Companion to `V3_UIUX_GAP_AUDIT.md` (the audit-before-coding ledger)._

## Verdict: **UIUX_READY_FOR_OWNER_REVIEW**

The V3 experience is now **materially transformed and reviewable**. The core buyer journey —
global shell, homepage, catalogue Flow, lot detail — reads as a premium, cinematic
auction platform that is visibly different from the V2 fallback at first glance, and it is
proven across the full responsive width matrix (screenshots below, 11/11 green, no
horizontal overflow at any width). Production is **unchanged**: every V3 flag still ships
OFF; the transformation is visible only through the new, reversible preview switch.

This is **not** a claim that the entire brief is finished. Several deeper polish items and
the largest backend gap (Live console roles + multi-lot sequencing) remain and are listed
plainly under "Remaining". The verdict is deliberately `READY_FOR_OWNER_REVIEW`, not a
blanket "complete", per the brief's instruction not to falsely mark completion.

## The core reframing (why the site "looked like V2")

The deployed site showed V2 because **every V3 experience flag defaults OFF** — a large,
already-premium V3 surface set existed in code but was invisible in review, and there was
no way to turn it on. The single highest-leverage fix was to make V3 reviewable safely,
then complete the genuinely-missing shell and fix the specific defects.

## What was delivered (this pass)

### V3-1 — Design system + global shell (was NOT STARTED → **DONE**)

- **`Sheet`** — the design system's first overlay primitive (`@singha/ui`): focus-trapped,
  scroll-locking, ESC/scrim close, focus restore, ARIA dialog, reduced-motion safe.
- **Mobile navigation** — the top shell defect. The desktop nav was `hidden md:flex` with
  no hamburger, so phones lost all navigation. New `MobileNav` hamburger → `Sheet` drawer
  with the full nav, flag-gated Discover, auth-aware account actions and the seller CTA.
- **Scroll-aware `Header`** — elevates on scroll, active-route aware, hosts the drawer, and
  gives the previously-**dead** `v3VisualArchitecture` flag a real, reversible effect
  (the "V3 preview" marker visible in the screenshots).
- **V3 preview switch** — `NEXT_PUBLIC_V3_PREVIEW` env (staging-only) + a shareable
  `?v3=on/off` review cookie overlay every V3 flag ON **without** changing production
  defaults. This is how the owner can finally see V3.
- **Shell chrome states** — app-root `loading` / `error` / `not-found`.
- **Reduced-motion completeness** — closed the gaps in `GestureBidControl` and
  `CompactLotCell`; `html`/`body` now both clip horizontal overflow site-wide.

### Homepage — cinematic recomposition (**DONE, core**)

- Two-column cinematic hero that **fills the desktop viewport** (the brief's "don't leave
  the right half empty"): a parallaxed, reduced-motion-safe stack of real featured lots,
  degrading to an editorial depth panel when featured data is sparse (shown in the
  screenshot, since the live API had no featured lots). Mobile stays copy-first and fast.

### Catalogue — Infinite Flow as the dominant experience (**DONE, core**)

- **Legible compact cells** — replaced hairline 9–11px micro-typography with a premium
  compact cell: title, gold price, a time-remaining chip, a tiny sale-method marker and a
  watched (♥) indicator, with a gentle hover lift. Still one tap target, never a bid button
  in a mini-cell.
- **`categoryOverlayV3` wired** — the floating band label was rendering unconditionally
  (dead flag); it is now gated, themed and can no longer overflow the viewport.
- Density confirmed on-brief (5–9 across desktop, 4×4≈16 mobile) across 360–1920px.

### Lot detail (**DONE, core**)

- **Mobile sticky action dock** — key state (current bid / guide / price) + the primary
  action always in reach; it anchors to the real bid/sale panel (never bids itself).
- Gesture Bid reduced-motion guard.

### Backend safe code gaps

- **AI translation** (BE `ab2b665`, CI green) — `POST /ai/translate` through the Tier-A
  `guardAiRequest('translation', …)` boundary; derived `AiRun`, audited, rule-11 boundary
  held; credential-free fake; AI E2E 19/19.
- **Social approval lifecycle + Asset-Intelligence sell-through** — in the same pass (see
  the backend commit referenced at the end); additive migration for the social approval
  states, a distinct `social:approve` permission, publish gated on `approved`, and a live
  sell-through metric on Market Pulse.

## Screenshot evidence matrix

Captured with Playwright against a real Chromium, preview flags ON, deterministic 2/16/80-lot
fixtures (`apps/web/e2e/v3-screenshots.spec.ts` — reproducible with
`SHOT_DIR=… PW_EXECUTABLE_PATH=… pnpm --filter @singha/web exec playwright test v3-screenshots.spec.ts`):

| Surface                              | Widths                               | Result                                  |
| ------------------------------------ | ------------------------------------ | --------------------------------------- |
| Catalogue Flow (16 lots/cat)         | 360, 390, 430, 768, 1024, 1440, 1920 | ✅ density + **no horizontal overflow** |
| Catalogue Flow — sparse (2 lots/cat) | 390, 1440                            | ✅ real lots only, no fake faces        |
| Catalogue Flow — dense (80 lots/cat) | 390, 1440                            | ✅ stable paging                        |
| Homepage shell                       | 390, 1440                            | ✅ hero fills viewport, no overflow     |

**11/11 green.** The screenshot set was delivered to the owner in-session (homepage
desktop+mobile, catalogue desktop+mobile, sparse, dense).

## How the owner sees V3 (one screen — brief §14)

V3 stays OFF in production. To review it, pick either:

1. **Per-viewer (no deploy):** open any page with `?v3=on` appended (e.g.
   `https://<site>/catalogue?v3=on`). Sets a 30-day cookie; `?v3=off` clears it.
2. **Staging deployment:** set `NEXT_PUBLIC_V3_PREVIEW=1` on the Vercel **preview/staging**
   environment (never production). To exercise the V3 **data** paths too (rivalry, discovery
   feed, live room, notifications), also set the backend `FEATURE_V3_*` env vars on the
   Railway staging service — otherwise those endpoints correctly 404 and the UI shows its
   safe fallbacks.

Rollback is instant and data-safe: unset the env / clear the cookie, or flip the
server flags off — no redeploy, no migration reversal (all V3 migrations are additive).

## Test + gate results

- **Frontend:** typecheck ✅, eslint ✅ (0 errors), prettier ✅, **55 web unit/component
  tests** ✅ (was 43; +Sheet/MobileNav/flags/CompactLotCell), `next build` ✅, Playwright
  screenshot matrix **11/11** ✅. (FE remote CI remains blocked by the owner GitHub Actions
  billing lock — verified locally instead.)
- **Backend:** full `check` (format/lint/typecheck/build/unit) ✅; AI E2E **19/19** on real
  Postgres ✅; remote backend CI green on the AI-translation SHA (CI ✅ / security ✅ / CodeQL ✅).

## Remaining — DO_NOW-class not yet done (carried, honestly)

- **Deeper visual integration** of Discover (BuyerTwin panel woven into the deck), the
  Dashboard (a distinct premium command-centre shell under `dashboardV3Beta`), and the
  engagement/notification + sound surfaces. These render V3 content today and sit inside the
  new shell, but have not had their own bespoke recomposition.
- **Live FE V3 room shell** (`liveV3` on the frontend) and the homepage editorial-sections
  deep cinematic pass (the hero is done; the lower sections are lightly touched).
- **Live console roles (auctioneer/clerk/producer) + multi-lot current-lot sequencing**
  (`AuctionEventLot`) — the largest backend gap; it touches the live bidding path and
  warrants a dedicated, carefully-tested pass rather than being rushed here.

## POST_PILOT (evidence-led / deferred by design)

Discover feed personalisation from real bid/offer history; materialised Intelligence
projections; real AI prompt templates; the literal edge-hinged 3D fold; V3-11 dashboard
attention-state + funnel tuning; removal of the frozen `apps/api`/`apps/worker` from the FE
(must rewire the Playwright/tooling dependency on `@singha/api` first — never delete-first).

## OWNER_ONLY (credential / infra / irreversible)

Repos private · GitHub Actions billing lock (frontend) · branch protection · Supabase
test-user credential (authenticated Playwright — the dashboard/account screenshots need it) ·
WhatsApp/SMS/email/push/AI/streaming provider credentials · production-scale load/soak ·
backup + isolated restore drill · external WCAG audit · Hostinger production migration.

## Heads

- Frontend `MUA1234/Auctions-New` `main`: **`bbf2063`**
- Backend `LakshanV/Auctions-Backend` `main`: **`ab2b665`** (+ the social-approval /
  sell-through commit that follows this report).
