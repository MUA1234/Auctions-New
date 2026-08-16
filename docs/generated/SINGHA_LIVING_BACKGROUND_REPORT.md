# Singha Living Background — Implementation Report

Implements the **Singha Living Background** pack: turn the supplied Singha hero scene
into a premium, viewport-fixed "living image" (atmospheric, cinematic, non-video) behind
the homepage hero, with progressive enhancement and strict scroll-independence.

Status: **complete and verified.** Frontend `@singha/web`, homepage only, gated on the
existing `v3VisualArchitecture` flag (so production keeps its restrained hero until the V3
visual system is switched on; it appears in a `?v3=on` / `NEXT_PUBLIC_V3_PREVIEW=1` review
session).

## Files changed

New — `apps/web/src/components/living-background/`:
- `SinghaLivingBackground.tsx` — client component; owns the fixed layered scene, resolves
  the device capability tier, mounts the Canvas field and pointer parallax, exposes no
  business logic.
- `ParticleField.ts` — imperative Canvas renderer for the luminous motes (no React work
  per frame, no hot-loop allocation, pre-rendered halo sprites, DPR-capped, ~30 FPS,
  pauses on `document.hidden`).
- `usePointerAtmosphere.ts` — desktop fine-pointer-only micro-parallax; lerps POINTER
  coordinates into CSS vars; never reads scroll.
- `living-background.module.css` — the one deliberately-scoped CSS Module in this
  Tailwind app (see DECISIONS): fixed root, image/ambient/haze/shaft/vignette layers,
  time-based keyframes, and a self-contained `prefers-reduced-motion` block.
- `SinghaLivingBackground.test.tsx` — gating + decorative-only + self-hosted-image test.

New assets — `apps/web/public/images/` (generated from the supplied 2000×1500 source via
Pillow; AVIF + WebP responsive variants + a JPEG fallback):
- `singha-hero-living-{828,1280,1920}.avif` (23/40/66 KB)
- `singha-hero-living-{828,1280,1920}.webp` (36/67/109 KB)
- `singha-hero-living.jpg` (1600w, 123 KB fallback)

Changed:
- `apps/web/src/app/page.tsx` — renders `<SinghaLivingBackground />` as a fixed layer at
  the top of the page; the hero stays transparent to reveal it; all sections below the
  hero ride an opaque `#070709` sheet that scrolls up and over the fixed scene.
- `apps/web/src/components/Footer.tsx` — `relative z-[1]` so the footer paints above the
  fixed scene (the only shell change; globally harmless).

Removed (superseded by the above):
- `apps/web/src/components/HomeHeroBackdrop.tsx` + `HomeHeroBackdrop.test.tsx`
- `apps/web/public/images/home-hero.webp` (dead asset)

## Technique

Layered viewport-fixed composition — no video, GIF, Lottie, or WebGL:
`base <picture>` (AVIF→WebP→JPEG, responsive `srcset`, `object-fit: cover`, ~24s optical
breathing) · `ambient light` (two radial glows drifting on different phases) · `haze`
(blurred depth gradient) · `light shaft` (one restrained diagonal) · `Canvas motes`
(distant fireflies) · `legibility vignette` (left/top/bottom/edge darkening that preserves
the luminous centre). Ambient motion is CSS keyframes + a throttled `requestAnimationFrame`
Canvas loop; the group carries an optional desktop pointer micro-parallax via CSS vars.

## Scroll behaviour — verified independent of scroll (non-negotiable)

- The root is `position: fixed; inset: 0` — a real fixed layer, **not**
  `background-attachment: fixed`.
- No scroll listeners, no `scrollY`, no IntersectionObserver, no GSAP/Framer/scroll
  timeline anywhere in the feature. All motion is time-based.
- **Automated proof** (Playwright, 390 / 768 / 1440 / 1920): the root reports
  `position: fixed` and its viewport `top` is **0 before and after** scrolling 1400px at
  every width → the scene is pinned and does not travel with the document. Opaque sections
  scroll up and over it (confirmed visually).

## Supplied image is the visual source — verified

The rendered scene is the supplied `singha-hero-living-source.png`, re-encoded only (resize
+ AVIF/WebP/JPEG); no recomposition, recolour, or AI recreation. All artwork is self-hosted
under `/images/` (satisfies the strict `img-src 'self'` CSP; no external hotlink — asserted
in the unit test).

## Performance safeguards

- AVIF-first responsive delivery (66 KB at 1920w); `sizes="100vw"`; `decoding="async"`.
- No new animation dependency; Canvas + CSS only. Homepage First-Load JS unchanged in the
  shared chunk.
- Canvas: single canvas, reused particle objects, pre-rendered sprites, **no allocation in
  the frame loop**, DPR capped at 2, ~30 FPS, `requestAnimationFrame` cancelled on unmount,
  listeners/`ResizeObserver` cleaned up, **paused when `document.hidden`**, started only
  after a 400ms defer so it never competes with hero paint/hydration.
- Compositor-friendly properties only (`transform`, `opacity`); `contain: layout paint` on
  the root.

## Responsive behaviour

- **Desktop (≥1024, fine pointer):** full effect — image + breathing + lights + haze +
  ~26 motes + pointer micro-parallax.
- **Tablet (≥640):** image + lights + haze + ~16 motes, no pointer parallax.
- **Mobile (<640):** image + lights + haze + ~8 motes, no pointer parallax; frame shifted
  (`object-position: 30% 60%`) so the luminous vegetation sits away from the left-aligned
  copy. `100dvh` with a `100vh` fallback for mobile toolbars.

## Reduced motion

`prefers-reduced-motion: reduce` → the Canvas is never started (particle budget 0) and all
CSS ambient animation + pointer parallax collapse (module `@media` block + the global
`@singha/ui` killswitch). The result is the deliberately-designed static scene with its
legibility vignette — not a broken or empty hero.

## Quality gates (all green)

`typecheck` (tsc --noEmit) · `test` (vitest — 26 files / 85 tests, incl. the new gating
test) · `build` (next build — homepage + all routes compile) · `eslint` (clean) ·
`prettier --check` (clean). No unrelated pre-existing failures were touched.
