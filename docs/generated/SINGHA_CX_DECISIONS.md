# Singha CX Overhaul — Decisions Log

Meaningful, reversible-internal decisions taken autonomously during the Customer Experience
Overhaul and the Living Background work. Newest first.

## D-CX-5 · CX4 + CX8 lot detail workspace + logistics: why `collectionSummary`/`inspectionSummary` were typed but `quantity` and seller/verification were not, and what stayed copy-only in Logistics

**`LotDetail` needed a real, checkable answer for "does this field actually exist on the wire,"
not a guess from a comment — `contracts/public-api.contract.json` gave one.** The task's own
constraint named the exact risk: verify in `api.ts`, and if `collectionSummary`/`quantity`
aren't on `LotDetail`, skip rather than fabricate. Neither was declared on `LotDetail` — but
`api.ts`'s existing comment on `CatalogueCardV2.collectionSummary` (added in CX3, D-CX-1) already
claimed the single-lot detail endpoint returns it today. Rather than trust or dismiss that
claim, it was checked against the one artifact in this repo built for exactly this question:
`contracts/public-api.contract.json`, generated verbatim from a real
`GET /api/v2/catalogue/:id` response (`scripts/emit-contract.mjs`, "shared with the frontend to
prevent silent DTO drift"). Its entry for that endpoint lists `collectionSummary` AND
`inspectionSummary` as real top-level keys — confirming both, not just the one D-CX-1 already
flagged. The same entry has no `quantity`/`quantityUnitCode` key anywhere, confirming the
opposite for those two (matching D-CX-1's separate note that quantity fields exist only on the
`Asset` data model, unprojected by any endpoint). Net effect: `collectionSummary` and
`inspectionSummary` were added to `LotDetail` as optional/nullable fields — completing a type
gap against already-real backend behaviour, not inventing a shape — while `quantity`/
`quantityUnitCode` were left off and skipped on the lot page entirely, exactly as the
instruction anticipated. `seller`/verification has no key of any kind on that same contract
entry, so it is a confirmed, reported gap, not a rendering choice.

**The same contract entry also reveals `LotDetail` has drifted further than this phase's scope
covers — noted, not fixed.** The contract's `GET /api/v2/catalogue/:id` shape carries `commercial`
(a nested `{currency, currentBidMinor, ...}` object, mirroring `CatalogueCardV2.commercial`) and
has no top-level `currency`/`currentBidMinor` keys at all — yet `LotDetail extends CatalogueLot`,
which types exactly those two as flat top-level fields, and the whole page (price header, sticky
dock, `SalePanel`/`BidPanel` props) reads them that way. If the live v2 endpoint really has no
flat `currency`/`currentBidMinor`, those reads are already silently `undefined` today, pre-dating
this phase (the safe failure mode: `formatMoney(undefined, undefined)` renders "LKR —", not a
crash). Restructuring `LotDetail` around the nested `commercial` shape would touch how every
sale-method panel reads its binding price — a materially larger, riskier change than "add two
optional display strings," explicitly against this task's "keep binding semantics untouched" /
"do not touch the backend" constraints, and not something to fix opportunistically mid-CX4/CX8.
Left as a reported finding for a dedicated follow-up, not silently patched.

**`check-contracts.mjs` was deliberately NOT extended to cover `GET /api/v2/catalogue/:id`.**
Adding that endpoint to the script's `MAP` would immediately fail on the pre-existing gaps above
(`commercial`, `event`, `featured`, `watchers` — none of which this phase needed or added) — a
new, permanently-red CI gate is worse than no gate. The two fields this phase actually added
(`collectionSummary`, `inspectionSummary`) are exactly the two the live contract confirms;
wiring the full endpoint into drift-checking is future work once the `commercial`-shape question
above is resolved, not a byproduct of a display-only lot-page pass.

**`SalePanel`/`BidPanel` price displays now route through the shared `Price` component —
display-only, not a binding-logic change.** CX4 asks for "transaction currency (+ indicative
display currency via the existing Price/FX component if present)." `Price` already exists
(E5, used by `LogisticsCentre`) and already self-gates on `fxDisplay` + a chosen display
currency, rendering identically to a bare `formatMoney()` call when either is unset — so
swapping `PriceHeader`'s and `BidPanel`'s amount line to `<Price>` is a formatting swap, not a
new dependency or a new gate. Neither panel's submit handlers, validation, confirmation copy or
API calls changed; `SalePanel`'s `null`-price "On request" copy was deliberately preserved
(kept out of `Price`, which would otherwise render a bare "—") rather than let a component swap
silently change established customer-facing wording.

