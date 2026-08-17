# Singha CX Overhaul — CX13 Responsive Visual QA Report

Full-stack responsive QA of the customer-experience overhaul across the seven mandated
viewport widths, with defects triaged, the genuine ones fixed and re-verified. Run against a
real local stack: Postgres (preview `singha_preview` DB) + the built API (`apps/api/dist`,
non-binding preview flags, `FEATURE_OPERATOR_PAYMENTS` / `FEATURE_LOGISTICS_QUOTES` **false**)
+ the Supabase auth stub + the seeded Evolution demo data. No binding transactions were
enabled at any point.

## Method
- **Widths (7):** 360, 390, 430, 768, 1024, 1440, 1920.
- **Modes:** *After* = redesign on (`?evo=on&v3=on`); *Before* = baseline (flags off), for the
  owner's before/after comparison. Authed surfaces captured through a real preview sign-in.
- **Surfaces:** homepage, Explore (`/catalogue`), Wanted, Sell, Services, Exchange, a lot
  detail, Command Centre (`/account/activity`), Singha ID (`/account/singha-id`), commercial
  offers, sealed-offer comparison, logistics.
- **Capture set:** 75 base frames (`after/` 42 · `before/` 9 · `authed/` 24) plus a targeted
  post-fix verification set. Every one of the 42 *after* frames was checked programmatically
  for horizontal page overflow: **zero overflow at any width** (the top responsive risk).
- **Evidence:** `scratchpad/cx13/{after,before,authed}/` and the post-fix `…/verify/` set.

## Defects found, triaged and resolved

| # | Severity | Where | Disposition |
|---|---|---|---|
| D1 | High | Global header, 768–1024 (and signed-in ≤1440) | **FIXED** (`af0c830`) |
| D2 | Med-High | Flow catalogue rails, ≥768 | **FIXED** (`af0c830`) |
| D3 | Low-Med | Home hero @ 360 | Not a defect — capture artifact (see below) |
| D4 | Low | Chip rails / table last column | Deferred — minor polish (open item) |
| D5 | — | Seller sees 403 on own sealed listing | Product / RBAC question for owner+backend (open item) |
| D6 | Low | Mobile dock paint at exact max-scroll | Headless-only; real-device check (open item) |

### D1 — Global header overflow *(fixed + verified)*
At 768–1024 the desktop nav + currency picker + Sign in + the gold "Sell with Singha" CTA all
appeared at once and the CTA text wrapped to three lines; signed in (four account links +
currency) it overflowed even at 1440. This is shared header chrome and predates the overhaul
(visible on the *before* frames too). **Fix:** the desktop nav and seller CTA now appear at
`lg` (the complete mobile drawer already covers 768–1023, so nothing is lost); the
informational currency picker is deferred to `xl`; the signed-in top bar is trimmed to
identity + Sign out (Membership/Security stay in the drawer and one click under *My account*);
nav gap tightened; CTA / Sign in / Sign out set `whitespace-nowrap`. **Verified** on the
running stack at 768 (clean brand + hamburger), 1024 (nav + Sign in + CTA fit, no wrap) and
1440 (nav + currency + Sign in + CTA on one line) — zero horizontal overflow.

### D2 — Flow rails duplicated every listing on wide screens *(fixed + verified)*
Each Flow category rail duplicates its lots (`[...items, ...items]`) to make touch/trackpad
scrolling wrap seamlessly. The duplication fired whenever a rail was *exhausted*, so on wide
screens a short rail that already fits showed its cards **twice side by side** — reading as a
duplication bug (e.g. Vehicles: 4 lots rendered as 8). **Fix:** only loop when the single set
actually **overflows** the rail (measured with a `ResizeObserver`); scroll arrows likewise gate
on real overflow. It adapts per width — the same rail loops at 390 (overflowing) yet renders a
single set at 1440 (fitting). **Verified** on the running stack with real seeded lots: Vehicles
now shows 4 cards, Machinery 3, etc. — no duplication — while narrow widths still scroll.

### D3 — Home hero "View opportunities" @ 360 *(capture artifact, no change)*
The full-page screenshot showed the fixed mobile bottom dock overlapping the wrapped
"View opportunities" intent link at 360. This is a `fullPage`-screenshot characteristic
(Playwright renders `position:fixed` elements at their first-viewport offset in the stitched
image); in a real browser the dock stays pinned to the viewport bottom, content scrolls under
it, and the `has-mobile-dock` body padding clears the end of the page. No permanent clipping
occurs. No code change.

## Gate status for the fix
FE GitHub Actions remains owner-blocked (see `SINGHA_CX_OPEN_ITEMS`), so the fix was verified
against the exact CI gate set locally: **typecheck, 110 web + 30 auctionflow + 13 contract
tests, eslint, prettier, `check-routes`, `check-contracts` all green**, and the production
build **compiles** (confirmed via an offline build — the sandbox network policy denies
`fonts.gstatic.com`, so only `next build`'s Google-Fonts fetch is environment-blocked here;
real CI and Vercel reach it normally).

## Expected states (not defects)
Placeholder lot imagery and an empty "Featured items" strip are correct empty states — the
preview DB has zero `MediaObject` rows and zero `featured` listings (confirmed via `psql`),
not a rendering fault.
