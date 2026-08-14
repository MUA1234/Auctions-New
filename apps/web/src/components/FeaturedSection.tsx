'use client';

import type { CatalogueCardV2 } from '../lib/api';
import { useFlags } from '../lib/use-flags';
import { FeaturedReel } from './FeaturedReel';
import { SaleCard } from './SaleCard';

/**
 * Homepage featured items. Data is fetched server-side and passed in (no
 * client-side full-catalogue download, pack doc 09). This client wrapper only
 * chooses the presentation: the cinematic revolving `FeaturedReel` when
 * `featuredReelV3` is enabled server-side, otherwise the current static grid.
 */
export function FeaturedSection({ items }: { items: CatalogueCardV2[] }) {
  const { flags } = useFlags();
  if (flags.featuredReelV3) return <FeaturedReel items={items} />;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((lot) => (
        <SaleCard key={lot.id} lot={lot} />
      ))}
    </div>
  );
}
