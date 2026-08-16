# Singha CX Overhaul — Current-State UI/UX Audit

**Pack:** Singha Customer Experience Overhaul, doc 02 (CX0 deliverable — see `docs/generated/SINGHA_CX_STATE.md`)
**Scope:** `apps/web` (Next.js 14 App Router, Tailwind) only. No source was modified to produce this document.

## 1. What this is, and how it was produced

This is a code-level, file-and-line-grounded audit of the current Singha frontend, written to give
CX1–CX14 a factual starting point instead of assumptions. Every finding below cites a real file
(and usually a line range) in this repository; nothing here is inferred from screenshots or from
the product docs alone. Enum/contract "truth" (what a raw value actually looks like on the wire)
was cross-checked against `database/prisma/schema.prisma` and `packages/contracts/src`, not
guessed from frontend comments.

**Baselines.** The pack's baseline commits were frontend `1622a040` and backend `f2d364e`
(`docs/generated/SINGHA_CX_DECISIONS.md`, `SINGHA_CX_STATE.md`). The task brief for this audit
cites frontend `6a125b8` ("Singha Living Background") as "now." **During this audit, main moved
twice more** — `ea6832f` ("CX homepage recomposition") and `e507cbd` ("CX mobile bottom dock") —
committed by a concurrent CX1/CX2 implementation session running in parallel with this one (see
`SINGHA_CX_STATE.md`: CX0/this audit, CX1 and CX2 were dispatched together). **This document is
grounded against frontend `e507cbd`.** Backend `Auctions-Backend` is confirmed unchanged at
`f2d364e` (verified directly). Where a finding would have read differently at `6a125b8`, that is
called out inline — this happened for the homepage and the mobile shell, both mid-flight.

**Not in this pass:** per-width screenshot QA (360/390/430/768/1024/1440/1920) is a separate, later
phase (CX13) that will pixel-verify the app in a real browser. This document is a static-code
review — it identifies exact defects and risk areas (several flagged below are near-certain visual
bugs based on CSS/DOM math, e.g. §Cross-cutting X9) but does not substitute for that visual pass.

**Reading the tags:** every recommendation is tagged `[UX]` `[Visual]` `[Copy]` `[API/read-model]`
`[A11y]` `[Perf]` `[Security/Privacy]`. Multiple tags may apply.

---

## 2. Cross-cutting findings

These recur across many surfaces below; each surface section references them by ID instead of
re-explaining them.

