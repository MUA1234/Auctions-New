# ARCHITECTURE STATUS

_Last updated: Phase 0 foundations._

## Style

Modular monolith with strict domain boundaries and a transactional outbox
(docs/03). No premature microservices. Apps are thin process hosts; domain logic
and contracts live in shared packages.

## Stack (current stable at implementation time — verify before pinning anew)

| Concern           | Choice                               |
| ----------------- | ------------------------------------ |
| Language          | TypeScript 5.7 (strict)              |
| Monorepo          | pnpm 9 workspaces + Turborepo 2      |
| Web / PWA         | Next.js 14.2 (App Router) + React 18 |
| API               | NestJS 10 + Express                  |
| Authoritative DB  | PostgreSQL 16 via Prisma 5           |
| Cache / queues    | Redis + BullMQ (optional in Phase 0) |
| Validation / DTOs | Zod (in `@singha/contracts`)         |
| Logging           | pino (secret-redacting)              |
| Tests             | Vitest (unit + integration)          |
| Lint / format     | ESLint 9 flat config + Prettier      |
| Lib bundling      | tsup (ESM + CJS + d.ts)              |

## Repository layout

```
apps/        web (Next.js) · api (NestJS) · worker (BullMQ) · live-console (placeholder)
packages/    contracts · domain · ui · auctionflow · config · observability · test-utils
database/    Prisma schema + migrations + client (@singha/database)
infrastructure/  docker-compose + native dev notes
docs/        the AI development pack (CLAUDE.md + docs/00..23) + docs/generated
```

## Domain boundaries

Declared as an acyclic manifest graph in `@singha/domain` (`boundaries.ts`) with
a test asserting the graph stays a DAG and dependencies precede dependents.
Modules communicate via commands/events, not by reaching into internals. Code
level import enforcement is deferred (DECISIONS D-0011).

## Data flow (target)

```
command -> domain aggregate -> state change + outbox event (same tx)
        -> outbox dispatcher (worker) -> internal event bus / adapters
        -> read models / notifications / analytics (rebuildable)
```

## Realtime

Server owns auction state; clients re-sync on reconnect. Realtime transport is a
later-phase adapter (WebSocket/SSE).

## Status

Phase 0 foundations in place: monorepo, tooling, CI, observability baseline,
domain-boundary scaffold, stable data-core schema (identity/inventory/media/
audit/outbox/platform) with an append-only audit guarantee, and the ported
design system. Not production-ready; feature phases (1–12) not started.