**The "Get a delivery estimate" entry point is a plain link, gated on `logistics`, separate from
the ungated pickup line.** Neither `/services/logistics` nor `LogisticsCentre` reads any query
parameter today (verified by reading both files, not assumed) — the task's own instruction was
to prefer a plain link over a query-param contract that doesn't exist, so no `?origin=`/
`?destination=` was added. The link itself is gated on the `logistics` flag (mirroring
`EvolutionEntryLinks`' established "graceful hide" pattern for entry points into a flag-gated
surface) so it never invites a visitor to a destination `EvoGate` would immediately turn away.
The pickup line above it (`collectionSummary`/location) is NOT gated — it is plain listing data,
unrelated to the E7 Logistics capability, so gating it on the same flag would hide real listing
facts behind an unrelated toggle.

**`LogisticsCentre`'s microcopy polish stayed inside the "no invented meanings" boundary.**
CX8 asks for "Incoterms explained in plain words." The page's own descriptive copy (what an
Incoterm fixes, "reference only") and the API's own `Incoterm.description` field were left
untouched — nothing there was rewritten. The one addition (`incotermName()`, code → standard ICC
name, e.g. "FOB" → "Free On Board") reuses a static lookup this exact codebase already ships and
already trusts for the same purpose in `CommercialOfferForm`/`ProcurementHub`/`lib/format.ts` —
expanding a standard abbreviation to its official name is not a legal interpretation, so it does
not trip CLAUDE.md's "legal/compliance wording" escalation trigger; inventing NEW prose about
what a term means commercially (who bears risk, who pays freight) would, and was not done.
Freight `mode` (`SEA_FCL` → "Sea freight — FCL (full container)") reuses the Quote form's own
`MODES` labels already in the same file — fixing the exact X3 finding audit called out on this
page, with data already present, not new copy. The Track tab's "my shipments list" gap
(audit P2, explicitly mapped to CX8) was NOT built: the only fix available without a new backend
endpoint is making the handoff moment clearer, so the booking-confirmation screen now tells the
buyer in plain words to keep the tracking reference — a real mitigation of the documented gap,
not a claim of having solved it.

## D-CX-4 · CX7 Command Centre + Singha ID passport: combining two read-models, an honest passport-state vocabulary, and what stayed out of scope

**The Command Centre's "Needs your attention" needed two data sources, not one — the aggregate
alone cannot express deadlines.** `EvoDashboard` (`GET /dashboard`, E11, the pre-existing
`ExchangeActivity` data source) is COUNTS ONLY — `{total, byStatus}` per section, no dates, no
per-lot detail. "Payment required", "closing soon" and "shipment/collection" (three of the pack's
own example attention items) are structurally impossible to derive from that shape alone. The
buyer command-centre projection (`fetchDashboard`/`DashboardProjection`, `lib/api.ts` — the same
read model `app/dashboard/page.tsx` already renders as its top strip + Rubik bands) has exactly
the missing typed fields: `strip.outbid`/`paymentDueMinor`/`readyForPickup` and per-lot `endsAt`.
CX7's brief explicitly pointed at reading `dashboard/page.tsx` + `streamDashboard` "to understand
what read-model fields exist before designing" — read as an instruction to consume that
projection here, not merely to study it. `fetchDashboard` already resolves `null` (never throws)
when the projection isn't shipped, so it was added as a second, purely additive `Promise.all`
member; the aggregate remains the one call whose failure still surfaces the page-level error
state, unchanged from before. The SSE half (`streamDashboard`) was deliberately NOT wired in here
— realtime per-lot deep-dive is `/dashboard`'s own job; duplicating it would risk two surfaces
drifting out of sync for no requirement this pack states. `fetchCapabilities` was added as a
third, best-effort (`.catch(() => [])`) source so "verification needed" can name the actual
capability instead of only a count — reusing the exact call `SinghaIdProfile` already made.

**Auction "stage" is read off real group membership, never guessed from a status string.** The
five-stage stepper (Bidding → Won → Payment → Collection → Complete) needed an authoritative
notion of "which stage is this lot at" per buyer-projection group. Rather than pattern-match an
unenumerated per-lot `status` string (real risk of inventing meaning the API never asserted),
`auctionStage()` classifies the GROUP's own `key`/label against the vocabulary
`app/dashboard/page.tsx` already treats as real and shipped (`GROUP_TONE`'s
WINNING/WON/OUTBID/LOST/PAYMENT_DUE, `deriveProjection`'s WATCHING/EOI_SUBMITTED/OFFERS_ACTIVE) —
an item's stage is simply the group it already sits in, which the backend (or the existing
fallback) put it in. An unrecognised key returns `null` and renders as a plain chip instead of
being force-fit onto a stage; a "closing soon" attention count is likewise computed purely from
each lot's own `endsAt` being a real future timestamp inside 48h (mirroring the catalogue's
existing `endingSoon` window) — self-limiting, since an ended/won lot's `endsAt` is already in
the past and drops out on its own, with no group-key guesswork required for that count.

