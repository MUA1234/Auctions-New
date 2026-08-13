# Anti-Clone / Security Retrofit — Implementation Report

_2026-08-13. Retrofit of the CURRENT system (no rebuild). Frontend `Auctions New`
+ backend `Auctions-Backend`, both committed to `main` (not pushed). Result:
**NO_GO** — code-side hardening complete + verified; the GO gate is blocked only
by owner actions (repo privacy, branch protection, deploy)._

## Implemented + verified

### Application security (doc 02)
- **Backend security headers (Helmet)** — CSP (`default-src 'none'`,
  `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, HSTS in production, cross-origin CORP; **X-Powered-By
  removed**; `trust proxy` for real client IP; explicit **512 KB** JSON/urlencoded
  body limits (media uploads go direct-to-storage, never through the API body).
  `apps/api/src/main.ts`.
- **Frontend security headers + CSP** — every route serves CSP (`default-src 'self'`,
  `frame-ancestors 'none'`, `object-src 'none'`, `connect-src` limited to self +
  the canonical API + Supabase; **no `unsafe-eval` in production**, dev-only for HMR),
  nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, HSTS.
  `poweredByHeader: false`, `productionBrowserSourceMaps: false`. `apps/web/next.config.mjs`.
- **CORS** — explicit HTTPS allow-list in production (`assertProductionInvariants`
  refuses `*`); verified allowed-origin echoed / disallowed-origin blocked.
- **Error hygiene** — production errors return a safe title/status only; verified an
  invalid request leaks no stack / SQL / Prisma / filesystem path.
- **Dev/demo surface** — `/dev/token` 404s in production and `DEMO_AUTH_ENABLED`
  fail-closes (verified live earlier; boot refuses on weak secrets or `*` CORS).

### Rate limiting + abuse (doc 02/04)
- **Route-aware rate limiting** (`@nestjs/throttler`) — generous 300/min default so
  browsing/bidding is never harmed; **member search 30/min**, **registration 20/min**;
  health probes exempt. The guard is **production-only** (skipped in dev/test unless
  `SECURITY_THROTTLE_TEST=1`, so local E2E from one IP is never throttled) and emits
  **privacy-safe security events** on a breach (`MEMBER_SEARCH_RATE_HIGH`,
  `BID_COMMAND_RATE_HIGH`, `CATALOGUE_ENUMERATION_RATE_HIGH`, … route class only,
  never the client IP), returning a standard 429.

### IP boundary + anti-scraping (doc 01/04)
- **Crown jewels server-side** — verified no Tier-A logic in the browser (see
  `CURRENT_IP_BOUNDARY_MAP.md`); the browser holds only a non-authoritative credit
  preview from the public policy endpoint.
- **No server secrets in the browser bundle** — `NEXT_PUBLIC_*` carries only the
  Supabase URL + publishable key + API URL; CI **bundle secret scan**
  (`scripts/security-bundle-scan.mjs`, `security:bundle`) fails on any server-secret
  value/name in `.next/static` (clean on the real build, proven to catch an injected leak).
- **Max page size** already capped (catalogue 60, rows 30) — no full-inventory pull;
  public/customer/staff **DTO separation** and **masked member-search** results already in place.

### Supply chain (doc 03)
- **Gitleaks** secret-scan workflow (full history) + **CodeQL** JS/TS + **Dependabot**
  (npm + github-actions) + **CODEOWNERS** (auth, auction, member/credit, commerce,
  security config, migrations, CI) + **least-privilege** `permissions: contents: read`
  — both repos.

## Verification

- Backend: new `pnpm test:security` (headers, no X-Powered-By, CORS allow-list,
  sanitized errors, member-search 429 after 30) **all pass**; `test:auction`,
  `test:member`, `test:commerce`, `test:exchange` **unchanged** (throttler off
  outside prod/opt-in).
- Frontend: `next build` (18 routes) green; prod headers present on every response;
  home hydrates under the strict CSP with **zero CSP console violations**; bundle
  scan clean + negative-tested.

## GO gate (doc 06)

| Gate | Status |
|---|---|
| No Tier-A logic in browser | ✅ |
| Prod source maps not public / no forbidden secret strings in `.next` | ✅ |
| CSP / security headers, no X-Powered-By | ✅ |
| Explicit prod CORS, dev-token 404, weak-secret fail-closed, sanitized errors, request limits | ✅ |
| Auth/privacy (forged/expired/issuer, escalation, Member-360 denial, flags/perf hidden, AAL2, media IDOR) | ✅ (existing E2E) |
| Auction/member regression (concurrency, proxy privacy, soft-close, converted exposure, temp scope, security expiry/release race) | ✅ (Rev 06.2) |
| Rate/abuse controls + security events | ✅ |
| Supply-chain workflows (Gitleaks/CodeQL/Dependabot/CODEOWNERS/min-perms) | ✅ code; ⏳ run blocked by Actions billing lock (`BLOCKED_EXTERNAL_ACCOUNT`) |
| **Both repos private** | ⛔ owner action |
| **Main branch protection** | ⛔ owner action |
| Deployments healthy against final SHAs | ⛔ not pushed (owner) |

**Result: `NO_GO`** — every code-side item is done and verified; GO is blocked only
by the owner actions in `OWNER_ACTIONS_ANTI_CLONE.md`. Accepted risks are recorded
in `SECURITY_WAIVERS.md`.
