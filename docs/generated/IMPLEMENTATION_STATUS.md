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
`next build`.

## Product Alignment — P5/P6/P7 + real media (frontend)

**Also built (this alignment pass):**

- [x] **Real asset media** (docs 07/15): `lib/media.ts` resolves a `storageKey`
      to a Supabase public-object URL; `LotImage` renders real photography with a
      graceful placeholder; `LotGallery` gives lot pages a cover + thumbnail
      strip. Wired into `SaleCard`, the lot page and homepage featured cards.
      Placeholder gradients only appear when a lot genuinely has no media.
- [x] **P6 premium homepage**: real featured lots from
      `/api/v2/catalogue?featured` (falls back gracefully), softened HUD (hero
      grid at 6% opacity, red-glow removed), restrained accents, larger type +
      generous spacing, added Trust & Transparency section, SEO/OG metadata, and
      alt text. Categories deep-link to `/catalogue?category=…` (honoured by
      `CatalogueBrowser`). Homepage still fetches only 8 cards + Market Pulse.
- [x] **P5 buyer command centre**: consumes `GET /api/v2/me/dashboard`
      projection (top action strip: active bids / winning / outbid / payment due
      / ready-for-pickup, plus status groups) rendered as **Rubik status bands**
      via the shared `CubeRow`; degrades to a projection derived from
      watchlist/EOI/offers when the endpoint isn't shipped yet.
- [x] **P7 full Listing Studio**: `sell/new` is now the complete 15-stage flow —
      source, sale method, category, core details, specifications, photos
      (cover/caption/remove), video, documents, AI Assistant (best-effort
      `/ai/listing/draft`, derived-not-invented), sale settings, inspection,
      collection, fees/terms, social promotion (manual-approval default),
      preview, submit. **Draft autosaves at every stage** (localStorage); rich
      content / media / sale-config / social are best-effort calls so listing
      creation always succeeds against an older backend.

Verified: `next build` green (9/9 pages) and a runtime smoke (`next start`) —
`/`, `/catalogue`, `/sell/new`, `/dashboard` all 200, unknown lot 404s.

## Product Alignment — P8 Production authentication (frontend)

- [x] **Real auth on Supabase Auth** (doc 09): `/login` supports email+password,
      passwordless magic link, sign-up and password reset (account recovery);
      `/auth/callback` exchanges the one-time code for a **secure cookie
      session** (refreshed by the existing SSR middleware — no tokens in
      localStorage on the real path).
- [x] **Central `lib/auth.ts`**: `getAccessToken()` returns the Supabase session
      JWT (falls back to the demo token only when
      `NEXT_PUBLIC_DEMO_AUTH_ENABLED !== 'false'`); `useAuth()` reacts to auth
      changes; `signOut()` clears both. Every authed surface (dashboard, seller,
      admin, Listing Studio, `WatchButton`, `BidPanel`) now goes through it —
      **no component reads `singha_demo_token` directly** any more.
- [x] Session-aware header (`AuthNav`): Sign in ⇄ account email + Sign out.
- [x] Demo login is **gated** and clearly labelled "Dev"; set
      `NEXT_PUBLIC_DEMO_AUTH_ENABLED=false` to remove it in production (doc 09
      "dev/demo auth disabled in production").

**Backend follow-up for P8** (separate repo): the API must verify Supabase JWTs
and map the IdP subject → Singha Customer/User (never use the IdP id as the
business key), add privileged-staff MFA, and disable `/auth/demo` +
`/dev/token` in production. Until then, real Supabase sessions authenticate the
frontend while the backend still accepts its own tokens; the demo path keeps
local dev working.

**Remaining alignment (open):**

- Backend repo (`Auctions-Backend`, not this repo): the authoritative
  `/api/v2/me/dashboard` projection + persistent watchlist authority,
  AuctionEvent/EventLot, richer lot-detail DTO with media, `/ai/listing/draft`,
  `/listings/:id/content` + `/sale-config`, `/social/campaigns`, signed media
  upload pipeline. The frontend already calls all of these and degrades cleanly
  until they exist.
- P1 cross-repo: generated typed client from the canonical backend (frontend
  currently has zero runtime import of the co-located stale `apps/api`).

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
