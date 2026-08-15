# SINGHA EVOLUTION — FRONTEND CAPABILITY MATRIX

Backend Ready / UI Ready / Pilot Ready for every Singha Evolution capability (E1–E13), after the
frontend gap-closure pass in `@singha/web`. This is the companion to
`SINGHA_EVOLUTION_FRONTEND_GAP_AUDIT.md` (which classified the gaps) — this file records the
verified end state.

## Legend

- **Backend Ready** — the capability's API/domain is implemented and its backend CI is green
  (established at E15; the API is the single source of truth, in `Auctions-Backend`).
- **UI Ready** — an accessible, responsive, flag-gated, **tested** frontend surface exists in
  `@singha/web`, consuming the real contract. "Tested" = a jsdom component test and/or a Playwright
  screenshot at the 7-width matrix (360/390/430/768/1024/1440/1920).
- **Pilot Ready** — the surface is wired into the IA, degrades gracefully when its capability flag
  is OFF (the route always resolves — never a 404 — showing a calm "not enabled" state), and turns
  on for a pilot cohort by flipping the backend capability flag (previewable now with `?evo=on`).
  Enabling for real users is a flag decision on top of a verified surface, not more frontend work.

Verification is split honestly by what can be hermetically driven in CI:
- **Public surfaces** (no session) — Playwright screenshots at all 7 widths, asserting no horizontal
  overflow and that real content rendered (not the flag-off fallback).
- **Authed surfaces** (need a Supabase session — an OWNER_ONLY credential, per the V3 record) —
  jsdom component tests (`vitest` + Testing Library) that mock auth/flags/API and assert the real
  states (loading, empty, error, populated, and the critical actions). These cannot be
  screenshotted in CI without shipping a real credential, so they are proven by component test.

## Whole-app gates (all green this pass)

| Gate | Result |
| ---- | ------ |
| `pnpm --filter @singha/web typecheck` (`tsc --noEmit`, strict + `noUncheckedIndexedAccess`) | ✅ clean |
| `pnpm --filter @singha/web build` (Next.js production build) | ✅ 41 routes compile |
| `pnpm --filter @singha/web test` (vitest) | ✅ 85/85 across 26 files (16 Evolution tests) |
| `node scripts/check-routes.mjs` (no dead primary-nav link) | ✅ all resolve |
| Playwright public-surface matrix (`e2e/evolution-screenshots.spec.ts`) | ✅ 20/20 — logistics ×7 widths, node local site ×7 widths, IA entry pages ×6; **0 console/hydration errors** |

## Capability matrix

