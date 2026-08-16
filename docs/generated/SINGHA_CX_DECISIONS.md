# Singha CX Overhaul — Decisions Log

Meaningful, reversible-internal decisions taken autonomously during the Customer Experience
Overhaul and the Living Background work. Newest first.

## D-CX-2 · CX6 Wanted/RFQ + Supply: read-model ceilings, two newly-wired existing endpoints, and a cross-cutting date-format fix

**The buyer's comparison view can only show price, incoterm and rank — verified against
`Auctions-Backend` source, not assumed.** `GET /procurement/requests/:id/proposals`
(`procurement.service.ts#proposalsForRequest`) constructs its `ranked` array as exactly
`{rank, proposalId, supplierCustomerId, totalPriceMinor, currency, incoterm}`. A supplier's
quantity, delivery date, payment terms, validity and notes are all accepted by
`offerProposalSchema` and stored on `ProcurementProposal`, but none are projected back by this
read endpoint, and there is no per-request `GET` at all (only `/mine`, projected to
`{id, type, status, title}`) — so `ProcurementDetail` cannot redisplay the buyer's own original
quantity/spec/destination/timing/payment-terms either, only the title. Given "DO NOT touch the
backend repo," the fix was to (a) build the richest possible comparison from what IS returned —
one responsive row per proposal (price, incoterm, rank, advisory framing), not a padded table
implying more was compared, and (b) NOT add write-only fields (delivery date / payment terms /
validity) to the supplier's proposal form: the existing "Notes" free-text field already exists
for exactly this ("Lead time, packing, validity…"), and adding three more structured fields the
buyer's screen can never show would be pure gold-plating with zero visible payoff. Documented so
a future backend change to enrich this read model has a ready-made frontend consumer.

**Two supply endpoints already existed on the backend and were never called by the frontend —
wiring them up is "consuming what exists," not inventing a shape.** `GET /supply/programmes/:id`
(`supply.service.ts#getProgramme`) returns `originCountry`/quantities/`indicativePriceMinor`/
`frequency`/`leadTimeDays` — richer than the `/mine` list summary — and
`GET /supply/perishable/:subjectType/:subjectId` (`getPerishable`) returns the derived
`{variety, grade, coldChain, expiresAt, expired}` summary. Neither had a frontend function in
`evolution-api.ts`. Added `fetchSupplyProgramme` / `fetchPerishable` (additive exports, real
verified response shapes) and a lazy "View programme terms" disclosure on each programme card
(`SupplyProgrammes.tsx`) that calls both only when the seller opens it — this is what makes
"cadence, volume" concretely visible per programme (CX6's ask) without an N+1 fetch on page load
and without risking the existing `SupplyProgrammes.test` (which never opens the panel, so its
`vi.mock` factory needed the two new exports added for import-shape completeness but never
needed new assertions). The programme's own `validFrom`/`validUntil` ("term") is still not
returned by any read endpoint — set at creation, not redisplayed; noted in-product rather than
silently omitted.

**Cross-cutting fix: `<input type="date">` values ("YYYY-MM-DD") were being sent verbatim into
backend fields typed `z.string().datetime()`.** Zod's `.datetime()` with no options requires a
full RFC3339 UTC timestamp and rejects a bare date — confirmed against
`packages/contracts/src/procurement-domains.ts` / `supply-domains.ts` (`deliveryBy`,
`submissionCloseAt`, `validFrom`, `validUntil`, every perishable date). Every date field this
phase touches now goes through a new `toApiDateTime()` (`lib/format.ts`,
`new Date(dateOnly).toISOString()`, undefined-safe). Pre-existing date fields in files outside
this phase's scope (`CommercialOfferForm.tsx`'s `deliveryDate`/`validUntil`) have the same latent
bug and were left alone — untouched files, not introduced by this task, and not touching them
avoids widening this change's blast radius; worth a follow-up sweep under CX11.

**Never expose the UPPER_SNAKE procurement `type` enum via the generic `humanize()` (X3).** Added
a small `PROCUREMENT_TYPE_LABELS` lookup (`lib/format.ts`) used everywhere `ProcurementHub`/
`ProcurementDetail` show a request's type, instead of widening `humanize()` itself — that
function is shared by many unrelated call sites across the app and correctly handling every
casing convention it meets (lower_snake / UPPER_SNAKE / camelCase) is explicitly CX11's scope,
not this phase's.

## D-CX-1 · CX3 Explore + universal card: label mapping, forward-compatible card fields, omitted filters
**Primary-action label per sale method (`SaleCard`).** The universal card needs exactly one
CTA whose label fits the method; the six words given (MAKE OFFER / BUY NOW / BID / VIEW /
REQUEST QUOTE / RESPOND) map 1:1 onto the five real `commercial.kind` values plus the
`unknown` fallback: `auction`→**Bid**, `buy_now`→**Buy now**, `make_offer`→**Make offer**,
`eoi`→**Request quote** (EOI often hides its price entirely — "Open" — so the natural ask is
for pricing/info), `sealed_tender`→**Respond** (avoids reusing "Bid" for a sealed submission),
`unknown`→**View**. Kept distinct from `LotStickyDock`'s existing lot-detail CTA map (Place
bid / Buy now / Make offer / Submit tender / Register interest / View lot) because that map
(a) has room for longer text on the sticky dock, and (b) still says "lot", which CX3 removes
from card copy — the two are allowed to diverge; both are internal, easily revisited copy.

