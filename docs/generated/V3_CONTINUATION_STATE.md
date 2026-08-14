# V3 Continuation State — Frontend (`MUA1234/Auctions-New`)

_Maintained per pack docs `00_EXECUTE_THIS_FIRST` + `02_AUTONOMY`. Working memory for the
continuation: current phase, landed commits, flags, blockers, next command._

## Git reconciliation (checked at continuation start)

| | |
|---|---|
| `origin/main` head | `ca1d9ec30fc9c37099e101ae2a83740f4417ad94` |
| Head message | `final unfinished` |
| Head date | 2026-08-14 |
| Working branch | `claude/new-session-at0qp4` (from `origin/main`; session-mandated branch name) |

`origin/main` **matches** the pack baseline `01_CURRENT_VERIFIED_BASELINE.md` exactly
(`ca1d9ec`, "final unfinished"). No newer upstream commits. The "final unfinished" head
carries WIP Discover code (`DiscoverDeck.tsx` + `lib/api.ts` discovery helpers) but **no**
`/discover` route, nav entry, gating, states or test — matching the baseline's "observed
missing" list. Current Git state is trusted over stale snapshot prose (pack doc 01).

## Current phase

**V3-6 — Bid Battle (frontend).** V3-5 frontend complete (Discover shipped, commit `9e8e991`,
pushed). This increment adds the **Bid Battle strip** on the lot page, gated on `bidBattleV3`:
`components/BidBattle.tsx` consumes the backend's safe `RivalryView`
(`GET /auctions/:id/rivalry`) via `lib/api.ts` (`fetchRivalry`) — YOU vs the leader/challenger
alias, gap-to-next, active-bidder count and lead-change/comeback/outbid moments. Read-only:
it never places a bid. Renders nothing when the flag is OFF or before a contest exists.
Component test `BidBattle.test.tsx` (5). Web suite 31 green; `next build` OK.

## Landed frontend commits (this program, on `main`)

- `e91a274` chore(v3-0): baseline closure — fix CI Prettier + add V3 feature flags
- `8b776f1` feat(v3-2): catalogue defaults to Ending Soon (matches backend)
- `31b0b78` feat(v3-2): Infinite Flow Canvas (2D matrix, mobile 4x4, category overlay)
- `3e62f1b` feat(v3-3): cinematic homepage FeaturedReel + web component testing
- `ac3db28` feat(v3-4): deliberate Gesture Bid on the lot page (idempotent, safe)
- `ca1d9ec` final unfinished (WIP Discover — being completed & re-messaged this increment)

## Feature flags (server source of truth; all V3 default OFF in `lib/flags.ts`)

`v3VisualArchitecture` · `flowMatrixV3` · `categoryOverlayV3` · `featuredReelV3` ·
`discoverV3` (page being completed) · `buyerTwinV3` · `bidBattleV3` · `gestureBidV3` ·
`engagementV3` · `dashboardV3Beta` · `liveV3`. Discover surfaces render only when
`discoverV3` is enabled server-side; otherwise the page shows a safe fallback.

## Next command

`pnpm --filter @singha/web run typecheck && ... test && ... build` after the Discover
page + test land. Then V3-6 Bid Battle UI (behind `bidBattleV3`) consuming the backend
alias + rivalry projection.

## Owner blockers (pack doc 16)

Repos → private; Actions billing lock; branch protection; Supabase test-user credential
(authenticated Playwright E2E); provider credentials for later phases.
