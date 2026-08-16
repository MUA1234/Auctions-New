# Singha CX Overhaul — Open Items (owner action / follow-ups)

## OWNER-ONLY — GitHub Actions cannot run on `MUA1234/Auctions-New` (pre-existing)

**What:** Every GitHub Actions run on the frontend repo `MUA1234/Auctions-New` — the `CI
(frontend)`, CodeQL and security workflows — completes in **2–5 seconds with zero steps
executed** and is marked `failure`. This is a runner **startup/provisioning** failure, not a
code failure: the `verify` job never runs a single step. It affects **every commit for at
least the last 30**, including the pre-overhaul baseline `1622a040` and all the earlier
E0–E15 Evolution commits — i.e. it predates this work entirely.

**Diagnosis:** The workflow file (`.github/workflows/ci.yml`) is valid and standard
(`ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4`, pnpm). The **backend** repo
`LakshanV/Auctions-Backend` runs the same style of CI green in multiple minutes with real
steps (latest `e5dceca` fully green). A valid workflow that fails in seconds with no steps,
persistently, on one account only, is the signature of **GitHub Actions being unable to
provision a runner** — almost always an **Actions spending-limit / billing** state on the
`MUA1234` account (GitHub records the run but refuses to execute it), or Actions execution
disabled for the account/repo.

**Why it is owner-only:** GitHub billing / spending limits / Actions enablement are
account-level settings. Claude has no access to the `MUA1234` GitHub billing or org settings
(pack doc 09 explicitly lists "GitHub billing" as a developer/owner responsibility; the
owner brief lists "credential/access requirement" as an escalation trigger).

**Owner fix (one of):**
- Raise or reset the GitHub Actions **spending limit** for the `MUA1234` account
  (Settings → Billing → Plans and usage → Actions), or add a payment method if the free
  minutes are exhausted; **or**
- Ensure **Actions is enabled** for the repo (Settings → Actions → General → "Allow all
  actions"), and that a standard GitHub-hosted `ubuntu-latest` runner is available (no
  required-but-offline self-hosted runner).
- After fixing, re-run the latest `main` workflow to confirm green.

**Compensating control in the meantime (done):** because CI cannot verify, every frontend
increment in this overhaul is verified **locally against the exact gates the FE CI would
run** — `pnpm run format:check`, `lint`, `typecheck`, `pnpm turbo run test` (web +
auctionflow), `pnpm turbo run build --filter=@singha/web`, `node scripts/check-routes.mjs`
(no dead nav) and `node scripts/check-contracts.mjs` (no FE↔backend contract drift) — all
green before push. Vercel builds/deploys independently of GitHub Actions, so preview
deploys are unaffected by this CI outage.

## Backend read-model follow-ups (safe, additive — not blockers)
- CX3 universal card wants a per-card **quantity + unit** and a **logistics/collection** hint
  on the `/api/v2/catalogue` LIST card; today only the single-lot detail endpoint projects
  `collectionSummary`, and only `Asset.quantityAvailable`/`quantityUnitCode` exist. The
  frontend `CatalogueCardV2` already declares these as optional forward-compatible fields
  (renders nothing until the backend sends them). A small additive backend projection would
  light them up. (See `SINGHA_CX_DECISIONS.md` D-CX-1.)
- CX3 filters: price-range, display-currency, quantity-range, shipping/pickup and
  verification are not `/api/v2/catalogue` server params yet; adding them needs additive
  backend query support (must stay server-side — the catalogue never downloads all inventory).