| ID | Finding | Tags | Evidence |
|----|---------|------|----------|
| **X1** | **The whole overhaul is code-complete-ish but invisible by default.** Every Evolution flag (`neutralIaV1`, `commercialOffersV2`, `sealedOffers`, `logistics`, `procurement`, `supplyProgrammes`, `singhaId`, `dashboard`, `controlCentre`, …) and every V3 visual flag default to `false`. A production visitor with no cookie/query override sees the old nav (Catalogue · Events · Dashboard · Live · How it works), no Wanted, no Services, no Singha ID, no Command Centre, no Supply Programmes, no mobile bottom dock. The entire neutral-IA product this pack describes only exists behind `?evo=on` / `?v3=on` preview cookies or a backend flag flip. This *is* why the product "still reads as an auction catalogue with newer features bolted beside it" — the newer features are there, they're just switched off. | `[UX]` | `apps/web/src/lib/flags.ts:131-166` (`DEFAULT_FLAGS`, every Evolution/V3 key `false`); `apps/web/src/lib/use-flags.ts:14-51` (cookie/query override mechanism) |
| **X2** | **Three independently-maintained category taxonomies have already drifted from each other**, contradicting the explicit "single source of truth... so these never drift" comment on the shared taxonomy file. (1) `lib/categories.tsx` — 8 categories, richest labels ("Machinery & Equipment", "Stock & Bulk", "Business Assets", "Agriculture", "General Assets"). (2) `sell/new/page.tsx` `CATEGORY_FIELDS` — only 5 categories (vehicles/property/gems/machinery/general); **a seller literally cannot list a Business Asset, Bulk/Stock, or Agriculture item** even though buyers can filter and homepage tiles advertise all 8. (3) `flow/FlowCanvas.tsx` `LABELS` — a 6-category set with yet different wording ("Machinery" not "Machinery & Equipment"; "Bulk & Stock" — word order reversed from taxonomy #1's "Stock & Bulk"). | `[UX]` `[Copy]` | `apps/web/src/lib/categories.tsx:1-9,112-121`; `apps/web/src/app/sell/new/page.tsx:35-59`; `apps/web/src/components/flow/FlowCanvas.tsx:6-14` |
| **X3** | **`humanize()` only fixes lower_snake_case.** It uppercases the first character and turns `_`/`-` into spaces, but never lowercases the rest: fed a `lower_snake` value (most status enums — see `database/prisma/schema.prisma:25-36,73+`, all lowercase) it works perfectly ("manual_review" → "Manual review"). Fed an **UPPER_SNAKE** value (`SaleMethod` is UPPER_SNAKE per `schema.prisma:64-70`; so are the Evolution `type`/`mode` enums built the same way, e.g. `REQUEST_SUPPLY`, `SEA_FCL`) it stays shouting: `humanize('REQUEST_SUPPLY')` → **"REQUEST SUPPLY"**, not "Request supply". Fed **camelCase** (fee-breakdown keys) it doesn't insert spaces at all: `humanize('buyerPremium')` → **"BuyerPremium"**. The one utility built specifically to keep raw enums off the screen has a blind spot for exactly the casing convention the backend uses for sale methods. | `[Copy]` | `apps/web/src/lib/format.ts:86-90`; confirmed live at `ProcurementHub.tsx:162` (`humanize(r.type)` on `RFQ`/`REQUEST_SUPPLY`/`REVERSE_TENDER`), `LogisticsCentre.tsx:439` (`humanize(quote.mode)` on `SEA_FCL`/`SEA_LCL`), `ControlCentre.tsx:589` (`humanize(key.replace(/Minor$/i,''))` on camelCase fee keys) |
| **X4** | **Older (pre-Evolution) surfaces bypass `humanize()` entirely**, calling `.replace(/_/g, ' ')` directly with no case handling. This is visually masked when the text sits inside the shared `Chip` component (which forces `uppercase` via CSS regardless of input — `packages/ui/src/components/Chip.tsx:23`), but the *same* raw-replace calls also appear as **plain, unstyled text** in several places, where the masking doesn't apply. | `[Copy]` | Raw-replace-in-Chip (cosmetically OK): `SaleCard.tsx:26`, `CatalogueBrowser.tsx:477`, `dashboard/page.tsx:281`. Raw-replace-as-plain-text (not masked): `dashboard/page.tsx:288,310`, `sell/page.tsx:81`, `account/watchlist/page.tsx:77`, `admin/page.tsx:81` |
| **X5** | **Raw ID / no-title read-model gap on offer & procurement lists.** `OfferView` (the DTO for every commercial-offer screen) carries `listingId: string` and `customerId: string` but **no listing title, reference, or buyer/counterparty name of any kind.** Frontend consequences: `MyCommercialOffers.tsx` renders the bare UUID as the "Listing" link text (the exact issue flagged in pack doc 05); `SellerOffersConsole.tsx` shows sellers a ranked list of offers with **no buyer identity at all**, not even a masked reference — a seller accepts/counters/awards blind; the degraded fallback path of the legacy `/dashboard` synthesizes a fake-looking title by slicing the ID (`Listing a3f9e2`). | `[API/read-model]` `[UX]` | `apps/web/src/lib/evolution-api.ts:65-90` (`OfferView`/`SealedListingView` shape); `apps/web/src/components/evolution/MyCommercialOffers.tsx:62-71`; `apps/web/src/components/evolution/SellerOffersConsole.tsx:30-38,270-317` (no buyer column anywhere); `apps/web/src/app/dashboard/page.tsx:236-262` |
| **X6** | **`EOI` vs `EXPRESSION_OF_INTEREST` key mismatch — a live, functional bug, not just cosmetic.** The canonical wire value (confirmed via `database/prisma/schema.prisma:66` and echoed correctly in `sell/new/page.tsx:63` and `dashboard/page.tsx:243`) is `EXPRESSION_OF_INTEREST`. Several other files key their lookup tables on the string `'EOI'` instead, which **never matches**: <br>• `SalePanel.tsx:79-80` — `case 'EOI':` in the buyer action-panel switch is **dead code**. A real EOI listing falls through to `default:`, which renders a generic "This lot is available through the Singha exchange." message **with no way to register interest** — the whole `EoiPanel` (amount/message/conditions form) is unreachable for its own sale method. <br>• `LotStickyDock.tsx:5-19` — mobile sticky CTA shows generic "View lot"/"Price" instead of "Register interest"/"Guide" for EOI lots. <br>• `lot/[id]/page.tsx:14-20,32` — the Sale-method **Fact row renders the raw enum** `EXPRESSION OF INTEREST` in plain (unstyled) text because the label map misses. <br>• `ControlCentre.tsx:343-351` — the operator routing-preview dropdown sends `saleMethod=EOI`, which won't match any real listing either. <br>Also: `LIVE_HYBRID` is missing from the same `lot/[id]/page.tsx` and `LotStickyDock.tsx` maps, hitting the identical fallback for live/hybrid lots. | `[UX]` `[API/read-model]` | as cited above; enum truth at `database/prisma/schema.prisma:64-70` |
| **X7** | **Generic API-error fallback can surface a raw `METHOD /path -> status` string.** Every mutation helper (`apiPost`/`apiPatch`/`apiPut`/`apiDelete` in `lib/api.ts` and `lib/evolution-api.ts`) throws `Error(detail?.message ?? detail?.title ?? \`POST ${path} -> ${res.status}\`)`. Every catch block in the app follows `err instanceof Error ? err.message : fallback`. When the backend *does* return a JSON `message`/`title` (typical validation errors), the customer sees a legible sentence. When it doesn't (5xx from infra/a proxy, a timeout, a malformed response), the customer sees the literal method+path+status — e.g. `POST /commercial-offers -> 500`. This is the fallback-of-last-resort on essentially every form in the product (bidding, offers, EOI, tenders, procurement, supply, logistics, Singha ID). `evo-api-error.ts`'s `friendlyError()` softens only 403/404 and is used only by the two operator surfaces (`ControlCentre.tsx`, `NodeConsole.tsx`) — no customer-facing surface has an equivalent mapper yet. | `[Copy]` `[UX]` | `apps/web/src/lib/api.ts:32-46,91-105`; `apps/web/src/lib/evolution-api.ts:12-23`; `apps/web/src/components/evolution/evo-api-error.ts:1-21` |
| **X8** | **Two non-integrated "command centre" implementations, with no link between them.** `/dashboard` (old, in default `NAV_ITEMS`) is a real-time (SSE) Rubik/`CubeRow` board with an urgent-action strip (Active bids / Winning / Outbid / Payment due / Ready for pickup). `/account/activity` → `ExchangeActivity.tsx` (new, Evolution, behind the `dashboard` flag) is a simpler, better-cross-linked metric-card view with no realtime push and no urgent-action strip. `AccountNav.tsx` lists "Activity" but never "Dashboard"; the neutral top nav (`NEUTRAL_NAV_ITEMS`) lists neither. Once `neutralIaV1` is on, `/dashboard` becomes **orphaned** (no nav path finds it) while the surface that replaces it is materially less rich. | `[UX]` | `apps/web/src/app/dashboard/page.tsx:1-33`; `apps/web/src/components/evolution/ExchangeActivity.tsx:84-125`; `apps/web/src/components/AccountNav.tsx:11-22`; `apps/web/src/lib/nav.ts:19-25` |
| **X9** | **New: the mobile bottom dock and the lot-detail sticky action dock will collide.** `MobileBottomDock.tsx` (shipped `e507cbd`, mid-audit) and `LotStickyDock.tsx` (pre-existing) are **both** `position: fixed; inset-x-0; bottom-0; z-40`, both active below their respective breakpoints (`md:hidden` / `lg:hidden` — both true under ~430–767px). `MobileBottomDock` is unconditional on `neutralIaV1`; `LotStickyDock` is unconditional (no flag at all) on every `/lot/[id]` page. The dock's own CSS fix only reserves `padding-bottom` on `<body>` (`globals.css` new block, `@media (max-width:767px) { html.has-mobile-dock body { padding-bottom: ... } }`) — that pads normal-flow content, it does **not** reposition another `position:fixed` element. On a phone viewing a lot page with `neutralIaV1` on, the two bars will paint on top of each other at the exact same rectangle, one likely obscuring the other's primary CTA (Place bid / Buy now / Register interest). This is a near-certain visual bug from CSS box-model alone, not a guess — recommend it be the very first thing checked in the CX13 screenshot pass at 390/430 on `/lot/[id]?evo=on`. | `[UX]` `[Visual]` | `apps/web/src/components/MobileBottomDock.tsx:74-79`; `apps/web/src/components/LotStickyDock.tsx:41-45`; `packages/ui/src/styles/globals.css` (dock CSS added in commit `e507cbd`) |
| **X10** | **Internal/process copy leaks into rendered customer text**, all confined to the seller Listing Studio wizard: a literal `"(mock)"` state label, three "endpoint unavailable" / "storage not reachable from this session" infra phrases on the **success** screen, and — most strikingly — a rendered `<p>` that cites **"(pack doc 28)"** directly to the seller, a document number that doesn't even exist in this repo's `/docs` (numbered only to 23). | `[Copy]` | `apps/web/src/app/sell/new/page.tsx:348,357,387,392,394,400,434,628,707,763,906,964` |

---

## 3. Per-surface findings

### 3.1 Homepage
**Files:** `apps/web/src/app/page.tsx`; `components/HeroShowcase.tsx`, `FeaturedSection.tsx`, `CategoryCards.tsx`, `living-background/SinghaLivingBackground.tsx`; **new this audit:** `components/home/HomeSearchIntent.tsx`, `HomeWaysToTransact.tsx`, `HomeWanted.tsx`.
**User intent:** "What is this, is it credible, and where do I go?" **Primary action:** explore a featured item or the categories. **Next action:** sign in / browse catalogue / start selling.

The homepage was mid-recomposition during this audit (commit `ea6832f`, CX2 "first pass" per `SINGHA_CX_STATE.md`). As of `e507cbd` it is hero → **HomeSearchIntent** (search bar + "I want to: Sell / Post what I need / View opportunities", `neutralIaV1`-gated) → featured items → **static** featured-event card → categories → **HomeWaysToTransact** + **HomeWanted** (both `neutralIaV1`-gated) → Market Pulse → trust → Sell CTA. Structurally this already matches CLAUDE.md rule 13 (editorial, lightweight, no full catalogue) — good.

| Tag | Finding |
|---|---|
| `[UX]` | The "Featured event" card (`page.tsx:204-223`) is **100% hardcoded** — "Featured live auction" / generic blurb / a `/live` link that isn't tied to any actual live/upcoming event. The page never fetches `/events`. If nothing is live, a visitor is still invited to "Enter live room." |
| `[UX]` | Even after the CX2 pass, the homepage has **no link to `/services`** anywhere (search intents = Sell/Wanted/Exchange only; `HomeWaysToTransact` links go to catalogue/exchange/live/wanted). Services is the one neutral-nav pillar with zero homepage entry point. |
| `[Copy]` | Trust section text is auction-specific even though the rest of the recomposition is explicitly de-centering auction: "**The auction engine** is the single source of truth" (`page.tsx:52`, unchanged since before CX2). |
| `[Visual]` | Ten full-bleed sections are stacked in a row, each internally restrained, but with near-identical rhythm (`py-20` container blocks back to back) — the page reads as a long homogeneous scroll rather than a directed narrative once you're past the hero. Worth a visual-hierarchy pass (CX10) rather than more sections. |
| `[UX]` | `HomeSearchIntent`, `HomeWaysToTransact`, `HomeWanted` are all gated on `neutralIaV1` (default off — see X1); production visitors today see none of this. |
| `[Perf]` | `SinghaLivingBackground` (gated `v3VisualArchitecture`, default off) is a Canvas-based animated hero; not evaluated for cost here since it's off by default — worth a perf pass only once it's promoted toward production (see `docs/generated/SINGHA_LIVING_BACKGROUND_REPORT.md` for prior work). |
| — | **Preserve:** the hero → featured → event → categories → pulse → trust → sell structure matches the "editorial, lightweight, no catalogue dump" mandate exactly. `HomeWaysToTransact`'s copy ("Auction is one method, not the whole story") is a strong, correctly-targeted rewrite of the product's self-description — keep this voice and extend it past the preview flag. |

### 3.2 Explore / Catalogue
**Files:** `app/catalogue/page.tsx`, `components/CatalogueBrowser.tsx`, `components/SaleCard.tsx`.
**User intent:** browse/filter everything for sale. **Primary action:** open a lot. **Next action:** filter by category/method, switch view (Flow/Grid/List), search.

`catalogue/page.tsx` was also touched by CX2: the H1 now reads "Explore" (was "Catalogue"), and `?q=` is wired through to `CatalogueBrowser`'s `initialSearch`. The eyebrow above it still reads "The exchange," which sits oddly next to the fact there is a *separate*, differently-purposed `/exchange` route — two different pages both claim the "exchange" label at the top of the page.

| Tag | Finding |
|---|---|
| `[Copy]` | Category filter chips render the **raw facet slug**, not the curated label: `CatalogueBrowser.tsx:145-146` outputs `{f.value}` ("business", "bulk", "general") while the *same* taxonomy file's `categoryMeta(f.value).label` ("Business Assets", "Stock & Bulk", "General Assets") sits one property away, unused. `CategoryCards.tsx` (homepage tiles) uses `.label` correctly — the two surfaces the taxonomy file's own comment says "never drift" already have drifted (see X2). |
| `[UX]` `[Perf]` | Up to 16 filter pills (8 categories + All, 6+ sale methods + All) can be on screen with no horizontal-scroll container — on narrow viewports this wraps several rows deep before any results are visible. Candidate for CX3's "sticky/compact filters." |
| `[A11y]` | The "Category" / "Sale method" section labels use `hidden ... sm:inline` (`CatalogueBrowser.tsx:520`) — `hidden` is `display:none`, so these grouping labels are removed from the accessibility tree on mobile too, not just visually hidden. A screen-reader user on a phone gets an unlabeled run of buttons. |
| `[UX]` | Two different pagination models coexist in one control: Flow bands cursor-paginate per-category (infinite, via `onNearEnd`); Grid/List use a classic Prev/Next pager (`Pager`, `CatalogueBrowser.tsx:484-515`). Switching views changes how "more" works. |
| `[Copy]` | Search placeholder "Search lots…" and the results count "`N lots`" use auction/estate-sale vocabulary pervasively (also true of `/lot/[id]`, dashboard groups, etc.) — a structural naming choice (the atomic unit is called "lot" everywhere, `/lot/[id]` route included) rather than a single bug; worth a deliberate decision either way rather than default inertia, since Buy-Now/Wanted items are not, functionally, auction "lots." |
| — | **Preserve — this is one of the stronger surfaces in the app.** Loading (6 skeleton cards), error (dedicated "Couldn't reach the catalogue" + Retry), and empty ("No lots match your filters" + hint to clear) states are all explicitly designed, not accidental (`CatalogueBrowser.tsx:214-243`). The Flow-row contract is unusually careful: a failed background load keeps existing items and shows an inline row-level retry rather than ever blanking the row (`CatalogueBrowser.tsx:319-329`, "blank-screen contract"). |

### 3.3 Category discovery
**Files:** `components/CategoryCards.tsx` (homepage tiles), `lib/categories.tsx` (taxonomy), `components/flow/FlowCanvas.tsx`, `FlowMatrixBand.tsx`, `CategoryOverlay.tsx` (V3 Flow canvas, behind `flowMatrixV3`).
**User intent:** "show me what kinds of things exist here." **Primary action:** pick a category. **Next action:** land pre-filtered in Explore.

| Tag | Finding |
|---|---|
| `[Copy]` `[UX]` | This is where X2 (three taxonomies) is most visible end-to-end: a shopper who taps "Machinery & Equipment" on the homepage (`CategoryCards`, correct label) lands in Explore where the *same* category now reads as bare "machinery" in the filter rail, and — if `flowMatrixV3` is on — the big in-band watermark name (`CategoryOverlay.tsx`) reads "Machinery" (a third wording), sourced from yet a third hand-maintained map (`FlowCanvas.tsx:6-14`). |
| `[Visual]` | `CategoryOverlay`'s big gold watermark text is a nice, restrained "premium" touch (large media, minimal chrome) genuinely in the spirit of the pack's visual goals — but it currently only fires under `flowMatrixV3` (default off) and only for the 6 categories present in `FlowCanvas.tsx`'s local list, so 2 of 8 real categories (business, agriculture) would show no watermark at all if reached via a direct category-filtered URL. |
| — | **Preserve:** `CategoryOverlay` is careful about not being a barrier — `pointer-events-none`, `aria-hidden`, and each band keeps a real semantic heading for assistive tech (`CategoryOverlay.tsx:9-10`); it also respects `motion-reduce`. This is a good pattern to keep and extend once the taxonomy is unified. |

### 3.4 Listing detail (`/lot/[id]`)
**Files:** `app/lot/[id]/page.tsx`, `components/LotGallery.tsx`, `LotStickyDock.tsx`, `SalePanel.tsx`, `BidPanel.tsx`, `BidBattle.tsx`, `WatchButton.tsx`.
**User intent:** decide whether to act on this specific item. **Primary action:** bid / buy / offer / tender / register interest. **Next action:** watch it, or go back to Explore.

| Tag | Finding |
|---|---|
| `[API/read-model]` `[UX]` | **The EOI sale method is functionally broken on this page and its own mobile CTA** — see X6. This is the single highest-severity finding in this audit: it is not a copy nit, it removes the ability to interact with a whole sale method. |
| `[Copy]` | `BidPanel.tsx:118-121`: when an auction isn't open, the fallback line is `` `Status: ${state.status}` `` — a raw backend status word in a customer sentence ("Status: settled"), never run through a humanizer or a written explanation of what it means for the buyer. |
| `[Copy]` | Specification rows split camelCase attribute keys with a regex (`k.replace(/([A-Z])/g, ' $1')`, `lot/[id]/page.tsx:85`) rather than a labeled schema — reasonable as a fallback, but means any attribute name from `sell/new`'s dynamic category fields (e.g. `mileageKm`) renders as "mileage Km" (extra capital, awkward spacing) rather than "Mileage (km)". |
| `[UX]` | Good shipping/pickup clarity where it exists: inspection/collection summaries are free-text strings assembled at listing-creation time (`sell/new/page.tsx:318-333`) and shown verbatim — clear to read, but not structured data, so nothing on this page can filter/sort/badge by "delivery available" the way `location.city` can. |
| — | **Preserve:** the "Key facts" `dl` (Reference/Category/Location/Sale method, `lot/[id]/page.tsx:60-65`) guarantees the page never reads as empty, and the "Server-authoritative" trust card next to the action panel (`:115-126`) is a good, concrete instance of rule 2 made visible to the customer rather than just enforced invisibly. The mobile sticky dock concept (`LotStickyDock`) is the right pattern for keeping price + primary CTA in reach — it just needs to not collide with the new global dock (X9) and to know about `EXPRESSION_OF_INTEREST`/`LIVE_HYBRID` (X6). |

### 3.5 Exchange
**Files:** `app/exchange/page.tsx`, `app/exchange/offer/[listingId]/page.tsx`, `components/evolution/EvolutionEntryLinks.tsx`.
**User intent:** understand the ways to transact on Singha. **Primary action:** pick a method and go explore/sell. **Next action:** post an RFQ, find supply, get a logistics quote (all flag-gated).

| Tag | Finding |
|---|---|
| `[UX]` | Good, deliberate framing already: "Auction" is explicitly one of six method cards, not the identity of the page (`exchange/page.tsx:18-50`) — this is exactly the sale-method-neutral tone the pack wants and should be the template for `/wanted` and `/services` (which already follow it) and any future editorial page. |
| `[UX]` | No cross-links from the method cards into a pre-filtered catalogue — "Timed & live auctions" doesn't link to `/catalogue?method=TIMED_AUCTION`, it's purely descriptive; the two buttons at the top go to unfiltered `/catalogue` and `/sell`. A missed, cheap win. |
| `[UX]` | `EvolutionEntryLinks` intro copy says "**These commercial surfaces are live for your account**" (`exchange/page.tsx:93`) unconditionally, even though every single link under it is individually flag-gated and, by default, none render — the intro sentence asserts something that's only true once at least one Evolution flag is on. |
| — | **Preserve:** `EvolutionEntryLinks` degrades cleanly — when zero of its links' flags are on it renders nothing at all (`EvolutionEntryLinks.tsx:40-41`), so the calm editorial page underneath is never left with a broken or empty CTA row. This graceful-hide pattern is used consistently across Exchange/Sell/Wanted/Services and is worth keeping as the standard for any future flag-gated entry point. |

### 3.6 Commercial Offers
**Files:** `components/evolution/CommercialOfferForm.tsx`, `MyCommercialOffers.tsx`; `app/exchange/offer/[listingId]/page.tsx`, `app/account/commercial-offers/page.tsx`; `lib/evolution-api.ts`.
**User intent (buyer):** propose full commercial terms, track my offers. **Primary action:** submit an offer / withdraw one. **Next action:** watch it move through negotiation.

| Tag | Finding |
|---|---|
| `[API/read-model]` `[UX]` | **Confirmed: the known issue in pack doc 05 is real and exactly as described.** `MyCommercialOffers.tsx:62-71` renders the bare `o.listingId` UUID as the "Listing" column's link text — there is no listing title anywhere in the `OfferView` DTO to show instead (X5). The legacy `/account/offers` page has the lighter version of the same gap: it never shows a title either, just amount + a generic "View lot →" link, so a buyer with several open offers can't tell them apart without clicking through each one. |
| `[UX]` | `account/offers/page.tsx:59` and `account/eoi/page.tsx:59` both link their empty-state CTA to **`/catalogue?saleMethod=...`** — but the catalogue page's actual query param is `method` (`catalogue/page.tsx:8`, `CatalogueBrowser` prop `initialSaleMethod` from `searchParams.method`). `saleMethod=` is silently ignored, so both "Find lots open to X" links land on the unfiltered catalogue. The `/account/eoi` instance compounds this with the wrong *value* too (`saleMethod=EOI`, see X6). |
| `[Copy]` | `CommercialOfferForm.tsx`'s error fallback is `'Could not submit your offer.'` (`:91`) — friendlier than most, but per X7 it's still shown only when `err` isn't an `Error` instance; the common case (a thrown `Error` with no backend message) still surfaces `err.message` raw. |
| `[UX]` | `account/commercial-offers/page.tsx` is the only one of the three sibling account wrapper pages (`singha-id`, `activity`, `commercial-offers`) with no `export const metadata` — minor, but it means this tab has a generic page `<title>` where its siblings have specific ones. |
| — | **Preserve — this is genuinely close to the pack's "negotiation-feeling offers" goal.** `CommercialOfferForm` models a real commercial proposal (price, quantity, Incoterm, delivery date, payment terms, validity) with a clearly-explained sealed toggle ("Keep your bid confidential — the seller cannot see your amount until they reveal all offers together," `:242-244`) rather than a bare price box. `MyCommercialOffers` has proper skeleton/error+retry/empty states and a real `EmptyState` component, not an afterthought div. |

### 3.7 Sealed offers
**Files:** `components/evolution/SellerOffersConsole.tsx` (seller reveal/compare/award), `CommercialOfferForm.tsx` (buyer's "sealed" toggle, §3.6); `app/sell/offers/[listingId]/page.tsx`.
**User intent (seller):** compare offers fairly, award without bias. **Primary action:** reveal, then award. **Next action:** counter or reject a non-sealed offer.

| Tag | Finding |
|---|---|
| `[UX]` | `sell/offers/[listingId]/page.tsx` is a two-line wrapper (`EvoGate` + `SellerOffersConsole`) — **there is no listing title, image, or reference shown anywhere on this page.** A seller comparing offers on a listing sees only "Offers received / Compare the offers on this listing and award the one you choose" with zero reminder of *which* asset that is, beyond the opaque ID in the URL. Root cause is the same read-model gap as X5 — `SealedListingView` carries no listing summary either. |
| `[API/read-model]` `[UX]` | Neither the sealed-ranked rows nor the open-offer rows carry any buyer identity — columns are Rank/Amount/Currency/(Rev)/(Status)/Actions only (`SellerOffersConsole.tsx:270-317`). For sealed offers pre-reveal this is presumably intentional (anti-collusion); post-reveal, and for ordinary open offers, a seller is Accepting/Countering/Rejecting/Awarding without knowing who they're dealing with. Worth confirming with the backend whether this is a deliberate privacy boundary or a read-model gap to close in CX5. |
| `[UX]` | Good, well-scoped confirmation friction: awarding requires selecting a row *and* confirming in a second step (`confirmAward`, `:203-226`), and the "highest offer is never auto-awarded" rule is stated in plain language right above the table (`:398-401`), not just enforced silently. |
| — | **Preserve — the trust copy here is some of the best writing in the app** and should be the reference tone for the rest of the negotiation surfaces: "Every amount is hidden until you reveal. Revealing shows all offers at once so no bidder is disadvantaged" + "Revealing is audited and cannot be undone" (`:370-374`); "Offer #N awarded — this binds the sale. The other offers are now closed" (`:391-394`). This is exactly the plain-language, consequence-explaining voice the "no raw errors, humanized copy" goal is asking for elsewhere. |

### 3.8 Auction / Live
**Files:** `app/live/page.tsx`, `components/SaleCard.tsx` (reused).
**User intent:** find/watch a live or hybrid event. **Primary action:** browse live/upcoming lots. **Next action:** open a lot and bid.

| Tag | Finding |
|---|---|
| `[UX]` | This page is a good precedent for the rest of the app: it fetches `saleMethod: 'LIVE_HYBRID'` (the correct enum value) and links out with `?method=LIVE_HYBRID` (the correct query param) — both right, unlike the `/account/offers` and `/account/eoi` empty-state links (§3.6). |
| `[Copy]` | Explicitly honest about rollout status rather than showing fake activity: "Singha Live is rolling out progressively; where a broadcast is not yet available a lot still runs as a fully authoritative online auction" (`live/page.tsx:103-107`). This directly contradicts the homepage's *own* hardcoded "Featured live auction" card (§3.1), which makes no such disclaimer — worth aligning the two. |
| — | **Preserve:** the "Live now" / "Upcoming" split with a real empty state ("No live or hybrid events are scheduled right now" + a redirect to timed auctions instead of a dead end, `:86-98`) is a good example of never showing a hollow page. |

### 3.9 Sell
**Files:** `app/sell/page.tsx` (seller dashboard/listing list), `app/sell/new/page.tsx` (Listing Studio wizard, 15 stages).
**User intent (seller):** manage my consignments; create a new listing. **Primary action:** "List an asset." **Next action:** track status, view offers.

| Tag | Finding |
|---|---|
| `[UX]` | **Category taxonomy gap (X2) is most consequential here**: the wizard's category picker only offers 5 of the 8 real categories. Business Assets, Stock & Bulk and Agriculture — three categories the rest of the product actively markets (homepage tiles, catalogue filters, and the CX2 "Wanted" section's own example demand items are literally onions, cinnamon and copper scrap) — cannot be selected when creating a listing. |
| `[Copy]` | X10 in full: the wizard's success screen can show a seller a mix of genuine business notes ("Requested auction opening/reserve recorded for staff scheduling") and raw infra language ("Buy-now price not stored (endpoint unavailable)"), plus a literal `"(mock)"` chip and a citation of a non-existent "(pack doc 28)" — all on the screen meant to confirm a successful, professional submission. |
| `[Visual]` `[UX]` | `sell/page.tsx`'s own-listings list is plain text rows with no thumbnail (`:69-99`) — a seller with several similar vehicles/lots must read titles carefully to tell them apart; every other list surface in the app that *does* have real media (SaleCard, watchlist doesn't either, actually — see below) shows how much clearer a thumbnail makes this. |
| `[UX]` | The wizard autosaves to `localStorage` under a single fixed key (`DRAFT_KEY = 'singha_listing_draft_v1'`, `sell/new/page.tsx:16`) — a seller starting a second listing before finishing/submitting the first will silently overwrite their in-progress draft. No "resume draft?" prompt exists. |
| — | **Preserve:** the wizard is honest about what it can't yet do rather than faking success — photos that fail to upload are explicitly flagged for re-attachment rather than silently registered as fake "ready" media ("Pack FIX-05: NEVER register a filename as media," `:361-364`), and documents/video are never registered without a real signed upload. This is a good, deliberate application of rule 4 (original media immutability) even under a incomplete pipeline. |

