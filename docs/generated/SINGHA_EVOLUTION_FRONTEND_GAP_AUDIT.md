# SINGHA EVOLUTION — FRONTEND GAP AUDIT

Audit of every Singha Evolution backend capability (E1–E13, all Backend-Ready and CI-green) against
the frontend (`@singha/web`). Written from a real recon of `apps/web` (routing/IA/flags, the V3
design system, the data/API layer, the test infra) + the authoritative backend endpoint inventory,
not from prior "done" labels.

## Method

- **Backend inventory:** every Evolution controller route + its permission (audience) was enumerated:
  `exchange:participate` → customer/buyer/supplier surface; `exchange:operate` → staff/operator
  surface; public/any-auth → browse/reference/local-site; one internal-only (`/payments/webhook`).
- **Frontend recon:** App Router at `apps/web/src/app` (single root layout); dark-only V3 design
  system (`@singha/ui` + tokens in `packages/ui`); hand-rolled `fetch` data layer (`lib/api.ts`) +
  `useAuth()` (Supabase) + `MfaGate` for staff; flags in `lib/flags.ts` with a `?evo=on` preview
  channel; vitest (jsdom, mock `../lib/api`) + a local-only Playwright 7-width screenshot matrix.
- **Classification:** every capability is **UI (this pass)** — a new accessible, responsive, tested
  surface; **PRE-EXISTING** — already present (extended/linked); **SERVER-INTEGRATED** — consumed
  server-side, not a user screen; or **API / INTERNAL-ONLY** — no user/staff UI by design.

## Foundation added this pass (shared, so surfaces stay consistent with V3)

- **Flags:** the Evolution capability flags (`commercialOffersV2`, `sealedOffers`, `multiCurrency`,
  `fxDisplay`, `logistics`, `procurement`, `supplyProgrammes`, `perishableGoods`, `singhaId`,
  `dashboard`, `controlCentre`, `transactionRouting`, `feesEngine`, `operatorPayments`,
  `insightEngine`, `satelliteNodes`) added to `FeatureFlags` (default OFF) and the `?evo=on` preview
  set — each mirrors the backend flag name, so a surface shows only when its capability is enabled.
- **`@singha/ui` primitives** (were missing): `Field`, `TextInput`, `Textarea`, `Select`, `Tabs`,
  `EmptyState`, `Skeleton`, `Stat`, `DataTable`.
- **Evolution composites** (`apps/web/src/components/evolution/`): `Price` (binding amount + optional
  non-binding display conversion), `DisplayCurrencySelector`, `QuantityUnitInput`,
  `CurrencyAmountInput`, `EvoGate` (flag-gated page fallback).
- **Formatters/catalogs:** `formatMoneyExp`, `formatQuantity`, `formatDate`, `formatDateTime`,
  `formatLocation`, `humanize`, `CURRENCIES`, `UNITS`; the typed `lib/evolution-api.ts` client.

## Capability → surface matrix

