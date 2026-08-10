# TEST MATRIX

Layers per docs/17. Phase 0 covers unit/domain, DB integration, and a live
health smoke. Concurrency/E2E/load arrive with the auction engine and beyond.

## Current coverage

| Layer                | Where                    | What is proven                                                                                              |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Unit — contracts     | `packages/contracts`     | ULID validity, event envelope validation, additive event-name set                                           |
| Unit — config        | `packages/config`        | Safe defaults, flag coercion, provider detection, required-env error                                        |
| Unit — observability | `packages/observability` | Secret redaction, metrics, correlation scoping                                                              |
| Unit — domain        | `packages/domain`        | Acyclic boundaries, Money invariants, Asset≠Listing, audit immutability, outbox mapping                     |
| Unit — auctionflow   | `packages/auctionflow`   | View-mode cycling/validation                                                                                |
| Unit — test-utils    | `packages/test-utils`    | Env sandbox, event builder                                                                                  |
| Unit — api           | `apps/api`               | Health payloads, feature-flags view (decorator-free logic)                                                  |
| Unit — worker        | `apps/worker`            | Outbox batch dispatch (success + partial failure)                                                           |
| Integration — DB     | `database`               | Migrated tables, Asset/Listing identity, **append-only audit (UPDATE/DELETE rejected)**, outbox persistence |
| Smoke — API          | verification             | `GET /healthz` returns ok against a booted Nest app                                                         |

## How to run

```bash
pnpm run check     # format + lint + typecheck + build + unit tests
pnpm run test:db   # ephemeral Postgres: migrations + DB integration tests
```

## Gaps / TODO (later phases)

- Concurrency & soft-close (Phase 2), EOI privacy (Phase 3), full transaction
  E2E (Phase 6), omnichannel/social mocks (7/9), live/hybrid E2E (Phase 11),
  permission matrix + load + restore (Phase 12).
- API DI end-to-end via supertest (add SWC transform for Vitest, or Nest e2e).