### 3.10 Wanted / RFQ
**Files:** `app/wanted/page.tsx` (editorial), `components/evolution/ProcurementHub.tsx` (post RFQ / my requests), `ProcurementDetail.tsx` (compare & award).
**User intent (buyer):** post what I need; see supplier responses. **Primary action:** post a request. **Next action:** open a request to compare/award.

| Tag | Finding |
|---|---|
| `[Copy]` | `ProcurementHub.tsx:162` — the "Type" column uses `humanize(r.type)` on values `RFQ` / `REQUEST_SUPPLY` / `REVERSE_TENDER`; per X3 this renders "REQUEST SUPPLY" / "REVERSE TENDER" in full caps sitting next to normal-case "Requirement" and "Status" columns in the same table row. |
| `[UX]` | `wanted/page.tsx` is honest, not aspirational, about maturity: "Buyer-side sourcing is rolling out progressively... get in touch through your Singha account" (`:96-98`) rather than showing a form that doesn't work yet. |
| `[UX]` | Good quantity/currency clarity in the request form: a dedicated `QuantityUnitInput` and a `CURRENCY_OPTIONS` select rather than a free-text amount field (`ProcurementHub.tsx:248-265`), consistent with the pack's "location/quantity/currency clarity" goal. |
| — | **Preserve:** the "My requests" list correctly shows the buyer's own title (not an ID) as the link text (`ProcurementHub.tsx:165-174`) — this is the pattern §3.6/§3.7's offer surfaces should be brought up to, not the other way around. |

