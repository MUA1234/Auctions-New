# ⚠️ FROZEN — not the canonical worker

This `apps/worker` is a **pre-split copy** from the original combined monorepo. It
is **not the source of truth** (pack 01 doc 08 — Canonical Backend and API
Contracts).

**The canonical worker lives in the separate `Auctions-Backend` repository**
(deployed to Railway), alongside the canonical API. All worker/outbox/dispatcher
work happens there.

This repository (`Auctions New`) is the **frontend/product** (`@singha/web`,
deployed to Vercel). Do not edit code here.
