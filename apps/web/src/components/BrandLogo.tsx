/**
 * Singha brand logo (red lion + SINGHA lockup) — the single brand mark used everywhere the
 * identity appears (header, footer, mobile drawer, member passport). The owner-supplied
 * artwork, served as a self-hosted animated SVG from our own origin (`/images/...`) so it
 * satisfies the strict `img-src 'self'` CSP. The SVG carries its own one-time entrance
 * animation and a `prefers-reduced-motion` fallback (no JavaScript), so a plain <img> is the
 * correct element — next/image would proxy/rasterise and drop the animation. Intrinsic
 * width/height are set to the artwork's (trimmed) aspect ratio to reserve space and avoid
 * layout shift while the SVG loads. Pass `className` to size it per surface.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    // A plain <img> is deliberate: the animated brand SVG must not be optimised/rasterised
    // by next/image. (The @next/next ESLint plugin isn't registered in this repo's flat
    // config, so a rule-specific disable directive would itself error — hence a plain note.)
    <img
      src="/images/singha-logo.svg"
      alt="Singha"
      width={913}
      height={183}
      draggable={false}
      className={className ?? 'h-10 w-auto sm:h-11'}
    />
  );
}
