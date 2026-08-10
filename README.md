# Singha Auctions V2

Production-grade auction, asset-exchange, live-auction, omnichannel and
asset-intelligence platform for Sri Lanka. Fresh V2 build — V1 is a reference and
migration source only.

The authoritative product specification is the AI Development Pack in
[`CLAUDE.md`](./CLAUDE.md) and [`docs/`](./docs). Read those before implementing a
domain they govern. Autonomous decisions are logged in
[`docs/generated/DECISIONS.md`](./docs/generated/DECISIONS.md).

> **Status: Phase 0 (Foundations).** Monorepo, tooling, CI, observability,
> domain-boundary scaffold, stable data core (identity/inventory/media/audit/
> outbox) and the ported design system. Not production-ready.

## Requirements

- Node ≥ 20, Corepack (`corepack enable` → pnpm 9)
- PostgreSQL 16 (Docker or native) — Redis optional in Phase 0

## Quick start

```bash
corepack enable
pnpm install

# bring up local infra (Docker) — or use native Postgres/Redis (see infrastructure/README.md)
docker compose -f infrastructure/docker-compose.yml up -d
cp .env.example .env

pnpm db:generate
pnpm db:migrate          # create/apply the initial migration
pnpm db:seed             # feature flags + business-config placeholders

pnpm dev                 # runs web + api + worker via Turbo
```

## Workspace

```
apps/web           Next.js editorial site (homepage: hero + featured + categories + Market Pulse)
apps/api           NestJS API (/api/v1) — health, feature flags, config, prisma
apps/worker        Outbox dispatcher (BullMQ; idles without REDIS_URL)
apps/live-console  Singha Live consoles (placeholder — Phase 11)

packages/contracts       versioned DTOs, domain-event names + envelope, ULID ids
packages/config          typed env, feature flags, business config
packages/observability   pino (redacting), correlation, metrics
packages/domain          kernel + boundary graph + identity/inventory/audit/outbox
packages/ui              design system (Auction-House Luxe) — Tailwind preset + primitives
packages/auctionflow     Cube/Grid/List view model (placeholder — Phase 4)
packages/test-utils      shared test helpers
database                 Prisma schema, migrations, client (@singha/database)
```

## Common commands

```bash
pnpm run check      # format:check + lint + typecheck + build + unit tests
pnpm run test:db    # ephemeral Postgres: apply migrations + DB integration tests
pnpm run build      # build everything (Turbo)
pnpm run lint       # ESLint (flat config)
pnpm run typecheck  # tsc --noEmit across the workspace
```

## Non-negotiables (see CLAUDE.md)

Permanent data survives app rewrites · UI is never the source of truth for
auction state · AI outputs are derived records, never overwrite facts · original
media immutable · bid/financial ledgers append-only · authorization enforced on
the server.
