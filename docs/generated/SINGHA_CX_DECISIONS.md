# Singha CX Overhaul — Decisions Log

Meaningful, reversible-internal decisions taken autonomously during the Customer Experience
Overhaul and the Living Background work. Newest first.

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
