'use client';

import { useEffect, useRef, useState } from 'react';
import { FlowMatrixBand } from './FlowMatrixBand';
import { CategoryOverlay } from './CategoryOverlay';
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
 * V3 Infinite Flow Canvas (pack doc 08). Two-dimensional exploration: VERTICAL is
 * natural page scroll between category bands; HORIZONTAL pages the 2-D matrix
 * inside the active band. Offscreen bands virtualize (each loads its own cursor
 * slice only when near the viewport). As the active band changes a floating
 * `CategoryOverlay` blooms in and fades — the label is decorative (`aria-hidden`)
 * while each band keeps a real semantic heading. No fake infinity: a band stops
 * when its cursor is exhausted.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { flags } = useFlags();
  const [activeKey, setActiveKey] = useState(categories[0] ?? '');
  const [overlayVisible, setOverlayVisible] = useState(false);

  // Track the most-visible band → drives the floating overlay.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.band;
          if (key) ratios.set(key, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best = '';
        let bestRatio = 0;
        ratios.forEach((r, k) => {
          if (r > bestRatio) {
            bestRatio = r;
            best = k;
          }
        });
        if (best) setActiveKey(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    root.querySelectorAll<HTMLElement>('[data-band]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [categories]);

  // Bloom the overlay on band entry, then fade it once the user settles/scrolls on.
  useEffect(() => {
    if (!activeKey) return;
    setOverlayVisible(true);
    const t = setTimeout(() => setOverlayVisible(false), 1300);
    return () => clearTimeout(t);
  }, [activeKey]);

  if (categories.length === 0) {
    return <p className="py-10 text-center text-bone-500">No lots match your filters.</p>;
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Floating band label — gated on `categoryOverlayV3`. When off, bands still
          carry their real semantic headings, so navigation/a11y is unaffected. */}
      {flags.categoryOverlayV3 && (
        <CategoryOverlay label={labelFor(activeKey)} visible={overlayVisible} />
      )}
      {categories.map((cat) => (
        <div key={cat} data-band={cat}>
          <FlowMatrixBand
            category={cat}
            label={labelFor(cat)}
            saleMethod={saleMethod}
            search={search}
          />
        </div>
      ))}
    </div>
  );
}