### 3.11 Supply Programmes
**Files:** `app/sell/supply/page.tsx`, `components/evolution/SupplyProgrammes.tsx`.
**User intent (seller/supplier):** publish standing/recurring availability. **Primary action:** create a programme. **Next action:** activate/pause/withdraw; attach perishable metadata.

| Tag | Finding |
|---|---|
| `[UX]` | Status transitions are modeled as real state-machine actions (`transitionsFor()`, `SupplyProgrammes.tsx:41-58`: draft→Activate, active→Pause/Withdraw, paused→Activate/Withdraw) rather than a raw status dropdown — good, matches "customer control on every screen." |
| `[UX]` | The perishable-metadata panel (harvest/packing/expiry dates, cold-chain, temperature band, shipment window) is a strong, concrete example of "natural local-market language" done right for Sri Lankan agri-commodity sellers (Ceylon tea/cinnamon-style use cases) — but it's nested a second level inside each programme card, toggled per-row (`PerishablePanel`, `:430-601`), which is easy to miss if a seller has several programmes. |
| `[Visual]` | "My programmes" list uses a plain-text "Loading…" nowhere — actually correctly uses `Skeleton` (`:366-370`), unlike the older `/account/offers`, `/account/eoi`, `/account/watchlist` pages which still show bare "Loading…" text (see §3.13). Noted here as the more consistent example. |
| — | **Preserve:** "Non-binding — a guide for matching" hint directly on the price field (`:296-300`) and "Set it active to start matching" on the success message (`:349-351`) both do real work explaining *why* a value is optional/what happens next, rather than leaving the seller to guess. |