| # | Capability (phase) | Audience | Frontend surface | Backend Ready | UI Ready | Pilot Ready |
| - | ------------------ | -------- | ---------------- | :-----------: | :------: | :---------: |
| 1 | Geography-neutral IA (E1) | public | Explore/Exchange/Sell/Wanted/Services nav + editorial pages, now with flag-gated links into every live surface | ✅ | ✅ pre-existing, extended | ✅ (`neutralIaV1`) |
| 2 | Platform config catalogs (E2) | reference | Units/currencies feed the qty/price inputs; markets/operators/nodes shown in the Control Centre | ✅ | ✅ consumed | ✅ |
| 3 | Commercial Offer V2 (E4) | buyer + seller | `/exchange/offer/[listingId]` (full terms + sealed), `/account/commercial-offers` | ✅ | ✅ component test | ✅ (`commercialOffersV2`) |
| 4 | Sealed offer comparison / selection (E4) | seller | `/sell/offers/[listingId]` — counts-only pre-reveal → reveal → ranked compare → explicit award (never auto-awards) | ✅ | ✅ component test | ✅ (`commercialOffersV2` / `sealedOffers`) |
| 5 | Currency / display FX (E5) | public | `DisplayCurrencySelector` in the header + `Price` non-binding "≈ … · indicative" conversion | ✅ | ✅ component test | ✅ (`multiCurrency` / `fxDisplay`) |
| 6 | Transaction routing (E6) | operator | Control Centre → Routing (deterministic decision preview) | ✅ | ✅ component test | ✅ (`transactionRouting`) |
| 7 | Logistics / Incoterms / quote / book / track (E7) | buyer + operator | `/services/logistics` (Reference / Quote / Track) | ✅ | ✅ **screenshot ×7** + component test | ✅ (`logistics`) |
| 8 | Fees / Tax (E8) | operator | Control Centre → Fees & Tax (line-item breakdown) | ✅ | ✅ component test | ✅ (`feesEngine`) |
| 9 | Payment route resolution (E8b) | operator | Control Centre → Payments | ✅ | ✅ component test | ✅ (`operatorPayments`) |
| 10 | Payment webhook (E8b) | provider→server | — | ✅ | **API / INTERNAL-ONLY** — HMAC provider callback, no UI by design | n/a |
| 11 | Procurement / RFQ / reverse tender (E9) | buyer + supplier | `/wanted/procurement` + `/wanted/procurement/[id]` (submit + ranked proposals + explicit award) | ✅ | ✅ component test | ✅ (`procurement`) |
| 12 | Supply programmes (E10) | seller + buyer | `/sell/supply` (seller) + `/wanted/supply` (buyer matching) | ✅ | ✅ component test | ✅ (`supplyProgrammes`) |
| 13 | Perishable metadata (E10) | seller | Inline in `/sell/supply` | ✅ | ✅ component test | ✅ (`perishableGoods`) |
| 14 | Singha ID profile + capabilities (E11) | member | `/account/singha-id` | ✅ | ✅ component test | ✅ (`singhaId`) |
| 15 | Capability decision / KYC (E11) | operator | Control Centre → KYC (verify/reject + expiry) | ✅ | ✅ component test | ✅ (`singhaId` + operator 403) |
| 16 | Cross-domain customer dashboard (E11) | member | `/account/activity` (Buying / Selling / Verification) | ✅ | ✅ component test | ✅ (`dashboard`) |
| 17 | Operator Control Centre (E11) | operator | `/control-centre` (overview + six tools) behind `MfaGate` | ✅ | ✅ component test | ✅ (`controlCentre` + MFA + 403) |
| 18 | Intelligence: match / pricing / compare (E12) | buyer | Woven into `/wanted/supply` (match) + offer comparison affordances | ✅ | ✅ component test | ✅ (`insightEngine`) |
| 19 | Intelligence: risk (E12) | operator | Control Centre → Risk (review signal, never an automatic block) | ✅ | ✅ component test | ✅ (`insightEngine`) |
| 20 | Satellite Node presentation + discovery (E13) | public | `/n/[code]` public local site (central inventory, attributed) | ✅ | ✅ **screenshot ×7** + component test | ✅ (`satelliteNodes`) |
| 21 | Node origination (E13) | operator | `/control-centre/nodes` behind `MfaGate` | ✅ | ✅ component test | ✅ (`satelliteNodes` + MFA + 403) |
| 22 | SEO canonical / JSON-LD (E13) | server | — | ✅ | **SERVER-INTEGRATED** — canonical/hreflang/JSON-LD belong in SSR `<head>`/sitemap, not a user screen | n/a |

## Outcome

Every user- or staff-facing Evolution capability (rows 1–9, 11–21) now has an accessible,
responsive, flag-gated, tested frontend surface. Two capabilities are **not** user screens and are
recorded as such: the payment **webhook** (row 10, internal provider callback) and the **SEO
helpers** (row 22, server-side rendering artefacts). No capability intended for a user or staff
member is left without a surface.

**Design system preserved.** No token, primitive, or layout of the premium V3 dark system was
redesigned. New surfaces are built from the existing `@singha/ui` primitives (extended additively
with `Field`/`TextInput`/`Select`/`Tabs`/`DataTable`/`Stat`/`Skeleton`/`EmptyState`) and the V3
palette (Singha-green `red-*` CTAs, `text-gold-400` prices, `text-outbid` errors), money in integer
minor units and quantities as decimal strings throughout.

**Nothing enabled by default.** Every Evolution capability flag ships **OFF**; production is
unchanged until a flag is switched on for the pilot. The whole set previews together with `?evo=on`.
Backend domains were consumed, never duplicated or redesigned.

**Pilot readiness = a flag flip on a verified surface.** For each row marked Pilot Ready, enabling
the backend capability flag for a cohort turns the surface on; the frontend work is complete and
verified. Full end-to-end pilot go-live remains subject to the backend's own pilot gates
(recorded in `Auctions-Backend`), real reference/config data per market, and the operator/KYC
enablement those staff surfaces drive.

## Self-review correction (browser testing → fix)

Browser testing surfaced one real defect, since fixed. Under the `?evo=on` preview, evolution-flag
state legitimately differs between the server render (the preview override is client-only, so flags
resolve OFF) and the first client render (flags resolve ON). Four components branch structurally on
an evolution flag while rendered during SSR **outside** an `EvoGate` boundary
(`DisplayCurrencySelector` in the header, `AccountNav`, the `EvolutionEntryLinks` entry-page rows,
and the `/sell` seller links) — so each produced a React hydration mismatch that discarded the
server tree on every preview page load. Each now uses the same mount guard the header nav already
used (render the neutral output on the server and first client render, reveal the flagged output
after mount), matching the established V3 convention. Re-run: **0 hydration/console errors** across
all 20 screenshots. Surfaces inside `EvoGate` were never affected — EvoGate renders a skeleton
during SSR, so their flag branches never hydrate on the server.
