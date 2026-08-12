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

## Product Alignment — auth loop, realtime, real uploads (both repos)

- [x] **Auth loop CLOSED** (backend alignment #5): `PrincipalMiddleware` now
      verifies **real Supabase session JWTs** against the project JWKS (ES256)
      and JIT-provisions a Singha Customer via `ExternalIdentity` (IdP subject is
      never the business key; same verified email links to the existing
      customer). Roles derive from persistent org membership, never the token.
      Singha's own HS256 tokens still work for dev/demo.
- [x] **Realtime bidding over SSE** (backend alignment #6 + web): `GET
    /auctions/:id/stream` pushes the auction projection on change; `BidPanel`
      consumes it via `EventSource` (3s poll fallback). Proven by `e2e-auction`
      (first frame carries live state).
- [x] **Real media uploads** (web): the Listing Studio uploads photos through
      the signed pipeline (`/assets/:id/media/upload-url` → `uploadToSignedUrl`
      → register real storage key), so Studio-created lots get real catalogue
      photos. Falls back to best-effort registration if the File is gone / upload
      fails.
- [x] **Endpoint alignment**: AI draft → `/ai/listing-draft`; content PATCH uses
      the real flat field names + guide/close time; buy-now via
      `/listings/:id/buy-now-price`.

## Product Alignment — MFA + dashboard realtime (frontend, no creds)

Two remaining credential-free frontend gaps closed this pass:

- [x] **Privileged-staff MFA** (doc 09 "MFA privileged staff"): TOTP on Supabase
      Auth. `lib/mfa.ts` wraps enroll / verify / list / unenroll / AAL. New
      `/account/security` page enrolls an authenticator (QR data-URI + manual
      secret, no external lib) and manages factors; verifying lifts the session
      to **AAL2**. `MfaGate` guards `/admin`: a real staff session with no factor
      is sent to enroll (`requireEnrollment`), and a verified-but-AAL1 session
      must pass a step-up challenge before the queue renders. Demo/dev sessions
      pass through. **Backend must still enforce the `aal2` claim** for
      privileged commands (UI is never the source of truth, rule 2).
- [x] **Dashboard realtime** (doc 05 "realtime transitions", doc 17): the buyer
      command centre now opens an `EventSource` to `GET /api/v2/me/dashboard/
      stream` (bearer via query param since `EventSource` can't set headers) and
      replaces the projection in place on each frame; a subtle "Live" pulse shows
      when connected. Falls back to a 20s **quiet poll** when the stream isn't
      shipped — mirroring `BidPanel`. Quiet refreshes never surface a transient
      error, so a stream blip can't blank a working dashboard.

Verified: `next build` green (12/12 pages, `/account/security` added), lint +
prettier clean.

**Still open (escalations needing real credentials):**

- **P8 remainder**: backend `aal2` enforcement for staff commands; disable
  `/auth/demo` in production (`/dev/token` is already gated by `isProduction`).
- **Escalations** (mock adapters await real creds): P9 real AI provider + Buyer
  Twin + recommendations, P10 Connect channels (WhatsApp/Meta/email/SMS), P11
  Social publishing (Meta), P12 Asset Intelligence source-backed data, P13
  Singha Live real video/YouTube.
- **P14 launch hardening**: load, formal security review, backup/restore drills,
  V1→V2 data migration, production observability, real pilot + cutover.
- **P1 cross-repo**: generated typed client (frontend has zero runtime import of
  the co-located stale `apps/api`, so it is runtime-clean already).

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

---

## Revision 06.1 — AuctionFlow geometry hotfix (frontend) — locally `COMPLETE`, deploy pending

_2026-08-12. Frontend `Auctions New` `main` commits `2f09514` (geometry) + `d4551ee`
(paging re-render fix). Per §29 this is **not** `COMPLETE_VERIFIED` until the
deployed Vercel catalogue is visually checked — the code is not yet pushed
(owner action), so the one open DoD item is "deployed Vercel catalogue visually
verified"._

The literal-cube Flow geometry (faces at `translateZ(width/2)` toward a fixed
camera) magnified cards ~3× and leaked side faces off the left edge; one-page
rows still rotated. Replaced with an **edge-hinged two-face quarter-turn**
(`packages/auctionflow`): bounded, locally contained (`overflow: clip` +
bounded `perspective`), cards at normal scale. One-page rows are fully static
(no 3D, no gesture, disabled controls); drag → live turn → commit past threshold
or snap back; partial final faces keep normal size; realtime appends never reset
the face; the page indicator collapses to a counter past 10 pages so a long
mobile row can't overflow.

A verification pass (§28 DoD) also caught and fixed a latent paging bug: the
position store re-rendered only on the rotation animation, so reduced-motion
arrows and the page dots did not page (`d4551ee`).

**Evidence:** 23 auctionflow unit tests (incl. §7/§8/§11 + page-dot +
reduced-motion regressions); typecheck + lint + route + contract checks +
`next build` (18 routes) green; real-browser DoD checks at
2560/1920/1440/1280/1024/768/430/390 across the §19 data scenarios
(1/2/8/9/18/30 lots + zero-image): no leakage, no giant cards, static one-page
rows, contained quarter-turn, keyboard + mouse-drag + real touch swipe +
direction-lock (vertical drag doesn't rotate) + wheel scroll + `touch-action:
pan-y` + reduced-motion rail all pass, no horizontal overflow. **Open:** deployed
Vercel visual check (commit not pushed — owner action).

## Revision 06 — member frontend items — `PARTIAL` (frontend done; some backend-gated)

_2026-08-12. Frontend `Auctions New` `main` commit `6df7e60`._

- **P1-13 Real Passport QR — `COMPLETE_VERIFIED`.** Genuine scannable QR
  (`qrcode.react`) encoding only an opaque `SINGHA:M:<ClientID>` reference; no
  sensitive data. Payload unit-tested; rendered code decodes back to the
  reference (BarcodeDetector/jsQR).
- **P1-12 / P1-16 Bid Capacity page — `COMPLETE_VERIFIED`.** New
  `/account/bid-capacity` (Approved/Committed/Available meter, security instrument
  states, policy note); the "Set up Bid Capacity" CTA points here;
  `/account/security` stays MFA.
- **P1-05 / P1-09 Credit policy preview — `COMPLETE_VERIFIED` (frontend preview).**
  Configurable, non-authoritative 5%→20× preview
  (`NEXT_PUBLIC_CREDIT_REQUIRED_SECURITY_BPS`), labelled subject to verification.
  A backend policy endpoint would let the frontend read it rather than mirror it.
- **P1-14 Browser E2E — `COMPLETE_VERIFIED` (critical subset).** Playwright
  (`apps/web/e2e`): catalogue Flow default / no-blank / no-overflow / Grid-List
  switch, Bid-Capacity vs account-security separation. 8 web unit tests + 3/4
  E2E pass (1 skips when the public catalogue has no facets).
- **P1-10 onsite search-first — `BLOCKED_BACKEND`.** Needs a customer search
  endpoint (by Client ID / mobile / email / name) in `Auctions-Backend`; the
  deployed API only exposes `GET /members/:customerId/360` (ULID).
- **P1-11 Member 360 by Client ID — `BLOCKED_BACKEND`.** Same missing search
  endpoint; staff still look up by ULID until it exists.

**Not in this session:** Rev 06 backend credit-integrity P0/P1 (converted-exposure
admission, temporary scope enforcement, security-release blocking, expiry
revalidation, binding-sale-method exposure) live in `Auctions-Backend` (much built
in Rev 05); and the `SINGHA_AI_MANAGEMENT_V3_1` pack, which targets the separate
`bot_business_Singha` repo — a different product, not this platform.

## Revision 06.2 — member search-first + policy consumption (frontend) — `COMPLETE` (deploy pending)

_2026-08-12. `main` commits `ef38b72` (search-first), `d98ec86` (policy)._

- **§13/§14 search-first (P1-10/P1-11)** — `/admin/members` is now a debounced SEARCH
  (Client ID / mobile / email / name / company → results → open the authoritative 360),
  not a raw ULID box. Onsite registration is the "no match → create" fallback with
  identity (mobile/email), Buyer/Seller/Both and an EXPLICIT Access scope
  (Auction/Event/Platform — blank never means platform); KYC never faked verified.
  Consumes the backend `GET /members/search` (masked contact; raw contact never sent).
- **§16 policy consumption** — `useCreditPolicy()` fetches the public
  `GET /members/credit-policy`; the Bid Capacity note and onsite preview read it instead
  of a hard-coded 5%, with a safe default while loading (backend stays authoritative).

Evidence: web typecheck + 8 unit tests + lint + `next build` (18 routes) + Playwright
(adds an admin-members search-first assertion) green. **Open:** deploy (not pushed).
Backend P0 items §4/§6 remain open in `Auctions-Backend` → overall Rev 06.2 is NO_GO.