### 3.12 Services / Logistics
**Files:** `app/services/page.tsx` (editorial), `app/services/logistics/page.tsx`, `components/evolution/LogisticsCentre.tsx` (Reference / Quote / Track tabs).
**User intent:** understand and use freight/Incoterms/tracking. **Primary action:** get a quote. **Next action:** book it, then track the shipment.

| Tag | Finding |
|---|---|
| `[UX]` | The "Track" tab has **no list of the buyer's own shipments** — it is ID-lookup only (`TrackPanel`, `LogisticsCentre.tsx:509-601`). A buyer who books a quote in the same session is auto-navigated in with the ID pre-filled (`onTrack` callback), but anyone returning later to `/services/logistics` must already know/have saved a raw shipment ID to find anything again. |
| `[Copy]` | The Track input's placeholder is literally `"e.g. shp_…"` (`:563`) — exposing the internal ID-prefix convention as the example text shown to a customer, and implying the reference they need to keep is a raw system ID rather than a designed human tracking code (contrast with listings, which do have a human `publicRef`/`reference` distinct from their `id` — `Shipment` appears not to). |
| `[Copy]` | `humanize(quote.mode)` on values like `SEA_FCL` renders "SEA FCL" (X3) in the quote result card shown directly to a buyer, not just an operator. |
| `[UX]` | Very clear, repeated "a quote is not a booking" messaging at three separate points (form empty-state, result card, booking confirmation) — good shipping-clarity precedent. |
| — | **Preserve:** the three-tab shape (public Reference / authed Quote / authed Track) correctly keeps the Incoterms & ports reference open to signed-out visitors while gating the account-tied actions — each `SignInPrompt` explicitly says the reference stays open (`:286,546`), which is a small but real trust-building detail. |

