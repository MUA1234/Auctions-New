# ⚠️ FROZEN — not the canonical backend

This `apps/api` is a **pre-split copy** left over from when the monorepo held both
frontend and backend. It is **not the source of truth** and must not become a
"second backend" (pack 01 doc 08 — Canonical Backend and API Contracts).

**Canonical API + worker live in the separate `Auctions-Backend` repository**
(deployed to Railway). All API/worker features, fixes and security work happen
there — including the Stabilisation & Security Pack and the pack-01 catalogue
scale work.

This repository (`Auctions New`) is the **frontend/product** (`@singha/web`,
deployed to Vercel). Vercel builds only `@singha/web`; the web app does not
import `@singha/api` or `@singha/worker`.

Do not edit code here. If something in the web app appears to depend on this
directory, port the need into the canonical backend instead.
