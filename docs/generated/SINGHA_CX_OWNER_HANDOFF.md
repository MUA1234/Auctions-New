# Singha Customer Experience Overhaul — Owner Handoff (CX14)

A concise, owner-facing handoff for the Customer Experience Overhaul + the Living Background
work. Everything below is shipped to `main` on both repos and verified locally against the
exact CI gate set; nothing binding is enabled.

## What visibly changed (customer-facing)
- **Living cinematic hero** — the homepage hero is now a fixed, atmospheric "living image"
  (your supplied firefly scene) that stays pinned while the page scrolls; reduced-motion and
  low-power safe. (Gated on the V3 visual flag.)
- **Intent-first homepage** — a real search, an "I want to: Sell / Post what I need / View
  opportunities" row, a plain-English "Ways to transact" explainer (auction is one of six
  methods), and a two-sided "Wanted" section.
- **Explore** (was "Catalogue") — compact sticky filter bar (search, location, ending-soon,
  sort, Flow/Grid/List) and a universal, sale-method-neutral listing card that works for a
  vehicle, a sapphire, 40 MT of onions, scrap, an excavator or land.
- **Mobile bottom dock** — Explore · Wanted · Sell · Activity · Account.
- **Listing = transaction workspace** — cleaner hierarchy, viewing/inspection + documents
  sections, FX-aware price, and a woven-in collection/delivery affordance.
- **Offers** — the buyer console shows a real listing title/reference/location, never a raw id.
- **Wanted / RFQ / Supply** — first-class buy-side: grouped plain-English RFQ creation with a
  "what suppliers will see" summary, commercial (not just cheapest) proposal comparison,
  recurring supply presented as a programme with perishable shelf-life/cold-chain.
- **Command Centre** — `account/activity` leads with "Needs your attention", then Buying /
  Selling / Wanted / Logistics / Documents with progression steppers.
- **Singha ID** — presented as a transaction passport (identity, company, seller/buyer
  readiness, capabilities) with clear Verified / Under review / Action needed states.
- **Local market** — natural "Singha Sri Lanka / Local pickup / Shipping from Colombo" language
  (no internal "market node" wording for customers).
- **Copy & accessibility** — no raw ids/enums/API errors reach customers; friendlier errors;
  label/focus/contrast a11y fixes on the transaction forms.

## What customers can now do
Browse and filter across all six categories; buy now, make an offer, bid, submit a sealed
tender, or register interest; post an RFQ or a supply programme and compare supplier proposals;
track offers/bids/activity and payment/collection steps in one Command Centre; see their Singha
ID transaction-readiness; and get a delivery estimate woven into the listing journey.

## What remains DISABLED (safe by default)
Production feature flags stay OFF until you enable them. No binding production transactions are
activated. In particular `operatorPayments` and `logistics quotes` binding remain OFF, and
`PAYMENT_WEBHOOK_SECRET` / `PAYMENT_PROVIDER_KEY` / `FX_API_*` stay blank in preview — the
preview never charges money, never calls live payment providers, and never sends live
WhatsApp/SMS/email.

## How to review (owner-side enablement — Claude cannot host)
The whole redesign is behind a **controlled preview**. On your staging deploy either append
query flags per browser, or set the env vars for the whole environment:
- **Per-browser:** append `?evo=on&v3=on` to any URL (persists via cookie). `?evo=off` /
  `?v3=off` clears it.
- **Environment (Vercel preview):** set `NEXT_PUBLIC_EVO_PREVIEW=1` and `NEXT_PUBLIC_V3_PREVIEW=1`.
- `NEXT_PUBLIC_EVO_PREVIEW` turns on the neutral IA (Explore | Exchange | Sell | Wanted |
  Services) + the Evolution surfaces; `NEXT_PUBLIC_V3_PREVIEW` turns on the visual system
  (Living Background, cinematic reels).
- Backend preview flags (Railway env, `FEATURE_*`, default false) enable the non-binding
  preview data surfaces; keep `FEATURE_OPERATOR_PAYMENTS` and `FEATURE_LOGISTICS_QUOTES` **false**.

Demonstration data (non-binding, clearly demo, idempotent, resettable) is seeded by the
Evolution preview seed scripts in `Auctions-Backend/database`:
`pnpm --filter @singha/database run seed:evolution` then `seed:evolution:tx`; reset with
`seed:evolution:reset`. (Requires the preview `DATABASE_URL`/`DIRECT_URL`.)

