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

## CX13 visual-QA follow-ups (minor / owner)
- **D4 — scroll affordance — RESOLVED.** The category/method chip rails on Explore and the shared
  data tables (offers, logistics, seller console, control centre, supply, procurement) hid their
  scrollbar (`no-scrollbar`) and hard-clipped the last visible item, so at narrow widths they read
  as "cut off" rather than "scroll for more". Fixed with a shared `ScrollX` component (`@singha/ui`)
  that adds a soft edge-fade on whichever side has off-screen content — **measured**, so it appears
  only when the rail actually overflows (no false hint when it fits). Applied to the two chip rails
  and the shared `DataTable` (one change covers all six table surfaces). Verified on the running
  stack at 390 (fade present) and 1440 (no fade). See D-CX-8.
- **D5 — seller viewing offers on their own sealed listing gets 403 (product / RBAC — owner +
  backend).** The sealed-offer operate/view permission (`exchange:operate`) is staff/admin-only,
  so a *seller* opening offers on their own sealed listing receives 403. The frontend already
  handles it gracefully (clean "couldn't load" card + Retry), so this is **not** a rendering
  bug — it is a product decision: should the seller role get a scoped, confidentiality-safe read
  of offers on listings they own (they need it to award), and if so, does it respect sealed
  pre-reveal (counts only until the server-authorized reveal)? This touches authorization and
  sealed-offer confidentiality, so it is intentionally **not** changed here — it belongs with the
  owner + backend team (`Auctions-Backend` RBAC), not a frontend visual-QA pass.
- **D6 — mobile bottom dock paint at exact max-scroll (real-device check).** During
  supplementary headless probing the dock's pixels were empty at the single exact max-scroll
  frame although the DOM/geometry reported it present and on top — most likely a headless-Chromium
  compositing quirk, not in the delivered frames. Worth a quick real-device spot-check; no code
  change asserted.
