# Current IP Boundary Map

_Anti-clone retrofit doc 01. Generated 2026-08-13 from the actual source.
Frontend `Auctions New` (MUA1234/Auctions-New) · Backend `Auctions-Backend`
(LakshanV/Auctions-Backend)._

## Subsystem inventory

| Subsystem | Current path | Browser exposed | Tier | Status |
|---|---|---|---|---|
| AuctionFlow (Flow/Grid/List) | `apps/web` `packages/auctionflow` | yes | B | presentation only ✓ |
| Catalogue cards / dashboard UI | `apps/web` | yes | B | presentation only ✓ |
| Auction acceptance / concurrency / soft-close | `Auctions-Backend` `modules/auction` + `packages/domain` | no | A | server-only ✓ |
| Proxy / max-bid policy | backend `packages/domain` | no | A | server-only ✓ |
| Credit exposure / reservations / scope | backend `modules/member/credit-exposure.service.ts` | no | A | server-only ✓ |
| Membership / security / guarantee rules | backend `modules/member` + `packages/domain/modules/member` | no | A | server-only ✓ |
| Performance scoring rules/weights | backend `packages/domain/modules/member/performance.ts` | no | A | server-only ✓ |
| Fraud / member flags | backend `modules/member` | no | A | server-only ✓ |
| Seller settlement / commerce | backend `modules/commerce` | no | A | server-only ✓ |
| Buyer Twin / Asset Intelligence | backend `modules/intelligence` (+ future) | no | A | server-only ✓ |
| AI system prompts / provider routing | backend `modules/ai` | no | A | server-only ✓ |
| Evidence / audit generation | backend (audit + outbox) | no | A | server-only ✓ |
| Published listings / public media / auction state | backend public DTOs (`/api/v2/catalogue`, lot state) | yes | C | public by design ✓ |

## Thin-client boundary — verified

The web app is a thin client. `grep -r "@singha/api\|apps/api\|apps/worker" apps/web/src`
returns **nothing** — the browser imports zero backend logic. The browser only:
renders state, animates Flow, collects intent, displays public data and calls
backend commands. It is authoritative for **none** of: bid acceptance, timer
truth, reserve, proxy max, credit, scoring, fraud, settlement, payment
verification or recommendation weights — all live server-side.

The only "policy" the browser holds is the **credit-policy preview** (`lib/credit-policy.ts`
+ `useCreditPolicy`), which is explicitly non-authoritative and fetched from the
public `GET /members/credit-policy`; the backend remains the authority.

## Residual Tier-A exposure (owner action)

The frontend monorepo still physically contains the **frozen** `apps/api` +
`apps/worker` copies (each carries `DEPRECATED.md`; the web app imports none of
them). These are Tier-A logic sitting in the product repo. They are mitigated by
making the repo **private** (owner action, see `OWNER_ACTIONS_ANTI_CLONE.md`);
physically removing them from the frontend repo is a recommended follow-up once
the canonical `Auctions-Backend` is confirmed as the sole source.
