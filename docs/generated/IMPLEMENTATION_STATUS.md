# IMPLEMENTATION STATUS

_Phases 0–2 COMPLETE and verified._ (Phase 0 foundations, Phase 1 data core,
Phase 2 timed auction engine.)

_Product Alignment (consolidated pack) in progress in this FRONTEND repo._

## Product Alignment — P4 Correct AuctionFlow (frontend)

The consolidated pack (doc 24) inserts a Product Alignment stage before launch
hardening. This repo owns the frontend slices. **P4 Correct AuctionFlow is
built:**

- [x] Reusable Rubik primitives extracted into `@singha/auctionflow` (no longer
      private in `CatalogueBrowser.tsx`): `AuctionFlowViewport`, `CubeRow`,
      `CubeFace`, `CubeControls`, `CubeProgress`, hooks `useCubeGesture`,
      `useCubePosition`/`CubePositionProvider`, `useReducedMotion`,
      `useFaceCount`, and pure paging maths (`pageCount`/`stepPage`/`faceItems`/
      `adjacentPages`/`resolveAxis`/`swipeDelta`).
- [x] Catalogue "Rubik" view = a stack of **independent** 3D-rotating category
      rows (not a literal six-sided cube, not one rail rotating all categories).
- [x] Each row pages through **all** its lots (backend pagination), reachable via
      swipe / drag / arrows / keyboard / dot indicator.
- [x] Direction lock — horizontal intent rotates the row, vertical intent scrolls
      the page (`touch-action: pan-y`).
- [x] Realtime-safe — per-row face position keyed by stable row id in a viewport
      store; a bid update never resets a row; survives Grid⇄Rubik toggle.
- [x] `prefers-reduced-motion` → non-rotating paged rail; offscreen faces are
      `inert` + `aria-hidden` (not keyboard-focusable).
- [x] Buyer command centre watchlist rendered with the **same** `CubeRow`
      primitive (doc 05) + top action strip of urgent counts.

Verified by `@singha/auctionflow` unit + jsdom component tests (all lots
reachable, offscreen faces inert, rows rotate independently) and a green
`next build`. Backend `GET /api/v2/me/dashboard` projection + persistent
watchlist authority remain **backend** work (separate repo).

Remaining frontend alignment: P6 public visual redesign, P7 full Listing Studio.

## Phase 0 checklist

- [x] Monorepo, tooling, CI, observability baseline, generated docs
- [x] Domain-boundary scaffold; stable data-core schema; migrations; design system

## Phase 1 checklist (gate: permissions + migration tests)

- [x] Identity/customer — register, read (self/permission), external identities, KYC
- [x] Organizations/sellers — create org (owner member), add members (ownership-authorized)
- [x] Assets — create/update with **versioned category-schema validation**
- [x] Listings — create + guarded lifecycle (submit → review → publish)
- [x] Category schemas — vehicles/machinery/gems/property/bulk/general (v1)
- [x] Media/docs — register immutable original + derivative provenance
- [x] Audit — every consequential command writes an append-only audit entry
- [x] Outbox — domain events written **atomically** with state (unit of work)
- [x] **Server-side RBAC** — JWT principal + permissions guard + ownership checks
- [x] **Migration tests** — additive `asset.attributes`, upgrade-safety, trigger intact
- [x] E2E — full seller→staff flow proving permission 403s + outbox/audit

## Phase 2 checklist (gate: concurrency + soft-close E2E)

- [x] Auction config — configure/open/close from a listing (staff)
- [x] **Append-only bid ledger** — DB trigger rejects UPDATE/DELETE
- [x] Increments + reserve (+ visibility) + opening bid
- [x] **Proxy / max bidding** — private maxima; deterministic visible price
- [x] **Concurrency** — row-locked bids (`SELECT…FOR UPDATE`) serialize
- [x] **Soft close** — bids in the trigger window extend the end time
- [x] Realtime projection — privacy-safe poll endpoint (SSE/WS adapter later)
- [x] Close + winner — reserve-met sale vs passed-in, events emitted
- [x] E2E — concurrency (exactly-one-accepted burst), proxy, soft-close, winner

## API surface (all under `/api/v1`)

| Command               | Route                                     | AuthZ                          |
| --------------------- | ----------------------------------------- | ------------------------------ |
| registerCustomer      | `POST /customers`                         | public                         |
| getCustomer           | `GET /customers/:id`                      | self or `customer:read`        |
| linkExternalIdentity  | `POST /customers/:id/external-identities` | self or `customer:manage`      |
| setKyc                | `POST /customers/:id/kyc`                 | `kyc:manage`                   |
| createOrganization    | `POST /organizations`                     | `organization:create`          |
| addOrganizationMember | `POST /organizations/:id/members`         | owner or `organization:manage` |
| createAsset           | `POST /assets`                            | `asset:create`                 |
| updateAssetAttributes | `PATCH /assets/:id/attributes`            | owner or `asset:manage`        |
| createListing         | `POST /listings`                          | `listing:create`               |
| submitListing         | `POST /listings/:id/submit`               | `listing:submit`               |
| reviewListing         | `POST /listings/:id/review`               | `listing:review`               |
| publishListing        | `POST /listings/:id/publish`              | `listing:publish`              |
| registerMedia         | `POST /assets/:id/media`                  | `media:manage`                 |
| addDerivative         | `POST /media/:id/derivatives`             | `media:manage`                 |
| configureAuction      | `POST /auctions`                          | `auction:configure`            |
| openAuction           | `POST /auctions/:id/open`                 | `auction:operate`              |
| placeBid              | `POST /auctions/:id/bids`                 | `bid:place`                    |
| closeAuction          | `POST /auctions/:id/close`                | `auction:operate`              |
| auctionState          | `GET /auctions/:id/state`                 | public (privacy-safe)          |
| devToken (non-prod)   | `POST /dev/token`                         | dev only                       |

## Not started (later phases)

EOI/Exchange (3), public site + AuctionFlow Cube (4),
seller/admin UI (5), commerce/settlement (6), Singha Connect (7), AI Core (8),
Social Publisher (9), Asset Intelligence (10), Singha Live (11), hardening +
V1 migration + launch (12).

## Gate status

Phases 1 and 2 gates **passed** via `pnpm run check` (format, lint, typecheck,
build, unit), `pnpm run test:db` (migrations and integration), `pnpm run test:e2e`
(data-core permissions + outbox/audit) and `pnpm run test:auction` (concurrency,
proxy, soft-close, winner). Ready for Phase 3 (EOI + Exchange).