### 3.13 Customer Activity
**Files:** `app/account/activity/page.tsx` → `components/evolution/ExchangeActivity.tsx` (new); `app/dashboard/page.tsx` (old, still live, unlinked from the new IA — see X8); `app/account/offers/page.tsx`, `account/eoi/page.tsx`, `account/watchlist/page.tsx`.
**User intent:** "what needs my attention right now, across everything?" **Primary action:** jump into the thing that needs action. **Next action:** act on it, or dismiss.

| Tag | Finding |
|---|---|
| `[UX]` | **X8 in full** — this is the surface most directly responsible for the pack's "attention-led Command Centre" goal, and it currently exists twice, unlinked, with different capability sets (old has realtime + urgent-action strip; new has better cross-linking but no realtime and no top strip). Neither page mentions the other. |
| `[API/read-model]` | `dashboard/page.tsx`'s degraded fallback path (used whenever `GET /api/v2/me/dashboard` isn't available) synthesizes card titles from raw IDs — `title: \`Listing ${e.listingId.slice(-6)}\`` (`:241,255`) — literally "Listing a3f9e2" shown as an item's name. |
| `[Visual]` | `/account/offers`, `/account/eoi`, `/account/watchlist` all render a bare `<p>Loading…</p>` text node for their loading state (e.g. `account/offers/page.tsx:53`) where every Evolution-era list (`SupplyProgrammes`, `ProcurementHub`, `MyCommercialOffers`, `ExchangeActivity`) uses a proper `Skeleton` — an easy, low-risk visual-consistency fix. |
| `[UX]` | `ExchangeActivity.tsx` cross-links every metric to its owning surface (Offers → `/account/commercial-offers`, Procurement → `/wanted/procurement`, Supply → `/sell/supply`, Capabilities → `/account/singha-id`, `:154-203`) — exactly the "missing cross-links" fix the rest of the app needs; it just needs to also link `/dashboard`'s content (or absorb it). |
| — | **Preserve:** `ExchangeActivity`'s per-section empty state ("Nothing here yet," `:76`) and its Sign-in/Loading/Error/Data state machine are clean and complete. The old `/dashboard`'s SSE-with-poll-fallback pattern (`:73-107`) and its never-clear-the-screen-on-a-quiet-refresh discipline (`load(t, quiet)`, `:43-61`) are both worth carrying forward into whichever surface CX7 consolidates on. |

