# SINGHA — CONDUCTOR CURRENT-STATE RECONCILIATION

_Phase A ("Reconcile") of `.conductor/brief/SINGHA_CONDUCTOR_AUTONOMOUS_DEV_GUIDE.md`._

This is a **fresh reconciliation from source**, not a restatement of the previous programme
reports. Every classification below is anchored to a file, line, migration, workflow or commit
that exists in this working tree at the SHA recorded in §0. Where a previous report asserts a
result that this run could not re-observe, the assertion is marked as **inherited, unverified**
rather than promoted to fact — worker/report claims are not proof (guide §1).

---

## 0. Run identity

| Item | Value |
| --- | --- |
| Repository (frontend/product) | `MUA1234/Auctions-New` — `@singha/web` + shared frontend packages |
| Branch | `main` |
| **Frontend `main` SHA** | **`49549219110598de5d29708d664c3cc872347c74`** (`4954921`) |
| Head commit | `feat(sell): AI draft feedback control closes the §8 correction loop`, 2026-08-18 09:32:52 +0000 |
| Working tree at session start | clean |
| Backend `main` SHA | **not recorded — the canonical repo `Auctions-Backend` is not present in this clone** (see §2) |
| Reconciliation date | 2026-08-19 |
| Method | static inspection of source, migrations, flag definitions, CI workflow definitions, contract snapshot, and the existing `docs/generated` reports |

**Inspected in this run:** the full `apps/`, `packages/`, `database/`, `contracts/`, `scripts/`
and `.github/` trees; `apps/web/src/lib/*`; every `page.tsx` under `apps/web/src/app`
(39 routes); all 7 Prisma migrations; all three GitHub workflow definitions; the frozen public
API contract snapshot; and the 47 pre-existing reports in `docs/generated`.

---

## 1. Label legend (brief-required labels)

| Label | Meaning as used here |
| --- | --- |
| `COMPLETE` | Implemented in this repo to the layer this repo owns, with evidence in source; no known defect. |
| `PARTIAL` | Implemented but materially incomplete at one or more required layers (tests, error states, a sibling surface, responsiveness). |
| `MISSING` | No implementation in this repo. |
| `DEFECT` | Implemented but demonstrably wrong or unsafe; needs a fix, not more feature work. |
| `OWNER_ONLY` | Blocked on an account/billing/admin action the engineering agent cannot take. |
| `PROVIDER_GATED` | Code path exists behind an adapter; blocked on real provider credentials/contracts. |
| `LEGAL_GATED` | Blocked on legal/compliance/business-policy wording or values. |
| `OPTIONAL_POST_PILOT` | Deliberately deferred; not required for controlled-pilot readiness. |

---

## 2. Verification posture — explicitly unverifiable dimensions for this run

This environment is a source clone only. The following dimensions **could not be verified** and
are therefore not asserted anywhere in this document:

| Dimension | Status this run | Why |
| --- | --- | --- |
| Static gates (`format:check`, `lint`, `typecheck`, `build`) | **UNVERIFIED** | No `node_modules` anywhere in the tree and no `pnpm` on `PATH`; no dependency install was possible. |
| Unit/component test results (vitest) | **UNVERIFIED** | Same. Test *files* were counted (55) and read; none were executed. |
| `scripts/check-routes.mjs`, `scripts/check-contracts.mjs` | **UNVERIFIED** | Both scripts exist and are wired into CI; neither was run (they need the installed workspace / built DTO surface). |
| DB integration + migration tests (`pnpm test:db`) | **UNVERIFIED** | No PostgreSQL and no ephemeral-DB tooling available. |
| Browser E2E (Playwright, 5 specs) and the synthetic pilot harness (`apps/web/pilot`) | **UNVERIFIED** | No browsers installed, no running API/web stack. |
| **Live CI / check-run status on GitHub** | **UNVERIFIED** | No `gh` CLI and no network access from this session. Only the *workflow definitions* were inspected. The last recorded status (`SINGHA_CX_OPEN_ITEMS.md`) is an owner-blocked Actions billing state — see §7 O1, carried forward as inherited, unverified. |
| Vercel deployment/runtime state | **UNVERIFIED** | No network access. |
| **Backend repository state** (`Auctions-Backend`: API, worker, auction engine, RBAC, ledgers, its own SHA/CI) | **UNVERIFIED / OUT OF TREE** | The canonical backend is a separate repo (CLAUDE.md "Repository topology") and is not in this clone. `contracts/public-api.contract.json` is a **copied snapshot**, not a live probe, so backend-side conformance can only be asserted at snapshot age. |
| Local runtime parity with CI | **N/A — mismatched** | Local Node is 26.7.0; CI pins Node 22 (`.github/workflows/ci.yml`); `.nvmrc` says 20; `engines.node` says `>=20`. Even with dependencies installed, a local green would not have been CI-equivalent. |

