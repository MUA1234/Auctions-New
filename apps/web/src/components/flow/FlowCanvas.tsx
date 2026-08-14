'use client';

import { FlowMatrixBand } from './FlowMatrixBand';
import { useFlags } from '../../lib/use-flags';

const LABELS: Record<string, string> = {
  vehicles: 'Vehicles',
  machinery: 'Machinery',
  gems: 'Gems & Jewellery',
  property: 'Property',
  bulk: 'Bulk & Stock',
  general: 'General',
};
const labelFor = (key: string) => LABELS[key] ?? key.replace(/_/g, ' ');

/**
 * V3 Infinite Flow Canvas (pack doc 08). Two-dimensional exploration: VERTICAL is natural
 * page scroll between category bands; HORIZONTAL scrolls the single rail inside each band.
 * Offscreen bands virtualize (each loads its own cursor slice only when near the viewport).
 * The big category name lives inside its own band (aligned with that row) and pops in on
 * hover / touch / entry — gated on `categoryOverlayV3`; each band always keeps a real
 * semantic heading for assistive tech. No fake infinity: a band stops when its cursor is
 * exhausted.
 */
export function FlowCanvas({
  categories,
  saleMethod,
  search,
}: {
  categories: string[];
  saleMethod?: string;
  search?: string;
}) {
  const { flags } = useFlags();

  if (categories.length === 0) {
    return <p className="py-10 text-center text-bone-500">No lots match your filters.</p>;
  }

  return (
    <div className="relative">
      {categories.map((cat) => (
        <div key={cat} data-band={cat}>
          <FlowMatrixBand
            category={cat}
            label={labelFor(cat)}
            saleMethod={saleMethod}
            search={search}
            showLabel={flags.categoryOverlayV3}
          />
        </div>
      ))}
    </div>
  );
}