### 3.14 Singha ID
**Files:** `app/account/singha-id/page.tsx` → `components/evolution/SinghaIdProfile.tsx`.
**User intent:** "prove who I am so I can do more" / manage preferences. **Primary action:** request a capability. **Next action:** save profile preferences.

| Tag | Finding |
|---|---|
| `[UX]` | This is the best-behaved `humanize()` call site in the app — every capability value (`place_bid`, `high_value_trade`, etc., `:27-35`) is genuinely lower_snake, so `humanize()` renders it correctly every time. Worth noting as evidence that the helper itself is fine; it's the inconsistent input casing elsewhere (X3) that's the problem, not this component. |
| `[Copy]` | "Informational only — never a binding currency" (`:238`) directly on the Display currency field is a good, concrete instance of "sale-method/currency clarity" — it heads off the exact confusion (does changing this change what I pay?) before it happens. |
| `[Visual]` | Success/confirmation text ("Saved.", "Posted 'X'.", "Created 'X'.") consistently renders in `text-red-300` across this and several other Evolution forms (e.g. `:281`; also `ProcurementHub.tsx:296`, `SupplyProgrammes.tsx:349`) rather than a green/success-toned class. Red is Singha's primary brand/CTA color throughout the app, so this is very likely intentional brand styling rather than a bug — flagging only because a color most users read as "warning" doing double duty as "success" is worth a deliberate design-system decision (and a name, e.g. a `text-confirm` token) rather than reusing the raw palette color ad hoc. |
| — | **Preserve:** the "Bidding: not available yet — {reason}" hint (`:295-300`) is a good, low-cost way to answer "why can't I bid?" before the customer even tries and hits a server rejection — exactly the kind of proactive clarity the pack wants more of. |

### 3.15 Control Centre
**Files:** `app/control-centre/page.tsx`, `control-centre/nodes/page.tsx`; `components/evolution/ControlCentre.tsx`, `NodeConsole.tsx`, `MfaGate.tsx`, `RecordView.tsx`.
**User intent (operator/staff):** administer routing, fees, payments, risk, KYC, nodes. **Primary action:** vary by tab. **Next action:** vary by tab.

This is explicitly an internal/operator surface (`EvoGate` + `MfaGate requireEnrollment` wrapping, `control-centre/page.tsx:10-16`), so a harsher HUD-style visual language and denser tables are appropriate here in a way they are not on customer surfaces — most findings below are lower priority than the customer-facing ones above.

| Tag | Finding |
|---|---|
| `[Copy]` | `ControlCentre.tsx:589` — the fee/amount breakdown renders `humanize(key.replace(/Minor$/i, ''))` against camelCase keys like `buyerPremiumMinor`; per X3 this produces smashed-together words like "BuyerPremium" with no space, in a table an operator is expected to read quickly. |
| `[API/read-model]` | `ControlCentre.tsx:343-351` — the routing-preview `SALE_METHODS` dropdown includes `{ value: 'EOI', ... }` (same X6 mismatch — will never match a real listing) and also a `COMMERCIAL_OFFER` option that isn't in the canonical `SaleMethod` enum at all (`schema.prisma:64-70`); worth a quick backend-contract confirmation on whether "commercial offer" is meant to key off a different field for routing purposes. |
| `[UX]` | `RecordView.tsx:25` renders one raw-replaced Chip (`value.replace(/_/g, ' ')`) while the rest of that same component correctly uses `humanize()` (`:72`) — a small internal inconsistency in an otherwise careful "generic record renderer." |
| — | **Preserve:** the authorization messaging is exactly right for an operator tool — "Access is authorized by the server — there is no client-side role switch" is stated to the user, not just true in the code (`:81-83`), and a 403 surfaces as the plain sentence "You don't have operator access" (`evo-api-error.ts:18`) rather than a raw error. `MfaGate`'s enrollment-required mode keeps privileged tools dark until MFA is actually configured (`MfaGate.tsx:19-20`) — good defense-in-depth made visible. |

### 3.16 Sri Lanka / local site (`/n/[code]`)
**Files:** `app/n/[code]/page.tsx`, `components/evolution/NodeLocalSite.tsx`.
**User intent:** "is there a local Singha presence/market here?" **Primary action:** browse this market's inventory. **Next action:** open a lot (same central `/lot/[id]`).

