# Singha CX Overhaul — Running State

Persistent progress log for the Customer Experience Overhaul + the Living Background work.
Baselines at pack start: frontend `MUA1234/Auctions-New` @ `1622a040`, backend
`LakshanV/Auctions-Backend` @ `f2d364e` (both confirmed current `origin/main`). Work
continues on `main`. The redesign is kept behind the controlled preview: `?v3=on` /
`NEXT_PUBLIC_V3_PREVIEW` (visual) and `?evo=on` / `NEXT_PUBLIC_EVO_PREVIEW` (neutral IA +
Evolution surfaces). Production defaults are unchanged until an owner enables the flags.

## Done
- **Living Background** (separate pack) — fixed cinematic homepage hero (CSS + Canvas,
  progressive enhancement, reduced-motion, proven scroll-independent 390–1920). Gated on
  `v3VisualArchitecture`. Report: `SINGHA_LIVING_BACKGROUND_REPORT.md`. Shipped `6a125b8`.
- **CX0** — current-state audit → `SINGHA_CX_CURRENT_STATE_AUDIT.md` (16 surfaces, tagged
  findings, phase-mapped fixes). It surfaced two real bugs, both now fixed + regression-tested:
  1. **EOI dead branch (pre-existing, high severity)** — the buyer action panel, sticky-dock
     CTA and label maps compared `'EOI'`, but the backend `SaleMethod` enum is
     `EXPRESSION_OF_INTEREST`, so every EOI listing's "register interest" form was unreachable.
     Fixed in `SalePanel`, `LotStickyDock`, `lot/[id]`, `events/[ref]`, `account/eoi`.
  2. **Dock collision (introduced by CX1)** — the new mobile bottom dock and the lot-detail
     sticky dock both pinned to `bottom-0`; the sticky dock now offsets above the nav dock on
     phones under neutral IA.
- **CX2 (homepage, first pass)** — intent-first hero (real search deep-linking into Explore
  `?q=` + "I want to: Sell / Post what I need / View opportunities"), a "Ways to transact"
  editorial explainer (six sale methods; auction is one of them), and a two-sided "Wanted"
  section surfacing buyer demand. New `components/home/*`, gated on `neutralIaV1`. Explore
  page relabelled from "Catalogue" and given a `q` param.
- **CX1 (mobile shell)** — purpose-built mobile bottom dock (Explore | Wanted | Sell |
  Activity | Account) with active-route state and safe-area handling; global CSS reserves
  bottom space via `has-mobile-dock`. `MobileBottomDock`, gated on `neutralIaV1`, `md:hidden`.

## Next (phase backlog)
- **CX2 (cont.)** — authenticated "Needs your attention" block on the homepage.
- **CX3** — Explore: sticky/compact filters (location, price, currency, qty/unit, shipping,
  verification), universal sale-method-neutral card polish.
- **CX4** — Listing detail as a transaction workspace (sticky rail desktop / dock mobile).
- **CX5** — Commercial + sealed offer UX; remove raw `listingId` via safe read-model enrich.
- **CX6** — Wanted/RFQ + Supply first-class flows.
- **CX7** — Customer Command Centre (attention-led) + Singha ID as transaction passport.
- **CX8** — Logistics woven into the transaction journey.
- **CX9** — Sri Lanka/local-market natural language (no "Satellite Node" vocabulary).
- **CX10** — visual hierarchy/motion refinement (fewer cards/borders, larger media).
- **CX11** — microcopy + friendly error mapper + a11y (no raw IDs/enums/errors).
- **CX12** — anti-clone / IP boundary review → `SINGHA_CX_IP_BOUNDARY_REVIEW.md`.
- **CX13** — full visual QA at 360/390/430/768/1024/1440/1920 + performance.
- **CX14** — controlled-preview handoff (env names, flag values, seed/deploy/smoke steps).

## Gates status
Every increment ships only after: typecheck · vitest (85 passing) · `next build` · eslint ·
prettier. Backend authority, immutable ledgers, sealed privacy, MFA/RBAC untouched.
