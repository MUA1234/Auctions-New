import Link from 'next/link';
import { CATEGORY_META } from '../lib/categories';

/**
 * "Explore categories" tiles — each an artistic card: a category-tinted gradient wash with a
 * large, faint line-icon bleeding off the corner and the label on top. Glyphs, tints and
 * labels come from the shared catalogue taxonomy (`lib/categories`) so these tiles and the
 * catalogue filter chips never drift. Pure CSS + inline SVG (no external media), so it
 * satisfies the strict CSP and ships with no assets. Server component — hover is CSS only.
 */
export function CategoryCards() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {CATEGORY_META.map((c) => (
        <Link
          key={c.slug}
          href={`/catalogue?category=${c.slug}`}
          className="group relative flex h-32 items-start overflow-hidden rounded-2xl border border-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_22px_50px_-26px_rgba(0,0,0,0.85)]"
        >
          {/* Category-tinted wash */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(120% 95% at 92% 8%, rgba(${c.rgb},0.32), transparent 58%), linear-gradient(155deg, rgba(${c.rgb},0.12) 0%, rgba(10,11,13,0.92) 66%)`,
            }}
          />
          {/* Large ghosted line-icon bleeding off the bottom-right corner */}
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-5 -right-4 opacity-90 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:opacity-100"
            style={{ color: `rgba(${c.rgb},0.22)` }}
          >
            <c.Icon className="h-32 w-32" />
          </span>
          {/* Label + arrow */}
          <span className="relative z-10 flex w-full items-center justify-between">
            <span className="font-display text-base font-semibold text-bone drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] transition-colors group-hover:text-white">
              {c.label}
            </span>
            <span className="text-gold-300 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