| Tag | Finding |
|---|---|
| `[Visual]` | **Doesn't reuse `SaleCard`** — the universal, sale-method-aware card the rest of the app uses everywhere else. Instead it hand-rolls a simpler card with a **plain gradient placeholder `div` instead of the lot's real photo** (`NodeLocalSite.tsx:146-149`) and `hud-cut-sm` clipped-corner styling — the same "gaming HUD" visual language the homepage's own code comments say is deliberately reserved for operator surfaces, not customer-facing ones (`app/page.tsx:33-34`). This is the one customer surface in the audit that visibly breaks from the "universal card" and "premium restraint" goals simultaneously. |
| `[Copy]` | Good news on X9's "no Satellite Node vocabulary" goal: visible copy already says "Local market" / "local storefront" / "the one central Singha marketplace" (`:100-119`) — the "Satellite Node" phrasing is confined to code/type names (`NodePresentation`, `fetchNode`, component name), which is fine since those aren't customer-visible. This objective looks largely already met on the customer-facing text; worth a final scan once real content/markets are live. |
| `[Copy]` | The route has no `export const metadata` — the page's `<title>`/description fall back to the root layout's generic "Singha — the trusted exchange..." rather than something location-specific (e.g. "Singha — [Market Name]"), which is a real SEO cost for the point of a local-market landing page. |
| — | **Preserve:** the resilience pattern here is genuinely good and should be the template for the visual fix above rather than being thrown out with it — dedicated skeleton, a friendly "This market node is unavailable" + Retry + "Go to Singha" fallback (not a bare error), and an honest "Nothing listed for this market yet" empty state rather than a blank grid (`:53-137`). |

---

## 4. Top fixes — prioritized, mapped to CX1–CX14

Phase numbers/names below are the authoritative ones from `docs/generated/SINGHA_CX_STATE.md` (CX1 "mobile shell" and CX2 "homepage, first pass" already shipped mid-audit, per §1).

| Priority | Fix | Maps to | Why first |
|---|---|---|---|
| **P0** | Fix the `EOI`/`EXPRESSION_OF_INTEREST` key mismatch (X6): `SalePanel.tsx` `case 'EOI'` → `case 'EXPRESSION_OF_INTEREST'`, plus the same correction in `LotStickyDock.tsx`, `lot/[id]/page.tsx`'s `SALE_METHOD_LABEL`, and `ControlCentre.tsx`'s `SALE_METHODS`; add `LIVE_HYBRID` to the two label maps missing it. | CX4 / CX11 | This is a live functional defect, not a polish item — one sale method's primary buyer form is currently unreachable. One-line-per-file fix, highest value-to-effort ratio in this audit. |
| **P0** | Resolve the `MobileBottomDock` vs `LotStickyDock` fixed-bottom collision (X9) before `neutralIaV1` goes any wider than preview. | CX4 (explicitly scoped as "sticky rail desktop / dock mobile") | Newest code, highest confidence of being a real visual bug, directly blocks the primary lot-page CTA on the exact viewport widths CX13 will screenshot. |
| **P1** | Enrich the commercial-offer read-model with listing title/reference (and confirm counterparty-identity policy) so `MyCommercialOffers`, `SellerOffersConsole`, and the `/sell/offers/[listingId]` page context stop depending on raw IDs (X5). | **CX5**, named exactly for this ("remove raw listingId via safe read-model enrich") | Confirms the pack's own known-issue flag; needs a backend read-model change, so should start early given lead time. |
| **P1** | Unify the category taxonomy (X2) to one source and one label set; extend `sell/new`'s wizard to all 8 categories. | CX3 / CX6 | Blocks sellers from listing into 3 of 8 marketed categories today (bulk/agriculture/business) — directly undercuts the "asset & commodity exchange" positioning the whole pack is named for. |
| **P1** | Give `humanize()` a real normalization pass (lowercase + split on `_`/`-`/camelCase boundaries) instead of "assume already-lowercase" (X3), and sweep the `.replace(/_/g,' ')`-outside-a-Chip call sites (X4) onto it. | **CX11** ("microcopy + friendly error mapper... no raw IDs/enums/errors") | One shared-utility fix cleans up ~10 call sites across customer *and* operator surfaces at once. |
| **P2** | Add a customer-facing error-message mapper (extend or generalize `evo-api-error.ts`'s pattern beyond the two operator surfaces) so mutation failures never fall through to a raw `METHOD /path -> status` string (X7). | CX11 | Same phase as the humanize fix; do together. |
| **P2** | Decide and consolidate: pick one Command Centre (X8) — most likely retire/redirect `/dashboard` into `/account/activity`'s IA once it has feature parity (realtime push, urgent-action strip), or explicitly keep both with a link between them in the interim. | **CX7** ("Customer Command Centre (attention-led) + Singha ID as transaction passport") | Structural decision that other CX7 work should be built on, not around. |
| **P2** | Give shipment tracking a "my shipments" list and a human tracking reference instead of raw-ID lookup only (`LogisticsCentre.tsx` Track tab). | **CX8** ("Logistics woven into the transaction journey") | Currently the *only* way back into a shipment without the in-session handoff is knowing a raw `shp_…` ID. |
| **P3** | Scrub the internal/process copy leaks in the Listing Studio success screen and video-state chip (X10). | CX11 | Small, contained, high embarrassment-to-effort ratio (a seller-facing screen citing a non-existent internal doc number). |
| **P3** | Fix the two dead catalogue-filter links (`saleMethod=` → `method=`) on `/account/offers` and `/account/eoi` empty states. | CX11 | Trivial fix, currently silently broken. |
| **P3** | Bring `NodeLocalSite`'s inventory cards onto the shared `SaleCard` (real photos, no HUD-cut styling) and give `/n/[code]` route-level metadata. | **CX9** ("Sri Lanka/local-market natural language") + CX3 (universal card) | The vocabulary half of CX9 already looks done on this surface (§3.16); the remaining work is visual consistency, not copy. |
| **P4** | Roll the `neutralIaV1`/Evolution/V3 flags from controlled preview toward default-on for real users once the above are closed (X1). | **CX14** ("controlled-preview handoff") | Everything above should land first — flipping defaults now would expose X6/X9 to production users immediately. |

---

*Grounded against frontend `e507cbd` / backend `f2d364e`. Per-width screenshot QA (360/390/430/768/1024/1440/1920) is a separate later pass — see CX13.*
