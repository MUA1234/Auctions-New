# Singha CX Overhaul — Running State

Persistent progress log for the Customer Experience Overhaul + the Living Background work.
Baselines at pack start: frontend `MUA1234/Auctions-New` @ `1622a040`, backend
`LakshanV/Auctions-Backend` @ `f2d364e` (both confirmed current `origin/main`). Work
continues on `main`. The redesign is kept behind the controlled preview: `?v3=on` /
`NEXT_PUBLIC_V3_PREVIEW` (visual) and `?evo=on` / `NEXT_PUBLIC_EVO_PREVIEW` (neutral IA +
Evolution surfaces). Production defaults are unchanged until an owner enables the flags.

## Done
- **Living Background** (separate pack) — fixed cinematic homepage hero (CSS + Canvas,
  progressive enhancement, reduced-motion, proven scroll-independent 390–1920). Gated on
  `v3VisualArchitecture`. Report: `SINGHA_LIVING_BACKGROUND_REPORT.md`. Shipped `6a125b8`.
- **CX0** — current-state audit → `SINGHA_CX_CURRENT_STATE_AUDIT.md` (16 surfaces, tagged
  findings, phase-mapped fixes). It surfaced two real bugs, both now fixed + regression-tested:
  1. **EOI dead branch (pre-existing, high severity)** — the buyer action panel, sticky-dock
     CTA and label maps compared `'EOI'`, but the backend `SaleMethod` enum is
     `EXPRESSION_OF_INTEREST`, so every EOI listing's "register interest" form was unreachable.
     Fixed in `SalePanel`, `LotStickyDock`, `lot/[id]`, `events/[ref]`, `account/eoi`.
  2. **Dock collision (introduced by CX1)** — the new mobile bottom dock and the lot-detail
     sticky dock both pinned to `bottom-0`; the sticky dock now offsets above the nav dock on
     phones under neutral IA.
- **CX2 (homepage, first pass)** — intent-first hero (real search deep-linking into Explore
  `?q=` + "I want to: Sell / Post what I need / View opportunities"), a "Ways to transact"
  editorial explainer (six sale methods; auction is one of them), and a two-sided "Wanted"
  section surfacing buyer demand. New `components/home/*`, gated on `neutralIaV1`. Explore
  page relabelled from "Catalogue" and given a `q` param.
- **CX1 (mobile shell)** — purpose-built mobile bottom dock (Explore | Wanted | Sell |
  Activity | Account) with active-route state and safe-area handling; global CSS reserves
  bottom space via `has-mobile-dock`. `MobileBottomDock`, gated on `neutralIaV1`, `md:hidden`.
- **CX3 (Explore + universal card)** — not flag-gated (ships to everyone, like the CX0
  fixes). Compact, sticky (`top-16 z-30`, under the header) Explore filter bar: search +
  new Location text filter + new Ending soon (48h) toggle + Sort (already had price
  asc/desc) + Flow/Grid/List, with the category/sale-method chip rows converted to
  `overflow-x-auto` rails so the bar's height stays bounded and it can't cause horizontal
  page overflow at 390px. `fetchCatalogueV2`/`fetchCatalogueRow` gained a typed
  `CatalogueQueryParams` (was an untyped `Record`) and now forward `location`/`endingSoon`
  everywhere, including into Flow bands so filter state still persists across view
  switches. `SaleCard` rebuilt to the doc 04 hierarchy (media → title → location →
  price/offer-state → quantity+unit "when present" → sale method → availability/close →
  subtle logistics hint → one primary action) with a sale-method→verb map (Bid / Buy now /
  Make offer / Request quote / Respond / View); dropped the on-image sale-method chip and
  the internal divider (doc 06 "fewer borders, larger media"); `quantity`,
  `quantityUnitCode`, `collectionSummary` added to `CatalogueCardV2` as optional/
  forward-compatible (the v2 list card doesn't project them yet — see `SINGHA_CX_DECISIONS`
  D-CX-1). Price-range/currency/quantity-range/shipping/verification filters intentionally
  NOT added (no server support); noted with a `// CX3: future backend filters` comment.
  Gates: typecheck, vitest (91 passing), eslint, prettier, `next build` all green.

- **CX5 (raw-ID removal + offer context)** — backend: `GET /commercial-offers/mine` enriched
  with additive PUBLIC listing context (title/publicRef/saleMethod/location/coverStorageKey),
  no private data (backend `e5dceca`). Frontend: `OfferView.listing` typed; `MyCommercialOffers`
  now shows the real title + reference + location instead of the raw listing CUID, with a
  regression test. (Sealed-offer comparison UX already exists from E4b; further offer-form
  "plain-English summary / negotiation timeline" polish tracked under CX-cont.)