**Consequence:** every classification below is a *source-level* classification. Nothing in this
document should be read as "verified green" — the brief's definition of done (guide §4) requires
browser + API + DB proof, which this run structurally could not produce.

---

## 3. Repository shape (observed)

```
apps/web            @singha/web — Next.js 14 App Router, 39 routes, the product surface
apps/live-console   12-line placeholder (src/main.ts) — logs and exits
packages/           auctionflow · config · contracts · domain · observability · test-utils · ui
database/           Prisma schema + 7 migrations + seed + 2 integration test files
contracts/          public-api.contract.json — backend-generated snapshot, copied in
scripts/            check-contracts · check-routes · security-bundle-scan · split-pack · with-ephemeral-db
.github/workflows/  ci.yml · codeql.yml · security.yml
```

- `apps/api` and `apps/worker` **no longer exist here** — removed in `62e0852`
  ("RW10: remove the frozen pre-split backend copy"). CLAUDE.md still describes them as present
  (see §6 DRIFT-1).
- 55 test files across the workspace; the heaviest concentrations are
  `apps/web/src/components` (12), `apps/web/src/components/evolution` (10) and
  `apps/web/src/lib` (8).
- Migrations present: `init`, `audit_append_only`, `asset_attributes`, `auction_engine`,
  `bid_append_only`, `money_bigint`, `evolution_e7_logistics` (latest:
  `20260815140000_evolution_e7_logistics`).

---

## 4. Work-area classification

### 4.1 Platform, build and delivery

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 1 | Monorepo/workspace wiring (pnpm + Turbo, task graph, filters) | `COMPLETE` | `package.json`, `turbo.json`, `pnpm-workspace.yaml` |
| 2 | Frontend CI definition (format → lint → typecheck → test → build → route check → contract check) | `COMPLETE` | `.github/workflows/ci.yml` |
| 3 | **CI execution on `MUA1234/Auctions-New`** | `OWNER_ONLY` | Workflows are valid and committed; runs are reported blocked at account level in `SINGHA_CX_OPEN_ITEMS.md` (inherited, unverified — §2). |
| 4 | Secret/supply-chain scanning (gitleaks, CodeQL, browser-bundle secret scan) | `OWNER_ONLY` | `.github/workflows/security.yml`, `codeql.yml`, `scripts/security-bundle-scan.mjs` — configured, execution blocked by #3 (waiver W5). |
| 5 | Node runtime pinning consistency | `PARTIAL` | CI Node 22 vs `.nvmrc` 20 vs `engines.node >=20`. Harmless today, but "green locally" and "green in CI" are not the same runtime. |
| 6 | `apps/live-console` (auctioneer/clerk/producer consoles, docs/08) | `MISSING` | `apps/live-console/src/main.ts` is a 12-line placeholder that only logs. |