| # | Capability (phase) | Backend route(s) | Audience | Pre-existing FE | This pass |
| - | ------------------ | ---------------- | -------- | --------------- | --------- |
| 1 | Geography-neutral IA (E1) | — | public | ✅ Explore/Exchange/Sell/Wanted/Services (`neutralIaV1`) | **PRE-EXISTING** — extended: new surfaces linked into Sell/Wanted/Services/Account |
| 2 | Platform config catalogs (E2) | `/platform/sale-methods\|units\|markets\|operators\|nodes` | public/reference | ❌ | **UI** — units/currencies feed the new inputs; markets/operators/nodes shown in the Control Centre |
| 3 | Commercial Offer V2 (E4) | `POST /commercial-offers`, `/mine`, `/counter\|reject\|accept\|withdraw` | buyer + seller | ⚠️ V3 `SalePanel` (basic offer) | **UI** — `/exchange/offer/[listingId]` (full terms + sealed), `/account/commercial-offers` |
| 4 | Sealed offer comparison/selection (E4) | `/listings/:id`, `/participation`, `/reveal`, `/award` | seller | ❌ | **UI** — `/sell/offers/[listingId]` (counts-only pre-reveal → reveal → compare → explicit award, D4) |
| 5 | Currency / display FX (E5) | `/fx/currencies\|rate\|convert` | public | ❌ | **UI** — `DisplayCurrencySelector` in the header + `Price` non-binding conversion (D5) |
| 6 | Transaction routing (E6) | `POST /routing/resolve\|terms` | operator | ❌ | **UI** — Control Centre → Routing (deterministic decision preview) |
| 7 | Logistics / Incoterms / quote / book / track (E7) | `/logistics/incoterms\|nodes\|quotes\|shipments` | buyer + operator | ❌ | **UI** — `/services/logistics` (Reference / Quote / Track) |
| 8 | Fees / Tax (E8) | `POST /fees/compute` | operator | ❌ | **UI** — Control Centre → Fees & Tax (breakdown) |
| 9 | Payment route resolution (E8b) | `POST /payments/resolve-route` | operator | ❌ | **UI** — Control Centre → Payments |
| 10 | Payment webhook (E8b) | `POST /payments/webhook` | provider→server | n/a | **API / INTERNAL-ONLY** — HMAC-signed provider callback; no UI by design |
| 11 | Procurement / RFQ / reverse tender (E9) | `/procurement/requests…/proposals\|close\|award` | buyer + supplier | ❌ | **UI** — `/wanted/procurement` + `/wanted/procurement/[id]` |
| 12 | Supply programmes (E10) | `/supply/programmes…/status\|recommend` | seller + buyer | ❌ | **UI** — `/sell/supply` (seller) + `/wanted/supply` (buyer matching) |
| 13 | Perishable metadata (E10) | `/supply/perishable` | seller | ❌ | **UI** — inline in `/sell/supply` (`perishableGoods`) |
| 14 | Singha ID profile + capabilities (E11) | `/singha-id/profile\|capabilities\|evaluate` | member | ❌ | **UI** — `/account/singha-id` |
| 15 | Capability decision / KYC (E11) | `POST /singha-id/capabilities/decide` | operator | ❌ | **UI** — Control Centre → KYC |
| 16 | Cross-domain customer dashboard (E11) | `GET /dashboard` | member | ⚠️ V3 `/dashboard` (auction command centre) | **UI** — `/account/activity` (Buying/Selling/Verification) |
| 17 | Operator Control Centre (E11) | `GET /control-centre/overview` | operator | ❌ | **UI** — `/control-centre` (overview + tools) |
| 18 | Intelligence: match / pricing / compare (E12) | `/insight/match\|pricing/comparables\|offers/compare` | buyer | ❌ | **UI** — woven into `/wanted/supply` (match) + comparison affordances |
| 19 | Intelligence: risk (E12) | `POST /insight/risk` | operator | ❌ | **UI** — Control Centre → Risk (review signal, never auto-block) |
| 20 | Satellite Node presentation + discovery (E13) | `GET /nodes/:code`, `/discovery` | public | ❌ | **UI** — `/n/[code]` public local site (central inventory) |
| 21 | Node origination (E13) | `POST /nodes/:code/originate` | operator | ❌ | **UI** — `/control-centre/nodes` |
| 22 | SEO canonical / JSON-LD (E13) | `POST /seo/canonical\|listing-jsonld` | server | n/a | **SERVER-INTEGRATED** — canonical/hreflang/JSON-LD belong in SSR `<head>`/sitemap, not a user screen |

## Outcome

Every user- or staff-facing capability (rows 1–9, 11–21) gets an accessible, responsive, flag-gated,
tested frontend surface this pass. Two capabilities are explicitly **not** user screens: the payment
**webhook** (internal provider callback) and the **SEO helpers** (server-side rendering artefacts).
The final Backend-Ready / UI-Ready / Pilot-Ready status is recorded in
`SINGHA_EVOLUTION_FRONTEND_CAPABILITY_MATRIX.md` after browser + responsive verification.