Smoke test after enabling: open `/?evo=on&v3=on` (living hero + intent), `/catalogue`
(filters + cards), `/wanted` (two-sided), sign in with a preview member, then `/account/activity`
(Command Centre), `/account/singha-id` (passport), `/account/commercial-offers` (real titles),
`/services/logistics` (Incoterms/quote).

## Owner actions required (owner-only — see also SINGHA_CX_OPEN_ITEMS + IP review)
1. **GitHub Actions is not running on the frontend repo** (`MUA1234/Auctions-New`): every run
   fails at provisioning (2–5s, no steps) — an Actions billing/enablement state, pre-existing.
   Raise/reset the Actions spending limit or enable Actions, then re-run `main`. (Backend CI is
   green.) Every FE increment here was verified locally against the full CI gate set meanwhile.
2. **Make both repositories private** — both are currently public, exposing the proprietary
   backend engines in source (CX12 / IP boundary review). Highest-value anti-clone action.
3. **Retire the frozen backend copy** from the public FE repo when you confirm nothing depends
   on it (the active app does not).
4. Optional safe backend read-model follow-ups (would "light up" already-forward-compatible FE
   fields): project quantity/unit + collection summary onto the catalogue LIST card; expose the
   full proposal terms + a "my shipments" list; nested-vs-flat lot price contract alignment.
   All additive; all documented in `SINGHA_CX_OPEN_ITEMS` / `SINGHA_CX_DECISIONS`.

## Production prerequisites (before any unrestricted public rollout)
Owner visual sign-off; operator/legal terms; payment-provider readiness; fee/tax + FX config;
logistics reference data; KYC rules; security/backups/monitoring; and a final flag-rollout plan.

## Rollback
Prefer feature-flag rollback (flip the `NEXT_PUBLIC_*` / `FEATURE_*` flags off — the redesign
self-gates, so this reverts to the current production experience with no deploy), then
deployment rollback, then forward-fix. No destructive migration is involved (the overhaul is
presentation + one additive backend read).

## Evidence — CX13 responsive visual QA (before/after)

**Owner review package (one link, click through the before/after):**
https://claude.ai/code/artifact/8fea16a4-3c11-48b3-9be6-f46091d6152d
(a self-contained visual review — homepage, Explore, Wanted, the new account surfaces, and the
two CX13 fixes, side by side).

**How it was captured.** A full local stack — Postgres (`singha_preview`) + the built API with
non-binding preview flags (`FEATURE_OPERATOR_PAYMENTS` / `FEATURE_LOGISTICS_QUOTES` **false**) +
the Supabase auth stub + the seeded Evolution demo data — screenshotted at the **seven mandated
widths (360 · 390 · 430 · 768 · 1024 · 1440 · 1920)**, redesign-on vs baseline, plus a signed-in
pass over the account/offer/logistics surfaces. **Zero horizontal page overflow at any width.**

**Screenshot matrix (75 base frames + a post-fix verification set):**
| Set | Frames | Covers |
|---|---|---|
| `after/` | 42 | redesign-on: home · Explore · Wanted · Sell · Services · Exchange × 7 widths |
| `before/` | 9 | baseline: home · Explore · Wanted × 390/768/1440 (the before/after pairs) |
| `authed/` | 24 | signed-in: Command Centre · Singha ID · offers · sealed comparison · lot · logistics · Explore × 390/768/1440 |
| `verify/` | 13 | post-fix confirmation of D1 (header) and D2 (Flow) on the running stack |

**Two defects found and fixed** (commit `af0c830`, verified on the running stack): the global
header overflow at tablet widths, and Flow catalogue rails duplicating listings on wide screens.
Full detail, triage of the remaining minor items (D3 non-defect; D4–D6 owner/polish) and the gate
status: `SINGHA_CX13_VISUAL_QA_REPORT.md`.

See also the per-phase reports: `SINGHA_LIVING_BACKGROUND_REPORT.md`,
`SINGHA_CX_CURRENT_STATE_AUDIT.md`, `SINGHA_CX_STATE.md`, `SINGHA_CX_DECISIONS.md`
(D-CX-6/D-CX-7 for the CX13 fixes), `SINGHA_CX_IP_BOUNDARY_REVIEW.md`, `SINGHA_CX_OPEN_ITEMS.md`.

> **Branch state.** The full overhaul (CX0–CX12 + the Living Background, 70 commits) is on
> `origin/main` of both repos. The CX13 fix + this CX14 finalization are on
> `claude/new-session-at0qp4` (this session's designated branch, based directly on `main` — it is
> `main` + the finalization, a clean fast-forward / PR into `main`).
