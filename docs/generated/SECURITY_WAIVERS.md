# Security Waivers — Anti-Clone Retrofit

_Accepted, documented risks from the retrofit. Each is a conscious trade-off with a
mitigation and a revisit trigger. None blocks GO on its own (see
`OWNER_ACTIONS_ANTI_CLONE.md` for what does)._

| # | Waiver | Why accepted | Mitigation | Revisit when |
|---|---|---|---|---|
| W1 | **CSP allows `'unsafe-inline'` for script/style** in the frontend | Next.js App Router injects inline hydration/runtime and inline critical CSS; nonce/hash-based CSP needs a custom server and would break the static/edge deploy | `unsafe-eval` is **prod-disabled** (dev-only for HMR); `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, tight `connect-src` allow-list remain; no third-party script origins | Next.js supports nonce-based CSP on this deploy target, or a middleware nonce pipeline is adopted |
| W2 | **In-memory rate-limit store** (`@nestjs/throttler` default) | Backend runs as a single Railway instance today; Redis-backed throttling is unnecessary complexity at current scale | Limits still enforced per instance; deployment-edge rate protection recommended as a second layer (owner follow-up) | The API scales to >1 instance / horizontal autoscaling — switch to the Redis throttler storage so limits are global |
| W3 | **GitHub Actions pinned to version tags, not commit SHAs** (`actions/checkout@v4`, `setup-node@v4`, CodeQL/Gitleaks actions) | Tag pinning keeps the workflows readable and auto-patchable; full SHA pinning is high-friction for a small team | **Dependabot (github-actions ecosystem)** is enabled and will PR action updates; least-privilege `permissions: contents: read` limits blast radius | A supply-chain incident in a pinned action, or a compliance requirement for SHA pinning, arises |
| W4 | **Opaque/signed catalogue cursors not implemented** — the row cursor is the plain lot ULID | Lot IDs are **already public** in `/lot/[id]` URLs, so signing the cursor protects nothing secret; max-page-size caps (60/30) + rate limiting already prevent bulk enumeration | Page size capped server-side; enumeration rate emits `CATALOGUE_ENUMERATION_RATE_HIGH` and 429s; public DTO carries no private fields | A future cursor encodes non-public state (e.g. personalization/scoring), which must then be signed |
| W5 | **Supply-chain scans configured but not yet executed** (Gitleaks / CodeQL / CI) | Runs are blocked by the org Actions billing/spending lock (`BLOCKED_EXTERNAL_ACCOUNT`), outside code control | Workflows, Dependabot config, CODEOWNERS and least-privilege tokens are all committed and ready; they run automatically once billing is cleared (owner action 4) | The Actions billing lock is cleared — confirm all three gates pass on `main` |

## Not waived — enforced

For the avoidance of doubt, these are **not** waived and are actively enforced in
code: no Tier-A logic in the browser; no server secrets in the browser bundle
(CI-scanned); production CORS allow-list (no `*`); sanitized production errors;
security headers + `X-Powered-By` removed on both tiers; dev/demo auth fail-closed
in production; request body size limits; server-authoritative auction, credit,
scoring, fraud and settlement.