**`quantity` / `quantityUnitCode` / `collectionSummary` added to `CatalogueCardV2` as
optional, forward-compatible fields — not sent by `/api/v2/catalogue` today.** The card
hierarchy (doc 04) requires a quantity+unit tier ("40 MT") and a subtle logistics/pickup
hint, but `CatalogueV2Service#toCardV2` (Auctions-Backend, read-only per repo topology) does
not project either onto the LIST card yet — only the single-lot detail endpoint returns
`collectionSummary`, and only `Asset.quantityAvailable`/`quantityUnitCode` exist on the data
model. Rather than block the card on a backend change this task cannot make (frontend-only,
`Auctions-Backend` is out of scope), the fields were added as `optional`/nullable on the
frontend type — a no-op today (backend omits them, so nothing renders) and correct the
moment a future additive backend change starts sending them. Field names mirror the backend
exactly (`quantityUnitCode`, `collectionSummary`) so no renaming is needed when that lands.

**Category/sale-method filter rows are horizontal-scroll rails (`overflow-x-auto
no-scrollbar`), not wrapping chip rows.** The CX0 audit (§3.2) flagged the old wrapping
layout as able to grow several rows deep before any results are visible. A rail keeps the
sticky bar's height bounded regardless of taxonomy size (genuinely "compact") and guarantees
the row can never cause horizontal PAGE overflow at 390px — it scrolls internally instead.
Mirrors the existing `no-scrollbar overflow-x-auto` pattern already used by
`FlowMatrixBand`'s rail and `@singha/ui`'s `DataTable`.

**Filters intentionally NOT added:** price range, display currency, quantity/unit range,
shipping/delivery and verification are not server-side params on `/api/v2/catalogue`
(`catalogueQuerySchema` in `@singha/contracts` has no such fields) — adding client-side
controls for them would require downloading and filtering the full result set in the
browser, which this catalogue never does. Left as a `// CX3: future backend filters` comment
in `CatalogueBrowser.tsx` instead of UI controls.

## D-LB-2 · Living Background is homepage-scoped and viewport-fixed via a page-level layer
The fixed cinematic scene is rendered from the homepage (`app/page.tsx`) as a
`position: fixed` layer, not injected globally into the root layout. Rationale: the pack is
about the home/landing hero specifically; scoping to the homepage keeps every other route
untouched and avoids a global stacking-context change. The hero stays transparent to reveal
the scene; post-hero sections ride an opaque `#070709` sheet so they cover it while
scrolling (the pack's intended "opaque sections cover the fixed scene"). The only shared
shell change is `Footer` gaining `relative z-[1]` so it paints above the fixed layer.

## D-LB-1 · One scoped CSS Module for the Living Background (exception to Tailwind-only)
The app styles with Tailwind + occasional inline styles and had no CSS Modules. The Living
Background introduces a single `living-background.module.css`. Rationale: it is a
self-contained compositing/animation system (~5 keyframe families, layered blends, a
`prefers-reduced-motion` block) that would be unreadable as Tailwind utilities and does not
belong in the shared `@singha/ui` design tokens. Next.js supports CSS Modules natively and
CSP-safely. This is an isolated, feature-local exception — the rest of the overhaul stays
Tailwind-first.

## D-CX-0 · Work continues on `main` for both repos
Consistent with the packs' "fetch latest origin/main / record SHAs / work on main" first
actions and the established session history. Baselines recorded at pack start: frontend
`MUA1234/Auctions-New` @ `1622a040`, backend `LakshanV/Auctions-Backend` @ `f2d364e`
(both confirmed as the current `origin/main` tips, nothing newer).

## D-CX-3 · Repo-root `typecheck` scoped to the active frontend (exclude the frozen backend copy)
The FE repo's repo-root `lint` and `typecheck` were failing on PRE-EXISTING issues unrelated to
this overhaul (introduced in the E1 rebrand `a2846ad`, long before it): `BrandLogo.tsx` carried
an `eslint-disable-next-line @next/next/no-img-element` for a rule the repo's flat ESLint config
never registers (so the directive itself errored), and the frozen `@singha/database` schema copy
referenced an undefined `ConfigVerification` enum while `@singha/domain` had further type errors.
`@singha/web` does NOT depend on `@singha/database`/`@singha/domain`/`apps/api`/`apps/worker` —
those are the frozen pre-split backend copy (CLAUDE.md: "never add features or fixes to them"),
whose canonical versions live in `Auctions-Backend`. The CI `test` and `build` steps already
filter to `--filter=@singha/web...`; `typecheck` was the one inconsistent step. Fix: (1) replace
the broken `eslint-disable` in the active `BrandLogo.tsx` with a plain note; (2) scope the
repo-root `typecheck` script to `--filter=@singha/web... --filter=@singha/auctionflow`, matching
`test`/`build`, so the deprecated copy is not gated. The frozen schema/domain code is left
untouched (not "fixed"), per the frozen-copy rule.
