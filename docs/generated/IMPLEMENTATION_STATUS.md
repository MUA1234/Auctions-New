# IMPLEMENTATION STATUS

_Phase 0 — Foundations._ Do not begin Phase 1 until Phase 0 checks pass (docs/23).

## Phase 0 checklist

- [x] Monorepo initialized (pnpm + Turborepo) with strict TS config
- [x] Format / lint / typecheck / build / unit-test commands
- [x] Local PostgreSQL + Redis dev config (docker-compose + native notes)
- [x] Observability baseline (pino redaction, correlation, metrics registry)
- [x] Generated project docs (this folder)
- [x] Domain-module boundaries scaffolded (acyclic manifest graph + test)
- [x] Stable data-core migrations: identity, inventory, media provenance, audit
      (append-only), transactional outbox, platform config
- [x] Migration + domain tests
- [x] CI pipeline (GitHub Actions with Postgres service)
- [x] Design system ported from V1 (`@singha/ui`) and applied to the web homepage

## What exists

| Area                                                         | Package/App             | State                        |
| ------------------------------------------------------------ | ----------------------- | ---------------------------- |
| Contracts (ids, events, API)                                 | `@singha/contracts`     | Implemented                  |
| Config (env/flags/business)                                  | `@singha/config`        | Implemented                  |
| Observability                                                | `@singha/observability` | Implemented                  |
| Domain kernel + boundaries + identity/inventory/audit/outbox | `@singha/domain`        | Phase 0 subset               |
| Data core (Prisma)                                           | `@singha/database`      | Implemented (Phase 0 tables) |
| Design system                                                | `@singha/ui`            | Implemented (ported)         |
| Catalogue view model                                         | `@singha/auctionflow`   | Placeholder (Phase 4)        |
| Test helpers                                                 | `@singha/test-utils`    | Implemented                  |
| API (health, feature-flags, config, prisma)                  | `apps/api`              | Foundations                  |
| Web (editorial homepage)                                     | `apps/web`              | Foundations                  |
| Worker (outbox dispatcher)                                   | `apps/worker`           | Foundations (idle w/o Redis) |
| Live consoles                                                | `apps/live-console`     | Placeholder (Phase 11)       |

## Not started (later phases)

Auction engine (Phase 2), EOI/Exchange (3), public site + AuctionFlow Cube (4),
seller/admin (5), commerce/settlement (6), Singha Connect (7), AI Core (8),
Social Publisher (9), Asset Intelligence (10), Singha Live (11), hardening +
V1 migration + launch (12).

## Gate

Phase 0 gate = all checks pass (`pnpm run check`) + DB integration
(`pnpm run test:db`). See TEST_MATRIX.md for the current run status.