- **CX6 (Wanted/RFQ + Supply first-class flows)** — frontend only (`Auctions-New`), no backend
  change. `ProcurementHub` (post an RFQ): the create form is grouped into plain-English
  `FormSection`s (What do you need → Quantity → Specification & quality → Where & when →
  Budget & payment) and ends with a live plain-English "What suppliers will see" summary before
  submit; the "My requests" type column uses a real label lookup instead of `humanize()` on the
  UPPER_SNAKE enum (X3). `ProcurementDetail` (compare & award): the ranked list is now ONE
  responsive row per proposal (CSS Grid `md:` columns / stacked labelled rows below `md:` — no
  duplicated DOM, so there's never two controls with the same accessible name at any width),
  with an explicit "Advisory only" badge and unchanged award/confirm semantics; the incoterm
  free-text input became a `Select` of standard codes. `SupplyProgrammes` (seller programmes):
  reframed as a commercial programme (cadence/volume/term sections); a new lazy "View programme
  terms" disclosure calls `GET /supply/programmes/:id` (already existed on the backend, never
  called from the frontend) for cadence/volume/price/lead-time, and a perishable summary calls
  `GET /supply/perishable/:subjectType/:subjectId` (same situation) for a plain-English
  shelf-life/cold-chain readout once metadata is saved. `SupplyMatch` (buyer search) gained a
  proper quantity+unit input (`quantityUnitCode` was already accepted by
  `recommendSupplySchema` but not sent). `/wanted` now presents buyer and supplier sides as two
  explicit cards and adds `/sell/supply` to its entry links. Fixed a real, latent bug hit by
  every date field this phase touched: `<input type="date">` sends `"YYYY-MM-DD"`, but every
  relevant backend field is Zod `.datetime()` (requires a `T`/`Z`-qualified timestamp) — added
  `toApiDateTime()` and used it wherever this pack sends a date. Added `friendlyMessage()`
  (`evo-api-error.ts`) so a bare `METHOD /path -> status` never reaches these forms (X7); operator
  `friendlyError()` untouched. Gates: typecheck, eslint, prettier all clean; vitest 28/28 files,
  89/89 tests (existing `ProcurementDetail.test`/`SupplyProgrammes.test` unmodified in their
  assertions — only extended `SupplyProgrammes.test`'s `vi.mock` factory with the two newly-wired
  read calls); `next build` succeeds. Full findings: `SINGHA_CX_DECISIONS.md` D-CX-2.

- **CX7 (Command Centre + Singha ID passport)** — `account/activity`/`ExchangeActivity`
  recomposed into an attention-led Command Centre: a "Needs your attention" triage (outbid,
  payment due, ready for pickup, closing within 48h, counter-offers to respond to, verification
  action needed/expiring) derived only from typed fields already on `EvoDashboard` (`/dashboard`,
  E11) and, where available, the richer per-lot buyer command-centre projection (`fetchDashboard`
  — the same read model `app/dashboard/page.tsx` already uses) — no new backend calls, no
  invented data. Activity below it is grouped into five lanes — Buying · Selling · Wanted ·
  Logistics · Documents — each rendered only when its data source can populate it (Logistics only
  appears once the buyer projection resolves), each with an `EmptyState` instead of a raw error;
  Buying additionally shows a five-stage auction stepper (Bidding → Won → Payment → Collection →
  Complete) built from the buyer projection's real group keys (grounded in the same
  WATCHING/WINNING/OUTBID/WON/PAYMENT_DUE vocabulary `app/dashboard/page.tsx` already relies on).
  `SinghaIdProfile`/`account/singha-id` reframed as a transaction passport: Identity / Company /
  Seller readiness / Bidder & buyer readiness / Trade capabilities & licences, each capability row
  showing one of four customer-safe states (Verified / Under review / Action needed / Not started
  — new shared `capability-state.tsx`) with a plain next step and a per-row request action, never
  a raw capability enum code or backend status string. Shared
  `components/evolution/capability-state.tsx` (passport-state mapping + friendly capability
  labels) is consumed by both surfaces so a grant reads identically everywhere; `evo-api-error`'s
  `friendlyMessage` applied to every error surface touched. No backend change, no new deps, no
  CSS Modules. Gates: typecheck,
  eslint, prettier all clean; vitest 29/29 files, 105/105 tests (16 new: 2 focused "Needs your
  attention" tests + 14 `capability-state` unit tests; two pre-existing assertions intentionally
  updated to the new friendly/renamed UI text, no other assertions touched);
  `check-routes`/`check-contracts`/`next build` all green. Full findings: `SINGHA_CX_DECISIONS.md`
  D-CX-4.

## Next (phase backlog)
- **CX2 (cont.)** — authenticated "Needs your attention" block on the homepage.
- **CX4** — Listing detail as a transaction workspace (sticky rail desktop / dock mobile).
- **CX5 (cont.)** — offer form plain-English summary + negotiation-timeline polish.
- **CX8** — Logistics woven into the transaction journey.
- **CX9** — Sri Lanka/local-market natural language (no "Satellite Node" vocabulary).
- **CX10** — visual hierarchy/motion refinement (fewer cards/borders, larger media).
- **CX11** — microcopy + friendly error mapper + a11y (no raw IDs/enums/errors).
- **CX12** — anti-clone / IP boundary review → `SINGHA_CX_IP_BOUNDARY_REVIEW.md`.
- **CX13** — full visual QA at 360/390/430/768/1024/1440/1920 + performance.
- **CX14** — controlled-preview handoff (env names, flag values, seed/deploy/smoke steps).

## Gates status
Every increment ships only after: typecheck · vitest (105 passing) · `next build` · eslint ·
prettier. Backend authority, immutable ledgers, sealed privacy, MFA/RBAC untouched.
