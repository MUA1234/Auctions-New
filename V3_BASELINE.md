# V3_BASELINE — Frontend (`MUA1234/Auctions-New`)

Prepared per pack `00_EXECUTE_THIS_FIRST.md` at the start of the V3 program.
Reconciled against actual source, not stale status docs.

## Current SHA
- `main` at baseline: `17d45e7` (in sync with `origin/main`; Vercel green per pack doc 01).
- This document + V3-0 closure land on top of it.

## Genuinely implemented (verified this session)
- Real, Supabase-only auth (no demo/guest token path); SSR middleware route
  protection for `/dashboard`, `/account/*`, `/admin`, `/sell/new`.
- Buyer Exchange UI: Buy Now / Make Offer / Sealed Tender / EOI (`SalePanel`),
  buyer activity hub (`/account/watchlist|offers|eoi`), auction events pages.
- Catalogue (Flow/Grid/List) with edge-hinged bounded 3D `@singha/auctionflow`;
  lot detail with auction `BidPanel`; homepage editorial + Market Pulse.
- Emerald primary palette (red→green migration complete).
- Gates verified locally: `format:check` GREEN (after fixing 7 files this session),
  `lint` GREEN, `typecheck` GREEN, unit tests 8/8, `next build` 22 routes.

## Partial / stale / not yet V3
- **Flow is NOT yet the V3 Infinite Flow Canvas** (independent category rows, not a
  2D matrix; mobile collapses to 1 col <520px, not the ~4×4 compact target).
- Homepage featured = static SaleCard grid, **not** the cinematic FeaturedReel.
- Catalogue default sort is `newest`, **not** Ending Soon (V3 non-negotiable).
- No Discover / Buyer Twin / Bid Battle / Gesture Bid / engagement/notifications /
  Live V3 surfaces yet.
- No generated API client — `lib/api.ts` is handwritten (V3 wants a generated,
  freshness-checked client from the canonical backend contract).

## CI / deploy status
- Vercel: green at `17d45e7`.
- **Frontend CI was red on Prettier** (7 files from last session's work) — fixed
  this session; formatting now clean.
- Frontend security workflow (Gitleaks/CodeQL/bundle scan) blocked by an
  Actions billing/account lock — **owner action** (pack doc 25), not a code pass.

## Security / IP blockers (P0, owner)
- Repo still **public** → anti-clone gate stays `NO_GO` until private.
- Branch protection on `main` unverified by owner.
- Deprecated `apps/api` + `apps/worker` frozen copies still present. NOT removable
  yet: the repo's own `test:e2e`/`test:auction` scripts + `.github/workflows/ci.yml`
  still build `@singha/api`. Removal requires rewiring/removing those e2e scripts
  first (planned V3-0 residual), then deleting the copies.

## V3 delta (what this repo must become)
Ending-Soon default → Infinite Flow Canvas (2D matrix, mobile 4×4, floating
category overlays) → cinematic FeaturedReel homepage → V3 lot detail + Gesture Bid
→ Discover + Buyer Twin → Bid Battle + engagement → Live V3 → dashboard pilot shell.
All gated behind the V3 feature flags (below), default OFF.

## Decisions (this session)
- **Branch strategy:** work on `main` with everything V3 gated behind feature flags
  and **not pushed unless asked** — per standing repo policy, which pack doc 00
  explicitly defers to ("unless repository policy requires another convention").
  Production stays on the current UI because every V3 flag defaults OFF.
- **Flags:** consumed from the backend `GET /api/v1/feature-flags` via
  `src/lib/flags.ts` (server) + `src/lib/use-flags.ts` (client), safe all-off
  defaults on any error.

## V3-0 status: PASS_WITH_OWNER_ACTION
Code-side foundation is clean and green locally. Owner P0s (repo privacy, Actions
billing, branch protection) remain outstanding and block production GO.