### 4.2 Customer surfaces

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 7 | Geography-neutral IA / routing (Explore, Exchange, Sell, Wanted, Services, Account) | `COMPLETE` | 39 `page.tsx` routes; `scripts/check-routes.mjs` guards dead nav links in CI. |
| 8 | Catalogue / Explore + universal `SaleCard` (Flow/Grid/List) | `COMPLETE` | `components/CatalogueBrowser.tsx`, `SaleCard.tsx`, `components/flow/*`, `packages/auctionflow`. |
| 9 | Lot detail (gallery, sticky dock, logistics hint, certification evidence) | `COMPLETE` | `app/lot/[id]/page.tsx`, `LotGallery.tsx`, `LotStickyDock.tsx`, `LotLogisticsHint.tsx`. |
| 10 | Bidding UI (proxy bid, gesture bid, SSE + poll fallback, idempotency key) | `DEFECT` | `components/BidPanel.tsx` — SSE/poll and idempotency are sound, but the amount conversion at `BidPanel.tsx:94` is currency-exponent-unaware (see §5 D-1). |
| 11 | Homepage (intent hero, ways to transact, wanted, attention rail, local opportunities) | `COMPLETE` | `components/home/*` (5 components), `app/page.tsx`. |
| 12 | Buyer dashboard / command centre / activity | `COMPLETE` | `app/dashboard/page.tsx`, `components/evolution/ExchangeActivity.tsx`, `app/account/activity/page.tsx`. |
| 13 | Singha Live customer room | `PARTIAL` | `components/live/LiveFloorRoom.tsx` + `app/live/[ref]` exist (customer consumer only). Auctioneer/clerk/producer consoles are `MISSING` (#6). |
| 14 | Customer AI assistant surfaces (webchat, Ask Singha AI, channel choice) | `COMPLETE` (FE layer); real providers `PROVIDER_GATED` | `components/assistant/*` with 3 test files; flag `aiConversation`; providers "not configured" per `INTEGRATION_STATUS.md`. |
| 15 | Discover / Buyer Twin panels | `COMPLETE` (flag-gated, default OFF) | `DiscoverExperience.tsx`, `BuyerTwinPanel.tsx`; `discoverV3`/`buyerTwinV3` default `false`. |

### 4.3 Seller surfaces

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 16 | Listing Studio wizard (config-driven categories, sale methods, quantity/units, Incoterms, auto reference, drafts) | `PARTIAL` | `app/sell/new/page.tsx` — 1,910 lines, server-resumable drafts, exponent-aware money maths (`:317-320`). **Zero automated tests** cover it (no `sell/**` test file; no Playwright spec touches `/sell`). This is the largest and most recently changed customer-facing surface in the repo and it is entirely unguarded. |
| 17 | Photo-first AI Vision intake + in-app camera capture | `PARTIAL` / `PROVIDER_GATED` | `components/sell/VisionIntakePanel.tsx`, `components/sell/CameraCapture.tsx`; no tests; `AI_VISION_API_KEY` unset (`INTEGRATION_STATUS.md`). |
| 18 | Pre-publish quality check + AI draft feedback loop (§6/§7/§8) | `PARTIAL` | Shipped in `fd676d8`/`4954921` inside `app/sell/new/page.tsx`; no test, no report entry (see §6 DRIFT-5). |
| 19 | Seller offers console (sealed counts → reveal → compare → explicit award) | `COMPLETE` (with §5 D-1 on the counter amount) | `components/evolution/SellerOffersConsole.tsx` + test. |
| 20 | Seller supply programmes | `COMPLETE` (flag-gated) | `components/evolution/SupplyProgrammes.tsx` + test. |

### 4.4 Operator / staff surfaces

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 21 | Control Centre (routing, fees, payments, nodes) | `COMPLETE` (flag-gated, default OFF) | `components/evolution/ControlCentre.tsx` + test; `app/control-centre/*`. |
| 22 | Admin — members, credit capacity, securities | `COMPLETE` (with §5 D-1 on the deposit input) | `app/admin/members/page.tsx`. |
| 23 | **CRM — Customer 360, agent inbox, tasks, follow-ups, notes, escalations, segmentation, campaign consent** | `MISSING` | No route, component or lib in this repo matches customer-360 / agent-inbox / CRM. This is the whole of guide Phase C, unstarted on the frontend. |
| 24 | Integration health / provider admin screen | `MISSING` | Called out as "Not started" in `INTEGRATION_STATUS.md`; no route exists. |

### 4.5 Money and transaction integrity (crown jewels — guide §11)

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 25 | Binding-vs-display currency separation (display FX is never binding) | `COMPLETE` (design) | `lib/display-currency.ts`, `components/evolution/Price.tsx` — the "≈ … · indicative" line is explicitly non-binding. |
| 26 | **Currency-exponent-correct money entry/rendering on binding paths** | `DEFECT` | §5 D-1 — the shared parser/formatter hardcode ×100 / ÷100 while the platform offers a 0-exponent binding currency (JPY). |
| 27 | Display precision of binding amounts | `DEFECT` | §5 D-2 — `formatMoney` renders with `maximumFractionDigits: 0`, so sub-unit precision is silently rounded away on every binding price. |
| 28 | Server authority over auction state (UI never the source of truth) | `COMPLETE` (as observed in FE) | `BidPanel` re-reads `/auctions/:id/state` after every action; no client-side computation is treated as authoritative. |
| 29 | Idempotent bid submission | `COMPLETE` | `newIntentId()` idempotency key on both proxy and gesture paths (`BidPanel.tsx:95`, `GestureBidControl.tsx:58`). |
| 30 | Credit/capacity presentation | `PARTIAL` | `lib/credit-policy.ts` + `account/bid-capacity`; the deposit→capacity preview at `app/admin/members/page.tsx:392` shares D-1. |

### 4.6 Data, contracts and migrations

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 31 | Prisma schema + 7 additive migrations, append-only audit and bid triggers | `COMPLETE` (in-tree) | `database/prisma/migrations/*` incl. `audit_append_only`, `bid_append_only`, `money_bigint`. |
| 32 | Ownership of the schema after the backend split | `PARTIAL` | `database/` still lives here and is **not** in the CI typecheck/test filters (`--filter=@singha/web... --filter=@singha/auctionflow`), while the canonical DB belongs to `Auctions-Backend`. Two plausible sources of truth, one of them unexercised here. |
| 33 | FE↔backend contract drift guard | `COMPLETE` (mechanism) / `UNVERIFIED` (freshness) | `scripts/check-contracts.mjs` enforces contract-fields ⊆ FE DTO fields against a **copied** snapshot; snapshot freshness cannot be checked from this repo. |
| 34 | V1 → V2 data migration | `MISSING` (by plan) | "Not started" in `DATA_MIGRATION_STATUS.md`; no scripts exist. |

### 4.7 Testing and verification

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 35 | Unit/component tests | `PARTIAL` | 55 test files. Untested high-risk modules include **`apps/web/src/lib/format.ts` (all money maths — no test file at all)** and the entire Seller Studio. |
| 36 | Browser E2E | `PARTIAL` | 5 Playwright specs; `critical-flows.spec.ts` covers home, catalogue, filter persistence and signed-out redirects only — **no bid, offer, sell or checkout path**. Chromium project only (no Firefox/WebKit). |
| 37 | Synthetic customer/seller pilot harness | `COMPLETE` (harness) / `UNVERIFIED` (results) | `apps/web/pilot/*` — 9 journeys, providers-off assertion before any commercial state. Its PASS verdict is inherited, unverified (§2). |
| 38 | Concurrency / load / chaos / API fuzz / mutation testing | `MISSING` in this repo | Belongs with the canonical engine in `Auctions-Backend`; nothing here exercises it. |
| 39 | Accessibility as an automated gate | `MISSING` | No axe/a11y assertion in any spec or workflow; a11y work to date is manual/visual. |

### 4.8 Security

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 40 | Browser-bundle secret scanning | `COMPLETE` (code) / `OWNER_ONLY` (execution) | `scripts/security-bundle-scan.mjs` wired into `security.yml`. |
| 41 | CSP `'unsafe-inline'` for script/style | `PARTIAL` — accepted waiver | `SECURITY_WAIVERS.md` W1; revisit trigger recorded. |
| 42 | In-memory rate limiting (single instance) | `PARTIAL` — accepted waiver | W2; becomes a real gap the moment the API scales past one instance. |
| 43 | Seller reading offers on their own sealed listing → 403 | `LEGAL_GATED` / owner product decision | `SINGHA_CX_OPEN_ITEMS.md` D5 — sealed-offer confidentiality + RBAC scope is a policy call, and the fix lands in the backend repo. |

### 4.9 Owner / provider / legal gates

| # | Area | Label | Evidence |
| --- | --- | --- | --- |
| 44 | GitHub Actions billing / runner provisioning | `OWNER_ONLY` | §4.1 #3. |
| 45 | AI text/vision, messaging (Meta/WhatsApp/SMS/email), live/YouTube, payments | `PROVIDER_GATED` | `INTEGRATION_STATUS.md` — all "not configured"; `.env.example` keys blank by design. |
| 46 | Buyer premium, seller commission, VAT/tax, payment & collection deadlines | `LEGAL_GATED` | `.env.example` `BUSINESS_*` values are `0`/placeholder and marked `BUSINESS_APPROVAL_REQUIRED`. |
| 47 | Incoterms / trade-terms wording, terms page content | `LEGAL_GATED` | `app/terms/page.tsx`; the CX pass deliberately reused standard code names rather than inventing meanings. |

### 4.10 Deliberately deferred

| # | Area | Label |
| --- | --- | --- |
| 48 | OSS adoption decisions (Superset, Temporal, Qdrant, Chatwoot, Meilisearch, pgvector, OCR benchmark) | `OPTIONAL_POST_PILOT` — no benchmark has been run; guide §12 requires "if value is not clear, do not adopt". |
| 49 | Singha Social Publisher (FB/IG creatives + campaigns) | `OPTIONAL_POST_PILOT` — no FE surface; `FEATURE_SOCIAL_AUTO_PUBLISH=false`. |
| 50 | YouTube simulcast / multi-camera production | `OPTIONAL_POST_PILOT` + `PROVIDER_GATED`. |
| 51 | OpenTelemetry tracing | `OPTIONAL_POST_PILOT` — `packages/observability` provides logger/metrics/correlation only; no OTel dependency. |

---

## 5. Defect register (new findings from this run)

### D-1 — `DEFECT` (P1, crown-jewel): binding money amounts are parsed and rendered with a hardcoded ×100 / ÷100, on a platform that offers a 0-exponent binding currency

**The contradiction, in one repo:**

- `apps/web/src/lib/format.ts:16-27` defines the binding-currency catalogue with explicit
  minor-unit exponents, including `{ code: 'JPY', exp: 0 }`.
- `apps/web/src/app/sell/new/page.tsx:317-320` gets it right and says so:
  `// Minor units respect the currency's own exponent — never assume ×100 (directive §6; e.g. JPY is ×1).`
- The **shared** helpers do not: `parseMoneyToMinor` multiplies by a literal `100`
  (`format.ts:11`) and `formatMoney` divides by a literal `100` (`format.ts:4`).
- The exponent-aware formatter that exists — `formatMoneyExp` (`format.ts:32-37`) — is
  **called from nowhere in the application**. Only its own file and a gap-audit doc mention it.

**Reachability is not theoretical.** The binding transaction currency is a user choice over the
full catalogue, JPY included:

- the seller sets it in the Listing Studio — `app/sell/new/page.tsx:1345-1357` renders `CURRENCIES`;
- buyer and seller set it on offer forms — `components/evolution/CurrencyAmountInput.tsx` renders
  `CURRENCIES` and its own docblock calls it "the BINDING transaction currency".

**Affected binding call sites (all send minor units to the authoritative engine):**

| Path | Site |
| --- | --- |
| Proxy bid `maxAmountMinor` | `components/BidPanel.tsx:94` (inline `Math.round(Number(amount) * 100)`) |
| Buy Now / Make Offer / EOI amounts | `components/SalePanel.tsx:235`, `:327`, `:412` |
| Commercial offer total | `components/evolution/CommercialOfferForm.tsx:68` |
| Seller counter-offer | `components/evolution/SellerOffersConsole.tsx:172` |
| Procurement proposal | `components/evolution/ProcurementDetail.tsx:138` |
| Supply programme price | `components/evolution/SupplyProgrammes.tsx:146` |
| Operator amounts (3 sites) | `components/evolution/ControlCentre.tsx:372`, `:467`, `:626` |
| Admin deposit → capacity | `app/admin/members/page.tsx:392` |

**Failure scenario:** a listing is published with `currency: 'JPY'`. A buyer types `5000` into
the bid field. `BidPanel.tsx:94` sends `maxAmountMinor: 500000`. For a 0-exponent currency the
engine reads that as ¥500,000 — a **100× overbid the buyer never authorised**, recorded on an
append-only ledger. The symmetric render error hides it: `formatMoney(500000, 'JPY')` displays
`JPY 5,000`, so the confirmation UI shows the buyer exactly what they intended while the
authoritative record holds 100× more. The same 100× applies to offers, counters, procurement
proposals and admin credit deposits.

**Why it is not caught today:** `apps/web/src/lib/format.ts` has **no test file** (§4.7 #35), and
`scripts/check-contracts.mjs` checks field *presence*, not unit semantics.

### D-2 — `DEFECT` (P2): binding prices are displayed with sub-unit precision rounded away

`format.ts:4` formats with `maximumFractionDigits: 0`. `formatMoney(12345, 'USD')` renders
`USD 123` instead of `USD 123.45`, and `Price` (`components/evolution/Price.tsx`) routes **both**
the binding amount and the indicative FX line through it. Harmless for whole-rupee LKR listings;
wrong for every 2-decimal currency the catalogue already offers, and it makes D-1's 100× error
invisible rather than obvious.

### D-3 — `DEFECT` (P3): two divergent `FeatureFlags` definitions

`packages/config/src/feature-flags.ts` declares an 11-key interface (`cubeCatalogue`,
`aiListing`, `whatsappBidIntent`, …) that no longer intersects `apps/web/src/lib/flags.ts`
(35 keys, backend-mirrored). Nothing reconciles them, so the shared package's "flag contract" is
stale documentation that typechecks.

---

## 6. Documentation drift register

| # | Drift | Evidence |
| --- | --- | --- |
| DRIFT-1 | `CLAUDE.md` states `apps/api` and `apps/worker` exist here as a frozen copy "(see their `DEPRECATED.md`)". Both directories, and every `DEPRECATED.md`, were deleted in `62e0852`. | `ls apps/` → `live-console`, `web` only. |
| DRIFT-2 | `docs/generated/ARCHITECTURE_STATUS.md` is still "_Last updated: Phase 0 foundations_", describes `apps/api`/`apps/worker` as the layout, and calls realtime "a later-phase adapter" — SSE bidding shipped (`BidPanel.tsx:32`). | file contents vs source. |
| DRIFT-3 | `docs/generated/TEST_MATRIX.md` documents `apps/api`/`apps/worker` unit tests and `scripts/e2e-data-core.mjs` / `e2e-auction.mjs`; none of those paths exist in this repo. Its counts (47 unit / 7 DB / 1 E2E) do not match the observed 55 test files. | `ls scripts/`. |
| DRIFT-4 | `docs/generated/DATA_MIGRATION_STATUS.md` lists 5 migrations; 7 exist (`money_bigint`, `evolution_e7_logistics` unlisted). | `database/prisma/migrations/`. |
| DRIFT-5 | The last 20 commits — the entire §-numbered customer-first directive (Listing Studio, camera capture, QC panel, AI feedback loop, live floor room, verified-seller badge, subcategory taxonomy) — landed with **no `docs/generated` update**. The newest programme state doc stops at the AIC/CX programmes. | `git log --oneline -30 -- docs/generated`. |

Drift is recorded, not repaired, in this document: the brief's Phase A output is the gap list,
and rewriting five inherited reports would bury the one finding that matters (§8).

---

## 7. Gates outside engineering control

| Gate | Label | What unblocks it |
| --- | --- | --- |
| O1 — GitHub Actions cannot execute on `MUA1234/Auctions-New` | `OWNER_ONLY` | Actions spending limit / billing / Actions-enabled setting on the `MUA1234` account. Until then **no automated gate has ever run on this repo's `main`**, and every "green" claim in `docs/generated` rests on local runs. |
| O2 — AI, messaging, live and payment providers | `PROVIDER_GATED` | Real credentials + contracts; adapters and mocks already exist. |
| O3 — Buyer premium, commission, VAT, payment/collection deadlines | `LEGAL_GATED` | Product-owner values; today `0`/placeholder in `.env.example`. |
| O4 — Seller access to offers on their own sealed listing | `LEGAL_GATED` + backend | Confidentiality/RBAC policy decision, then an `Auctions-Backend` change. |
| O5 — Backend SHA / CI / engine verification | out of tree | Requires the `Auctions-Backend` clone; not obtainable from this session. |

---

## 8. Highest-priority code-level engineering gap to tackle next

> **Make currency-exponent correctness a property of the shared money layer, and prove it —
> starting with `apps/web/src/lib/format.ts` and the eleven binding call sites that feed the
> authoritative engine (defects D-1 / D-2, §5).**

**Why this one, ahead of everything else in §4:**

1. **It is a correctness defect on crown-jewel paths, not missing scope.** `placeBid`, offer
   acceptance, counters and credit exposure are exactly the surfaces the brief singles out for
   the strongest review (guide §11), and the brief orders critical financial/currency corrections
   (Phase B) *ahead of* CRM (Phase C) and UI/UX (Phase F). The largest missing area in this repo —
   CRM, §4.4 #23 — is bigger, but it is absent scope; D-1 is live, wrong money.
2. **The repo already knows the rule and applies it in exactly one place.** `sell/new/page.tsx:317-320`
   implements exponent-aware conversion and cites the directive; `formatMoneyExp` was written for
   it and then never wired in. This is unpropagated knowledge — the cheapest class of defect to
   close and the most expensive to leave, because every new money surface imports the wrong
   helper, since that is the one imported everywhere.
3. **It is silent by construction.** The parse error (×100) and the render error (÷100) cancel in
   the UI, so a buyer's confirmation screen agrees with their intent while the append-only ledger
   disagrees by 100×. Nothing in the repo can currently detect that: `format.ts` has no test file,
   the contract check validates field presence rather than unit semantics, and no Playwright spec
   places a bid.
4. **It is bounded and testable without the backend.** One shared module, eleven call sites and a
   pure-function test suite — deliverable and provable inside this repo, which matters given §2
   (no backend, no DB, no CI available for anything larger).

**What "done" looks like (definition-of-done for this gap):**

- `parseMoneyToMinor` takes the currency and uses the catalogue exponent; a currency outside the
  catalogue is a rejection, not a silent `exp = 2` fallback on a binding path.
- `formatMoney` either delegates to `formatMoneyExp` or is replaced by it at every call site, so
  the exponent-aware formatter is the only formatter — and sub-unit digits are shown (D-2).
- The inline `Math.round(Number(amount) * 100)` at `BidPanel.tsx:94` and
  `app/admin/members/page.tsx:392` is removed in favour of the shared helper — no bespoke money
  maths outside the money module.
- `sell/new/page.tsx`'s local `toMinor`/`currencyExp` collapse into the shared helper, so there is
  one implementation of the rule rather than two that agree by coincidence.
- A new `apps/web/src/lib/format.test.ts` pins the invariant per currency — JPY round-trips
  `5000 → 5000 → "JPY 5,000"`, USD round-trips `123.45 → 12345 → "USD 123.45"` — and a component
  test asserts `BidPanel` submits `maxAmountMinor: 5000`, not `500000`, for a JPY lot.
- The eventual browser proof (a JPY bid path in `critical-flows.spec.ts`) is recorded as the
  follow-up this repo cannot run today (§2), so the gap is closed at the layers available and the
  remaining layer is stated rather than assumed.

**Runner-up, for sequencing after the above:** the Seller Studio's total absence of automated
coverage (§4.3 #16 — 1,910 lines, 20 commits, zero tests). It is the biggest *risk* surface in
the repo, but it is untested working code, whereas D-1 is broken money-path code that no test
watches.