**"Wanted" became its own lane, pulling `procurementRequests`/`procurementResponses` out of
Buying/Selling.** The pack's five named lanes (Buying · Selling · Wanted · Logistics · Documents)
don't map 1:1 onto `EvoDashboard`'s two top-level keys (`buying`/`selling`); Wanted/RFQ is already
a first-class, separate top-level concept in this product's own IA (the mobile dock reads Explore
| **Wanted** | Sell | Activity | Account; `/wanted` already presents buyer-demand and
supplier-response as two explicit cards — CX6). Splitting the request/response pair out of
Buying/Selling into their own Wanted lane matches how the rest of the app already talks about
this flow, rather than inventing a new grouping.

**Logistics is the one lane gated strictly on the optional projection — the aggregate has no
shipment field at all.** Buying/Selling/Wanted/Documents can always render (worst case, an
`EmptyState`) because they lean on `EvoDashboard`, which is required for the page to reach its
success state in the first place. Logistics has no aggregate fallback whatsoever — its only
possible data point is `buyer.strip.readyForPickup` — so it is the one lane that disappears
entirely (not just empty-states) when `fetchDashboard` resolves `null`, taking "only render a
lane if the API can populate it" at its most literal for the one lane where that's the honest
answer.

**Identity/Company use "Complete"/"Not started", not the passport's "Verified" vocabulary — no
one verifies a self-declared country or company-roles field.** The brief's four states
(Verified / Under review / Action needed / Not started) map cleanly onto `CapabilityGrant.status`
— a real, backend-tracked review state — for the three capability sections (Seller readiness /
Bidder & buyer readiness / Trade capabilities & licences). Identity (country/language/timezone/
currency) and Company (`companyRoles`) are plain preference fields nobody reviews; labelling a
filled-in country field "Verified" would be a false claim no operator ever made. Both instead get
an honest completeness chip (`Complete` vs `Add your details`/`Not started`) in the same visual
language, keeping the passport framing without fabricating a verification that didn't happen.

**`passportState()` defaults an unrecognised status to "Under review", and demotes an expired
"verified" grant to "Action needed" using the same `expiresAt` already shown today.** Only
`verified` maps to Verified and only a short, deliberate list
(rejected/declined/expired/revoked/lapsed/cancelled) maps to Action needed; every other token —
including any future backend status this pack hasn't seen — lands on "Under review" rather than
being silently promoted to Verified (would overclaim a capability) or alarmingly flagged Action
needed (would falsely tell a customer something is wrong). A `verified` grant whose `expiresAt`
has already passed is reclassified to Action needed — not a new field, just honestly reading the
one `expiresAt` `SinghaIdProfile` already displayed as "Expires …" before this phase.

**Two existing test assertions were intentionally changed, both because CX7 intentionally changed
the UI text they were asserting on — no other assertion in either file was touched.**
`SinghaIdProfile.test`'s `getByText('verified')` (the raw lowercase `StatusChip` status word) is
now `getByText('Verified')` (the friendly passport-state label) — asserting on the raw status
verbatim would contradict this very phase's "map any enum/status to friendly labels" instruction.
`ExchangeActivity.test`'s `getByText('Verification')` heading is now `getByText('Documents')` —
the pack names "Documents" as one of the five required lanes, replacing the old "Verification"
section outright. Every numeric assertion in both files (5/3/2/4/6/7, the profile/timezone/
company-roles field values, the capability-request interaction) is byte-for-byte unchanged. Two
new focused test files were added rather than folded into existing ones:
`ExchangeActivity.test.tsx` gained two `it()`s (the empty "all caught up" state, and a populated
"Needs your attention" derived from all three read-models together, scoped with `within()` to the
attention `<section>` so it can't collide with an identically-worded lane heading elsewhere on
the page); `capability-state.test.ts` is a new pure-unit-test file (14 tests) for the shared
mapping, matching this repo's existing convention of unit-testing pure `lib`-style modules
(`flags.test.ts`, `passport.test.ts`).

**Known gap, not built: a buyer can't actually action a "counter-offer to respond to" from
`/account/commercial-offers` today — only Withdraw exists there.** `acceptCommercialOffer` /
`rejectCommercialOffer` / `counterCommercialOffer` are real, existing exports, but every current
call site is the SELLER console (`SellerOffersConsole.tsx`); `MyCommercialOffers.tsx` (the
buyer's own offers list, CX7's attention link target) only wires `withdrawCommercialOffer`. This
is not a missing backend field — the API shapes exist — it's a buyer-facing accept/counter UI
that was never built on that page, and building it is a `MyCommercialOffers` enhancement in its
own right, not part of recomposing `account/activity`/`SinghaIdProfile` (this phase's named
files). Left as a real, reported gap rather than silently building a same-page workaround that
would duplicate what belongs on the offers console.

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
