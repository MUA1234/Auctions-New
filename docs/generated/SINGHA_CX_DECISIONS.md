# Singha CX Overhaul — Decisions Log

Meaningful, reversible-internal decisions taken autonomously during the Customer Experience
Overhaul and the Living Background work. Newest first.

## D-LB-2 · Living Background is homepage-scoped and viewport-fixed via a page-level layer
The fixed cinematic scene is rendered from the homepage (`app/page.tsx`) as a
`position: fixed` layer, not injected globally into the root layout. Rationale: the pack is
about the home/landing hero specifically; scoping to the homepage keeps every other route
untouched and avoids a global stacking-context change. The hero stays transparent to reveal
the scene; post-hero sections ride an opaque `#070709` sheet so they cover it while
scrolling (the pack's intended "opaque sections cover the fixed scene"). The only shared
shell change is `Footer` gaining `relative z-[1]` so it paints above the fixed layer.

## D-LB-1 · One scoped CSS Module for the Living Background (exception to Tailwind-only)
The app styles with Tailwind + occasional inline styles and had no CSS Modules. The Living
Background introduces a single `living-background.module.css`. Rationale: it is a
self-contained compositing/animation system (~5 keyframe families, layered blends, a
`prefers-reduced-motion` block) that would be unreadable as Tailwind utilities and does not
belong in the shared `@singha/ui` design tokens. Next.js supports CSS Modules natively and
CSP-safely. This is an isolated, feature-local exception — the rest of the overhaul stays
Tailwind-first.

## D-CX-0 · Work continues on `main` for both repos
Consistent with the packs' "fetch latest origin/main / record SHAs / work on main" first
actions and the established session history. Baselines recorded at pack start: frontend
`MUA1234/Auctions-New` @ `1622a040`, backend `LakshanV/Auctions-Backend` @ `f2d364e`
(both confirmed as the current `origin/main` tips, nothing newer).
