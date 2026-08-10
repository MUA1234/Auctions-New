# IMPLEMENTATION STATUS

_Phase 1 — Stable Data Core: COMPLETE._ (Phase 0 foundations also complete.)

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
| devToken (non-prod)   | `POST /dev/token`                         | dev only                       |

## Not started (later phases)

Auction engine (Phase 2), EOI/Exchange (3), public site + AuctionFlow Cube (4),
seller/admin UI (5), commerce/settlement (6), Singha Connect (7), AI Core (8),
Social Publisher (9), Asset Intelligence (10), Singha Live (11), hardening +
V1 migration + launch (12).

## Gate status

Phase 1 gate **passed** via `pnpm run check` (format, lint, typecheck, build,
unit), `pnpm run test:db` (migrations and integration) and `pnpm run test:e2e`
(permission enforcement, outbox and append-only audit end-to-end). Ready for
Phase 2 (Timed Auction Engine).
