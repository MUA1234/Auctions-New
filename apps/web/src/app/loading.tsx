/**
 * Global route-loading shell (V3-1). Shown during server navigation — a calm,
 * premium placeholder rather than a blank frame. Reduced-motion users get the
 * static version (the shimmer collapses via the global reduced-motion block).
 */
export default function Loading() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-5 py-24">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border-2 border-white/10" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-gold-400" />
      </div>
      <p className="eyebrow">Loading</p>
    </div>
  );
}
