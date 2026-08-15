import type { ReactNode } from 'react';

/**
 * Catalogue taxonomy — the single source of truth for category glyphs, tints and labels,
 * plus sale-method glyphs. Shared by the homepage "Explore categories" tiles
 * (`CategoryCards`) and the catalogue filter chips (`CatalogueBrowser`) so the two never
 * drift. Everything here is pure inline SVG + data (no external media), which satisfies the
 * strict CSP and works in both server and client components (no hooks, no 'use client').
 */

export type IconProps = { className?: string; strokeWidth?: number };

function Ico({
  className,
  strokeWidth = 1.3,
  children,
}: {
  className?: string;
  strokeWidth?: number;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/* ---------- Category glyphs ---------- */

const CarIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M5 17H3v-4l2.2-5.2A2 2 0 0 1 7 6.6h10a2 2 0 0 1 1.8 1.2L21 13v4h-2" />
    <path d="M3 13h18" />
    <path d="M9 17h6" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </Ico>
);
const GearIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M18.9 5.1 16.8 7.2M7.2 16.8 5.1 18.9" />
  </Ico>
);
const GemIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M6 3h12l3.5 5.5L12 21 2.5 8.5 6 3Z" />
    <path d="M2.5 8.5h19" />
    <path d="M8.5 8.5 12 21l3.5-12.5" />
    <path d="M8.5 8.5 11 3M15.5 8.5 13 3" />
  </Ico>
);
const BuildingIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
    <path d="M15 9h4a1 1 0 0 1 1 1v11" />
    <path d="M3 21h18" />
    <path d="M7 8h2M11 8h1M7 12h2M11 12h1M7 16h2M11 16h1" />
  </Ico>
);
const BriefcaseIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <rect x="2.5" y="7" width="19" height="13" rx="2" />
    <path d="M16 7V5.5A1.5 1.5 0 0 0 14.5 4h-5A1.5 1.5 0 0 0 8 5.5V7" />
    <path d="M2.5 12h19" />
  </Ico>
);
const BoxIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M21 8.5 12 3 3 8.5" />
    <path d="M3 8.5v7L12 21l9-5.5v-7" />
    <path d="M3 8.5 12 14l9-5.5" />
    <path d="M12 14v7" />
    <path d="M7.5 5.75 16.5 11.25" />
  </Ico>
);
const SproutIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M12 20v-8" />
    <path d="M7 20h10" />
    <path d="M12 12C12 8.5 9 6 5.5 6 5.5 9.5 8.5 12 12 12Z" />
    <path d="M12 11c0-3 2.3-5.5 5.5-5.5C17.5 8.5 15.2 11 12 11Z" />
  </Ico>
);
const GridIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
  </Ico>
);

export type CategoryMeta = {
  slug: string;
  label: string;
  rgb: string;
  Icon: (p: IconProps) => ReactNode;
};

/** Ordered category taxonomy — drives the homepage tiles and (by slug) the filter chips. */
export const CATEGORY_META: CategoryMeta[] = [
  { slug: 'vehicles', label: 'Vehicles', rgb: '31,160,85', Icon: CarIcon },
  { slug: 'machinery', label: 'Machinery & Equipment', rgb: '214,150,60', Icon: GearIcon },
  { slug: 'gems', label: 'Gems & Jewellery', rgb: '158,120,240', Icon: GemIcon },
  { slug: 'property', label: 'Property', rgb: '72,132,214', Icon: BuildingIcon },
  { slug: 'business', label: 'Business Assets', rgb: '48,178,158', Icon: BriefcaseIcon },
  { slug: 'bulk', label: 'Stock & Bulk', rgb: '128,150,180', Icon: BoxIcon },
  { slug: 'agriculture', label: 'Agriculture', rgb: '150,182,72', Icon: SproutIcon },
  { slug: 'general', label: 'General Assets', rgb: '201,162,75', Icon: GridIcon },
];

const CATEGORY_BY_SLUG = new Map(CATEGORY_META.map((c) => [c.slug, c]));

/** Neutral gold fallback for any facet value not in the taxonomy — never returns null. */
const CATEGORY_FALLBACK: Omit<CategoryMeta, 'slug' | 'label'> = {
  rgb: '201,162,75',
  Icon: GridIcon,
};

/** Resolve a category facet value (a slug) to its glyph + tint, tolerating unknown values. */
export function categoryMeta(slug: string): CategoryMeta {
  const found = CATEGORY_BY_SLUG.get(slug.toLowerCase());
  if (found) return found;
  return { slug, label: slug, ...CATEGORY_FALLBACK };
}

/* ---------- Sale-method glyphs ---------- */

const ClockIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 1.8" />
  </Ico>
);
const BookmarkIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.8L5 21V4.5a1 1 0 0 1 1-1Z" />
  </Ico>
);
const TagIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M11.6 3H5a2 2 0 0 0-2 2v6.6a2 2 0 0 0 .6 1.4l7.4 7.4a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8L13 3.6A2 2 0 0 0 11.6 3Z" />
    <circle cx="7.5" cy="7.5" r="1.4" />
  </Ico>
);
const OfferIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M20.5 11.7a8 8 0 0 1-8.5 8 9 9 0 0 1-3.8-.85L3.5 20l1.2-4.6A8 8 0 0 1 4 11.7 8 8 0 0 1 12.2 4a8 8 0 0 1 8.3 7.7Z" />
    <path d="M9 12h6M9 9h6" />
  </Ico>
);
const LockIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Ico>
);
const BroadcastIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <circle cx="12" cy="12" r="2.3" />
    <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M9.3 9.3a3.8 3.8 0 0 0 0 5.4M14.7 9.3a3.8 3.8 0 0 1 0 5.4" />
  </Ico>
);
const FunnelIcon = (p: IconProps) => (
  <Ico className={p.className} strokeWidth={p.strokeWidth}>
    <path d="M3 5h18l-7 8.2V20l-4 1.5v-8.3L3 5Z" />
  </Ico>
);

const SALE_METHOD_ICONS: Record<string, (p: IconProps) => ReactNode> = {
  TIMED_AUCTION: ClockIcon,
  EXPRESSION_OF_INTEREST: BookmarkIcon,
  BUY_NOW: TagIcon,
  MAKE_OFFER: OfferIcon,
  SEALED_TENDER: LockIcon,
  LIVE_HYBRID: BroadcastIcon,
};

/** Human label for a sale-method enum value: "TIMED_AUCTION" → "timed auction" (chip capitalises). */
export function saleMethodLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase();
}

/** Glyph for a sale-method enum value; falls back to a tag for unknown methods. */
export function saleMethodIcon(value: string): (p: IconProps) => ReactNode {
  return SALE_METHOD_ICONS[value] ?? TagIcon;
}

/** "All" glyphs for the reset chips at the head of each filter row. */
export const AllCategoriesIcon = GridIcon;
export const AllMethodsIcon = FunnelIcon;
