# Infrastructure (local development)

Phase 0 provisions only local development infrastructure. Production
infrastructure-as-code (compute, managed Postgres, Redis, object storage/CDN,
queues, secrets, monitoring) is defined in later phases (docs/18).

## Option A — Docker (recommended)

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Brings up PostgreSQL 16 (`localhost:5432`, db `singha_v2`, user/pass `singha`)
and Redis 7 (`localhost:6379`). These match the defaults in `.env.example`.

## Option B — Native (Homebrew), when Docker is unavailable

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
createdb singha_v2            # or: createuser + createdb to taste
```

Set `DATABASE_URL` / `REDIS_URL` in `.env` accordingly.

## Applying the schema

```bash
pnpm db:migrate:deploy   # apply committed migrations
pnpm db:seed             # feature flags + business-config placeholders
```

## Ephemeral verification database

`scripts/with-ephemeral-db.mjs` boots a throwaway Postgres cluster in `.localdb/`
(no Docker, no system services), applies migrations, runs a command against it,
then tears it down. Used by `pnpm test:db` and CI-free local verification.
