import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * "Explore categories" tiles — each an artistic card: a category-tinted gradient wash with a
 * large, faint line-icon bleeding off the corner and the label on top. Pure CSS + inline SVG
 * (no external media), so it satisfies the strict CSP and ships with no assets. Server
 * component — hover is CSS only.
 */

function Ico({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

const CarIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <path d="M5 17H3v-4l2.2-5.2A2 2 0 0 1 7 6.6h10a2 2 0 0 1 1.8 1.2L21 13v4h-2" />
    <path d="M3 13h18" />
    <path d="M9 17h6" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </Ico>
);
const GearIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M18.9 5.1 16.8 7.2M7.2 16.8 5.1 18.9" />
  </Ico>
);
const GemIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <path d="M6 3h12l3.5 5.5L12 21 2.5 8.5 6 3Z" />
    <path d="M2.5 8.5h19" />
    <path d="M8.5 8.5 12 21l3.5-12.5" />
    <path d="M8.5 8.5 11 3M15.5 8.5 13 3" />
  </Ico>
);
const BuildingIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
    <path d="M15 9h4a1 1 0 0 1 1 1v11" />
    <path d="M3 21h18" />
    <path d="M7 8h2M11 8h1M7 12h2M11 12h1M7 16h2M11 16h1" />
  </Ico>
);
const BriefcaseIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <rect x="2.5" y="7" width="19" height="13" rx="2" />
    <path d="M16 7V5.5A1.5 1.5 0 0 0 14.5 4h-5A1.5 1.5 0 0 0 8 5.5V7" />
    <path d="M2.5 12h19" />
  </Ico>
);
const BoxIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <path d="M21 8.5 12 3 3 8.5" />
    <path d="M3 8.5v7L12 21l9-5.5v-7" />
    <path d="M3 8.5 12 14l9-5.5" />
    <path d="M12 14v7" />
    <path d="M7.5 5.75 16.5 11.25" />
  </Ico>
);
const SproutIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <path d="M12 20v-8" />
    <path d="M7 20h10" />
    <path d="M12 12C12 8.5 9 6 5.5 6 5.5 9.5 8.5 12 12 12Z" />
    <path d="M12 11c0-3 2.3-5.5 5.5-5.5C17.5 8.5 15.2 11 12 11Z" />
  </Ico>
);
const GridIcon = (p: IconProps) => (
  <Ico className={p.className}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
  </Ico>
);

const CATS: {
  slug: string;
  label: string;
  rgb: string;
  Icon: (p: IconProps) => ReactNode;
}[] = [
  { slug: 'vehicles', label: 'Vehicles', rgb: '31,160,85', Icon: CarIcon },
  { slug: 'machinery', label: 'Machinery & Equipment', rgb: '214,150,60', Icon: GearIcon },
  { slug: 'gems', label: 'Gems & Jewellery', rgb: '158,120,240', Icon: GemIcon },
  { slug: 'property', label: 'Property', rgb: '72,132,214', Icon: BuildingIcon },
  { slug: 'business', label: 'Business Assets', rgb: '48,178,158', Icon: BriefcaseIcon },
  { slug: 'bulk', label: 'Stock & Bulk', rgb: '128,150,180', Icon: BoxIcon },
  { slug: 'agriculture', label: 'Agriculture', rgb: '150,182,72', Icon: SproutIcon },
  { slug: 'general', label: 'General Assets', rgb: '201,162,75', Icon: GridIcon },
];

export function CategoryCards() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {CATS.map((c) => (
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
